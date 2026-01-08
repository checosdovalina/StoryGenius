import { 
  users, tournaments, courts, matches, tournamentRegistrations, playerStats, padelPairs, scheduledMatches, clubs, matchStatsSessions, matchEvents, statShareTokens, tournamentUserRoles, irtPointsConfig, playerRankingHistory, tournamentSponsors,
  type User, type InsertUser, type Tournament, type InsertTournament,
  type Court, type InsertCourt, type Match, type InsertMatch,
  type TournamentRegistration, type InsertTournamentRegistration,
  type PlayerStats, type InsertPlayerStats, type PadelPair, type InsertPadelPair,
  type ScheduledMatch, type InsertScheduledMatch, type Club, type InsertClub,
  type MatchStatsSession, type InsertMatchStatsSession, type MatchEvent, type InsertMatchEvent,
  type StatShareToken, type InsertStatShareToken, type TournamentUserRole, type InsertTournamentUserRole,
  type IrtPointsConfig, type InsertIrtPointsConfig, type PlayerRankingHistory, type InsertPlayerRankingHistory,
  type TournamentSponsor, type InsertTournamentSponsor
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, count, avg, sum, isNull, isNotNull, gte, lte, between, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserProfile(id: string, data: any): Promise<User>;
  updateUserPartial(id: string, data: any): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  // Tournament management
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getTournament(id: string): Promise<Tournament | undefined>;
  getTournamentsByOrganizer(organizerId: string): Promise<Tournament[]>;
  getAllTournaments(): Promise<Tournament[]>;
  getUserTournaments(userId: string): Promise<Array<Tournament & { userAccess: { hasRole: boolean; roles: string[]; isPlayer: boolean } }>>;
  updateTournament(id: string, updates: Partial<InsertTournament>): Promise<Tournament>;
  deleteTournament(id: string): Promise<void>;

  // Tournament registrations
  registerPlayerForTournament(registration: InsertTournamentRegistration): Promise<TournamentRegistration>;
  getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]>;
  getTournamentRegistration(tournamentId: string, playerId: string): Promise<TournamentRegistration | undefined>;
  getTournamentPlayers(tournamentId: string): Promise<Array<Omit<User, 'password'> & { registeredAt: Date }>>;
  getPlayerTournaments(playerId: string): Promise<Tournament[]>;
  unregisterPlayerFromTournament(tournamentId: string, playerId: string): Promise<void>;
  
  // Bracket generation
  generateTournamentBrackets(tournamentId: string, forceRegenerate?: boolean): Promise<void>;

  // Padel pairs management
  createPadelPair(pair: InsertPadelPair): Promise<PadelPair>;
  getPadelPair(id: string): Promise<PadelPair | undefined>;
  getPadelPairsByPlayer(playerId: string): Promise<PadelPair[]>;
  updatePadelPairOnUserRegister(phone: string, userId: string): Promise<void>;
  findUserByPhone(phone: string): Promise<User | undefined>;

  // Club management
  createClub(club: InsertClub): Promise<Club>;
  getClub(id: string): Promise<Club | undefined>;
  getAllClubs(): Promise<Club[]>;
  updateClub(id: string, updates: Partial<InsertClub>): Promise<Club>;
  deleteClub(id: string): Promise<void>;

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
  deleteMatch(id: string): Promise<void>;
  recordMatchResult(id: string, result: {
    winnerId: string;
    player1Sets: number;
    player2Sets: number;
    player1Games: string;
    player2Games: string;
    duration?: number;
  }): Promise<Match>;

  // Scheduled matches management (calendar)
  createScheduledMatch(match: InsertScheduledMatch): Promise<ScheduledMatch>;
  getScheduledMatch(id: string): Promise<ScheduledMatch | undefined>;
  getAllScheduledMatches(): Promise<ScheduledMatch[]>;
  getScheduledMatchesByDate(date: Date): Promise<ScheduledMatch[]>;
  getScheduledMatchesByDateRange(startDate: Date, endDate: Date): Promise<ScheduledMatch[]>;
  getScheduledMatchesByCourt(courtId: string, date?: Date): Promise<ScheduledMatch[]>;
  getScheduledMatchesByOrganizer(organizerId: string): Promise<ScheduledMatch[]>;
  getScheduledMatchesByTournament(tournamentId: string): Promise<ScheduledMatch[]>;
  getScheduledMatchesByTournamentAndDate(tournamentId: string, date: Date): Promise<ScheduledMatch[]>;
  updateScheduledMatch(id: string, updates: Partial<InsertScheduledMatch>): Promise<ScheduledMatch>;
  deleteScheduledMatch(id: string): Promise<void>;

  // Excel import
  importPlayersFromExcel(tournamentId: string, data: any[], isDoubles: boolean): Promise<{ success: number; errors: string[]; created: any[] }>;
  importMatchesFromExcel(tournamentId: string, data: any[]): Promise<{ success: number; errors: string[]; created: any[] }>;

  // Statistics and rankings
  getPlayerStats(playerId: string, tournamentId?: string): Promise<PlayerStats[]>;
  updatePlayerStats(playerId: string, tournamentId: string | null, stats: Partial<InsertPlayerStats>): Promise<PlayerStats>;
  getGlobalRankings(limit?: number): Promise<any[]>;
  getTournamentRankings(tournamentId: string, limit?: number, category?: string): Promise<any[]>;
  getRankingEntries(tournamentId?: string, limit?: number): Promise<any[]>;
  getPlayerMatchOutcomes(tournamentId?: string): Promise<any[]>;
  getPlayersEventStats(tournamentId?: string): Promise<any[]>;

  // Match stats sessions
  createStatsSession(session: InsertMatchStatsSession): Promise<MatchStatsSession>;
  getStatsSession(id: string): Promise<MatchStatsSession | undefined>;
  getActiveStatsSession(matchId: string): Promise<MatchStatsSession | undefined>;
  updateStatsSession(id: string, updates: Partial<InsertMatchStatsSession>): Promise<MatchStatsSession>;
  completeStatsSession(id: string): Promise<MatchStatsSession>;
  getAllStatsSessions(): Promise<StatsSessionSummary[]>;

  // Match events
  createMatchEvent(event: InsertMatchEvent): Promise<MatchEvent>;
  getSessionEvents(sessionId: string): Promise<MatchEvent[]>;
  getLatestMatchEvents(sessionId: string, limit: number): Promise<MatchEvent[]>;
  undoLastEvent(sessionId: string): Promise<MatchStatsSession | null>;

  // Player statistics from match events
  getPlayersEventStats(): Promise<any[]>;

  // IRT Ranking System
  getIrtPointsConfig(tier: string, matchType: string, round: string): Promise<IrtPointsConfig | undefined>;
  createPlayerRankingHistory(history: InsertPlayerRankingHistory): Promise<PlayerRankingHistory>;
  getPlayerRankingHistory(playerId: string, tournamentId?: string): Promise<PlayerRankingHistory[]>;
  getGlobalRanking(limit?: number): Promise<any[]>;

  // Stat share tokens
  createStatShareToken(ownerUserId: string, targetPlayerId: string, expiresAt?: Date): Promise<StatShareToken>;
  getStatShareToken(token: string): Promise<StatShareToken | undefined>;
  deleteStatShareToken(id: string): Promise<void>;
  getPlayerPublicStats(playerId: string): Promise<any>;

  // Multi-tenant authorization
  isSuperAdmin(userId: string): Promise<boolean>;
  getUserTournamentRoles(userId: string, tournamentId: string): Promise<string[]>;
  canManageTournament(userId: string, tournamentId: string): Promise<boolean>;
  canAssignRole(assignerId: string, targetRole: string, tournamentId: string): Promise<boolean>;
  assignTournamentRole(data: InsertTournamentUserRole): Promise<TournamentUserRole>;
  removeTournamentRole(tournamentId: string, userId: string, role: string): Promise<void>;
  getUserTournamentsByRole(userId: string, role?: string): Promise<Tournament[]>;
  getTournamentUserRoles(tournamentId: string): Promise<Array<TournamentUserRole & { user: User }>>;

  // Tournament sponsors
  createTournamentSponsor(sponsor: InsertTournamentSponsor): Promise<TournamentSponsor>;
  getTournamentSponsors(tournamentId: string): Promise<TournamentSponsor[]>;
  updateTournamentSponsor(id: string, updates: Partial<InsertTournamentSponsor>): Promise<TournamentSponsor>;
  deleteTournamentSponsor(id: string): Promise<void>;

  // Active matches for public display
  getActiveMatches(tournamentId?: string): Promise<any[]>;

  // Tournament reset
  resetTournamentPlayersAndMatches(tournamentId: string): Promise<{ playersRemoved: number; matchesRemoved: number }>;

  sessionStore: session.Store;
}

type PlayerSummary = {
  id: string;
  name: string;
  email: string;
};

