import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["superadmin", "admin", "jugador", "organizador", "arbitro", "escrutador", "escribano"]);
export const tournamentRoleEnum = pgEnum("tournament_role", ["tournament_admin", "organizador", "arbitro", "escrutador", "jugador"]);
export const sportEnum = pgEnum("sport", ["padel", "racquetball"]);
export const matchTypeEnum = pgEnum("match_type", ["singles", "doubles"]);
export const teamEnum = pgEnum("team", ["1", "2"]);
export const padelCategoryEnum = pgEnum("padel_category", ["1a", "2a", "3a", "4a", "veteranos", "juvenil"]);
export const racquetballLevelEnum = pgEnum("racquetball_level", ["principiante", "intermedio", "avanzado", "profesional"]);
export const tournamentFormatEnum = pgEnum("tournament_format", ["elimination", "round_robin", "groups"]);
export const tournamentStatusEnum = pgEnum("tournament_status", ["draft", "registration", "active", "completed", "cancelled"]);
export const matchStatusEnum = pgEnum("match_status", ["scheduled", "in_progress", "completed", "cancelled"]);
export const courtStatusEnum = pgEnum("court_status", ["available", "maintenance", "blocked"]);
export const scheduledMatchStatusEnum = pgEnum("scheduled_match_status", ["programado", "confirmado", "en_curso", "completado", "cancelado"]);
export const statsSessionStatusEnum = pgEnum("stats_session_status", ["active", "paused", "completed", "cancelled"]);
export const matchEventTypeEnum = pgEnum("match_event_type", ["point_won", "fault", "ace", "double_fault", "winner", "error", "set_won", "game_won", "timeout", "appellation", "technical"]);
export const shotTypeEnum = pgEnum("shot_type", ["recto", "esquina", "cruzado", "punto"]);
export const aceSideEnum = pgEnum("ace_side", ["derecha", "izquierda"]);
export const appellationResultEnum = pgEnum("appellation_result", ["ganada", "perdida"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "waived"]);
export const tournamentTierEnum = pgEnum("tournament_tier", [
  "GS-1000", "GS-900", "IRT-800", "IRT-700",
  "SAT-600", "SAT-500", "SAT-400", "SAT-350", "SAT-250", "SAT-150",
  "DOB-800", "DOB-700", "DOB-600", "DOB-500"
]);
export const tournamentRoundEnum = pgEnum("tournament_round", [
  "128s", "64s", "32s", "16s", "quarterfinals", "semifinals", "final", "champion"
]);
export const matchCategoryEnum = pgEnum("match_category", [
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
]);

