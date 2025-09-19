import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "jugador", "organizador", "arbitro", "escrutador"]);
export const sportEnum = pgEnum("sport", ["padel", "racquetball"]);
export const padelCategoryEnum = pgEnum("padel_category", ["1a", "2a", "3a", "4a", "veteranos", "juvenil"]);
export const racquetballLevelEnum = pgEnum("racquetball_level", ["principiante", "intermedio", "avanzado", "profesional"]);
export const tournamentFormatEnum = pgEnum("tournament_format", ["elimination", "round_robin", "groups"]);
export const tournamentStatusEnum = pgEnum("tournament_status", ["draft", "registration", "active", "completed", "cancelled"]);
export const matchStatusEnum = pgEnum("match_status", ["scheduled", "in_progress", "completed", "cancelled"]);
export const courtStatusEnum = pgEnum("court_status", ["available", "maintenance", "blocked"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  club: text("club"),
  role: userRoleEnum("role").notNull().default("jugador"),
  preferredSport: sportEnum("preferred_sport"),
  padelCategory: padelCategoryEnum("padel_category"),
  racquetballLevel: racquetballLevelEnum("racquetball_level"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const padelPairs = pgTable("padel_pairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  player1Id: varchar("player1_id").notNull().references(() => users.id),
  player2Id: varchar("player2_id").references(() => users.id), // Null if partner not registered yet
  player2Name: text("player2_name"), // Name of unregistered partner
  player2Phone: text("player2_phone"), // Phone of unregistered partner
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sport: sportEnum("sport").notNull(),
  format: tournamentFormatEnum("format").notNull(),
  status: tournamentStatusEnum("status").notNull().default("draft"),
  venue: text("venue").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  maxPlayers: integer("max_players").notNull(),
  registrationFee: decimal("registration_fee", { precision: 10, scale: 2 }).default("0"),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const courts = pgTable("courts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sport: sportEnum("sport").notNull(),
  status: courtStatusEnum("status").notNull().default("available"),
  description: text("description"),
  venue: text("venue").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  maintenanceUntil: timestamp("maintenance_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const tournamentRegistrations = pgTable("tournament_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  playerId: varchar("player_id").notNull().references(() => users.id),
  pairId: varchar("pair_id").references(() => padelPairs.id), // Only for padel tournaments
  registeredAt: timestamp("registered_at").notNull().defaultNow()
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  player1Id: varchar("player1_id").notNull().references(() => users.id),
  player2Id: varchar("player2_id").notNull().references(() => users.id),
  courtId: varchar("court_id").references(() => courts.id),
  scheduledAt: timestamp("scheduled_at"),
  status: matchStatusEnum("status").notNull().default("scheduled"),
  round: text("round"),
  bracketPosition: integer("bracket_position"),
  winnerId: varchar("winner_id").references(() => users.id),
  player1Sets: integer("player1_sets").default(0),
  player2Sets: integer("player2_sets").default(0),
  player1Games: text("player1_games"), // JSON array of games per set
  player2Games: text("player2_games"), // JSON array of games per set
  duration: integer("duration_minutes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const playerStats = pgTable("player_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => users.id),
  tournamentId: varchar("tournament_id").references(() => tournaments.id),
  matchesPlayed: integer("matches_played").notNull().default(0),
  matchesWon: integer("matches_won").notNull().default(0),
  matchesLost: integer("matches_lost").notNull().default(0),
  setsWon: integer("sets_won").notNull().default(0),
  setsLost: integer("sets_lost").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  gamesLost: integer("games_lost").notNull().default(0),
  avgMatchDuration: integer("avg_match_duration"),
  currentWinStreak: integer("current_win_streak").notNull().default(0),
  bestWinStreak: integer("best_win_streak").notNull().default(0),
  globalRanking: integer("global_ranking"),
  rankingPoints: integer("ranking_points").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organizedTournaments: many(tournaments),
  registrations: many(tournamentRegistrations),
  matchesAsPlayer1: many(matches, { relationName: "player1" }),
  matchesAsPlayer2: many(matches, { relationName: "player2" }),
  wonMatches: many(matches, { relationName: "winner" }),
  stats: many(playerStats),
  pairsAsPlayer1: many(padelPairs, { relationName: "player1" }),
  pairsAsPlayer2: many(padelPairs, { relationName: "player2" })
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  organizer: one(users, {
    fields: [tournaments.organizerId],
    references: [users.id]
  }),
  registrations: many(tournamentRegistrations),
  matches: many(matches)
}));

export const courtsRelations = relations(courts, ({ many }) => ({
  matches: many(matches)
}));

export const padelPairsRelations = relations(padelPairs, ({ one, many }) => ({
  player1: one(users, {
    fields: [padelPairs.player1Id],
    references: [users.id],
    relationName: "player1"
  }),
  player2: one(users, {
    fields: [padelPairs.player2Id],
    references: [users.id],
    relationName: "player2"
  }),
  registrations: many(tournamentRegistrations)
}));

export const tournamentRegistrationsRelations = relations(tournamentRegistrations, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentRegistrations.tournamentId],
    references: [tournaments.id]
  }),
  player: one(users, {
    fields: [tournamentRegistrations.playerId],
    references: [users.id]
  }),
  pair: one(padelPairs, {
    fields: [tournamentRegistrations.pairId],
    references: [padelPairs.id]
  })
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id]
  }),
  player1: one(users, {
    fields: [matches.player1Id],
    references: [users.id],
    relationName: "player1"
  }),
  player2: one(users, {
    fields: [matches.player2Id],
    references: [users.id],
    relationName: "player2"
  }),
  winner: one(users, {
    fields: [matches.winnerId],
    references: [users.id],
    relationName: "winner"
  }),
  court: one(courts, {
    fields: [matches.courtId],
    references: [courts.id]
  })
}));

export const playerStatsRelations = relations(playerStats, ({ one }) => ({
  player: one(users, {
    fields: [playerStats.playerId],
    references: [users.id]
  }),
  tournament: one(tournaments, {
    fields: [playerStats.tournamentId],
    references: [tournaments.id]
  })
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  maxPlayers: z.number().min(4).max(128),
  registrationFee: z.string().refine(val => parseFloat(val) >= 0, "Registration fee must be non-negative")
}).refine(
  data => data.endDate >= data.startDate,
  { message: "End date must be after start date", path: ["endDate"] }
);

export const updateTournamentSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  sport: z.enum(["padel", "racquetball"]).optional(),
  format: z.enum(["elimination", "round_robin", "groups"]).optional(),
  venue: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  maxPlayers: z.number().min(4).max(128).optional(),
  registrationFee: z.string().refine(val => parseFloat(val) >= 0, "Registration fee must be non-negative").optional()
}).refine(
  data => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  { message: "End date must be after start date", path: ["endDate"] }
);

export const insertCourtSchema = createInsertSchema(courts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPadelPairSchema = createInsertSchema(padelPairs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTournamentRegistrationSchema = createInsertSchema(tournamentRegistrations).omit({
  id: true,
  registeredAt: true
});

export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({
  id: true,
  updatedAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Court = typeof courts.$inferSelect;
export type InsertCourt = z.infer<typeof insertCourtSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type TournamentRegistration = typeof tournamentRegistrations.$inferSelect;
export type InsertTournamentRegistration = z.infer<typeof insertTournamentRegistrationSchema>;
export type PlayerStats = typeof playerStats.$inferSelect;
export type InsertPlayerStats = z.infer<typeof insertPlayerStatsSchema>;
export type PadelPair = typeof padelPairs.$inferSelect;
export type InsertPadelPair = z.infer<typeof insertPadelPairSchema>;
