import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTournamentSchema, updateTournamentSchema, insertCourtSchema, insertMatchSchema, insertTournamentRegistrationSchema, insertPadelPairSchema, insertScheduledMatchSchema, insertClubSchema, insertMatchStatsSessionSchema, insertMatchEventSchema, insertTournamentUserRoleSchema, excelPlayerSinglesSchema, excelPlayerDoublesSchema, excelMatchSinglesSchema, excelMatchDoublesSchema } from "@shared/schema";
import { z } from "zod";
import { MatchStatsWebSocketServer } from "./websocket";
import multer from "multer";
import * as XLSX from "xlsx";

let wsServer: MatchStatsWebSocketServer;

// Configure multer for file uploads (memory storage for Excel files)
const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Tournament routes
  app.get("/api/tournaments", async (req, res) => {
    try {
      // Multi-tenant: Users only see tournaments they have access to
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // SuperAdmin sees all tournaments
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      let tournaments;
      
      console.log(`[TOURNAMENTS] User: ${req.user!.username}, IsSuperAdmin: ${isSuperAdmin}`);
      
      if (isSuperAdmin) {
        tournaments = await storage.getAllTournaments();
        console.log(`[TOURNAMENTS] SuperAdmin - returning ALL ${tournaments.length} tournaments`);
      } else {
        // Other users only see tournaments where they have a role or are registered
        tournaments = await storage.getUserTournaments(req.user!.id);
        console.log(`[TOURNAMENTS] Regular user - returning ${tournaments.length} user-specific tournaments`);
      }
      
      // Disable caching to prevent stale data
      res.setHeader('Cache-Control', 'no-store');
      res.json(tournaments);
    } catch (error) {
      console.error('[TOURNAMENTS] Error:', error);
      res.status(500).json({ message: "Failed to fetch tournaments" });
    }
  });

  app.post("/api/tournaments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Multi-tenant: Only SuperAdmin can create tournaments
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can create tournaments" });
      }

      const validatedData = insertTournamentSchema.parse({
        ...req.body,
        organizerId: req.user!.id,
        status: "draft" // Always set to draft on creation, ignore client status
      });

      const tournament = await storage.createTournament(validatedData);
      res.status(201).json(tournament);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tournament data", errors: error.errors });
      }
      console.error("Error creating tournament:", error);
      res.status(500).json({ message: "Failed to create tournament" });
    }
  });

  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      // Include canManage flag if user is authenticated
      let canManage = false;
      if (req.isAuthenticated()) {
        canManage = await storage.canManageTournament(req.user!.id, req.params.id);
      }
      
      res.json({ ...tournament, canManage });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tournament" });
    }
  });

  app.put("/api/tournaments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get tournament to check ownership
      const existingTournament = await storage.getTournament(req.params.id);
      if (!existingTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Use multi-tenant authorization: SuperAdmin or Tournament Admin can update
      const canManage = await storage.canManageTournament(req.user!.id, req.params.id);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Validate update data
      const validatedData = updateTournamentSchema.parse(req.body);
      
      const tournament = await storage.updateTournament(req.params.id, validatedData);
      res.json(tournament);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });

  app.delete("/api/tournaments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get tournament to check ownership  
      const existingTournament = await storage.getTournament(req.params.id);
      if (!existingTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Use multi-tenant authorization: SuperAdmin or Tournament Admin can delete
      const canManage = await storage.canManageTournament(req.user!.id, req.params.id);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.deleteTournament(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tournament" });
    }
  });

  // Tournament registration routes
  app.post("/api/tournaments/:id/register", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const registrationData = insertTournamentRegistrationSchema.parse({
        tournamentId: req.params.id,
        playerId: req.user!.id
      });

      const registration = await storage.registerPlayerForTournament(registrationData);
      res.status(201).json(registration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register for tournament" });
    }
  });

  app.delete("/api/tournaments/:id/register", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.unregisterPlayerFromTournament(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to unregister from tournament" });
    }
  });

  app.get("/api/tournaments/:id/registrations", async (req, res) => {
    try {
      const registrations = await storage.getTournamentRegistrations(req.params.id);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.get("/api/tournaments/:id/players", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify tournament exists first
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Get players after confirming tournament exists
      const players = await storage.getTournamentPlayers(req.params.id);
      
      // Only expose phone numbers to SuperAdmin or Tournament Admin
      const isAuthorizedForPII = await storage.canManageTournament(req.user!.id, req.params.id);
      
      const sanitizedPlayers = players.map(player => {
        if (isAuthorizedForPII) {
          return player;
        } else {
          // Remove phone for regular users
          const { phone, ...playerWithoutPhone } = player;
          return playerWithoutPhone;
        }
      });
      
      res.json(sanitizedPlayers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tournament players" });
    }
  });

  // Admin/organizer can register any player
  app.post("/api/tournaments/:id/register-player", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get tournament to check permissions
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Only SuperAdmin or Tournament Admin can register other players
      const canManage = await storage.canManageTournament(req.user!.id, req.params.id);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const registrationData = insertTournamentRegistrationSchema.parse({
        tournamentId: req.params.id,
        playerId: req.body.playerId
      });

      const registration = await storage.registerPlayerForTournament(registrationData);
      res.status(201).json(registration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register player" });
    }
  });

  // Admin/organizer can unregister specific players
  app.delete("/api/tournaments/:id/players/:playerId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get tournament to check permissions
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Only SuperAdmin or Tournament Admin can unregister other players
      const canManage = await storage.canManageTournament(req.user!.id, req.params.id);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.unregisterPlayerFromTournament(req.params.id, req.params.playerId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to unregister player" });
    }
  });

  // Club routes
  app.get("/api/clubs", async (req, res) => {
    try {
      const clubs = await storage.getAllClubs();
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clubs" });
    }
  });

  app.post("/api/clubs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only SuperAdmin can create clubs
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can create clubs" });
      }

      const validatedData = insertClubSchema.parse(req.body);
      const club = await storage.createClub(validatedData);
      res.status(201).json(club);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid club data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create club" });
    }
  });

  app.get("/api/clubs/:id", async (req, res) => {
    try {
      const club = await storage.getClub(req.params.id);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      res.json(club);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch club" });
    }
  });

  app.patch("/api/clubs/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only SuperAdmin can update clubs
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can update clubs" });
      }

      const club = await storage.updateClub(req.params.id, req.body);
      res.json(club);
    } catch (error) {
      res.status(500).json({ message: "Failed to update club" });
    }
  });

  app.delete("/api/clubs/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only SuperAdmin can delete clubs
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can delete clubs" });
      }

      await storage.deleteClub(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete club" });
    }
  });

  // Court routes
  app.get("/api/courts", async (req, res) => {
    try {
      const courts = await storage.getAllCourts();
      res.json(courts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courts" });
    }
  });

  app.post("/api/courts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only SuperAdmin can create courts
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can create courts" });
      }

      const validatedData = insertCourtSchema.parse(req.body);
      const court = await storage.createCourt(validatedData);
      res.status(201).json(court);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid court data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create court" });
    }
  });

  app.put("/api/courts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only SuperAdmin can update courts
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can update courts" });
      }

      const court = await storage.updateCourt(req.params.id, req.body);
      res.json(court);
    } catch (error) {
      res.status(500).json({ message: "Failed to update court" });
    }
  });

  app.delete("/api/courts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only SuperAdmin can delete courts
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can delete courts" });
      }

      await storage.deleteCourt(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete court" });
    }
  });

  // Match routes
  app.get("/api/tournaments/:id/matches", async (req, res) => {
    try {
      const matches = await storage.getTournamentMatches(req.params.id);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch match" });
    }
  });

  app.post("/api/matches", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertMatchSchema.parse(req.body);
      
      // Verify tournament exists
      const tournament = await storage.getTournament(validatedData.tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Only SuperAdmin or Tournament Admin can create matches
      const canManage = await storage.canManageTournament(req.user!.id, validatedData.tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions to create matches" });
      }

      const match = await storage.createMatch(validatedData);
      res.status(201).json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid match data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  app.put("/api/matches/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get match to verify existence and get tournament
      const existingMatch = await storage.getMatch(req.params.id);
      if (!existingMatch) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Verify user can manage the tournament this match belongs to
      const canManage = await storage.canManageTournament(req.user!.id, existingMatch.tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const validatedData = insertMatchSchema.partial().parse(req.body);
      const match = await storage.updateMatch(req.params.id, validatedData);
      res.json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid match data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update match" });
    }
  });

  app.delete("/api/matches/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get match to verify existence and get tournament
      const existingMatch = await storage.getMatch(req.params.id);
      if (!existingMatch) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Verify user can manage the tournament this match belongs to
      const canManage = await storage.canManageTournament(req.user!.id, existingMatch.tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.deleteMatch(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete match" });
    }
  });

  app.put("/api/matches/:id/result", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get match to verify existence and get tournament
      const existingMatch = await storage.getMatch(req.params.id);
      if (!existingMatch) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Verify user can manage the tournament this match belongs to
      const canManage = await storage.canManageTournament(req.user!.id, existingMatch.tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions to record match results" });
      }

      const resultSchema = z.object({
        winnerId: z.string(),
        player1Sets: z.number().min(0),
        player2Sets: z.number().min(0),
        player1Games: z.string(),
        player2Games: z.string(),
        duration: z.number().optional()
      });

      const validatedResult = resultSchema.parse(req.body);
      const match = await storage.recordMatchResult(req.params.id, validatedResult);
      res.json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid result data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to record match result" });
    }
  });

  app.get("/api/players/:id/matches", async (req, res) => {
    try {
      const matches = await storage.getPlayerMatches(req.params.id);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player matches" });
    }
  });

  // Scheduled matches routes (calendar)
  app.get("/api/scheduled-matches", async (req, res) => {
    try {
      const { date, startDate, endDate, courtId, organizerId } = req.query;
      
      let matches;
      if (date) {
        // Get matches for specific date
        matches = await storage.getScheduledMatchesByDate(new Date(date as string));
      } else if (startDate && endDate) {
        // Get matches for date range
        matches = await storage.getScheduledMatchesByDateRange(
          new Date(startDate as string), 
          new Date(endDate as string)
        );
      } else if (courtId) {
        // Get matches for specific court
        const courtDate = date ? new Date(date as string) : undefined;
        matches = await storage.getScheduledMatchesByCourt(courtId as string, courtDate);
      } else if (organizerId) {
        // Get matches by organizer
        matches = await storage.getScheduledMatchesByOrganizer(organizerId as string);
      } else {
        // Get all matches
        matches = await storage.getAllScheduledMatches();
      }
      
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scheduled matches" });
    }
  });

  app.post("/api/scheduled-matches", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertScheduledMatchSchema.parse({
        ...req.body,
        organizerId: req.user!.id
      });

      const match = await storage.createScheduledMatch(validatedData);
      res.status(201).json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid scheduled match data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create scheduled match" });
    }
  });

  app.get("/api/scheduled-matches/:id", async (req, res) => {
    try {
      const match = await storage.getScheduledMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }
      res.json(match);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scheduled match" });
    }
  });

  app.put("/api/scheduled-matches/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get existing match to check permissions
      const existingMatch = await storage.getScheduledMatch(req.params.id);
      if (!existingMatch) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }

      // Only the organizer or SuperAdmin can update
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (existingMatch.organizerId !== req.user!.id && !isSuperAdmin) {
        return res.status(403).json({ message: "Not authorized to update this match" });
      }

      const validatedData = insertScheduledMatchSchema.partial().parse(req.body);
      const match = await storage.updateScheduledMatch(req.params.id, validatedData);
      res.json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update scheduled match" });
    }
  });

  app.delete("/api/scheduled-matches/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get existing match to check permissions
      const existingMatch = await storage.getScheduledMatch(req.params.id);
      if (!existingMatch) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }

      // Only the organizer or SuperAdmin can delete
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (existingMatch.organizerId !== req.user!.id && !isSuperAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this match" });
      }

      await storage.deleteScheduledMatch(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete scheduled match" });
    }
  });

  // User management routes (SuperAdmin and Admin)
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user is superadmin or legacy admin
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      const isAdmin = req.user!.role === 'admin';
      
      if (!isSuperAdmin && !isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all users with their tournament-scoped roles
      const users = await storage.getAllUsers();
      const usersWithRoles = await Promise.all(
        users.map(async (user) => {
          const tournamentRoles = await storage.getAllUserTournamentRoles(user.id);
          return {
            ...user,
            tournamentRoles
          };
        })
      );

      res.json(usersWithRoles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id/role", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user is superadmin or legacy admin
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      const isAdmin = req.user!.role === 'admin';
      
      if (!isSuperAdmin && !isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      const targetUserId = req.params.id;

      // Verify target user exists
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only superadmin can modify superadmin users or assign superadmin role
      if (targetUser.role === 'superadmin' && !isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can modify superadmin users" });
      }

      if (role === 'superadmin' && !isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can assign superadmin role" });
      }

      // Prevent demoting the last superadmin
      if (targetUser.role === 'superadmin' && role !== 'superadmin') {
        const isOnly = await storage.isOnlySuperAdmin(targetUserId);
        if (isOnly) {
          return res.status(403).json({ message: "Cannot demote the last superadmin in the system" });
        }
      }

      const user = await storage.updateUserRole(targetUserId, role);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user is superadmin or legacy admin
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      const isAdmin = req.user!.role === 'admin';
      
      if (!isSuperAdmin && !isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;

      // Verify target user exists
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only superadmin can delete superadmin users
      if (targetUser.role === 'superadmin' && !isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can delete superadmin users" });
      }

      // Prevent deleting the last superadmin
      if (targetUser.role === 'superadmin') {
        const isOnly = await storage.isOnlySuperAdmin(targetUserId);
        if (isOnly) {
          return res.status(403).json({ message: "Cannot delete the last superadmin in the system" });
        }
      }

      await storage.deleteUser(targetUserId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Player tournaments
  app.get("/api/players/:id/tournaments", async (req, res) => {
    try {
      const tournaments = await storage.getPlayerTournaments(req.params.id);
      res.json(tournaments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player tournaments" });
    }
  });

  // Statistics and rankings
  app.get("/api/players/:id/stats", async (req, res) => {
    try {
      const { tournamentId } = req.query;
      const stats = await storage.getPlayerStats(req.params.id, tournamentId as string);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player stats" });
    }
  });

  app.get("/api/rankings/global", async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const rankings = await storage.getGlobalRankings(Number(limit));
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch global rankings" });
    }
  });

  app.get("/api/tournaments/:id/rankings", async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const rankings = await storage.getTournamentRankings(req.params.id, Number(limit));
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tournament rankings" });
    }
  });

  // Bracket generation
  app.post("/api/tournaments/:id/generate-brackets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check if user can manage this tournament - SuperAdmin or Tournament Admin only
      const canManage = await storage.canManageTournament(req.user!.id, req.params.id);
      if (!canManage) {
        return res.status(403).json({ message: "Only tournament admins and superadmins can generate brackets" });
      }

      const { force } = req.body;
      await storage.generateTournamentBrackets(req.params.id, force === true);
      
      res.json({ message: "Brackets generated successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to generate brackets" });
    }
  });

  // Excel Import endpoints
  app.post("/api/tournaments/:id/import/players", upload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tournamentId = req.params.id;
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      const canManage = await storage.canManageTournament(req.user!.id, tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Only tournament admins can import players" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Determine if it's singles or doubles based on columns
      const firstRow: any = data[0];
      const isDoubles = firstRow.hasOwnProperty('nombrePareja1') || firstRow.hasOwnProperty('nombrePareja2');
      
      const results = await storage.importPlayersFromExcel(tournamentId, data, isDoubles);
      
      res.json(results);
    } catch (error) {
      console.error("Error importing players:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to import players" });
    }
  });

  app.post("/api/tournaments/:id/import/matches", upload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tournamentId = req.params.id;
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      const canManage = await storage.canManageTournament(req.user!.id, tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Only tournament admins can import matches" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = await storage.importMatchesFromExcel(tournamentId, data);
      
      res.json(results);
    } catch (error) {
      console.error("Error importing matches:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to import matches" });
    }
  });

  app.get("/api/tournaments/import/templates/:type", async (req, res) => {
    try {
      const { type } = req.params;
      
      let templateData: any[] = [];
      let filename = '';

      if (type === 'players-singles') {
        templateData = [
          { nombre: 'Juan Pérez', categoria: 'intermedio' },
          { nombre: 'María García', categoria: 'avanzado' }
        ];
        filename = 'plantilla_jugadores_singles.xlsx';
      } else if (type === 'players-doubles') {
        templateData = [
          { nombrePareja1: 'Juan Pérez', nombrePareja2: 'Carlos López', categoria: 'intermedio' },
          { nombrePareja1: 'María García', nombrePareja2: 'Ana Rodríguez', categoria: 'avanzado' }
        ];
        filename = 'plantilla_jugadores_doubles.xlsx';
      } else if (type === 'matches-singles') {
        templateData = [
          { fecha: '2024-01-15', hora: '10:00', modalidad: 'Singles', jugador1: 'Juan Pérez', jugador2: 'Carlos López' },
          { fecha: '2024-01-15', hora: '11:30', modalidad: 'Singles', jugador1: 'María García', jugador2: 'Ana Rodríguez' }
        ];
        filename = 'plantilla_partidos_singles.xlsx';
      } else if (type === 'matches-doubles') {
        templateData = [
          { fecha: '2024-01-15', hora: '10:00', modalidad: 'Doubles', nombrePareja1: 'Juan Pérez', nombrePareja2: 'Carlos López', nombreRival1: 'Pedro Sánchez', nombreRival2: 'Luis Martínez' }
        ];
        filename = 'plantilla_partidos_doubles.xlsx';
      } else {
        return res.status(400).json({ message: "Invalid template type" });
      }

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(buffer);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "Failed to generate template" });
    }
  });

  // Multi-tenant role management
  app.post("/api/tournaments/:id/roles", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { userId, role } = req.body;
      const tournamentId = req.params.id;

      // Verify tournament exists
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // CRITICAL: Verify target user exists to prevent orphaned role assignments
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }

      // Check if assigner can assign this role in this tournament
      const canAssign = await storage.canAssignRole(req.user!.id, role, tournamentId);
      if (!canAssign) {
        return res.status(403).json({ message: "Insufficient permissions to assign this role" });
      }

      // Validate the role assignment data
      const roleData = insertTournamentUserRoleSchema.parse({
        tournamentId,
        userId,
        role,
        assignedBy: req.user!.id
      });

      const assignedRole = await storage.assignTournamentRole(roleData);
      res.status(201).json(assignedRole);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid role data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to assign role" });
    }
  });

  app.delete("/api/tournaments/:id/roles", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { userId, role } = req.body;
      const tournamentId = req.params.id;

      // Verify tournament exists
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check if user can manage roles in this tournament (must be superadmin or tournament_admin)
      const canManage = await storage.canManageTournament(req.user!.id, tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions to remove roles" });
      }

      await storage.removeTournamentRole(tournamentId, userId, role);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove role" });
    }
  });

  app.get("/api/tournaments/:id/roles", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tournamentId = req.params.id;

      // Verify tournament exists
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check if user can view roles (superadmin or tournament_admin)
      const canView = await storage.canManageTournament(req.user!.id, tournamentId);
      if (!canView) {
        return res.status(403).json({ message: "Insufficient permissions to view roles" });
      }

      const roles = await storage.getTournamentUserRoles(tournamentId);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tournament roles" });
    }
  });

  // Padel pairs routes
  app.post("/api/padel-pairs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const pairData = insertPadelPairSchema.parse({
        ...req.body,
        player1Id: req.user!.id
      });

      const pair = await storage.createPadelPair(pairData);
      res.status(201).json(pair);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid pair data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create padel pair" });
    }
  });

  app.get("/api/users/search-by-phone/:phone", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.findUserByPhone(req.params.phone);
      if (user) {
        // Only return minimal information to prevent PII exposure
        res.json({ id: user.id, name: user.name });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to search user" });
    }
  });

  app.get("/api/padel-pairs/by-player/:playerId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const pairs = await storage.getPadelPairsByPlayer(req.params.playerId);
      res.json(pairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch padel pairs" });
    }
  });

  // Modified tournament registration to handle padel pairs
  app.post("/api/tournaments/:id/register-with-pair", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { pairId } = req.body;
      
      // Verify pair ownership if pairId is provided
      if (pairId) {
        const pair = await storage.getPadelPair(pairId);
        if (!pair) {
          return res.status(404).json({ message: "Pair not found" });
        }
        if (pair.player1Id !== req.user!.id) {
          return res.status(403).json({ message: "You can only register with your own pairs" });
        }
        if (!pair.isActive) {
          return res.status(400).json({ message: "Pair is not active" });
        }
      }
      
      const registrationData = insertTournamentRegistrationSchema.parse({
        tournamentId: req.params.id,
        playerId: req.user!.id,
        pairId: pairId || null
      });

      const registration = await storage.registerPlayerForTournament(registrationData);
      res.status(201).json(registration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register for tournament" });
    }
  });

  // Match stats sessions endpoints
  app.post("/api/matches/:matchId/stats/start", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only admin and escribano can start stats sessions
      if (!["admin", "escribano"].includes(req.user!.role)) {
        return res.status(403).json({ message: "Only admin and escribano can capture statistics" });
      }

      // Check if there's already an active session
      const activeSession = await storage.getActiveStatsSession(req.params.matchId);
      if (activeSession) {
        return res.status(400).json({ message: "There is already an active stats session for this match" });
      }

      // Get match to determine sport
      const match = await storage.getMatch(req.params.matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Get tournament to get sport info
      const tournament = await storage.getTournament(match.tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      const sessionData: any = {
        matchId: req.params.matchId,
        startedBy: req.user!.id,
        sport: tournament.sport,
        status: "active",
        currentSet: 1,
        player1CurrentScore: "0",
        player2CurrentScore: "0",
        player1Sets: 0,
        player2Sets: 0
      };

      // Initialize Open IRT fields for racquetball
      if (tournament.sport === "racquetball") {
        sessionData.serverId = match.player1Id; // Player 1 starts serving
        sessionData.player1TimeoutsUsed = "[]";
        sessionData.player2TimeoutsUsed = "[]";
        sessionData.player1AppellationsUsed = "[]";
        sessionData.player2AppellationsUsed = "[]";
        sessionData.player1Technicals = 0;
        sessionData.player2Technicals = 0;
        sessionData.matchEndedByTechnical = false;
      }

      const validatedData = insertMatchStatsSessionSchema.parse(sessionData);
      const session = await storage.createStatsSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to start stats session" });
    }
  });

  app.get("/api/matches/:matchId/stats/active", async (req, res) => {
    try {
      const session = await storage.getActiveStatsSession(req.params.matchId);
      if (!session) {
        return res.status(404).json({ message: "No active stats session found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.get("/api/stats/sessions/:sessionId", async (req, res) => {
    try {
      const session = await storage.getStatsSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.put("/api/stats/sessions/:sessionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only admin and escribano can update sessions
      if (!["admin", "escribano"].includes(req.user!.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const session = await storage.updateStatsSession(req.params.sessionId, req.body);
      
      // Broadcast session update
      if (session && wsServer) {
        wsServer.broadcastToMatch(session.matchId, {
          type: "session_update",
          session
        });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.post("/api/stats/sessions/:sessionId/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const session = await storage.getStatsSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Stats session not found" });
      }

      // Get match to verify tournament
      const match = await storage.getMatch(session.matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Only SuperAdmin or Tournament Admin can complete sessions
      const canManage = await storage.canManageTournament(req.user!.id, match.tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions to complete stats sessions" });
      }

      const completedSession = await storage.completeStatsSession(req.params.sessionId);
      
      // Update match status to completed
      await storage.updateMatch(session.matchId, {
        status: "completed",
        player1Sets: completedSession.player1Sets || 0,
        player2Sets: completedSession.player2Sets || 0,
        player1Games: completedSession.player1Games || "[]",
        player2Games: completedSession.player2Games || "[]"
      });

      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete session" });
    }
  });

  // Match events endpoints
  app.post("/api/stats/sessions/:sessionId/events", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get session to verify existence and get match
      const session = await storage.getStatsSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Stats session not found" });
      }

      // Get match to verify tournament
      const match = await storage.getMatch(session.matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Only SuperAdmin or Tournament Admin can create events
      const canManage = await storage.canManageTournament(req.user!.id, match.tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions to create match events" });
      }

      const validatedData = insertMatchEventSchema.parse({
        sessionId: req.params.sessionId,
        ...req.body
      });

      const event = await storage.createMatchEvent(validatedData);
      
      // Broadcast event to match subscribers
      if (wsServer) {
        wsServer.broadcastToMatch(session.matchId, {
          type: "match_event",
          event,
          session
        });
      }
      
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get("/api/stats/sessions/:sessionId/events", async (req, res) => {
    try {
      const events = await storage.getSessionEvents(req.params.sessionId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get all completed stats sessions (admin/escribano only)
  app.get("/api/stats/sessions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!["admin", "escribano"].includes(req.user!.role)) {
        return res.status(403).json({ message: "Unauthorized - Admin or Escribano role required" });
      }

      const sessions = await storage.getAllStatsSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get aggregated player statistics from match events
  app.get("/api/stats/players", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const stats = await storage.getPlayersEventStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player stats" });
    }
  });

  // DISABLED: Share statistics endpoints - requires comprehensive authorization design
  // TODO: Re-implement with proper role-based ownership validation, token lifecycle, and tests
  // See: statShareTokens table schema and storage methods remain for future implementation



  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  wsServer = new MatchStatsWebSocketServer(httpServer);
  
  return httpServer;
}
