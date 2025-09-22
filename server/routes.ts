import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTournamentSchema, updateTournamentSchema, insertCourtSchema, insertMatchSchema, insertTournamentRegistrationSchema, insertPadelPairSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Tournament routes
  app.get("/api/tournaments", async (req, res) => {
    try {
      const tournaments = await storage.getAllTournaments();
      res.json(tournaments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tournaments" });
    }
  });

  app.post("/api/tournaments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only admin or organizador can create tournaments
      if (!["admin", "organizador"].includes(req.user!.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
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
      res.status(500).json({ message: "Failed to create tournament" });
    }
  });

  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      res.json(tournament);
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

      // Only admin or tournament organizer can update
      if (req.user!.role !== "admin" && existingTournament.organizerId !== req.user!.id) {
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

      // Only admin or tournament organizer can delete
      if (req.user!.role !== "admin" && existingTournament.organizerId !== req.user!.id) {
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

      const players = await storage.getTournamentPlayers(req.params.id);
      
      // Only expose phone numbers to admin or tournament organizer
      const tournament = await storage.getTournament(req.params.id);
      const isAuthorizedForPII = req.user!.role === "admin" || 
                               (tournament && tournament.organizerId === req.user!.id);
      
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

      // Only admin or tournament organizer can register other players
      if (req.user!.role !== "admin" && tournament.organizerId !== req.user!.id) {
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

      // Only admin or tournament organizer can unregister other players
      if (req.user!.role !== "admin" && tournament.organizerId !== req.user!.id) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.unregisterPlayerFromTournament(req.params.id, req.params.playerId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to unregister player" });
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

  app.post("/api/matches", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertMatchSchema.parse(req.body);
      const match = await storage.createMatch(validatedData);
      res.status(201).json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid match data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  app.put("/api/matches/:id/result", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
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

  // User management routes (Admin only)
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id/role", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      const user = await storage.updateUserRole(req.params.id, role);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteUser(req.params.id);
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

      // Check if user can manage this tournament - admin or tournament organizer only
      const user = req.user as any;
      if (user.role !== "admin" && tournament.organizerId !== user.id) {
        return res.status(403).json({ message: "Only tournament organizers and admins can generate brackets" });
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


  // Endpoint temporal para debuggear login en producción
  app.post("/api/debug-login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Verificar que el usuario existe
      const user = await storage.getUserByEmail(email?.trim()?.toLowerCase());
      
      res.json({
        debug: true,
        userExists: !!user,
        email: email,
        normalizedEmail: email?.trim()?.toLowerCase(),
        userFound: user ? { id: user.id, email: user.email, role: user.role } : null,
        environment: process.env.NODE_ENV,
        hasSessionSecret: !!process.env.SESSION_SECRET,
        databaseUrl: process.env.DATABASE_URL ? "configured" : "missing"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, debug: true });
    }
  });

  // Endpoint público para verificar qué usuarios existen en la base de datos
  app.get("/api/debug-users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      res.json({
        debug: true,
        environment: process.env.NODE_ENV,
        userCount: users.length,
        users: users.map(u => ({ 
          id: u.id, 
          email: u.email, 
          username: u.username, 
          role: u.role,
          hasPassword: !!u.password,
          passwordFormat: u.password?.includes('.') ? 'hashed' : 'plaintext'
        })),
        hasSessionSecret: !!process.env.SESSION_SECRET,
        databaseUrl: process.env.DATABASE_URL ? "configured" : "missing"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, debug: true });
    }
  });

  // Endpoint temporal para arreglar el usuario admin corrupto
  app.post("/api/fix-admin-production", async (req, res) => {
    try {
      // Eliminar usuario admin corrupto con contraseña plaintext
      const corruptedAdmin = await storage.getUserByEmail('admin@gbsport.com');
      if (corruptedAdmin) {
        await storage.deleteUser(corruptedAdmin.id);
      }
      
      // Crear nuevo usuario admin con contraseña correctamente hasheada
      const newAdmin = await storage.createUser({
        username: 'admin',
        email: 'admin@gbsport.com',
        password: 'admin123',
        name: 'Administrador GBSport',
        club: 'GBSport',
        role: 'admin'
      });
      
      res.json({ 
        success: true, 
        message: 'Admin user fixed successfully',
        user: { id: newAdmin.id, email: newAdmin.email, role: newAdmin.role }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, debug: true });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