export const clubs = pgTable("clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  managerId: varchar("manager_id").references(() => users.id), // Manager of the club
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

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
  categories: matchCategoryEnum("categories").array(),
  photoUrl: text("photo_url"),
  nationality: text("nationality"),
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
  clubId: varchar("club_id").references(() => clubs.id),
  tier: tournamentTierEnum("tier"),
  prizePool: decimal("prize_pool", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  maxPlayers: integer("max_players").notNull(),
  registrationFee: decimal("registration_fee", { precision: 10, scale: 2 }).default("0"),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  timezone: text("timezone").notNull().default("America/Mexico_City"),
  matchRotationInterval: integer("match_rotation_interval").notNull().default(40000),
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
  clubId: varchar("club_id").notNull().references(() => clubs.id),
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
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  paymentVerifiedAt: timestamp("payment_verified_at"),
  paymentVerifiedBy: varchar("payment_verified_by").references(() => users.id),
  paymentNotes: text("payment_notes"),
  registeredAt: timestamp("registered_at").notNull().defaultNow()
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  matchType: matchTypeEnum("match_type").notNull().default("singles"),
  category: matchCategoryEnum("category"),
  player1Id: varchar("player1_id").notNull().references(() => users.id),
  player2Id: varchar("player2_id").notNull().references(() => users.id),
  player3Id: varchar("player3_id").references(() => users.id), // For doubles - team 1
  player3Name: text("player3_name"), // For non-registered players
  player4Id: varchar("player4_id").references(() => users.id), // For doubles - team 2
  player4Name: text("player4_name"), // For non-registered players
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

export const scheduledMatches = pgTable("scheduled_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  title: text("title").notNull(),
  description: text("description"),
  sport: sportEnum("sport").notNull(),
  matchType: matchTypeEnum("match_type").notNull().default("singles"),
  courtId: varchar("court_id").notNull().references(() => courts.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration_minutes").notNull().default(60),
  status: scheduledMatchStatusEnum("status").notNull().default("programado"),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  player1Id: varchar("player1_id").references(() => users.id),
  player1Name: text("player1_name"), // For non-registered players
  player2Id: varchar("player2_id").references(() => users.id),
  player2Name: text("player2_name"), // For non-registered players
  player3Id: varchar("player3_id").references(() => users.id), // For doubles - team 1
  player3Name: text("player3_name"),
  player4Id: varchar("player4_id").references(() => users.id), // For doubles - team 2
  player4Name: text("player4_name"),
  notes: text("notes"),
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
  singlesPlayed: integer("singles_played").notNull().default(0),
  singlesWon: integer("singles_won").notNull().default(0),
  singlesLost: integer("singles_lost").notNull().default(0),
  doublesPlayed: integer("doubles_played").notNull().default(0),
  doublesWon: integer("doubles_won").notNull().default(0),
  doublesLost: integer("doubles_lost").notNull().default(0),
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

export const matchStatsSessions = pgTable("match_stats_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => matches.id, { onDelete: 'cascade' }),
  startedBy: varchar("started_by").notNull().references(() => users.id),
  status: statsSessionStatusEnum("status").notNull().default("active"),
  sport: sportEnum("sport").notNull(),
  matchType: matchTypeEnum("match_type").notNull().default("singles"),
  // Team composition - player1/2 are team leaders, player3/4 are partners in doubles
  player1Id: varchar("player1_id").references(() => users.id), // Team 1 leader
  player1Name: text("player1_name"), // For non-registered players
  player2Id: varchar("player2_id").references(() => users.id), // Team 2 leader
  player2Name: text("player2_name"), // For non-registered players
  player3Id: varchar("player3_id").references(() => users.id), // Team 1 partner (doubles only)
  player3Name: text("player3_name"), // For non-registered players
  player4Id: varchar("player4_id").references(() => users.id), // Team 2 partner (doubles only)
  player4Name: text("player4_name"), // For non-registered players
  currentSet: integer("current_set").notNull().default(1),
  player1CurrentScore: text("player1_current_score").default("0"), // Team 1 score
  player2CurrentScore: text("player2_current_score").default("0"), // Team 2 score
  player1Sets: integer("player1_sets").default(0), // Team 1 sets
  player2Sets: integer("player2_sets").default(0), // Team 2 sets
  player1Games: text("player1_games"), // Team 1 games per set
  player2Games: text("player2_games"), // Team 2 games per set
  // Open IRT fields for racquetball
  serverId: varchar("server_id").references(() => users.id), // Who is currently serving (specific player)
  initialServers: text("initial_servers").default("[]"), // JSON array of initial server IDs per set [set1ServerId, set2ServerId, set3ServerId]
  coinFlipWinner: varchar("coin_flip_winner"), // Who won the coin flip (determines set 1 server)
  player1TimeoutsUsed: text("player1_timeouts_used").default("[]"), // JSON array per set [0,0,0] - Team 1
  player2TimeoutsUsed: text("player2_timeouts_used").default("[]"), // JSON array per set - Team 2
  player1AppellationsUsed: text("player1_appellations_used").default("[]"), // JSON array per set - Team 1
  player2AppellationsUsed: text("player2_appellations_used").default("[]"), // JSON array per set - Team 2
  player1Technicals: integer("player1_technicals").default(0), // 0-3 - Team 1
  player2Technicals: integer("player2_technicals").default(0), // 0-3 - Team 2
  matchEndedByTechnical: boolean("match_ended_by_technical").default(false),
  matchWinner: varchar("match_winner"), // Winning team leader ID (player1Id or player2Id)
  timeoutStartedAt: timestamp("timeout_started_at"), // For 1-minute timer
  timeoutPlayerId: varchar("timeout_player_id").references(() => users.id), // Specific player requesting timeout
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at")
});

export const matchEvents = pgTable("match_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => matchStatsSessions.id, { onDelete: 'cascade' }),
  eventType: matchEventTypeEnum("event_type").notNull(),
  playerId: varchar("player_id").references(() => users.id), // Specific player who performed action
  team: teamEnum("team"), // Denormalized: which team (1 or 2) for easy querying
  setNumber: integer("set_number").notNull(),
  gameNumber: integer("game_number"),
  player1Score: text("player1_score"), // Team 1 score
  player2Score: text("player2_score"), // Team 2 score
  // Open IRT fields for racquetball
  shotType: shotTypeEnum("shot_type"), // recto, esquina, cruzado, punto
  aceSide: aceSideEnum("ace_side"), // derecha, izquierda (for ace events)
  appellationResult: appellationResultEnum("appellation_result"), // ganada, perdida (for appellation events)
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const statShareTokens = pgTable("stat_share_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(),
  ownerUserId: varchar("owner_user_id").notNull().references(() => users.id),
  targetPlayerId: varchar("target_player_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const tournamentUserRoles = pgTable("tournament_user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: tournamentRoleEnum("role").notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  // Composite unique index to prevent duplicate role assignments
  uniqueUserTournamentRole: sql`UNIQUE (${table.tournamentId}, ${table.userId}, ${table.role})`
}));

export const irtPointsConfig = pgTable("irt_points_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tier: tournamentTierEnum("tier").notNull(),
  matchType: matchTypeEnum("match_type").notNull().default("singles"),
  round: tournamentRoundEnum("round").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueTierRound: sql`UNIQUE (${table.tier}, ${table.matchType}, ${table.round})`
}));

export const playerRankingHistory = pgTable("player_ranking_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tournamentId: varchar("tournament_id").references(() => tournaments.id, { onDelete: 'cascade' }),
  matchId: varchar("match_id").references(() => matches.id, { onDelete: 'set null' }),
  tier: tournamentTierEnum("tier"),
  matchType: matchTypeEnum("match_type"),
  round: tournamentRoundEnum("round"),
  result: text("result"),
  points: integer("points").notNull(),
  notes: text("notes"),
  awardedBy: varchar("awarded_by").references(() => users.id, { onDelete: 'set null' }),
  isManualAdjustment: boolean("is_manual_adjustment").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const tournamentSponsors = pgTable("tournament_sponsors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
  websiteUrl: text("website_url"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Relations
export const clubsRelations = relations(clubs, ({ one, many }) => ({
  manager: one(users, {
    fields: [clubs.managerId],
    references: [users.id]
  }),
  courts: many(courts),
  tournaments: many(tournaments)
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  managedClubs: many(clubs),
  organizedTournaments: many(tournaments),
  registrations: many(tournamentRegistrations),
  matchesAsPlayer1: many(matches, { relationName: "player1" }),
  matchesAsPlayer2: many(matches, { relationName: "player2" }),
  wonMatches: many(matches, { relationName: "winner" }),
  stats: many(playerStats),
  pairsAsPlayer1: many(padelPairs, { relationName: "player1" }),
  pairsAsPlayer2: many(padelPairs, { relationName: "player2" }),
  organizedScheduledMatches: many(scheduledMatches, { relationName: "organizer" }),
  scheduledMatchesAsPlayer1: many(scheduledMatches, { relationName: "player1" }),
  scheduledMatchesAsPlayer2: many(scheduledMatches, { relationName: "player2" }),
  scheduledMatchesAsPlayer3: many(scheduledMatches, { relationName: "player3" }),
  scheduledMatchesAsPlayer4: many(scheduledMatches, { relationName: "player4" }),
  tournamentRoles: many(tournamentUserRoles),
  assignedRoles: many(tournamentUserRoles, { relationName: "assigner" })
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  organizer: one(users, {
    fields: [tournaments.organizerId],
    references: [users.id]
  }),
  club: one(clubs, {
    fields: [tournaments.clubId],
    references: [clubs.id]
  }),
  registrations: many(tournamentRegistrations),
  matches: many(matches),
  scheduledMatches: many(scheduledMatches),
  userRoles: many(tournamentUserRoles),
  sponsors: many(tournamentSponsors)
}));

export const courtsRelations = relations(courts, ({ one, many }) => ({
  club: one(clubs, {
    fields: [courts.clubId],
    references: [clubs.id]
  }),
  matches: many(matches),
  scheduledMatches: many(scheduledMatches)
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

export const scheduledMatchesRelations = relations(scheduledMatches, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [scheduledMatches.tournamentId],
    references: [tournaments.id]
  }),
  court: one(courts, {
    fields: [scheduledMatches.courtId],
    references: [courts.id]
  }),
  organizer: one(users, {
    fields: [scheduledMatches.organizerId],
    references: [users.id],
    relationName: "organizer"
  }),
  player1: one(users, {
    fields: [scheduledMatches.player1Id],
    references: [users.id],
    relationName: "player1"
  }),
  player2: one(users, {
    fields: [scheduledMatches.player2Id],
    references: [users.id],
    relationName: "player2"
  }),
  player3: one(users, {
    fields: [scheduledMatches.player3Id],
    references: [users.id],
    relationName: "player3"
  }),
  player4: one(users, {
    fields: [scheduledMatches.player4Id],
    references: [users.id],
    relationName: "player4"
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

export const matchStatsSessionsRelations = relations(matchStatsSessions, ({ one, many }) => ({
  match: one(matches, {
    fields: [matchStatsSessions.matchId],
    references: [matches.id]
  }),
  startedByUser: one(users, {
    fields: [matchStatsSessions.startedBy],
    references: [users.id]
  }),
  events: many(matchEvents)
}));

export const matchEventsRelations = relations(matchEvents, ({ one }) => ({
  session: one(matchStatsSessions, {
    fields: [matchEvents.sessionId],
    references: [matchStatsSessions.id]
  }),
  player: one(users, {
    fields: [matchEvents.playerId],
    references: [users.id]
  })
}));

export const tournamentUserRolesRelations = relations(tournamentUserRoles, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentUserRoles.tournamentId],
    references: [tournaments.id]
  }),
  user: one(users, {
    fields: [tournamentUserRoles.userId],
    references: [users.id]
  }),
  assigner: one(users, {
    fields: [tournamentUserRoles.assignedBy],
    references: [users.id],
    relationName: "assigner"
  })
}));

export const tournamentSponsorsRelations = relations(tournamentSponsors, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentSponsors.tournamentId],
    references: [tournaments.id]
  })
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  categories: z.array(z.enum([
    "PRO_SINGLES_IRT", "DOBLES_OPEN", "AMATEUR_A", "AMATEUR_B", "AMATEUR_C",
    "PRINCIPIANTES", "JUVENIL_18_VARONIL", "JUVENIL_18_FEMENIL", "DOBLES_AB",
    "DOBLES_BC", "MASTER_35", "MASTER_55", "DOBLES_MASTER_35"
  ])).max(3, "Máximo 3 categorías permitidas").optional().nullable()
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
  timezone: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  maxPlayers: z.number().min(4).max(128).optional(),
  registrationFee: z.string().refine(val => parseFloat(val) >= 0, "Registration fee must be non-negative").optional()
}).refine(
  data => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  { message: "End date must be after start date", path: ["endDate"] }
);

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCourtSchema = createInsertSchema(courts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

const baseMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  scheduledAt: z.coerce.date().optional().nullable()
});

