# Overview
This project is a comprehensive sports tournament management system specifically for **racquetball**, built with a full-stack TypeScript architecture. It offers extensive features for tournament administration, including user and role management (admin, player, organizer, referee, scrutineer), tournament creation, match scheduling, court management, and detailed player statistics tracking with shot-type analysis. The system aims to streamline tournament operations and enhance the overall experience for organizers and participants. Padel support is preserved in the backend schema for historical data but is hidden from all UI forms and selectors, ensuring a racquetball-only user experience.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is a React 18 application built with TypeScript, using Vite, Tailwind CSS, and `shadcn/ui`. It leverages `React Query` for server state management, `Wouter` for routing, and the `Context API` for authentication. A consistent `AppShell` with a Sidebar and Header provides layout. Root routing dynamically redirects users based on authentication state and role.

## Backend Architecture
The backend is an Express.js application with TypeScript, designed with a modular structure. It uses `Passport.js` with a Local Strategy for authentication, `scrypt` for password hashing, and session-based authentication with PostgreSQL storage. `Zod` is used for type-safe data validation. A centralized error handling system preserves backend-specific messages and provides Spanish translations for common HTTP errors.

## Database Design
The system uses PostgreSQL with Drizzle ORM. The schema includes tables for `Users` (with role-based permissions), `Tournaments`, `Courts`, `Matches`, `Tournament Registrations`, and `Player Statistics`, connected via one-to-many and many-to-many relationships.

## Authentication & Authorization
The system implements session-based authentication with a hierarchical multi-tenant role-based access control. Password hashing is done using Node.js `crypto.scrypt` and sessions are managed with `Express-session` using a PostgreSQL store.

**Multi-Tenant Role System**:
- **Global Roles**: `superadmin` (platform-wide access).
- **Tournament-Scoped Roles**: `tournament_admin`, `organizador`, `arbitro`, `escrutador`, `jugador` (permissions within a specific tournament).

**Authorization Architecture**: All backend endpoints follow a consistent authorization pattern involving authentication checks, resource existence verification, and permission validation based on global and tournament-scoped roles (`isSuperAdmin`, `canManageTournament`, `canAssignRole`).

