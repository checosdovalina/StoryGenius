import { 
  users, tournaments, courts, matches, tournamentRegistrations, playerStats,
  type User, type InsertUser, type Tournament, type InsertTournament,
  type Court, type InsertCourt, type Match, type InsertMatch,
  type TournamentRegistration, type InsertTournamentRegistration,
  type PlayerStats, type InsertPlayerStats
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, count, avg, sum, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  // Tournament management
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getTournament(id: string): Promise<Tournament | undefined>;
  getTournamentsByOrganizer(organizerId: string): Promise<Tournament[]>;
  getAllTournaments(): Promise<Tournament[]>;
  updateTournament(id: string, updates: Partial<InsertTournament>): Promise<Tournament>;
  deleteTournament(id: string): Promise<void>;

  // Tournament registrations
  registerPlayerForTournament(registration: InsertTournamentRegistration): Promise<TournamentRegistration>;
  getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]>;
  getTournamentPlayers(tournamentId: string): Promise<Array<Omit<User, 'password'> & { registeredAt: Date }>>;
  getPlayerTournaments(playerId: string): Promise<Tournament[]>;
  unregisterPlayerFromTournament(tournamentId: string, playerId: string): Promise<void>;
  
  // Bracket generation
  generateTournamentBrackets(tournamentId: string, forceRegenerate?: boolean): Promise<void>;

  // Court management
  createCourt(court: InsertCourt): Promise<Court>;
  getCourt(id: string): Promise<Court | undefined>;
  getAllCourts(): Promise<Court[]>;
  updateCourt(id: string, updates: Partial<InsertCourt>): Promise<Court>;
  deleteCourt(id: string): Promise<void>;

  // Match management
  createMatch(match: InsertMatch): Promise<Match>;
  getMatch(id: string): Promise<Match | undefined>;
  getTournamentMatches(tournamentId: string): Promise<Match[]>;
  getPlayerMatches(playerId: string): Promise<Match[]>;
  updateMatch(id: string, updates: Partial<InsertMatch>): Promise<Match>;
  recordMatchResult(id: string, result: {
    winnerId: string;
    player1Sets: number;
    player2Sets: number;
    player1Games: string;
    player2Games: string;
    duration?: number;
  }): Promise<Match>;

  // Statistics and rankings
  getPlayerStats(playerId: string, tournamentId?: string): Promise<PlayerStats[]>;
  updatePlayerStats(playerId: string, tournamentId: string | null, stats: Partial<InsertPlayerStats>): Promise<PlayerStats>;
  getGlobalRankings(limit?: number): Promise<PlayerStats[]>;
  getTournamentRankings(tournamentId: string, limit?: number): Promise<PlayerStats[]>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User management
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.name));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Tournament management
  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const [newTournament] = await db
      .insert(tournaments)
      .values(tournament)
      .returning();
    return newTournament;
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament || undefined;
  }

  async getTournamentsByOrganizer(organizerId: string): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.organizerId, organizerId))
      .orderBy(desc(tournaments.createdAt));
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt));
  }

  async updateTournament(id: string, updates: Partial<InsertTournament>): Promise<Tournament> {
    const [tournament] = await db
      .update(tournaments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tournaments.id, id))
      .returning();
    return tournament;
  }

  async deleteTournament(id: string): Promise<void> {
    await db.delete(tournaments).where(eq(tournaments.id, id));
  }

  // Tournament registrations
  async registerPlayerForTournament(registration: InsertTournamentRegistration): Promise<TournamentRegistration> {
    const [newRegistration] = await db
      .insert(tournamentRegistrations)
      .values(registration)
      .returning();
    return newRegistration;
  }

  async getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
    return await db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournamentId));
  }

  async getTournamentPlayers(tournamentId: string): Promise<Array<Omit<User, 'password'> & { registeredAt: Date }>> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        club: users.club,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Password field omitted for security
        registeredAt: tournamentRegistrations.registeredAt
      })
      .from(users)
      .innerJoin(tournamentRegistrations, eq(users.id, tournamentRegistrations.playerId))
      .where(eq(tournamentRegistrations.tournamentId, tournamentId))
      .orderBy(asc(tournamentRegistrations.registeredAt));
    
    return result;
  }

  async getPlayerTournaments(playerId: string): Promise<Tournament[]> {
    const result = await db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        description: tournaments.description,
        sport: tournaments.sport,
        format: tournaments.format,
        status: tournaments.status,
        venue: tournaments.venue,
        startDate: tournaments.startDate,
        endDate: tournaments.endDate,
        maxPlayers: tournaments.maxPlayers,
        registrationFee: tournaments.registrationFee,
        organizerId: tournaments.organizerId,
        createdAt: tournaments.createdAt,
        updatedAt: tournaments.updatedAt
      })
      .from(tournaments)
      .innerJoin(tournamentRegistrations, eq(tournaments.id, tournamentRegistrations.tournamentId))
      .where(eq(tournamentRegistrations.playerId, playerId))
      .orderBy(desc(tournaments.startDate));
    
    return result;
  }

  async unregisterPlayerFromTournament(tournamentId: string, playerId: string): Promise<void> {
    await db
      .delete(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.playerId, playerId)
        )
      );
  }

  // Bracket generation with safeguards
  async generateTournamentBrackets(tournamentId: string, forceRegenerate: boolean = false): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const players = await this.getTournamentPlayers(tournamentId);
    if (players.length < 2) throw new Error("At least 2 players required for brackets");

    // Check for existing matches and tournament status
    const existingMatches = await db.select().from(matches).where(eq(matches.tournamentId, tournamentId));
    
    if (existingMatches.length > 0 && !forceRegenerate) {
      // Check if any matches are in progress or completed
      const nonScheduledMatches = existingMatches.filter(match => 
        match.status === "in_progress" || match.status === "completed"
      );
      
      if (nonScheduledMatches.length > 0) {
        throw new Error(
          "Cannot regenerate brackets: some matches are already in progress or completed. " +
          "Use force regeneration if you're sure you want to reset all matches."
        );
      }

      // Check tournament status
      if (tournament.status === "active") {
        throw new Error(
          "Cannot regenerate brackets for active tournament without force flag. " +
          "This will reset all match data."
        );
      }
    }

    // Use transaction for atomic bracket regeneration
    await db.transaction(async (tx) => {
      // Clear existing matches
      await tx.delete(matches).where(eq(matches.tournamentId, tournamentId));

      // Generate new matches based on format
      let newMatches: any[] = [];
      if (tournament.format === "elimination") {
        newMatches = await this.generateEliminationBrackets(tournamentId, players);
      } else if (tournament.format === "round_robin") {
        newMatches = await this.generateRoundRobinMatches(tournamentId, players);
      } else if (tournament.format === "groups") {
        newMatches = await this.generateGroupMatches(tournamentId, players);
      }

      // Insert all matches in one operation
      if (newMatches.length > 0) {
        await tx.insert(matches).values(newMatches);
      }
    });
  }

  private async generateEliminationBrackets(tournamentId: string, players: Array<Omit<User, 'password'> & { registeredAt: Date }>): Promise<any[]> {
    // Shuffle players for random seeding
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Generate first round matches, handling odd number of players with bye
    const firstRoundMatches = [];
    let bracketPosition = 1;
    
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      if (i + 1 < shuffledPlayers.length) {
        // Regular match between two players
        firstRoundMatches.push({
          tournamentId,
          player1Id: shuffledPlayers[i].id,
          player2Id: shuffledPlayers[i + 1].id,
          round: "Round 1",
          bracketPosition: bracketPosition++,
          status: "scheduled" as const
        });
      } else {
        // Odd player gets a bye - automatically advances
        firstRoundMatches.push({
          tournamentId,
          player1Id: shuffledPlayers[i].id,
          player2Id: shuffledPlayers[i].id, // Self-match indicates bye
          round: "Round 1",
          bracketPosition: bracketPosition++,
          status: "completed" as const,
          winnerId: shuffledPlayers[i].id,
          player1Sets: 1,
          player2Sets: 0
        });
      }
    }

    return firstRoundMatches;
  }

  private async generateRoundRobinMatches(tournamentId: string, players: Array<Omit<User, 'password'> & { registeredAt: Date }>): Promise<any[]> {
    const roundRobinMatches = [];
    let matchNumber = 1;

    // Generate all possible combinations (each player plays every other player once)
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        roundRobinMatches.push({
          tournamentId,
          player1Id: players[i].id,
          player2Id: players[j].id,
          round: "Round Robin",
          bracketPosition: matchNumber++,
          status: "scheduled" as const
        });
      }
    }

    return roundRobinMatches;
  }

  private async generateGroupMatches(tournamentId: string, players: Array<Omit<User, 'password'> & { registeredAt: Date }>): Promise<any[]> {
    // For groups format, divide players into groups of 4
    const groupSize = 4;
    const numberOfGroups = Math.ceil(players.length / groupSize);
    
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const groupMatches = [];
    let matchNumber = 1;

    for (let group = 0; group < numberOfGroups; group++) {
      const groupStart = group * groupSize;
      const groupEnd = Math.min(groupStart + groupSize, shuffledPlayers.length);
      const groupPlayers = shuffledPlayers.slice(groupStart, groupEnd);

      // Generate round robin within each group
      for (let i = 0; i < groupPlayers.length; i++) {
        for (let j = i + 1; j < groupPlayers.length; j++) {
          groupMatches.push({
            tournamentId,
            player1Id: groupPlayers[i].id,
            player2Id: groupPlayers[j].id,
            round: `Group ${String.fromCharCode(65 + group)}`, // Group A, Group B, etc.
            bracketPosition: matchNumber++,
            status: "scheduled" as const
          });
        }
      }
    }

    return groupMatches;
  }

  // Court management
  async createCourt(court: InsertCourt): Promise<Court> {
    const [newCourt] = await db
      .insert(courts)
      .values(court)
      .returning();
    return newCourt;
  }

  async getCourt(id: string): Promise<Court | undefined> {
    const [court] = await db.select().from(courts).where(eq(courts.id, id));
    return court || undefined;
  }

  async getAllCourts(): Promise<Court[]> {
    return await db.select().from(courts).orderBy(asc(courts.name));
  }

  async updateCourt(id: string, updates: Partial<InsertCourt>): Promise<Court> {
    const [court] = await db
      .update(courts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(courts.id, id))
      .returning();
    return court;
  }

  async deleteCourt(id: string): Promise<void> {
    await db.delete(courts).where(eq(courts.id, id));
  }

  // Match management
  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db
      .insert(matches)
      .values(match)
      .returning();
    return newMatch;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match || undefined;
  }

  async getTournamentMatches(tournamentId: string): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId))
      .orderBy(asc(matches.scheduledAt));
  }

  async getPlayerMatches(playerId: string): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(
        or(
          eq(matches.player1Id, playerId),
          eq(matches.player2Id, playerId)
        )
      )
      .orderBy(desc(matches.scheduledAt));
  }

  async updateMatch(id: string, updates: Partial<InsertMatch>): Promise<Match> {
    const [match] = await db
      .update(matches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(matches.id, id))
      .returning();
    return match;
  }

  async recordMatchResult(id: string, result: {
    winnerId: string;
    player1Sets: number;
    player2Sets: number;
    player1Games: string;
    player2Games: string;
    duration?: number;
  }): Promise<Match> {
    const [match] = await db
      .update(matches)
      .set({
        ...result,
        status: "completed",
        updatedAt: new Date()
      })
      .where(eq(matches.id, id))
      .returning();
    return match;
  }

  // Statistics and rankings
  async getPlayerStats(playerId: string, tournamentId?: string): Promise<PlayerStats[]> {
    if (tournamentId) {
      return await db
        .select()
        .from(playerStats)
        .where(
          and(
            eq(playerStats.playerId, playerId),
            eq(playerStats.tournamentId, tournamentId)
          )
        );
    } else {
      return await db
        .select()
        .from(playerStats)
        .where(eq(playerStats.playerId, playerId));
    }
  }

  async updatePlayerStats(playerId: string, tournamentId: string | null, stats: Partial<InsertPlayerStats>): Promise<PlayerStats> {
    const existing = await db
      .select()
      .from(playerStats)
      .where(
        and(
          eq(playerStats.playerId, playerId),
          tournamentId ? eq(playerStats.tournamentId, tournamentId) : isNull(playerStats.tournamentId)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(playerStats)
        .set({ ...stats, updatedAt: new Date() })
        .where(eq(playerStats.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(playerStats)
        .values({
          playerId,
          tournamentId,
          ...stats
        })
        .returning();
      return created;
    }
  }

  async getGlobalRankings(limit = 50): Promise<PlayerStats[]> {
    return await db
      .select()
      .from(playerStats)
      .where(isNull(playerStats.tournamentId))
      .orderBy(desc(playerStats.rankingPoints))
      .limit(limit);
  }

  async getTournamentRankings(tournamentId: string, limit = 50): Promise<PlayerStats[]> {
    return await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.tournamentId, tournamentId))
      .orderBy(desc(playerStats.matchesWon))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