export const insertMatchSchema = baseMatchSchema.refine(
  (data) => {
    // matches table: player1/2 are always IDs (required), player3/4 can be ID or Name
    const hasPlayer1 = !!data.player1Id;
    const hasPlayer2 = !!data.player2Id;
    const hasPlayer3 = !!(data.player3Id || data.player3Name);
    const hasPlayer4 = !!(data.player4Id || data.player4Name);
    
    if (data.matchType === 'doubles') {
      return hasPlayer1 && hasPlayer2 && hasPlayer3 && hasPlayer4;
    } else {
      return hasPlayer1 && hasPlayer2 && !hasPlayer3 && !hasPlayer4;
    }
  },
  {
    message: "Singles requiere exactamente 2 jugadores, Doubles requiere exactamente 4 jugadores",
    path: ["matchType"]
  }
);

export const updateMatchSchema = baseMatchSchema.partial();

export const insertPadelPairSchema = createInsertSchema(padelPairs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTournamentRegistrationSchema = createInsertSchema(tournamentRegistrations).omit({
  id: true,
  registeredAt: true,
  paymentVerifiedAt: true,
  paymentVerifiedBy: true
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(["pending", "paid", "waived"]),
  paymentNotes: z.string().optional()
});

export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({
  id: true,
  updatedAt: true
});

const baseScheduledMatchSchema = createInsertSchema(scheduledMatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  scheduledDate: z.coerce.date(),
  duration: z.number().min(30).max(180, "La duración debe estar entre 30 y 180 minutos")
});