export type StatsSessionSummary = MatchStatsSession & {
  match?: Match | null;
  tournament?: Tournament | null;
  player1?: PlayerSummary | null;
  player2?: PlayerSummary | null;
  player3?: PlayerSummary | null;
  player4?: PlayerSummary | null;
};

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
    // Hash password before saving
    const hashedPassword = await this.hashPassword(insertUser.password);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        email: insertUser.email.trim().toLowerCase(),
        username: insertUser.username.trim(),
        password: hashedPassword
      })
      .returning();
    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    const { scrypt, randomBytes } = await import("crypto");
    const { promisify } = await import("util");
    const scryptAsync = promisify(scrypt);
    
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
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

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const { scrypt } = await import("crypto");
    const { promisify } = await import("util");
    const scryptAsync = promisify(scrypt);

    const [hashedPassword, salt] = user.password.split(".");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return hashedPassword === buf.toString("hex");
  }

  async updateUserProfile(id: string, data: { 
    email?: string; 
    password?: string;
    photoUrl?: string | null;
    nationality?: string | null;
    categories?: string[] | null;
  }): Promise<User> {
    const updates: any = { updatedAt: new Date() };
    
    if (data.email) {
      updates.email = data.email.trim().toLowerCase();
    }
    
    if (data.password) {
      updates.password = await this.hashPassword(data.password);
    }

    if (data.photoUrl !== undefined) {
      updates.photoUrl = data.photoUrl;
    }

    if (data.nationality !== undefined) {
      updates.nationality = data.nationality;
    }

    if (data.categories !== undefined) {
      updates.categories = data.categories;
    }

    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPartial(id: string, data: any): Promise<User> {
    const updates: any = { updatedAt: new Date() };
    
    if (data.name !== undefined) updates.name = data.name;
    if (data.email !== undefined) updates.email = data.email.trim().toLowerCase();
    if (data.password !== undefined) updates.password = await this.hashPassword(data.password);
    if (data.photoUrl !== undefined) updates.photoUrl = data.photoUrl;
    if (data.nationality !== undefined) updates.nationality = data.nationality;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.club !== undefined) updates.club = data.club;
    if (data.role !== undefined) updates.role = data.role;
    if (data.categories !== undefined) updates.categories = data.categories;

    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async hashPassword(password: string): Promise<string> {
    const { scrypt, randomBytes } = await import("crypto");
    const { promisify } = await import("util");
    const scryptAsync = promisify(scrypt);
    
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
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

  async getUserTournaments(userId: string): Promise<Array<Tournament & { userAccess: { hasRole: boolean; roles: string[]; isPlayer: boolean } }>> {
    // Get tournaments where user has a role assigned
    const tournamentsWithRoles = await db
      .select({ 
        tournamentId: tournamentUserRoles.tournamentId,
        role: tournamentUserRoles.role 
      })
      .from(tournamentUserRoles)
      .where(eq(tournamentUserRoles.userId, userId));
    
    // Get tournaments where user is registered as a player
    const tournamentsAsPlayer = await db
      .selectDistinct({ tournamentId: tournamentRegistrations.tournamentId })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.playerId, userId));
    
    // Create a map of tournament access info
    const accessMap = new Map<string, { hasRole: boolean; roles: string[]; isPlayer: boolean }>();
    
    // Add role-based access
    for (const roleRecord of tournamentsWithRoles) {
      if (!accessMap.has(roleRecord.tournamentId)) {
        accessMap.set(roleRecord.tournamentId, { hasRole: true, roles: [], isPlayer: false });
      }
      accessMap.get(roleRecord.tournamentId)!.roles.push(roleRecord.role);
    }
    
    // Add player-based access
    for (const playerRecord of tournamentsAsPlayer) {
      if (!accessMap.has(playerRecord.tournamentId)) {
        accessMap.set(playerRecord.tournamentId, { hasRole: false, roles: [], isPlayer: true });
      } else {
        accessMap.get(playerRecord.tournamentId)!.isPlayer = true;
      }
    }
    
    // Get all unique tournament IDs
    const uniqueTournamentIds = Array.from(accessMap.keys());
    
    // If no tournaments found, return empty array
    if (uniqueTournamentIds.length === 0) {
      return [];
    }
    
    // Fetch tournament details
    const userTournaments = await db
      .select()
      .from(tournaments)
      .where(sql`${tournaments.id} IN ${sql.raw(`(${uniqueTournamentIds.map(id => `'${id}'`).join(',')})`)}`)
      .orderBy(desc(tournaments.createdAt));
    
    // Add access info to each tournament
    return userTournaments.map(tournament => ({
      ...tournament,
      userAccess: accessMap.get(tournament.id)!
    }));
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
    // Delete in cascade order to avoid foreign key constraint violations
    await db.delete(matchStatsSessions).where(
      sql`match_id IN (SELECT id FROM matches WHERE tournament_id = ${id})`
    );
    await db.delete(matchEvents).where(
      sql`session_id IN (SELECT id FROM match_stats_sessions WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = ${id}))`
    );
    await db.delete(matches).where(eq(matches.tournamentId, id));
    await db.delete(scheduledMatches).where(eq(scheduledMatches.tournamentId, id));
    await db.delete(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, id));
    await db.delete(playerStats).where(eq(playerStats.tournamentId, id));
    await db.delete(tournamentUserRoles).where(eq(tournamentUserRoles.tournamentId, id));
    await db.delete(tournamentSponsors).where(eq(tournamentSponsors.tournamentId, id));
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

  async getTournamentRegistration(tournamentId: string, playerId: string): Promise<TournamentRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(tournamentRegistrations)
      .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), eq(tournamentRegistrations.playerId, playerId)));
    return registration || undefined;
  }

  async getTournamentPlayers(tournamentId: string): Promise<Array<Omit<User, 'password'> & { registeredAt: Date }>> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        phone: users.phone,
        club: users.club,
        role: users.role,
        preferredSport: users.preferredSport,
        padelCategory: users.padelCategory,
        racquetballLevel: users.racquetballLevel,
        categories: users.categories,
        photoUrl: users.photoUrl,
        nationality: users.nationality,
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
        clubId: tournaments.clubId,
        tier: tournaments.tier,
        prizePool: tournaments.prizePool,
        startDate: tournaments.startDate,
        endDate: tournaments.endDate,
        maxPlayers: tournaments.maxPlayers,
        registrationFee: tournaments.registrationFee,
        organizerId: tournaments.organizerId,
        timezone: tournaments.timezone,
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

  // Padel pairs management
  async createPadelPair(pair: InsertPadelPair): Promise<PadelPair> {
    const [newPair] = await db
      .insert(padelPairs)
      .values(pair)
      .returning();
    return newPair;
  }

  async getPadelPair(id: string): Promise<PadelPair | undefined> {
    const [pair] = await db
      .select()
      .from(padelPairs)
      .where(eq(padelPairs.id, id))
      .limit(1);
    return pair;
  }

  async getPadelPairsByPlayer(playerId: string): Promise<PadelPair[]> {
    const pairs = await db
      .select()
      .from(padelPairs)
      .where(
        and(
          or(
            eq(padelPairs.player1Id, playerId),
            eq(padelPairs.player2Id, playerId)
          ),
          eq(padelPairs.isActive, true)
        )
      );
    return pairs;
  }

  async updatePadelPairOnUserRegister(phone: string, userId: string): Promise<void> {
    await db
      .update(padelPairs)
      .set({ 
        player2Id: userId,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(padelPairs.player2Phone, phone),
          isNull(padelPairs.player2Id)
        )
      );
  }

  async findUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    return user;
  }

  // Club management
  async createClub(club: InsertClub): Promise<Club> {
    const [newClub] = await db
      .insert(clubs)
      .values(club)
      .returning();
    return newClub;
  }

  async getClub(id: string): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club || undefined;
  }

  async getAllClubs(): Promise<Club[]> {
    return await db.select().from(clubs).orderBy(asc(clubs.name));
  }

  async updateClub(id: string, updates: Partial<InsertClub>): Promise<Club> {
    const [club] = await db
      .update(clubs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clubs.id, id))
      .returning();
    return club;
  }

  async deleteClub(id: string): Promise<void> {
    await db.delete(clubs).where(eq(clubs.id, id));
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

  async deleteMatch(id: string): Promise<void> {
    await db.delete(matches).where(eq(matches.id, id));
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

  // Scheduled matches management (calendar)
  async createScheduledMatch(match: InsertScheduledMatch): Promise<ScheduledMatch> {
    const [newMatch] = await db
      .insert(scheduledMatches)
      .values(match)
      .returning();
    return newMatch;
  }

  async getScheduledMatch(id: string): Promise<ScheduledMatch | undefined> {
    const [match] = await db.select().from(scheduledMatches).where(eq(scheduledMatches.id, id));
    return match || undefined;
  }

  async getAllScheduledMatches(): Promise<ScheduledMatch[]> {
    return await db
      .select()
      .from(scheduledMatches)
      .orderBy(asc(scheduledMatches.scheduledDate));
  }

  async getScheduledMatchesByDate(date: Date): Promise<ScheduledMatch[]> {
    // Expand search range to cover all timezones (UTC-12 to UTC+14)
    // This ensures we catch matches that fall on the selected date in any tournament's timezone
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const startOfDay = new Date(`${dateStr}T00:00:00Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59Z`);
    
    // Expand by 14 hours before and 12 hours after to cover all possible timezones
    const expandedStart = new Date(startOfDay.getTime() - (14 * 60 * 60 * 1000));
    const expandedEnd = new Date(endOfDay.getTime() + (12 * 60 * 60 * 1000));

    // Get scheduled matches from scheduled_matches table
    const scheduled = await db
      .select()
      .from(scheduledMatches)
      .where(
        and(
          gte(scheduledMatches.scheduledDate, expandedStart),
          lte(scheduledMatches.scheduledDate, expandedEnd)
        )
      )
      .orderBy(asc(scheduledMatches.scheduledDate));

    // Get matches from matches table with scheduled_at and their tournaments
    const tournamentMatches = await db
      .select({
        match: matches,
        tournament: tournaments,
        player1: users,
        player2: {
          id: sql<string>`p2.id`,
          name: sql<string>`p2.name`,
        },
        player3: {
          id: sql<string | null>`p3.id`,
          name: sql<string | null>`p3.name`,
        },
        player4: {
          id: sql<string | null>`p4.id`,
          name: sql<string | null>`p4.name`,
        }
      })
      .from(matches)
      .leftJoin(tournaments, eq(matches.tournamentId, tournaments.id))
      .leftJoin(users, eq(matches.player1Id, users.id))
      .leftJoin(sql`users as p2`, sql`${matches.player2Id} = p2.id`)
      .leftJoin(sql`users as p3`, sql`${matches.player3Id} = p3.id`)
      .leftJoin(sql`users as p4`, sql`${matches.player4Id} = p4.id`)
      .where(
        and(
          isNotNull(matches.scheduledAt),
          gte(matches.scheduledAt, expandedStart),
          lte(matches.scheduledAt, expandedEnd)
        )
      )
      .orderBy(asc(matches.scheduledAt));

    // Map tournament matches to ScheduledMatch format and filter by tournament timezone
    const mappedMatches: ScheduledMatch[] = tournamentMatches
      .filter((row) => {
        if (!row.tournament || !row.match.scheduledAt) return false;
        
        // Format the match date in the tournament's timezone as YYYY-MM-DD
        const timezone = row.tournament.timezone || "America/Mexico_City";
        const localDateStr = formatInTimeZone(row.match.scheduledAt, timezone, 'yyyy-MM-dd');
        
        // Check if the match falls on the requested date in the tournament's timezone
        return localDateStr === dateStr;
      })
      .map((row) => ({
        id: row.match.id,
        title: row.match.round || "Partido",
        scheduledDate: row.match.scheduledAt!,
        sport: "racquetball" as const,
        matchType: row.match.matchType as "singles" | "doubles",
        courtId: row.match.courtId || "",
        duration: 90,
        player1Name: row.player1?.name || null,
        player2Name: row.player2?.name || null,
        player3Name: row.player3?.name || null,
        player4Name: row.player4?.name || null,
        player1Id: row.match.player1Id,
        player2Id: row.match.player2Id,
        player3Id: row.match.player3Id || null,
        player4Id: row.match.player4Id || null,
        tournamentId: row.match.tournamentId,
        organizerId: row.match.tournamentId,
        status: row.match.status === "completed" ? "completado" : 
                row.match.status === "in_progress" ? "en_curso" :
                row.match.status === "cancelled" ? "cancelado" : "programado",
        description: null,
        notes: null,
        createdAt: row.match.createdAt,
        updatedAt: row.match.updatedAt
      }));

    // Combine both lists and sort by date
    const allMatches = [...scheduled, ...mappedMatches];
    allMatches.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    return allMatches;
  }

  async getScheduledMatchesByDateRange(startDate: Date, endDate: Date): Promise<ScheduledMatch[]> {
    return await db
      .select()
      .from(scheduledMatches)
      .where(
        and(
          gte(scheduledMatches.scheduledDate, startDate),
          lte(scheduledMatches.scheduledDate, endDate)
        )
      )
      .orderBy(asc(scheduledMatches.scheduledDate));
  }

  async getScheduledMatchesByCourt(courtId: string, date?: Date): Promise<ScheduledMatch[]> {
    let conditions = [eq(scheduledMatches.courtId, courtId)];
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      conditions.push(
        gte(scheduledMatches.scheduledDate, startOfDay),
        lte(scheduledMatches.scheduledDate, endOfDay)
      );
    }

    return await db
      .select()
      .from(scheduledMatches)
      .where(and(...conditions))
      .orderBy(asc(scheduledMatches.scheduledDate));
  }

  async getScheduledMatchesByOrganizer(organizerId: string): Promise<ScheduledMatch[]> {
    return await db
      .select()
      .from(scheduledMatches)
      .where(eq(scheduledMatches.organizerId, organizerId))
      .orderBy(desc(scheduledMatches.scheduledDate));
  }

  async getScheduledMatchesByTournament(tournamentId: string): Promise<ScheduledMatch[]> {
    // Get scheduled matches
    const scheduled = await db
      .select()
      .from(scheduledMatches)
      .where(eq(scheduledMatches.tournamentId, tournamentId))
      .orderBy(asc(scheduledMatches.scheduledDate));

    // Get tournament matches with scheduled dates
    const tournamentMatches = await db
      .select({
        match: matches,
        player1: users,
        player2: {
          id: sql<string>`p2.id`,
          name: sql<string>`p2.name`,
        },
        player3: {
          id: sql<string | null>`p3.id`,
          name: sql<string | null>`p3.name`,
        },
        player4: {
          id: sql<string | null>`p4.id`,
          name: sql<string | null>`p4.name`,
        }
      })
      .from(matches)
      .leftJoin(users, eq(matches.player1Id, users.id))
      .leftJoin(sql`users as p2`, sql`${matches.player2Id} = p2.id`)
      .leftJoin(sql`users as p3`, sql`${matches.player3Id} = p3.id`)
      .leftJoin(sql`users as p4`, sql`${matches.player4Id} = p4.id`)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          isNotNull(matches.scheduledAt)
        )
      )
      .orderBy(asc(matches.scheduledAt));

    // Map tournament matches to ScheduledMatch format
    const mappedMatches: ScheduledMatch[] = tournamentMatches.map((row) => ({
      id: row.match.id,
      title: row.match.round || "Partido",
      scheduledDate: row.match.scheduledAt!,
      sport: "racquetball" as const,
      matchType: row.match.matchType as "singles" | "doubles",
      courtId: row.match.courtId || "", // Default empty if no court assigned
      duration: 90, // Default duration
      player1Name: row.player1?.name || null,
      player2Name: row.player2?.name || null,
      player3Name: row.player3?.name || null,
      player4Name: row.player4?.name || null,
      player1Id: row.match.player1Id,
      player2Id: row.match.player2Id,
      player3Id: row.match.player3Id || null,
      player4Id: row.match.player4Id || null,
      tournamentId: row.match.tournamentId,
      organizerId: row.match.tournamentId, // Use tournament as organizer fallback
      status: row.match.status === "completed" ? "completado" : 
              row.match.status === "in_progress" ? "en_curso" :
              row.match.status === "cancelled" ? "cancelado" : "programado",
      description: null,
      notes: null,
      createdAt: row.match.createdAt,
      updatedAt: row.match.updatedAt
    }));

    // Combine both lists and sort by date
    const allMatches = [...scheduled, ...mappedMatches];
    allMatches.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    return allMatches;
  }

  async getScheduledMatchesByTournamentAndDate(tournamentId: string, date: Date): Promise<ScheduledMatch[]> {
    // Get tournament to access its timezone
    const tournament = await this.getTournament(tournamentId);
    const timezone = tournament?.timezone || "America/Mexico_City";
    
    // Create date range in tournament's timezone
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const startOfDayLocal = `${dateString}T00:00:00`;
    const endOfDayLocal = `${dateString}T23:59:59`;
    
    // Convert to UTC for database query
    const startOfDay = fromZonedTime(startOfDayLocal, timezone);
    const endOfDay = fromZonedTime(endOfDayLocal, timezone);

    // Get scheduled matches
    const scheduled = await db
      .select()
      .from(scheduledMatches)
      .where(
        and(
          eq(scheduledMatches.tournamentId, tournamentId),
          gte(scheduledMatches.scheduledDate, startOfDay),
          lte(scheduledMatches.scheduledDate, endOfDay)
        )
      )
      .orderBy(asc(scheduledMatches.scheduledDate));

    // Get tournament matches with scheduled dates for this day
    const tournamentMatches = await db
      .select({
        match: matches,
        player1: users,
        player2: {
          id: sql<string>`p2.id`,
          name: sql<string>`p2.name`,
        },
        player3: {
          id: sql<string | null>`p3.id`,
          name: sql<string | null>`p3.name`,
        },
        player4: {
          id: sql<string | null>`p4.id`,
          name: sql<string | null>`p4.name`,
        }
      })
      .from(matches)
      .leftJoin(users, eq(matches.player1Id, users.id))
      .leftJoin(sql`users as p2`, sql`${matches.player2Id} = p2.id`)
      .leftJoin(sql`users as p3`, sql`${matches.player3Id} = p3.id`)
      .leftJoin(sql`users as p4`, sql`${matches.player4Id} = p4.id`)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          isNotNull(matches.scheduledAt),
          gte(matches.scheduledAt, startOfDay),
          lte(matches.scheduledAt, endOfDay)
        )
      )
      .orderBy(asc(matches.scheduledAt));

    // Map tournament matches to ScheduledMatch format
    const mappedMatches: ScheduledMatch[] = tournamentMatches.map((row) => ({
      id: row.match.id,
      title: row.match.round || "Partido",
      scheduledDate: row.match.scheduledAt!,
      sport: "racquetball" as const,
      matchType: row.match.matchType as "singles" | "doubles",
      courtId: row.match.courtId || "",
      duration: 90,
      player1Name: row.player1?.name || null,
      player2Name: row.player2?.name || null,
      player3Name: row.player3?.name || null,
      player4Name: row.player4?.name || null,
      player1Id: row.match.player1Id,
      player2Id: row.match.player2Id,
      player3Id: row.match.player3Id || null,
      player4Id: row.match.player4Id || null,
      tournamentId: row.match.tournamentId,
      organizerId: row.match.tournamentId,
      status: row.match.status === "completed" ? "completado" : 
              row.match.status === "in_progress" ? "en_curso" :
              row.match.status === "cancelled" ? "cancelado" : "programado",
      description: null,
      notes: null,
      createdAt: row.match.createdAt,
      updatedAt: row.match.updatedAt
    }));

    // Combine both lists and sort by date
    const allMatches = [...scheduled, ...mappedMatches];
    allMatches.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    return allMatches;
  }

  async updateScheduledMatch(id: string, updates: Partial<InsertScheduledMatch>): Promise<ScheduledMatch> {
    const [match] = await db
      .update(scheduledMatches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scheduledMatches.id, id))
      .returning();
    return match;
  }

  async deleteScheduledMatch(id: string): Promise<void> {
    await db.delete(scheduledMatches).where(eq(scheduledMatches.id, id));
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

  async getPlayerMatchOutcomes(tournamentId?: string): Promise<any[]> {
    // Build where condition
    const whereCondition = tournamentId
      ? and(eq(matches.status, "completed"), eq(matches.tournamentId, tournamentId))
      : eq(matches.status, "completed");
    
    // Get all completed matches
    const completedMatches = await db
      .select({
        id: matches.id,
        tournamentId: matches.tournamentId,
        matchType: matches.matchType,
        player1Id: matches.player1Id,
        player2Id: matches.player2Id,
        player3Id: matches.player3Id,
        player4Id: matches.player4Id,
        winnerId: matches.winnerId,
        duration: matches.duration
      })
      .from(matches)
      .where(whereCondition);
    
    // Aggregate wins/losses/duration per player
    const playerOutcomesMap = new Map<string, any>();
    
    completedMatches.forEach(match => {
      const playerIds = [
        match.player1Id,
        match.player2Id,
        match.player3Id,
        match.player4Id
      ].filter(Boolean) as string[];
      
      playerIds.forEach(playerId => {
        if (!playerOutcomesMap.has(playerId)) {
          playerOutcomesMap.set(playerId, {
            playerId,
            matchesWon: 0,
            matchesLost: 0,
            totalMatches: 0,
            totalDuration: 0
          });
        }
        
        const outcome = playerOutcomesMap.get(playerId);
        outcome.totalMatches++;
        
        if (match.winnerId) {
          // Determine if player won or lost
          const isTeamWin = match.matchType === "doubles"
            ? (match.player1Id === playerId || match.player3Id === playerId) && (match.winnerId === match.player1Id || match.winnerId === match.player3Id) ||
              (match.player2Id === playerId || match.player4Id === playerId) && (match.winnerId === match.player2Id || match.winnerId === match.player4Id)
            : match.winnerId === playerId;
          
          if (isTeamWin) {
            outcome.matchesWon++;
          } else {
            outcome.matchesLost++;
          }
        }
        
        if (match.duration) {
          outcome.totalDuration += match.duration;
        }
      });
    });
    
    return Array.from(playerOutcomesMap.values()).map(outcome => ({
      ...outcome,
      avgMatchDuration: outcome.totalMatches > 0 
        ? Math.round(outcome.totalDuration / outcome.totalMatches)
        : 0,
      winRate: outcome.totalMatches > 0
        ? Math.round((outcome.matchesWon / outcome.totalMatches) * 100)
        : 0
    }));
  }

  async getRankingEntries(tournamentId?: string, limit = 50, category?: string): Promise<any[]> {
    // Get event stats and match outcomes
    const [eventStats, matchOutcomes] = await Promise.all([
      this.getPlayersEventStats(tournamentId),
      this.getPlayerMatchOutcomes(tournamentId)
    ]);
    
    // Create maps for quick lookup
    const statsMap = new Map(eventStats.map(s => [s.playerId, s]));
    const outcomesMap = new Map(matchOutcomes.map(o => [o.playerId, o]));
    
    // Get all unique player IDs
    const allPlayerIds = new Set([
      ...eventStats.map(s => s.playerId),
      ...matchOutcomes.map(o => o.playerId)
    ]);

    if (allPlayerIds.size === 0) {
      console.log(`[IRT RANKING] No players with stats found`);
      return [];
    }
    
    // Get all active users and filter in memory
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        club: users.club,
        categories: users.categories
      })
      .from(users)
      .where(eq(users.isActive, true));
    
    // Filter to only users that have stats/outcomes
    const playerUsers = allUsers.filter(u => allPlayerIds.has(u.id));
    
    // Filter by category if specified
    const filteredPlayerUsers = category
      ? playerUsers.filter(u => {
          const hasCategory = u.categories && u.categories.includes(category);
          return hasCategory;
        })
      : playerUsers;
    
    console.log(`[IRT RANKING] Total players: ${playerUsers.length}, Category: ${category || 'all'}, Filtered: ${filteredPlayerUsers.length}`);
    
    const usersMap = new Map(filteredPlayerUsers.map(u => [u.id, u]));
    
    // Filter allPlayerIds to only include users with the category
    const filteredPlayerIds = category
      ? Array.from(allPlayerIds).filter(id => usersMap.has(id))
      : Array.from(allPlayerIds);
    
    // Combine and calculate ranking scores
    const rankings = filteredPlayerIds.map(playerId => {
      const stats = statsMap.get(playerId) || {
        totalPoints: 0,
        aces: 0,
        doubleFaults: 0,
        winners: 0,
        errors: 0,
        aceEffectiveness: 0
      };
      
      const outcomes = outcomesMap.get(playerId) || {
        matchesWon: 0,
        matchesLost: 0,
        totalMatches: 0,
        avgMatchDuration: 0,
        winRate: 0
      };
      
      const user = usersMap.get(playerId);
      if (!user) return null;
      
      // Calculate ranking score
      // Base: wins * 100 + points * 2
      let rankingScore = (outcomes.matchesWon * 100) + (stats.totalPoints * 2);
      
      // Bonus for ace effectiveness (max +20 points)
      if (stats.aceEffectiveness >= 70) {
        rankingScore += 20;
      } else if (stats.aceEffectiveness >= 50) {
        rankingScore += 10;
      } else if (stats.aceEffectiveness >= 30) {
        rankingScore += 5;
      }
      
      // Bonus for winner/error ratio (max +15 points)
      const winnerErrorRatio = stats.errors > 0 
        ? stats.winners / stats.errors 
        : stats.winners > 0 ? 3 : 0;
      if (winnerErrorRatio >= 2) {
        rankingScore += 15;
      } else if (winnerErrorRatio >= 1) {
        rankingScore += 10;
      } else if (winnerErrorRatio >= 0.5) {
        rankingScore += 5;
      }
      
      return {
        playerId,
        playerName: user.name,
        playerEmail: user.email,
        playerClub: user.club || "Sin club",
        rankingScore: Math.round(rankingScore),
        // Match outcomes
        matchesWon: outcomes.matchesWon,
        matchesLost: outcomes.matchesLost,
        totalMatches: outcomes.totalMatches,
        winRate: outcomes.winRate,
        avgMatchDuration: outcomes.avgMatchDuration,
        // Event stats
        totalPoints: stats.totalPoints,
        aces: stats.aces,
        doubleFaults: stats.doubleFaults,
        aceEffectiveness: stats.aceEffectiveness,
        winners: stats.winners,
        errors: stats.errors,
        // For compatibility with old PlayerStats type
        rankingPoints: Math.round(rankingScore),
        currentWinStreak: 0 // Could be calculated if needed
      };
    }).filter(Boolean);
    
    // Sort by ranking score and limit
    return rankings
      .sort((a, b) => (b?.rankingScore || 0) - (a?.rankingScore || 0))
      .slice(0, limit);
  }

  async getGlobalRankings(limit = 50, category?: string): Promise<any[]> {
    return this.getRankingEntries(undefined, limit, category);
  }

  async getTournamentRankings(tournamentId: string, limit = 50, category?: string): Promise<any[]> {
    try {
      console.log(`[TOURNAMENT RANKINGS] Fetching rankings for tournament: ${tournamentId}, category: ${category || 'all'}`);
      
      // Get all registered players first
      let registeredPlayers = await db
        .select({
          playerId: users.id,
          playerName: users.name,
          playerEmail: users.email,
          categories: users.categories
        })
        .from(tournamentRegistrations)
        .innerJoin(users, eq(tournamentRegistrations.playerId, users.id))
        .where(eq(tournamentRegistrations.tournamentId, tournamentId));
      
      // Filter by category if specified
      if (category) {
        registeredPlayers = registeredPlayers.filter(p => 
          p.categories && p.categories.includes(category)
        );
      }
      
      if (registeredPlayers.length === 0) {
        console.log(`[TOURNAMENT RANKINGS] No registered players found`);
        return [];
      }
      
      // Get all stats for this tournament
      const allStats = await db
        .select()
        .from(playerStats)
        .where(eq(playerStats.tournamentId, tournamentId));
      
      const statsMap = new Map(allStats.map(s => [s.playerId, s]));
      
      // Combine: all registered players with their stats (or zeros if no stats)
      const result = registeredPlayers.map(player => {
        const playerStat = statsMap.get(player.playerId);
        return {
          playerId: player.playerId,
          playerName: player.playerName,
          playerEmail: player.playerEmail,
          matchesPlayed: playerStat?.matchesPlayed || 0,
          matchesWon: playerStat?.matchesWon || 0,
          matchesLost: playerStat?.matchesLost || 0,
          setsWon: playerStat?.setsWon || 0,
          setsLost: playerStat?.setsLost || 0
        };
      }).sort((a, b) => {
        // Sort by wins first, then by sets difference
        if ((b.matchesWon || 0) !== (a.matchesWon || 0)) {
          return (b.matchesWon || 0) - (a.matchesWon || 0);
        }
        const aDiff = (a.setsWon || 0) - (a.setsLost || 0);
        const bDiff = (b.setsWon || 0) - (b.setsLost || 0);
        return bDiff - aDiff;
      }).slice(0, limit);
      
      console.log(`[TOURNAMENT RANKINGS] Found ${result.length} players total (${registeredPlayers.length} registered, category: ${category || 'all'})`);
      return result;
    } catch (error) {
      console.error('[TOURNAMENT RANKINGS] Error:', error);
      throw error;
    }
  }

  // Match stats sessions
  async createStatsSession(session: InsertMatchStatsSession): Promise<MatchStatsSession> {
    let composedSession = { ...session };

    // Hydrate from match if matchId is provided
    if (session.matchId) {
      const match = await this.getMatch(session.matchId);
      if (!match) {
        throw new Error("Match not found");
      }

      // Use match values as defaults, allow caller overrides (nullish coalescing preserves explicit null)
      composedSession = {
        matchType: session.matchType ?? match.matchType,
        player1Id: session.player1Id ?? match.player1Id,
        player1Name: session.player1Name ?? null,
        player2Id: session.player2Id ?? match.player2Id,
        player2Name: session.player2Name ?? null,
        player3Id: session.player3Id ?? match.player3Id ?? null,
        player3Name: session.player3Name ?? match.player3Name ?? null,
        player4Id: session.player4Id ?? match.player4Id ?? null,
        player4Name: session.player4Name ?? match.player4Name ?? null,
        ...session // Caller overrides win
      };

      // Validate matchType consistency
      if (session.matchType && session.matchType !== match.matchType) {
        throw new Error("Session matchType conflicts with match matchType");
      }
    } else {
      // Exhibition session: require matchType and all participant data
      if (!session.matchType) {
        throw new Error("matchType is required for exhibition sessions");
      }
    }

    // Validate singles/doubles invariants
    const hasPlayer3 = !!(composedSession.player3Id || composedSession.player3Name);
    const hasPlayer4 = !!(composedSession.player4Id || composedSession.player4Name);
    
    if (composedSession.matchType === 'singles') {
      if (hasPlayer3 || hasPlayer4) {
        throw new Error("Singles matches cannot have player3 or player4");
      }
    } else if (composedSession.matchType === 'doubles') {
      if (!hasPlayer3 || !hasPlayer4) {
        throw new Error("Doubles matches must have all 4 players");
      }
    }

    const [created] = await db.insert(matchStatsSessions).values(composedSession).returning();
    return created;
  }

  async getStatsSession(id: string): Promise<MatchStatsSession | undefined> {
    const [session] = await db.select().from(matchStatsSessions).where(eq(matchStatsSessions.id, id));
    return session || undefined;
  }

  async getActiveStatsSession(matchId: string): Promise<MatchStatsSession | undefined> {
    const [session] = await db
      .select()
      .from(matchStatsSessions)
      .where(
        and(
          eq(matchStatsSessions.matchId, matchId),
          eq(matchStatsSessions.status, 'active')
        )
      );
    return session || undefined;
  }

  async updateStatsSession(id: string, updates: Partial<InsertMatchStatsSession>): Promise<MatchStatsSession> {
    const [updated] = await db
      .update(matchStatsSessions)
      .set(updates)
      .where(eq(matchStatsSessions.id, id))
      .returning();
    return updated;
  }

  async completeStatsSession(id: string): Promise<MatchStatsSession> {
    const [completed] = await db
      .update(matchStatsSessions)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(matchStatsSessions.id, id))
      .returning();
    return completed;
  }

  async getAllStatsSessions(): Promise<StatsSessionSummary[]> {
    const results = await db
      .select({
        session: matchStatsSessions,
        match: matches,
        tournament: tournaments,
      })
      .from(matchStatsSessions)
      .leftJoin(matches, eq(matchStatsSessions.matchId, matches.id))
      .leftJoin(tournaments, eq(matches.tournamentId, tournaments.id))
      .orderBy(desc(matchStatsSessions.startedAt));

    // Fetch all players in parallel
    const sessionsWithPlayers = await Promise.all(
      results.map(async (result) => {
        const [player1, player2, player3, player4] = await Promise.all([
          result.match?.player1Id ? this.getUser(result.match.player1Id) : Promise.resolve(undefined),
          result.match?.player2Id ? this.getUser(result.match.player2Id) : Promise.resolve(undefined),
          result.match?.player3Id ? this.getUser(result.match.player3Id) : Promise.resolve(undefined),
          result.match?.player4Id ? this.getUser(result.match.player4Id) : Promise.resolve(undefined),
        ]);

        return {
          ...result.session,
          match: result.match || null,
          tournament: result.tournament || null,
          player1: player1 ? { id: player1.id, name: player1.name, email: player1.email } : null,
          player2: player2 ? { id: player2.id, name: player2.name, email: player2.email } : null,
          player3: player3 ? { id: player3.id, name: player3.name, email: player3.email } : null,
          player4: player4 ? { id: player4.id, name: player4.name, email: player4.email } : null,
        };
      })
    );

    return sessionsWithPlayers;
  }

  // Match events
  async createMatchEvent(event: InsertMatchEvent): Promise<MatchEvent> {
    let composedEvent = { ...event };

    // Calculate team from playerId if not explicitly provided
    if (event.sessionId && event.playerId && !event.team) {
      const session = await this.getStatsSession(event.sessionId);
      if (session) {
        // Determine which team the player belongs to
        if (event.playerId === session.player1Id || event.playerId === session.player3Id) {
          composedEvent.team = '1';
        } else if (event.playerId === session.player2Id || event.playerId === session.player4Id) {
          composedEvent.team = '2';
        } else {
          throw new Error("PlayerId does not match any player in the session");
        }
      }
    }

    const [created] = await db.insert(matchEvents).values(composedEvent).returning();
    
    if (event.sessionId && (event.player1Score || event.player2Score)) {
      const updates: Partial<InsertMatchStatsSession> = {};
      if (event.player1Score !== undefined) {
        updates.player1CurrentScore = event.player1Score;
      }
      if (event.player2Score !== undefined) {
        updates.player2CurrentScore = event.player2Score;
      }
      await this.updateStatsSession(event.sessionId, updates);
    }
    
    return created;
  }

  async getSessionEvents(sessionId: string): Promise<MatchEvent[]> {
    return await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.sessionId, sessionId))
      .orderBy(asc(matchEvents.createdAt));
  }

  async getLatestMatchEvents(sessionId: string, limit: number): Promise<MatchEvent[]> {
    return await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.sessionId, sessionId))
      .orderBy(desc(matchEvents.createdAt))
      .limit(limit);
  }

  async undoLastEvent(sessionId: string): Promise<MatchStatsSession | null> {
    const session = await this.getStatsSession(sessionId);
    if (!session) {
      return null;
    }

    const allEvents = await this.getSessionEvents(sessionId);
    if (allEvents.length === 0) {
      return session;
    }

    const lastEvent = allEvents[allEvents.length - 1];

    await db.delete(matchEvents).where(eq(matchEvents.id, lastEvent.id));

    const updates: Partial<InsertMatchStatsSession> = {};

    if (allEvents.length > 1) {
      const secondToLastEvent = allEvents[allEvents.length - 2];
      updates.player1CurrentScore = secondToLastEvent.player1Score || "0";
      updates.player2CurrentScore = secondToLastEvent.player2Score || "0";
    } else {
      updates.player1CurrentScore = "0";
      updates.player2CurrentScore = "0";
      updates.player1Sets = 0;
      updates.player2Sets = 0;
      updates.currentSet = 1;
      updates.player1Games = "[]";
      updates.player2Games = "[]";
      updates.serverId = session.player1Id;
    }

    updates.matchWinner = null;
    updates.matchEndedByTechnical = false;
    updates.status = "active";

    if (lastEvent.eventType === "technical") {
      const isTeam1Event = lastEvent.team === '1';
      if (isTeam1Event && session.player1Technicals! > 0) {
        updates.player1Technicals = session.player1Technicals! - 1;
      } else if (!isTeam1Event && session.player2Technicals! > 0) {
        updates.player2Technicals = session.player2Technicals! - 1;
      }
    }

    return await this.updateStatsSession(sessionId, updates);
  }

  async getPlayersEventStats(tournamentId?: string): Promise<any[]> {
    // Build query with optional tournament filter
    let events;
    
    if (tournamentId) {
      // Filter by tournament - join through sessions and matches
      events = await db
        .select({
          playerId: matchEvents.playerId,
          eventType: matchEvents.eventType,
          shotType: matchEvents.shotType,
          aceSide: matchEvents.aceSide,
          playerName: users.name,
          playerEmail: users.email,
          sessionId: matchEvents.sessionId
        })
        .from(matchEvents)
        .leftJoin(users, eq(matchEvents.playerId, users.id))
        .leftJoin(matchStatsSessions, eq(matchEvents.sessionId, matchStatsSessions.id))
        .leftJoin(matches, eq(matchStatsSessions.matchId, matches.id))
        .where(
          and(
            eq(users.isActive, true),
            eq(matches.tournamentId, tournamentId),
            eq(matchStatsSessions.status, 'completed')
          )
        );
    } else {
      // Global stats - no tournament filter, only completed sessions
      events = await db
        .select({
          playerId: matchEvents.playerId,
          eventType: matchEvents.eventType,
          shotType: matchEvents.shotType,
          aceSide: matchEvents.aceSide,
          playerName: users.name,
          playerEmail: users.email,
          sessionId: matchEvents.sessionId
        })
        .from(matchEvents)
        .leftJoin(users, eq(matchEvents.playerId, users.id))
        .leftJoin(matchStatsSessions, eq(matchEvents.sessionId, matchStatsSessions.id))
        .where(
          and(
            eq(users.isActive, true),
            eq(matchStatsSessions.status, 'completed')
          )
        );
    }

    // Group by player and aggregate stats
    const playerStatsMap = new Map<string, any>();

    events.forEach(event => {
      if (!event.playerId) return;

      if (!playerStatsMap.has(event.playerId)) {
        playerStatsMap.set(event.playerId, {
          playerId: event.playerId,
          playerName: event.playerName,
          playerEmail: event.playerEmail,
          totalPoints: 0,
          aces: 0,
          doubleFaults: 0,
          errors: 0,
          winners: 0,
          faults: 0,
          // Shot types
          shotRecto: 0,
          shotEsquina: 0,
          shotCruzado: 0,
          shotPunto: 0,
          // Ace sides
          aceDerecha: 0,
          aceIzquierda: 0
        });
      }

      const stats = playerStatsMap.get(event.playerId);
      
      // Count shot types for all events that have shotType
      if (event.shotType) {
        if (event.shotType === 'recto') stats.shotRecto++;
        else if (event.shotType === 'esquina') stats.shotEsquina++;
        else if (event.shotType === 'cruzado') stats.shotCruzado++;
        else if (event.shotType === 'punto') stats.shotPunto++;
      }
      
      switch (event.eventType) {
        case 'point_won':
          stats.totalPoints++;
          break;
        case 'ace':
          stats.aces++;
          // Count ace sides
          if (event.aceSide === 'derecha') stats.aceDerecha++;
          else if (event.aceSide === 'izquierda') stats.aceIzquierda++;
          break;
        case 'double_fault':
          stats.doubleFaults++;
          break;
        case 'error':
          stats.errors++;
          break;
        case 'winner':
          stats.winners++;
          break;
        case 'fault':
          stats.faults++;
          break;
      }
    });

    // Get playerStats data (wins, losses, sets)
    const playerStatsData = tournamentId
      ? await db
          .select()
          .from(playerStats)
          .where(eq(playerStats.tournamentId, tournamentId))
      : await db
          .select()
          .from(playerStats)
          .where(isNull(playerStats.tournamentId));

    const playerStatsDataMap = new Map(
      playerStatsData.map(ps => [ps.playerId, ps])
    );

    // Convert map to array, calculate percentages, and sort by total points
    return Array.from(playerStatsMap.values())
      .map(stats => {
        const psData = playerStatsDataMap.get(stats.playerId);
        const totalShots = stats.shotRecto + stats.shotEsquina + stats.shotCruzado + stats.shotPunto;
        
        return {
          ...stats,
          // Calculate effectiveness percentages
          aceEffectiveness: stats.aces + stats.doubleFaults > 0 
            ? Math.round((stats.aces / (stats.aces + stats.doubleFaults)) * 100)
            : 0,
          totalShots,
          // Shot type percentages
          shotRectoPercent: totalShots > 0 ? Math.round((stats.shotRecto / totalShots) * 100) : 0,
          shotEsquinaPercent: totalShots > 0 ? Math.round((stats.shotEsquina / totalShots) * 100) : 0,
          shotCruzadoPercent: totalShots > 0 ? Math.round((stats.shotCruzado / totalShots) * 100) : 0,
          shotPuntoPercent: totalShots > 0 ? Math.round((stats.shotPunto / totalShots) * 100) : 0,
          // Match stats from playerStats table
          matchesWon: psData?.matchesWon || 0,
          matchesLost: psData?.matchesLost || 0,
          matchesPlayed: psData?.matchesPlayed || 0,
          singlesPlayed: psData?.singlesPlayed || 0,
          singlesWon: psData?.singlesWon || 0,
          singlesLost: psData?.singlesLost || 0,
          doublesPlayed: psData?.doublesPlayed || 0,
          doublesWon: psData?.doublesWon || 0,
          doublesLost: psData?.doublesLost || 0,
          setsWon: psData?.setsWon || 0,
          setsLost: psData?.setsLost || 0,
          totalSets: (psData?.setsWon || 0) + (psData?.setsLost || 0)
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }

  // Stat share tokens
  async createStatShareToken(ownerUserId: string, targetPlayerId: string, expiresAt?: Date): Promise<StatShareToken> {
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString('hex');
    
    const [created] = await db
      .insert(statShareTokens)
      .values({
        token,
        ownerUserId,
        targetPlayerId,
        expiresAt: expiresAt || null
      })
      .returning();
    
    return created;
  }

  async getStatShareToken(token: string): Promise<StatShareToken | undefined> {
    const [shareToken] = await db
      .select()
      .from(statShareTokens)
      .where(eq(statShareTokens.token, token));
    
    return shareToken || undefined;
  }

  async deleteStatShareToken(id: string): Promise<void> {
    await db.delete(statShareTokens).where(eq(statShareTokens.id, id));
  }

  async getPlayerPublicStats(playerId: string): Promise<any> {
    // Get user info (without sensitive data)
    const [player] = await db
      .select({
        id: users.id,
        name: users.name,
        preferredSport: users.preferredSport,
        padelCategory: users.padelCategory,
        racquetballLevel: users.racquetballLevel
      })
      .from(users)
      .where(eq(users.id, playerId));

    if (!player) {
      return null;
    }

    // Get player stats from events
    const allStats = await this.getPlayersEventStats();
    const playerEventStats = allStats.find(s => s.playerId === playerId) || {
      totalPoints: 0,
      aces: 0,
      doubleFaults: 0,
      errors: 0,
      shotRecto: 0,
      shotEsquina: 0,
      shotCruzado: 0,
      shotPunto: 0,
      aceDerecha: 0,
      aceIzquierda: 0,
      aceEffectiveness: 0,
      totalShots: 0
    };

    // Get match history
    const playerMatches = await db
      .select({
        id: matches.id,
        player1Sets: matches.player1Sets,
        player2Sets: matches.player2Sets,
        winnerId: matches.winnerId,
        scheduledAt: matches.scheduledAt
      })
      .from(matches)
      .where(
        or(
          eq(matches.player1Id, playerId),
          eq(matches.player2Id, playerId)
        )
      )
      .orderBy(desc(matches.updatedAt))
      .limit(10);

    const matchesWon = playerMatches.filter(m => m.winnerId === playerId).length;
    const matchesLost = playerMatches.filter(m => m.winnerId && m.winnerId !== playerId).length;

    return {
      player,
      stats: {
        ...playerEventStats,
        matchesWon,
        matchesLost,
        totalMatches: matchesWon + matchesLost
      },
      recentMatches: playerMatches
    };
  }

  // Multi-tenant authorization methods
  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.role === 'superadmin';
  }

  async getSuperAdmins(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, 'superadmin'));
  }

  async isOnlySuperAdmin(userId: string): Promise<boolean> {
    const superAdmins = await this.getSuperAdmins();
    return superAdmins.length === 1 && superAdmins[0].id === userId;
  }

  async getUserTournamentRoles(userId: string, tournamentId: string): Promise<string[]> {
    const roles = await db
      .select({ role: tournamentUserRoles.role })
      .from(tournamentUserRoles)
      .where(
        and(
          eq(tournamentUserRoles.userId, userId),
          eq(tournamentUserRoles.tournamentId, tournamentId)
        )
      );
    
    return roles.map(r => r.role);
  }

  async getAllUserTournamentRoles(userId: string): Promise<Array<{ tournamentId: string; tournamentName: string; role: string }>> {
    const roles = await db
      .select({
        tournamentId: tournamentUserRoles.tournamentId,
        tournamentName: tournaments.name,
        role: tournamentUserRoles.role
      })
      .from(tournamentUserRoles)
      .innerJoin(tournaments, eq(tournamentUserRoles.tournamentId, tournaments.id))
      .where(eq(tournamentUserRoles.userId, userId));
    
    return roles;
  }

  async canManageTournament(userId: string, tournamentId: string): Promise<boolean> {
    // SuperAdmins can manage all tournaments
    if (await this.isSuperAdmin(userId)) {
      return true;
    }

    // Check if user is tournament admin for this specific tournament
    const roles = await this.getUserTournamentRoles(userId, tournamentId);
    return roles.includes('tournament_admin');
  }

  async canAssignRole(assignerId: string, targetRole: string, tournamentId: string): Promise<boolean> {
    // SuperAdmins can assign any role except superadmin
    if (await this.isSuperAdmin(assignerId)) {
      return targetRole !== 'superadmin';
    }

    // Tournament admins can only assign non-admin roles within THEIR specific tournaments
    // CRITICAL: Must verify assignerId has tournament_admin in THIS EXACT tournament
    const assignerRoles = await this.getUserTournamentRoles(assignerId, tournamentId);
    if (assignerRoles.includes('tournament_admin')) {
      // Tournament admins cannot assign tournament_admin or superadmin
      return !['tournament_admin', 'superadmin'].includes(targetRole);
    }

    // No permission to assign roles
    return false;
  }

  async assignTournamentRole(data: InsertTournamentUserRole): Promise<TournamentUserRole> {
    const [role] = await db
      .insert(tournamentUserRoles)
      .values(data)
      .returning();
    
    return role;
  }

  async removeTournamentRole(tournamentId: string, userId: string, role: string): Promise<void> {
    await db
      .delete(tournamentUserRoles)
      .where(
        and(
          eq(tournamentUserRoles.tournamentId, tournamentId),
          eq(tournamentUserRoles.userId, userId),
          eq(tournamentUserRoles.role, role as any)
        )
      );
  }

  async getUserTournamentsByRole(userId: string, role?: string): Promise<Tournament[]> {
    const conditions = [eq(tournamentUserRoles.userId, userId)];
    
    if (role) {
      conditions.push(eq(tournamentUserRoles.role, role as any));
    }

    return await db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        description: tournaments.description,
        sport: tournaments.sport,
        format: tournaments.format,
        status: tournaments.status,
        venue: tournaments.venue,
        clubId: tournaments.clubId,
        tier: tournaments.tier,
        prizePool: tournaments.prizePool,
        startDate: tournaments.startDate,
        endDate: tournaments.endDate,
        maxPlayers: tournaments.maxPlayers,
        registrationFee: tournaments.registrationFee,
        organizerId: tournaments.organizerId,
        timezone: tournaments.timezone,
        createdAt: tournaments.createdAt,
        updatedAt: tournaments.updatedAt
      })
      .from(tournaments)
      .innerJoin(
        tournamentUserRoles,
        eq(tournaments.id, tournamentUserRoles.tournamentId)
      )
      .where(and(...conditions));
  }

  async getTournamentUserRoles(tournamentId: string): Promise<Array<TournamentUserRole & { user: User }>> {
    const roles = await db
      .select()
      .from(tournamentUserRoles)
      .innerJoin(users, eq(tournamentUserRoles.userId, users.id))
      .where(eq(tournamentUserRoles.tournamentId, tournamentId));
    
    return roles.map(r => ({
      ...r.tournament_user_roles,
      user: r.users
    }));
  }

  async resetTournamentPlayersAndMatches(tournamentId: string): Promise<{ playersRemoved: number; matchesRemoved: number }> {
    // Get all users with roles in this tournament
    const usersWithRoles = await db
      .select({ userId: tournamentUserRoles.userId })
      .from(tournamentUserRoles)
      .where(eq(tournamentUserRoles.tournamentId, tournamentId));
    
    const userIdsWithRoles = usersWithRoles.map(r => r.userId);

    // Delete all tournament registrations where user does NOT have a role
    const registrationsToDelete = await db
      .select({ playerId: tournamentRegistrations.playerId })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournamentId));

    let playersRemoved = 0;
    for (const reg of registrationsToDelete) {
      if (!userIdsWithRoles.includes(reg.playerId)) {
        await db
          .delete(tournamentRegistrations)
          .where(
            and(
              eq(tournamentRegistrations.tournamentId, tournamentId),
              eq(tournamentRegistrations.playerId, reg.playerId)
            )
          );
        playersRemoved++;
      }
    }

    // Delete all matches in this tournament
    const deletedMatches = await db
      .delete(matches)
      .where(eq(matches.tournamentId, tournamentId));

    // Delete all scheduled matches in this tournament
    await db
      .delete(scheduledMatches)
      .where(eq(scheduledMatches.tournamentId, tournamentId));

    return {
      playersRemoved,
      matchesRemoved: deletedMatches.rowCount || 0
    };
  }

  async importPlayersFromExcel(
    tournamentId: string, 
    data: any[], 
    isDoubles: boolean
  ): Promise<{ success: number; errors: string[]; created: any[] }> {
    const results = {
      success: 0,
      errors: [] as string[],
      created: [] as any[]
    };

    // Guard against empty data
    if (!data || data.length === 0) {
      throw new Error("No hay datos para importar. El archivo está vacío.");
    }

    const { excelPlayerSinglesSchema, excelPlayerDoublesSchema } = await import("@shared/schema");

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        const rowNumber = i + 2; // +2 because Excel starts at 1 and has header row

        if (isDoubles) {
          // Validate doubles data
          const validated = excelPlayerDoublesSchema.parse(row);
          
          // Check if players already exist or create them
          const player1Name = validated.nombrePareja1.trim();
          const player2Name = validated.nombrePareja2.trim();
          const category = validated.categoria;

          // Create or find player 1
          let player1 = await db.select().from(users).where(eq(users.name, player1Name)).limit(1);
          let player1Credentials: { email: string; password: string } | null = null;
          if (player1.length === 0) {
            const tempEmail = player1Name.toLowerCase().replace(/\s+/g, '.') + '@temp.local';
            const tempPassword = player1Name.split(' ')[0].toLowerCase() + '123';
            const newPlayer1 = await db.insert(users).values({
              name: player1Name,
              username: player1Name.toLowerCase().replace(/\s+/g, '_'),
              email: tempEmail,
              password: tempPassword,
              role: 'jugador',
              category: category,
              preferredSport: 'racquetball'
            }).returning();
            player1 = newPlayer1;
            player1Credentials = { email: tempEmail, password: tempPassword };
          }

          // Create or find player 2
          let player2 = await db.select().from(users).where(eq(users.name, player2Name)).limit(1);
          let player2Credentials: { email: string; password: string } | null = null;
          if (player2.length === 0) {
            const tempEmail = player2Name.toLowerCase().replace(/\s+/g, '.') + '@temp.local';
            const tempPassword = player2Name.split(' ')[0].toLowerCase() + '123';
            const newPlayer2 = await db.insert(users).values({
              name: player2Name,
              username: player2Name.toLowerCase().replace(/\s+/g, '_'),
              email: tempEmail,
              password: tempPassword,
              role: 'jugador',
              category: category,
              preferredSport: 'racquetball'
            }).returning();
            player2 = newPlayer2;
            player2Credentials = { email: tempEmail, password: tempPassword };
          }

          // Register both players for the tournament
          const existingReg1 = await db.select().from(tournamentRegistrations)
            .where(and(
              eq(tournamentRegistrations.tournamentId, tournamentId),
              eq(tournamentRegistrations.playerId, player1[0].id)
            )).limit(1);
          
          if (existingReg1.length === 0) {
            await db.insert(tournamentRegistrations).values({
              tournamentId,
              playerId: player1[0].id
            });
          }

          const existingReg2 = await db.select().from(tournamentRegistrations)
            .where(and(
              eq(tournamentRegistrations.tournamentId, tournamentId),
              eq(tournamentRegistrations.playerId, player2[0].id)
            )).limit(1);
          
          if (existingReg2.length === 0) {
            await db.insert(tournamentRegistrations).values({
              tournamentId,
              playerId: player2[0].id
            });
          }

          results.created.push({ 
            player1: player1[0].name, 
            player2: player2[0].name, 
            category,
            credentials: {
              player1: player1Credentials,
              player2: player2Credentials
            }
          });
          results.success++;

        } else {
          // Singles player
          const validated = excelPlayerSinglesSchema.parse(row);
          const playerName = validated.nombre.trim();
          const category = validated.categoria;

          // Check if player exists or create
          let player = await db.select().from(users).where(eq(users.name, playerName)).limit(1);
          let playerCredentials: { email: string; password: string } | null = null;
          if (player.length === 0) {
            const tempEmail = playerName.toLowerCase().replace(/\s+/g, '.') + '@temp.local';
            const tempPassword = playerName.split(' ')[0].toLowerCase() + '123';
            const newPlayer = await db.insert(users).values({
              name: playerName,
              username: playerName.toLowerCase().replace(/\s+/g, '_'),
              email: tempEmail,
              password: tempPassword,
              role: 'jugador',
              category: category,
              preferredSport: 'racquetball'
            }).returning();
            player = newPlayer;
            playerCredentials = { email: tempEmail, password: tempPassword };
          }

          // Register player for tournament
          const existingReg = await db.select().from(tournamentRegistrations)
            .where(and(
              eq(tournamentRegistrations.tournamentId, tournamentId),
              eq(tournamentRegistrations.playerId, player[0].id)
            )).limit(1);
          
          if (existingReg.length === 0) {
            await db.insert(tournamentRegistrations).values({
              tournamentId,
              playerId: player[0].id
            });
          }

          results.created.push({ 
            name: player[0].name, 
            category,
            credentials: playerCredentials
          });
          results.success++;
        }

      } catch (error: any) {
        results.errors.push(`Fila ${i + 2}: ${error.message}`);
      }
    }

    return results;
  }

  async importMatchesFromExcel(
    tournamentId: string, 
    data: any[]
  ): Promise<{ success: number; errors: string[]; created: any[] }> {
    const results = {
      success: 0,
      errors: [] as string[],
      created: [] as any[]
    };

    // Guard against empty data
    if (!data || data.length === 0) {
      throw new Error("No hay datos para importar. El archivo está vacío.");
    }

    const { excelMatchSinglesSchema, excelMatchDoublesSchema } = await import("@shared/schema");

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        const rowNumber = i + 2;

        // Normalize modality to handle case insensitivity
        const rawModalidad = String(row.modalidad || '').trim();
        let modalidad: 'Singles' | 'Doubles' | null = null;
        
        if (rawModalidad.toLowerCase() === 'singles') {
          modalidad = 'Singles';
        } else if (rawModalidad.toLowerCase() === 'doubles') {
          modalidad = 'Doubles';
        }
        
        if (modalidad === 'Singles') {
          const validated = excelMatchSinglesSchema.parse(row);
          
          // Find players by name
          const player1Result = await db.select().from(users).where(eq(users.name, validated.jugador1.trim())).limit(1);
          const player2Result = await db.select().from(users).where(eq(users.name, validated.jugador2.trim())).limit(1);

          if (player1Result.length === 0) {
            results.errors.push(`Fila ${rowNumber}: Jugador "${validated.jugador1}" no encontrado`);
            continue;
          }
          if (player2Result.length === 0) {
            results.errors.push(`Fila ${rowNumber}: Jugador "${validated.jugador2}" no encontrado`);
            continue;
          }

          // Parse date and time
          const scheduledAt = new Date(`${validated.fecha}T${validated.hora}`);

          // Create match
          const match = await db.insert(matches).values({
            tournamentId,
            matchType: 'singles',
            player1Id: player1Result[0].id,
            player2Id: player2Result[0].id,
            scheduledAt,
            status: 'scheduled'
          }).returning();

          results.created.push({
            modalidad: 'Singles',
            jugador1: player1Result[0].name,
            jugador2: player2Result[0].name,
            fecha: validated.fecha,
            hora: validated.hora
          });
          results.success++;

        } else if (modalidad === 'Doubles') {
          const validated = excelMatchDoublesSchema.parse(row);
          
          // Find all 4 players
          const p1Result = await db.select().from(users).where(eq(users.name, validated.nombrePareja1.trim())).limit(1);
          const p2Result = await db.select().from(users).where(eq(users.name, validated.nombrePareja2.trim())).limit(1);
          const p3Result = await db.select().from(users).where(eq(users.name, validated.nombreRival1.trim())).limit(1);
          const p4Result = await db.select().from(users).where(eq(users.name, validated.nombreRival2.trim())).limit(1);

          if (p1Result.length === 0) {
            results.errors.push(`Fila ${rowNumber}: Jugador "${validated.nombrePareja1}" no encontrado`);
            continue;
          }
          if (p2Result.length === 0) {
            results.errors.push(`Fila ${rowNumber}: Jugador "${validated.nombrePareja2}" no encontrado`);
            continue;
          }
          if (p3Result.length === 0) {
            results.errors.push(`Fila ${rowNumber}: Jugador "${validated.nombreRival1}" no encontrado`);
            continue;
          }
          if (p4Result.length === 0) {
            results.errors.push(`Fila ${rowNumber}: Jugador "${validated.nombreRival2}" no encontrado`);
            continue;
          }

          const scheduledAt = new Date(`${validated.fecha}T${validated.hora}`);

          // Create doubles match
          const match = await db.insert(matches).values({
            tournamentId,
            matchType: 'doubles',
            player1Id: p1Result[0].id,
            player2Id: p3Result[0].id,
            player3Id: p2Result[0].id,
            player4Id: p4Result[0].id,
            scheduledAt,
            status: 'scheduled'
          }).returning();

          results.created.push({
            modalidad: 'Doubles',
            pareja1: `${p1Result[0].name} / ${p2Result[0].name}`,
            pareja2: `${p3Result[0].name} / ${p4Result[0].name}`,
            fecha: validated.fecha,
            hora: validated.hora
          });
          results.success++;

        } else {
          results.errors.push(`Fila ${rowNumber}: Modalidad inválida "${modalidad}"`);
        }

      } catch (error: any) {
        results.errors.push(`Fila ${i + 2}: ${error.message}`);
      }
    }

    return results;
  }

  // IRT Ranking System implementations
  async getIrtPointsConfig(tier: string, matchType: string, round: string): Promise<IrtPointsConfig | undefined> {
    const result = await db.select().from(irtPointsConfig)
      .where(and(
        eq(irtPointsConfig.tier, tier as any),
        eq(irtPointsConfig.matchType, matchType as any),
        eq(irtPointsConfig.round, round as any)
      ))
      .limit(1);
    return result[0];
  }

  async createPlayerRankingHistory(history: InsertPlayerRankingHistory): Promise<PlayerRankingHistory> {
    const result = await db.insert(playerRankingHistory).values(history).returning();
    return result[0];
  }

  async getPlayerRankingHistory(playerId: string, tournamentId?: string): Promise<PlayerRankingHistory[]> {
    if (tournamentId) {
      return await db.select().from(playerRankingHistory)
        .where(and(
          eq(playerRankingHistory.playerId, playerId),
          eq(playerRankingHistory.tournamentId, tournamentId)
        ))
        .orderBy(desc(playerRankingHistory.createdAt));
    }
    return await db.select().from(playerRankingHistory)
      .where(eq(playerRankingHistory.playerId, playerId))
      .orderBy(desc(playerRankingHistory.createdAt));
  }

  async getGlobalRanking(limit: number = 100): Promise<any[]> {
    const result = await db
      .select({
        playerId: users.id,
        playerName: users.name,
        playerEmail: users.email,
        rankingPoints: playerStats.rankingPoints,
        matchesPlayed: playerStats.matchesPlayed,
        matchesWon: playerStats.matchesWon,
        matchesLost: playerStats.matchesLost,
        setsWon: playerStats.setsWon,
        setsLost: playerStats.setsLost
      })
      .from(users)
      .leftJoin(playerStats, and(
        eq(playerStats.playerId, users.id),
        isNull(playerStats.tournamentId)
      ))
      .where(eq(users.role, 'jugador'))
      .orderBy(
        desc(sql`COALESCE(${playerStats.rankingPoints}, 0)`),
        desc(sql`COALESCE(${playerStats.matchesPlayed}, 0)`)
      )
      .limit(limit);
    return result;
  }

  async createTournamentSponsor(sponsor: InsertTournamentSponsor): Promise<TournamentSponsor> {
    const [newSponsor] = await db.insert(tournamentSponsors).values(sponsor).returning();
    return newSponsor;
  }

  async getTournamentSponsors(tournamentId: string): Promise<TournamentSponsor[]> {
    return await db
      .select()
      .from(tournamentSponsors)
      .where(and(
        eq(tournamentSponsors.tournamentId, tournamentId),
        eq(tournamentSponsors.isActive, true)
      ))
      .orderBy(asc(tournamentSponsors.displayOrder), asc(tournamentSponsors.createdAt));
  }

  async updateTournamentSponsor(id: string, updates: Partial<InsertTournamentSponsor>): Promise<TournamentSponsor> {
    const [updated] = await db
      .update(tournamentSponsors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tournamentSponsors.id, id))
      .returning();
    return updated;
  }

  async deleteTournamentSponsor(id: string): Promise<void> {
    await db.delete(tournamentSponsors).where(eq(tournamentSponsors.id, id));
  }

  async getActiveMatches(tournamentId?: string): Promise<any[]> {
    // Get both active and recently completed matches (completed within last 5 minutes for display cycle)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const conditions = [
      or(
        eq(matchStatsSessions.status, 'active'),
        and(
          eq(matchStatsSessions.status, 'completed'),
          gte(matchStatsSessions.completedAt, fiveMinutesAgo)
        )
      )
    ];
    if (tournamentId) {
      conditions.push(eq(matches.tournamentId, tournamentId));
    }

    const sessions = await db
      .select({
        session: matchStatsSessions,
        match: matches,
        tournament: tournaments,
        player1: users,
        player2: {
          id: sql<string>`p2.id`,
          name: sql<string>`p2.name`,
          photoUrl: sql<string>`p2.photo_url`,
          nationality: sql<string>`p2.nationality`
        },
        player3: {
          id: sql<string>`p3.id`,
          name: sql<string>`p3.name`,
          photoUrl: sql<string>`p3.photo_url`,
          nationality: sql<string>`p3.nationality`
        },
        player4: {
          id: sql<string>`p4.id`,
          name: sql<string>`p4.name`,
          photoUrl: sql<string>`p4.photo_url`,
          nationality: sql<string>`p4.nationality`
        },
        matchWinner: {
          id: sql<string>`mw.id`,
          name: sql<string>`mw.name`,
          photoUrl: sql<string>`mw.photo_url`,
          nationality: sql<string>`mw.nationality`
        }
      })
      .from(matchStatsSessions)
      .innerJoin(matches, eq(matchStatsSessions.matchId, matches.id))
      .innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
      .innerJoin(users, eq(matchStatsSessions.player1Id, users.id))
      .leftJoin(sql`users AS p2`, sql`${matchStatsSessions.player2Id} = p2.id`)
      .leftJoin(sql`users AS p3`, sql`${matchStatsSessions.player3Id} = p3.id`)
      .leftJoin(sql`users AS p4`, sql`${matchStatsSessions.player4Id} = p4.id`)
      .leftJoin(sql`users AS mw`, sql`${matchStatsSessions.matchWinner} = mw.id`)
      .where(and(...conditions))
      .orderBy(desc(matchStatsSessions.startedAt));

    // Add aggregated statistics for each session
    const sessionsWithStats = await Promise.all(
      sessions.map(async (item) => {
        const events = await db
          .select()
          .from(matchEvents)
          .where(eq(matchEvents.sessionId, item.session.id));

        // Calculate stats for team 1 (player1 + player3)
        const team1Ids = [item.session.player1Id, item.session.player3Id].filter(Boolean);
        const team2Ids = [item.session.player2Id, item.session.player4Id].filter(Boolean);

        const team1Events = events.filter(e => team1Ids.includes(e.playerId || ''));
        const team2Events = events.filter(e => team2Ids.includes(e.playerId || ''));

        const calculateStats = (teamEvents: any[]) => {
          const aces = teamEvents.filter(e => e.eventType === 'ace').length;
          const recto = teamEvents.filter(e => e.shotType === 'recto').length;
          const esquina = teamEvents.filter(e => e.shotType === 'esquina').length;
          const cruzado = teamEvents.filter(e => e.shotType === 'cruzado').length;
          const punto = teamEvents.filter(e => e.shotType === 'punto').length;
          return {
            aces,
            recto,
            esquina,
            cruzado,
            punto,
            totalPoints: aces + recto + esquina + cruzado + punto
          };
        };

        return {
          ...item,
          stats: {
            team1: calculateStats(team1Events),
            team2: calculateStats(team2Events)
          }
        };
      })
    );

    return sessionsWithStats;
  }
}

export const storage = new DatabaseStorage();
