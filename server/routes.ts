import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTournamentSchema, updateTournamentSchema, insertCourtSchema, insertMatchSchema, updateMatchSchema, insertTournamentRegistrationSchema, insertPadelPairSchema, insertScheduledMatchSchema, updateScheduledMatchSchema, insertClubSchema, insertMatchStatsSessionSchema, insertMatchEventSchema, insertTournamentUserRoleSchema, excelPlayerSinglesSchema, excelPlayerDoublesSchema, excelMatchSinglesSchema, excelMatchDoublesSchema, updatePaymentStatusSchema } from "@shared/schema";
import { z } from "zod";
import { MatchStatsWebSocketServer } from "./websocket";
import multer from "multer";
import * as XLSX from "xlsx";
import { uploadProfilePhoto, downloadProfilePhoto, getProfilePhotoMetadata } from "./object-storage";

let wsServer: MatchStatsWebSocketServer;

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Configure multer for profile photo uploads with validation
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (validMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'));
    }
  }
});

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  app.get("/api/tournaments", async (req, res) => {
    try {
      // Public access: For unauthenticated users or during registration
      // we return ALL tournaments so they can choose one
      const allTournaments = await storage.getAllTournaments();
      
      // Filter out draft tournaments for non-admins to avoid confusion
      let isSuperAdmin = false;
      if (req.isAuthenticated()) {
        isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      }

      const filteredTournaments = isSuperAdmin 
        ? allTournaments 
        : allTournaments.filter(t => t.status !== 'draft');

      console.log(`[TOURNAMENTS] Returning ${filteredTournaments.length} tournaments (Auth: ${!!req.user})`);
      
      res.setHeader('Cache-Control', 'no-store');
      res.json(filteredTournaments);
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

  app.post("/api/tournaments/:id/reset", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const existingTournament = await storage.getTournament(req.params.id);
      if (!existingTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      const canManage = await storage.canManageTournament(req.user!.id, req.params.id);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const result = await storage.resetTournamentPlayersAndMatches(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to reset tournament" });
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

  app.patch("/api/tournaments/:tournamentId/registrations/:playerId/payment", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { tournamentId, playerId } = req.params;

      const canManage = await storage.canManageTournament(req.user!.id, tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = updatePaymentStatusSchema.parse(req.body);
      
      const registration = await storage.updatePaymentStatus(
        tournamentId,
        playerId,
        data.paymentStatus,
        req.user!.id,
        data.paymentNotes
      );
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      res.json(registration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update payment status" });
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
  app.patch("/api/tournaments/:id/players/:playerId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id: tournamentId, playerId } = req.params;

      // Verify permission to manage tournament
      const canManage = await storage.canManageTournament(req.user!.id, tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Verify player is registered in tournament
      const registration = await storage.getTournamentRegistration(tournamentId, playerId);
      if (!registration) {
        return res.status(404).json({ message: "Player not registered in tournament" });
      }

      const updateSchema = z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        photoUrl: z.string().optional().nullable(),
        nationality: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        club: z.string().optional().nullable(),
        role: z.enum(["superadmin", "admin", "jugador", "organizador", "arbitro", "escrutador", "escribano"]).optional(),
        categories: z.array(z.enum(["PRO_SINGLES_IRT","DOBLES_OPEN","AMATEUR_A","AMATEUR_B","AMATEUR_C","PRINCIPIANTES","JUVENIL_18_VARONIL","JUVENIL_18_FEMENIL","DOBLES_AB","DOBLES_BC","MASTER_35","MASTER_55","DOBLES_MASTER_35"])).max(3).optional().nullable()
      });

      const validatedData = updateSchema.parse(req.body);
      const updatedUser = await storage.updateUserPartial(playerId, validatedData);

      res.json({ message: "Player updated", user: updatedUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update player" });
    }
  });

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

  // Match routes - Get all matches for a tournament (public, no auth required)
  app.get("/api/tournaments/:id/matches", async (req, res) => {
    try {
      const matches = await storage.getTournamentMatches(req.params.id);
      // Return all matches without any role-based filtering
      res.json(matches || []);
    } catch (error) {
      console.error("Error fetching tournament matches:", error);
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

      const validatedData = updateMatchSchema.parse(req.body);
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

  // Scheduled matches routes (calendar) - Tournament scoped
  app.get("/api/tournaments/:tournamentId/scheduled-matches", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { tournamentId } = req.params;
      const { date } = req.query;

      // Verify tournament exists
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check user access: SuperAdmin, Tournament Admin, Organizer can see all
      // Players only see their own matches
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      const userRoles = await storage.getUserTournamentRoles(req.user!.id, tournamentId);
      const canManageAll = isSuperAdmin || userRoles.includes('tournament_admin') || userRoles.includes('organizador');

      let matches;
      if (date) {
        matches = await storage.getScheduledMatchesByTournamentAndDate(
          tournamentId, 
          new Date(date as string)
        );
      } else {
        matches = await storage.getScheduledMatchesByTournament(tournamentId);
      }

      // Filter for players - only show their matches
      if (!canManageAll) {
        matches = matches.filter(match => 
          match.player1Id === req.user!.id ||
          match.player2Id === req.user!.id ||
          match.player3Id === req.user!.id ||
          match.player4Id === req.user!.id
        );
      }

      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scheduled matches" });
    }
  });

  app.post("/api/tournaments/:tournamentId/scheduled-matches", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { tournamentId } = req.params;

      // Verify tournament exists
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Only SuperAdmin, Tournament Admin, and Organizers can create matches
      const canManage = await storage.canManageTournament(req.user!.id, tournamentId);
      const userRoles = await storage.getUserTournamentRoles(req.user!.id, tournamentId);
      
      if (!canManage && !userRoles.includes('organizador')) {
        return res.status(403).json({ message: "You don't have permission to create matches in this tournament" });
      }

      const validatedData = insertScheduledMatchSchema.parse({
        ...req.body,
        tournamentId,
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

  app.get("/api/scheduled-matches", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ message: "Date parameter required" });
      }

      // Parse date in UTC to avoid timezone issues
      const dateStr = date as string;
      const [year, month, day] = dateStr.split('-').map(Number);
      const searchDate = new Date(Date.UTC(year, month - 1, day));

      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      const allMatches = await storage.getScheduledMatchesByDate(searchDate);

      // SuperAdmins and admins see all matches
      if (isSuperAdmin || req.user!.role === 'admin') {
        return res.json(allMatches);
      }

      // Other users only see matches where they are participants
      const filteredMatches = allMatches.filter(match => {
        return match.player1Id === req.user!.id ||
               match.player2Id === req.user!.id ||
               match.player3Id === req.user!.id ||
               match.player4Id === req.user!.id;
      });

      res.json(filteredMatches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scheduled matches" });
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

  app.put("/api/tournaments/:tournamentId/scheduled-matches/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { tournamentId, id } = req.params;

      // Get existing match to check permissions
      const existingMatch = await storage.getScheduledMatch(id);
      if (!existingMatch) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }

      // Verify match belongs to this tournament
      if (existingMatch.tournamentId !== tournamentId) {
        return res.status(400).json({ message: "Match does not belong to this tournament" });
      }

      // Only SuperAdmin, Tournament Admin, and Organizers can update
      const canManage = await storage.canManageTournament(req.user!.id, tournamentId);
      const userRoles = await storage.getUserTournamentRoles(req.user!.id, tournamentId);
      
      if (!canManage && !userRoles.includes('organizador')) {
        return res.status(403).json({ message: "You don't have permission to update matches in this tournament" });
      }

      const validatedData = updateScheduledMatchSchema.parse(req.body);
      const match = await storage.updateScheduledMatch(id, validatedData);
      res.json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update scheduled match" });
    }
  });

  app.delete("/api/tournaments/:tournamentId/scheduled-matches/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { tournamentId, id } = req.params;

      // Get existing match to check permissions
      const existingMatch = await storage.getScheduledMatch(id);
      if (!existingMatch) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }

      // Verify match belongs to this tournament
      if (existingMatch.tournamentId !== tournamentId) {
        return res.status(400).json({ message: "Match does not belong to this tournament" });
      }

      // Only SuperAdmin, Tournament Admin, and Organizers can delete
      const canManage = await storage.canManageTournament(req.user!.id, tournamentId);
      const userRoles = await storage.getUserTournamentRoles(req.user!.id, tournamentId);
      
      if (!canManage && !userRoles.includes('organizador')) {
        return res.status(403).json({ message: "You don't have permission to delete matches in this tournament" });
      }

      await storage.deleteScheduledMatch(id);
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

  // Upload profile photo endpoint - supports both Object Storage (Replit) and Database storage (Render/other)
  // Also supports admin uploading for other users via targetUserId query parameter
  app.post("/api/media/profile-photo", (req, res) => {
    photoUpload.single('photo')(req, res, async (err) => {
      try {
        // Handle Multer errors explicitly
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({ message: "File size exceeds 5MB limit" });
            }
            return res.status(400).json({ message: `Upload error: ${err.message}` });
          }
          // Custom file filter error
          if (err.message.includes('Invalid file type')) {
            return res.status(400).json({ message: err.message });
          }
          console.error("Unexpected upload error:", err);
          return res.status(500).json({ message: "Unexpected error during upload" });
        }

        if (!req.isAuthenticated() || !req.user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Determine target user - allow admins to upload for other users
        let targetUserId = req.user.id;
        const queryTargetUserId = req.query.targetUserId as string | undefined;
        
        if (queryTargetUserId && queryTargetUserId !== req.user.id) {
          // Check if current user is admin/superadmin
          const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
          if (!isAdmin) {
            return res.status(403).json({ message: "Only admins can upload photos for other users" });
          }
          // Verify target user exists
          const targetUser = await storage.getUser(queryTargetUserId);
          if (!targetUser) {
            return res.status(404).json({ message: "Target user not found" });
          }
          targetUserId = queryTargetUserId;
        }

        // Check if Object Storage is available (Replit environment)
        const hasObjectStorage = !!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
        
        if (hasObjectStorage) {
          try {
            // Try Object Storage first
            const result = await uploadProfilePhoto(req.file, targetUserId);
            
            // Update user's photoUrl in database
            await storage.updateUserPartial(targetUserId, { photoUrl: result.url });
            
            return res.json({
              message: "Photo uploaded successfully",
              url: result.url,
              filename: result.filename,
              size: result.size
            });
          } catch (objectStorageError: any) {
            console.log("Object Storage failed, falling back to database storage:", objectStorageError.message);
          }
        }
        
        // Fallback: Store photo as base64 in database
        const base64Data = req.file.buffer.toString('base64');
        const photoUrl = `/api/media/db-photo/${targetUserId}`;
        
        await storage.updateUserPhoto(targetUserId, {
          photoUrl,
          photoData: base64Data,
          photoMimeType: req.file.mimetype
        });

        res.json({
          message: "Photo uploaded successfully",
          url: photoUrl,
          filename: `db-photo-${targetUserId}`,
          size: req.file.size
        });
      } catch (error: any) {
        console.error("Error uploading profile photo:", error);
        res.status(500).json({ message: error.message || "Failed to upload photo" });
      }
    });
  });

  // Serve profile photos from Object Storage
  app.get("/api/media/profile-photos/:filename(*)", async (req, res) => {
    try {
      const filename = decodeURIComponent(req.params.filename);
      
      // Get photo metadata and data
      const [metadata, photoData] = await Promise.all([
        getProfilePhotoMetadata(filename),
        downloadProfilePhoto(filename)
      ]);

      // Set appropriate headers
      res.set({
        'Content-Type': metadata.contentType,
        'Content-Length': metadata.size.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      });

      res.send(photoData);
    } catch (error: any) {
      console.error("Error serving profile photo:", error);
      res.status(404).json({ message: "Photo not found" });
    }
  });

  // Serve profile photos from database (fallback for Render/other environments)
  app.get("/api/media/db-photo/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const photoData = await storage.getUserPhotoData(userId);
      
      if (!photoData) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const buffer = Buffer.from(photoData.photoData, 'base64');
      
      res.set({
        'Content-Type': photoData.photoMimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      });

      res.send(buffer);
    } catch (error: any) {
      console.error("Error serving DB profile photo:", error);
      res.status(404).json({ message: "Photo not found" });
    }
  });

  // Update user profile (email, password, photo, nationality, categories)
  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const updateSchema = z.object({
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        currentPassword: z.string().optional(),
        photoUrl: z.string().optional().nullable(), // Allow relative URLs for uploaded photos
        nationality: z.string().optional().nullable(),
        categories: z.array(z.enum([
          "PRO_SINGLES_IRT",
          "DOBLES_OPEN",
          "AMATEUR_A",
          "AMATEUR_B",
          "AMATEUR_C",
          "PRINCIPIANTES",
          "JUVENIL_18_VARONIL",
          "JUVENIL_18_FEMENIL",
          "DOBLES_AB",
          "DOBLES_BC",
          "MASTER_35",
          "MASTER_55",
          "DOBLES_MASTER_35"
        ])).max(3, "Máximo 3 categorías permitidas").optional().nullable()
      }).refine(data => data.email || data.password || data.photoUrl !== undefined || data.nationality !== undefined || data.categories !== undefined, {
        message: "At least one field must be provided"
      });

      const validatedData = updateSchema.parse(req.body);

      // If updating password, verify current password
      if (validatedData.password && validatedData.currentPassword) {
        const isValid = await storage.verifyPassword(req.user!.id, validatedData.currentPassword);
        if (!isValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      const updatedUser = await storage.updateUserProfile(req.user!.id, {
        email: validatedData.email,
        password: validatedData.password,
        photoUrl: validatedData.photoUrl,
        nationality: validatedData.nationality,
        categories: validatedData.categories as any
      });

      res.json({ 
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          username: updatedUser.username,
          photoUrl: updatedUser.photoUrl,
          nationality: updatedUser.nationality,
          categories: updatedUser.categories
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
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
      const { limit = 50, category } = req.query;
      const rankings = await storage.getGlobalRankings(Number(limit), category ? String(category) : undefined);
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch global rankings" });
    }
  });

  app.get("/api/tournaments/:id/rankings", async (req, res) => {
    try {
      const { limit = 50, category } = req.query;
      const rankings = await storage.getTournamentRankings(req.params.id, Number(limit), category ? String(category) : undefined);
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

      // Validate file is not empty
      if (!data || data.length === 0) {
        return res.status(400).json({ 
          message: "El archivo Excel está vacío. Por favor agrega datos a la plantilla antes de importar." 
        });
      }

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

      // Validate file is not empty
      if (!data || data.length === 0) {
        return res.status(400).json({ 
          message: "El archivo Excel está vacío. Por favor agrega datos a la plantilla antes de importar." 
        });
      }

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
          { nombre: 'Juan Pérez', categoria: 'PRO Singles IRT' },
          { nombre: 'María García', categoria: 'Amateur A' }
        ];
        filename = 'plantilla_jugadores_singles.xlsx';
      } else if (type === 'players-doubles') {
        templateData = [
          { nombrePareja1: 'Juan Pérez', nombrePareja2: 'Carlos López', categoria: 'Dobles Open' },
          { nombrePareja1: 'María García', nombrePareja2: 'Ana Rodríguez', categoria: 'Dobles AB' }
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

  // Get current user's roles in a tournament
  app.get("/api/tournaments/:id/my-roles", async (req, res) => {
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

      // Get roles for current user
      const roles = await storage.getUserTournamentRoles(req.user!.id, tournamentId);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user roles" });
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

      // Get match to determine tournament
      const match = await storage.getMatch(req.params.matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Get tournament to get sport info
      const tournament = await storage.getTournament(match.tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check authorization: global roles or tournament-specific roles
      const allowedGlobalRoles = ["superadmin", "admin"];
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      const hasGlobalPermission = isSuperAdmin || allowedGlobalRoles.includes(req.user!.role);

      if (!hasGlobalPermission) {
        // Check tournament-specific roles
        const tournamentRoles = await storage.getUserTournamentRoles(req.user!.id, match.tournamentId);
        const allowedTournamentRoles = ["tournament_admin", "organizador", "arbitro", "escrutador"];
        const hasTournamentPermission = tournamentRoles.some(role => allowedTournamentRoles.includes(role));

        if (!hasTournamentPermission) {
          return res.status(403).json({ message: "Insufficient permissions to capture statistics" });
        }
      }

      // Check if there's already an active session
      const activeSession = await storage.getActiveStatsSession(req.params.matchId);
      if (activeSession) {
        return res.status(400).json({ message: "There is already an active stats session for this match" });
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
        // Get coin flip winner from request body (defaults to player1 if not provided)
        const coinFlipWinner = req.body.coinFlipWinner || match.player1Id;
        sessionData.serverId = coinFlipWinner; // Coin flip winner starts serving Set 1
        sessionData.coinFlipWinner = coinFlipWinner; // Track who won the coin flip
        sessionData.initialServers = JSON.stringify([coinFlipWinner]); // Track initial server for each set
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

      // Get session to verify existence and get match
      const session = await storage.getStatsSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Stats session not found" });
      }

      // Prevent modifications to completed sessions
      if (session.status === "completed") {
        return res.status(400).json({ message: "Cannot update a completed session" });
      }

      // Get match to verify tournament
      const match = await storage.getMatch(session.matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Only the user who started the session or SuperAdmin/Tournament Admin can update sessions
      const isStartedByUser = session.startedBy === req.user!.id;
      const canManage = await storage.canManageTournament(req.user!.id, match.tournamentId);
      if (!isStartedByUser && !canManage) {
        return res.status(403).json({ message: "Solo el usuario que inició la captura de estadísticas puede modificar esta sesión" });
      }

      const updatedSession = await storage.updateStatsSession(req.params.sessionId, req.body);
      
      // Broadcast session update
      if (updatedSession && wsServer) {
        wsServer.broadcastToMatch(updatedSession.matchId, {
          type: "session_update",
          session: updatedSession
        });
      }
      
      res.json(updatedSession);
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

      // Only the user who started the session or SuperAdmin/Tournament Admin can complete sessions
      const isStartedByUser = session.startedBy === req.user!.id;
      const canManage = await storage.canManageTournament(req.user!.id, match.tournamentId);
      if (!isStartedByUser && !canManage) {
        return res.status(403).json({ message: "Solo el usuario que inició la captura de estadísticas puede finalizar esta sesión" });
      }

      const completedSession = await storage.completeStatsSession(req.params.sessionId);
      
      // Determine winner and update match status
      const matchWinner = completedSession.matchWinner;
      const player1Won = matchWinner === match.player1Id;
      const player2Won = matchWinner === match.player2Id;
      
      await storage.updateMatch(session.matchId, {
        status: "completed",
        player1Sets: completedSession.player1Sets || 0,
        player2Sets: completedSession.player2Sets || 0,
        player1Games: completedSession.player1Games || "[]",
        player2Games: completedSession.player2Games || "[]",
        winnerId: matchWinner || null
      });

      // Helper function to update player stats (both tournament and global)
      const updatePlayerStatsForMatch = async (
        playerId: string,
        won: boolean,
        lost: boolean,
        setsWon: number,
        setsLost: number
      ) => {
        const isSingles = match.matchType === 'singles';
        
        // Update tournament stats
        const tournamentStatsArray = await storage.getPlayerStats(playerId, match.tournamentId);
        const tournamentStats = tournamentStatsArray[0] || {
          matchesPlayed: 0, matchesWon: 0, matchesLost: 0,
          singlesPlayed: 0, singlesWon: 0, singlesLost: 0,
          doublesPlayed: 0, doublesWon: 0, doublesLost: 0,
          setsWon: 0, setsLost: 0
        };
        
        await storage.updatePlayerStats(playerId, match.tournamentId, {
          matchesPlayed: tournamentStats.matchesPlayed + 1,
          matchesWon: tournamentStats.matchesWon + (won ? 1 : 0),
          matchesLost: tournamentStats.matchesLost + (lost ? 1 : 0),
          singlesPlayed: tournamentStats.singlesPlayed + (isSingles ? 1 : 0),
          singlesWon: tournamentStats.singlesWon + (isSingles && won ? 1 : 0),
          singlesLost: tournamentStats.singlesLost + (isSingles && lost ? 1 : 0),
          doublesPlayed: tournamentStats.doublesPlayed + (!isSingles ? 1 : 0),
          doublesWon: tournamentStats.doublesWon + (!isSingles && won ? 1 : 0),
          doublesLost: tournamentStats.doublesLost + (!isSingles && lost ? 1 : 0),
          setsWon: tournamentStats.setsWon + setsWon,
          setsLost: tournamentStats.setsLost + setsLost
        });
        
        // Update global stats (tournament_id = undefined for global stats)
        const globalStatsArray = await storage.getPlayerStats(playerId, undefined);
        const globalStats = globalStatsArray[0] || {
          matchesPlayed: 0, matchesWon: 0, matchesLost: 0,
          singlesPlayed: 0, singlesWon: 0, singlesLost: 0,
          doublesPlayed: 0, doublesWon: 0, doublesLost: 0,
          setsWon: 0, setsLost: 0, rankingPoints: 0
        };
        
        await storage.updatePlayerStats(playerId, undefined, {
          matchesPlayed: globalStats.matchesPlayed + 1,
          matchesWon: globalStats.matchesWon + (won ? 1 : 0),
          matchesLost: globalStats.matchesLost + (lost ? 1 : 0),
          singlesPlayed: globalStats.singlesPlayed + (isSingles ? 1 : 0),
          singlesWon: globalStats.singlesWon + (isSingles && won ? 1 : 0),
          singlesLost: globalStats.singlesLost + (isSingles && lost ? 1 : 0),
          doublesPlayed: globalStats.doublesPlayed + (!isSingles ? 1 : 0),
          doublesWon: globalStats.doublesWon + (!isSingles && won ? 1 : 0),
          doublesLost: globalStats.doublesLost + (!isSingles && lost ? 1 : 0),
          setsWon: globalStats.setsWon + setsWon,
          setsLost: globalStats.setsLost + setsLost
        });
      };

      // Update player statistics for player 1
      if (match.player1Id) {
        await updatePlayerStatsForMatch(
          match.player1Id,
          player1Won,
          player2Won,
          completedSession.player1Sets || 0,
          completedSession.player2Sets || 0
        );
      }

      // Update player statistics for player 2
      if (match.player2Id) {
        await updatePlayerStatsForMatch(
          match.player2Id,
          player2Won,
          player1Won,
          completedSession.player2Sets || 0,
          completedSession.player1Sets || 0
        );
      }

      // Update player statistics for player 3 (doubles only)
      if (match.player3Id && match.matchType === 'doubles') {
        await updatePlayerStatsForMatch(
          match.player3Id,
          player1Won,
          player2Won,
          completedSession.player1Sets || 0,
          completedSession.player2Sets || 0
        );
      }

      // Update player statistics for player 4 (doubles only)
      if (match.player4Id && match.matchType === 'doubles') {
        await updatePlayerStatsForMatch(
          match.player4Id,
          player2Won,
          player1Won,
          completedSession.player2Sets || 0,
          completedSession.player1Sets || 0
        );
      }

      // Calculate and assign IRT ranking points
      const tournament = await storage.getTournament(match.tournamentId);
      
      // Validate all required fields for IRT point calculation
      if (tournament && tournament.tier && match.round && match.matchType) {
        try {
          // Get IRT points configuration for this tier/matchType/round
          const pointsConfig = await storage.getIrtPointsConfig(
            tournament.tier,
            match.matchType,
            match.round
          );

          if (pointsConfig) {
            // Helper function to assign points to a player
            const assignPoints = async (playerId: string, won: boolean) => {
              // Points are awarded to winners based on the points config
              // Losers typically receive 0 points in most IRT rounds
              const points = won ? pointsConfig.points : 0;
              
              if (points > 0) {
                // Create ranking history record
                await storage.createPlayerRankingHistory({
                  playerId,
                  tournamentId: match.tournamentId,
                  matchId: match.id,
                  points,
                  tier: tournament.tier!,
                  round: match.round!,
                  matchType: match.matchType,
                  result: won ? 'won' : 'lost'
                });

                // Update global ranking points (tournamentId = undefined for global stats)
                const globalStatsArray = await storage.getPlayerStats(playerId, undefined);
                const globalStats = globalStatsArray[0];
                
                if (globalStats) {
                  await storage.updatePlayerStats(playerId, undefined, {
                    rankingPoints: (globalStats.rankingPoints || 0) + points
                  });
                }
              }
            };

            // Assign points to all players
            if (match.player1Id) {
              await assignPoints(match.player1Id, player1Won);
            }
            if (match.player2Id) {
              await assignPoints(match.player2Id, player2Won);
            }
            if (match.player3Id && match.matchType === 'doubles') {
              await assignPoints(match.player3Id, player1Won);
            }
            if (match.player4Id && match.matchType === 'doubles') {
              await assignPoints(match.player4Id, player2Won);
            }
          } else {
            // Log when points config is not found for this tier/round combination
            console.warn(`IRT points config not found for tier: ${tournament.tier}, matchType: ${match.matchType}, round: ${match.round}`);
          }
        } catch (error) {
          console.error('Error calculating IRT ranking points:', error);
          // Continue execution - don't fail the session completion if points calculation fails
        }
      } else {
        // Log why IRT points were not calculated
        if (!tournament) {
          console.warn('Tournament not found - IRT points not calculated');
        } else if (!tournament.tier) {
          console.log('Tournament has no tier assigned - IRT points not calculated');
        } else if (!match.round) {
          console.warn(`Match ${match.id} has no round assigned - IRT points not calculated`);
        } else if (!match.matchType) {
          console.warn(`Match ${match.id} has no matchType - IRT points not calculated`);
        }
      }

      // Broadcast match completion to WebSocket clients
      if (wsServer) {
        // Broadcast to stats capture clients
        wsServer.broadcastToMatch(session.matchId, {
          type: "match_completed",
          session: completedSession
        });
        // Broadcast to public display with full match data
        wsServer.broadcastMatchCompleted(session.matchId, completedSession);
      }

      res.json(completedSession);
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

      // Prevent modifications to completed sessions
      if (session.status === "completed") {
        return res.status(400).json({ message: "Cannot add events to a completed session" });
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
      
      const updatedSession = await storage.getStatsSession(req.params.sessionId);
      
      // Broadcast event to match subscribers
      if (wsServer) {
        wsServer.broadcastToMatch(session.matchId, {
          type: "match_event",
          event,
          session: updatedSession
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

  // Undo last event endpoint
  app.post("/api/stats/sessions/:sessionId/undo", async (req, res) => {
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

      // Only SuperAdmin or Tournament Admin can undo events
      const canManage = await storage.canManageTournament(req.user!.id, match.tournamentId);
      if (!canManage) {
        return res.status(403).json({ message: "Insufficient permissions to undo match events" });
      }

      const updatedSession = await storage.undoLastEvent(req.params.sessionId);
      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found or no events to undo" });
      }

      // Broadcast session update to match subscribers
      if (wsServer) {
        wsServer.broadcastToMatch(session.matchId, {
          type: "session_update",
          session: updatedSession
        });
      }

      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to undo event" });
    }
  });

  // Get all active stats sessions
  app.get("/api/stats/sessions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
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

  // IRT Ranking System Endpoints
  
  // Get global ranking (public endpoint, limited to top 100, emails hidden)
  app.get("/api/ranking/global", async (req, res) => {
    try {
      // Always limit to max 100 for performance and privacy
      const requestedLimit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const limit = Math.min(requestedLimit, 100);
      
      const ranking = await storage.getGlobalRanking(limit);
      
      // Remove emails completely for unauthenticated users (don't just set to undefined)
      const sanitizedRanking = ranking.map(player => {
        const { playerEmail, ...playerWithoutEmail } = player;
        return req.isAuthenticated() ? player : playerWithoutEmail;
      });
      
      res.json(sanitizedRanking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch global ranking" });
    }
  });

  // Get player ranking history
  app.get("/api/ranking/history/:playerId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tournamentId = req.query.tournamentId as string | undefined;
      const history = await storage.getPlayerRankingHistory(req.params.playerId, tournamentId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ranking history" });
    }
  });

  // Manually edit player ranking points (SuperAdmin only)
  app.post("/api/ranking/edit", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only SuperAdmin can manually edit points
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmins can manually edit ranking points" });
      }

      const { playerId, points, reason } = req.body;

      if (!playerId || points === undefined) {
        return res.status(400).json({ message: "playerId and points are required" });
      }

      // Get current global stats
      const globalStatsArray = await storage.getPlayerStats(playerId, undefined);
      const globalStats = globalStatsArray[0];

      if (!globalStats) {
        return res.status(404).json({ message: "Player stats not found" });
      }

      // Update ranking points
      const updatedStats = await storage.updatePlayerStats(playerId, undefined, {
        rankingPoints: (globalStats.rankingPoints || 0) + points
      });

      // Create history record for manual adjustment
      await storage.createPlayerRankingHistory({
        playerId,
        tournamentId: null,
        matchId: null,
        points,
        tier: null,
        round: null,
        matchType: null,
        result: 'manual_adjustment',
        notes: reason || 'Manual adjustment by SuperAdmin'
      });

      res.json(updatedStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to edit ranking points" });
    }
  });

  // ============ TOURNAMENT SPONSORS ============
  
  // Get tournament sponsors
  app.get("/api/tournaments/:tournamentId/sponsors", async (req, res) => {
    try {
      const sponsors = await storage.getTournamentSponsors(req.params.tournamentId);
      res.json(sponsors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sponsors" });
    }
  });

  // Create tournament sponsor (SuperAdmin and Tournament Admin only)
  app.post("/api/tournaments/:tournamentId/sponsors", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check permissions
      const isSuperAdmin = await storage.isSuperAdmin(req.user!.id);
      const canManage = await storage.canManageTournament(req.user!.id, req.params.tournamentId);

      if (!isSuperAdmin && !canManage) {
        return res.status(403).json({ message: "Only SuperAdmins and Tournament Admins can manage sponsors" });
      }

      const sponsor = await storage.createTournamentSponsor({
        ...req.body,
        tournamentId: req.params.tournamentId
      });

      res.json(sponsor);
    } catch (error) {
      res.status(500).json({ message: "Failed to create sponsor" });
    }
  });

  // Update sponsor (SuperAdmin and Tournament Admin only)
  app.patch("/api/sponsors/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // TODO: Add permission check for tournament admin
      const sponsor = await storage.updateTournamentSponsor(req.params.id, req.body);
      res.json(sponsor);
    } catch (error) {
      res.status(500).json({ message: "Failed to update sponsor" });
    }
  });

  // Delete sponsor (SuperAdmin and Tournament Admin only)
  app.delete("/api/sponsors/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // TODO: Add permission check for tournament admin
      await storage.deleteTournamentSponsor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sponsor" });
    }
  });

  // ============ PUBLIC DISPLAY ============
  
  // Get active matches for public display (no auth required)
  app.get("/api/tournaments/:tournamentId/active-matches", async (req, res) => {
    try {
      const matches = await storage.getActiveMatches(req.params.tournamentId);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active matches" });
    }
  });

  // Get all active matches across all tournaments (no auth required)
  app.get("/api/active-matches", async (req, res) => {
    try {
      const matches = await storage.getActiveMatches();
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active matches" });
    }
  });


  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  wsServer = new MatchStatsWebSocketServer(httpServer);
  
  return httpServer;
}