export const insertScheduledMatchSchema = baseScheduledMatchSchema.refine(
  (data) => {
    const playerCount = [data.player1Id, data.player1Name, data.player2Id, data.player2Name, data.player3Id, data.player3Name, data.player4Id, data.player4Name].filter(Boolean).length;
    if (data.matchType === 'doubles') {
      return playerCount === 4;
    } else {
      return playerCount === 2;
    }
  },
  {
    message: "Singles requiere exactamente 2 jugadores, Doubles requiere exactamente 4 jugadores",
    path: ["matchType"]
  }
);

export const updateScheduledMatchSchema = baseScheduledMatchSchema.partial();

export const insertMatchStatsSessionSchema = createInsertSchema(matchStatsSessions).omit({
  id: true,
  startedAt: true,
  completedAt: true
});

export const insertMatchEventSchema = createInsertSchema(matchEvents).omit({
  id: true,
  createdAt: true
});

export const insertStatShareTokenSchema = createInsertSchema(statShareTokens).omit({
  id: true,
  createdAt: true
}).extend({
  expiresAt: z.coerce.date().optional().nullable()
});

export const insertTournamentUserRoleSchema = createInsertSchema(tournamentUserRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertIrtPointsConfigSchema = createInsertSchema(irtPointsConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPlayerRankingHistorySchema = createInsertSchema(playerRankingHistory).omit({
  id: true,
  createdAt: true
});

export const insertTournamentSponsorSchema = createInsertSchema(tournamentSponsors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Category mapping for Excel import - accepts both friendly names and enum values
export const CATEGORY_MAPPING: Record<string, string> = {
  // Friendly names (as they appear in Excel)
  "PRO Singles IRT": "PRO_SINGLES_IRT",
  "Dobles Open": "DOBLES_OPEN",
  "Amateur A": "AMATEUR_A",
  "Amateur B": "AMATEUR_B",
  "Amateur C": "AMATEUR_C",
  "Principiantes": "PRINCIPIANTES",
  "Juvenil 18 y menores (Varonil)": "JUVENIL_18_VARONIL",
  "Juvenil 18 y menores (Femenil)": "JUVENIL_18_FEMENIL",
  "Dobles AB": "DOBLES_AB",
  "Dobles BC": "DOBLES_BC",
  "Master 35+": "MASTER_35",
  "Master 55+": "MASTER_55",
  "Dobles Master 35+": "DOBLES_MASTER_35",
  // Enum values (direct match)
  "PRO_SINGLES_IRT": "PRO_SINGLES_IRT",
  "DOBLES_OPEN": "DOBLES_OPEN",
  "AMATEUR_A": "AMATEUR_A",
  "AMATEUR_B": "AMATEUR_B",
  "AMATEUR_C": "AMATEUR_C",
  "PRINCIPIANTES": "PRINCIPIANTES",
  "JUVENIL_18_VARONIL": "JUVENIL_18_VARONIL",
  "JUVENIL_18_FEMENIL": "JUVENIL_18_FEMENIL",
  "DOBLES_AB": "DOBLES_AB",
  "DOBLES_BC": "DOBLES_BC",
  "MASTER_35": "MASTER_35",
  "MASTER_55": "MASTER_55",
  "DOBLES_MASTER_35": "DOBLES_MASTER_35",
};

// Excel Import Schemas - accept string and transform using mapping
export const excelPlayerSinglesSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  categoria: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const mapped = CATEGORY_MAPPING[val];
    if (!mapped) {
      throw new Error(`Categoría "${val}" no válida. Categorías válidas: PRO Singles IRT, Dobles Open, Amateur A, Amateur B, Amateur C, Principiantes, Juvenil 18 y menores (Varonil), Juvenil 18 y menores (Femenil), Dobles AB, Dobles BC, Master 35+, Master 55+, Dobles Master 35+`);
    }
    return mapped as "PRO_SINGLES_IRT" | "DOBLES_OPEN" | "AMATEUR_A" | "AMATEUR_B" | "AMATEUR_C" | "PRINCIPIANTES" | "JUVENIL_18_VARONIL" | "JUVENIL_18_FEMENIL" | "DOBLES_AB" | "DOBLES_BC" | "MASTER_35" | "MASTER_55" | "DOBLES_MASTER_35";
  })
});