## Specific Features
-   **Real-Time Match Statistics Capture**: Live scoring module with racquetball-specific logic, granular event recording including shot types, and serve tracking. Authorized roles include: superadmin, admin (global), and tournament_admin, organizador, arbitro, escrutador (tournament-scoped). The authorization system properly waits for role data to load before evaluating permissions, preventing premature redirects.
-   **Open IRT Format Implementation**: Specialized scoring logic for International Racquetball Tour (IRT) including server-only scoring, two-panel interface, timeout management, appellation system, technical foul tracking with automatic match termination at 3 technicals, undo functionality to revert the last action, and fault/double-fault tracking for serve statistics.
-   **Enhanced Statistics Module**: Tracks shot-type breakdown (recto, esquina, cruzado, punto), serve effectiveness (ace tracking by side with percentage-based badges and color-coded performance tiers), and aggregates summary metrics from completed matches. Statistics capture from this view updates the scoreboard in real-time. When a session is completed, player statistics are automatically updated with match results (wins/losses, sets won/lost) for all participants (1-4 players depending on match type). The statistics module displays comprehensive metrics including win/loss records, set statistics, shot-type percentages, and ace effectiveness. **Singles/Doubles Differentiation**: Player statistics now track singles and doubles performance separately with dedicated counters (singlesPlayed/Won/Lost, doublesPlayed/Won/Lost), allowing detailed analysis of player performance by match type. In doubles matches, team structure is player1+player3 vs player2+player4, with both teammates receiving identical match outcome updates. Only data from completed sessions is included in the aggregated statistics to ensure accuracy. Completed sessions are locked from further modifications to maintain data integrity.
-   **Comprehensive CRUD**: Full Create, Read, Update, Delete functionality for tournaments and matches with role-based access controls.
-   **Bracket Generation**: System for generating tournament brackets with transactional safety.
-   **Racquetball-Only UI**: Padel-related elements are hidden from the UI, maintaining focus on racquetball.
-   **Tournament Doubles Integration**: Supports creating, editing, and viewing both singles and doubles matches with conditional player fields, Zod validation for unique players in doubles, modality badges, and team-based formatting. Player lists auto-refresh.
-   **Excel Import Module**: Bulk import functionality for players and matches (Singles/Doubles) with automatic data processing, player creation, and tournament registration. It includes downloadable templates, Zod validation with detailed error reporting, and a results preview. Authorization is restricted to SuperAdmin and Tournament Admin roles.
-   **Tournament-Scoped Calendar System**: Integrated calendar module accessible via sidebar menu with role-based filtering. Players view only their scheduled matches, while admins can create, edit, and delete matches within specific tournaments. SuperAdmins and Admins have access to a global "All Tournaments" view showing all scheduled matches for a selected date across all tournaments, grouped by tournament for easy overview. Calendar displays matches in the tournament's configured timezone, ensuring matches appear on the correct date regardless of server timezone. Uses `formatInTimeZone` from `date-fns-tz` for timezone-aware date formatting.
-   **Tournament Timezone Support**: Each tournament can have its own timezone setting (configurable by SuperAdmins during tournament creation/editing). Supported timezones include major cities in Mexico, USA, Latin America, and Europe. Default timezone is America/Mexico_City. Backend queries use `formatInTimeZone` for timezone-aware date filtering, expanding search window by ±14/12 hours to cover all global timezones and filtering results to match the target date in each tournament's timezone.
-   **IRT Ranking System**: Official International Racquetball Tour (IRT) ranking points system with automatic calculation and permanent point accumulation. Tournaments can be assigned tiers (Grand Slam 1000/900, Tier 1 800/700, Satellites 600-150, Doubles Pro 800-500) which determine point values. Points are automatically calculated and awarded when matches are completed based on tournament tier, match type (singles/doubles), round reached (128s through champion), and match result (win/loss). The system includes dedicated tables for IRT point configuration (irtPointsConfig) and player ranking history (playerRankingHistory) tracking every point award with full tournament/match context. Global ranking view displays top 100 players ordered by cumulative IRT points with match statistics and win rates. Points never expire and accumulate permanently. SuperAdmins can manually adjust points with reason tracking for special cases (penalties, corrections, bonus points). All point awards are logged in history with timestamps, tournament context, and result details for complete audit trails.
-   **Match and Player Categories**: Comprehensive categorization system with 13 official competition categories. Players can be assigned a category (optional) and matches can be categorized during creation. Categories include: PRO Singles IRT, Dobles Open, Amateur A/B/C, Principiantes, Juvenil 18 y menores (Varonil/Femenil), Dobles AB/BC, Master 35+/55+, and Dobles Master 35+. Category badges are displayed in match listings and user tables.
-   **Player Profile Enhancement**: Players can now have a profile photo (URL), nationality (with flag display), and assigned category. User management interface shows player photos, country flags, and categories in a visually enhanced table format. User forms include fields for photo URL input, nationality selector with 20+ countries, and category dropdown.

# External Dependencies
-   **Neon PostgreSQL**: Serverless PostgreSQL database.
-   **Drizzle ORM**: Type-safe ORM for PostgreSQL.
-   **connect-pg-simple**: PostgreSQL session store.
-   **Radix UI**: Accessible component primitives.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Lucide React**: Icon library.
-   **Vite**: Build tool and development server.
-   **TypeScript**: Static type checking.
-   **ESBuild**: Fast bundler.
-   **Passport.js**: Authentication middleware.
-   **Zod**: Runtime type validation.
-   **drizzle-zod**: Drizzle and Zod integration.
-   **TanStack Query**: Server state management.
-   **React Hook Form**: Form state management.
-   **@hookform/resolvers**: Zod integration for form validation.
-   **xlsx**: Library for Excel parsing.
-   **multer**: For file uploads.