export const excelPlayerDoublesSchema = z.object({
  nombrePareja1: z.string().min(1, "Nombre Pareja 1 es requerido"),
  nombrePareja2: z.string().min(1, "Nombre Pareja 2 es requerido"),
  categoria: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const mapped = CATEGORY_MAPPING[val];
    if (!mapped) {
      throw new Error(`Categoría "${val}" no válida. Categorías válidas: PRO Singles IRT, Dobles Open, Amateur A, Amateur B, Amateur C, Principiantes, Juvenil 18 y menores (Varonil), Juvenil 18 y menores (Femenil), Dobles AB, Dobles BC, Master 35+, Master 55+, Dobles Master 35+`);
    }
    return mapped as "PRO_SINGLES_IRT" | "DOBLES_OPEN" | "AMATEUR_A" | "AMATEUR_B" | "AMATEUR_C" | "PRINCIPIANTES" | "JUVENIL_18_VARONIL" | "JUVENIL_18_FEMENIL" | "DOBLES_AB" | "DOBLES_BC" | "MASTER_35" | "MASTER_55" | "DOBLES_MASTER_35";
  })
});

export const excelMatchSinglesSchema = z.object({
  fecha: z.string().min(1, "Fecha es requerida"),
  hora: z.string().min(1, "Hora es requerida"),
  modalidad: z.literal("Singles"),
  jugador1: z.string().min(1, "Jugador 1 es requerido"),
  jugador2: z.string().min(1, "Jugador 2 es requerido")
});

export const excelMatchDoublesSchema = z.object({
  fecha: z.string().min(1, "Fecha es requerida"),
  hora: z.string().min(1, "Hora es requerida"),
  modalidad: z.literal("Doubles"),
  nombrePareja1: z.string().min(1, "Nombre Pareja 1 es requerido"),
  nombrePareja2: z.string().min(1, "Nombre Pareja 2 es requerido"),
  nombreRival1: z.string().min(1, "Nombre Rival 1 es requerido"),
  nombreRival2: z.string().min(1, "Nombre Rival 2 es requerido")
});

// Types
export type Club = typeof clubs.$inferSelect;
export type InsertClub = z.infer<typeof insertClubSchema>;
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
export type ScheduledMatch = typeof scheduledMatches.$inferSelect;
export type InsertScheduledMatch = z.infer<typeof insertScheduledMatchSchema>;
export type MatchStatsSession = typeof matchStatsSessions.$inferSelect;
export type InsertMatchStatsSession = z.infer<typeof insertMatchStatsSessionSchema>;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type InsertMatchEvent = z.infer<typeof insertMatchEventSchema>;
export type StatShareToken = typeof statShareTokens.$inferSelect;
export type InsertStatShareToken = z.infer<typeof insertStatShareTokenSchema>;
export type TournamentUserRole = typeof tournamentUserRoles.$inferSelect;
export type InsertTournamentUserRole = z.infer<typeof insertTournamentUserRoleSchema>;
export type IrtPointsConfig = typeof irtPointsConfig.$inferSelect;
export type InsertIrtPointsConfig = z.infer<typeof insertIrtPointsConfigSchema>;
export type PlayerRankingHistory = typeof playerRankingHistory.$inferSelect;
export type InsertPlayerRankingHistory = z.infer<typeof insertPlayerRankingHistorySchema>;
export type TournamentSponsor = typeof tournamentSponsors.$inferSelect;
export type InsertTournamentSponsor = z.infer<typeof insertTournamentSponsorSchema>;
export type ExcelPlayerSingles = z.infer<typeof excelPlayerSinglesSchema>;
export type ExcelPlayerDoubles = z.infer<typeof excelPlayerDoublesSchema>;
export type ExcelMatchSingles = z.infer<typeof excelMatchSinglesSchema>;
export type ExcelMatchDoubles = z.infer<typeof excelMatchDoublesSchema>;
export type UpdatePaymentStatus = z.infer<typeof updatePaymentStatusSchema>;
