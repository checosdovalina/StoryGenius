# Overview

This project is a comprehensive sports tournament management system for **racquetball**, built with a full-stack TypeScript architecture. It offers extensive features for tournament administration including user and role management (admin, player, organizer, referee, scrutineer), tournament creation, match scheduling, court management, and detailed player statistics tracking with shot-type analysis. The system aims to streamline tournament operations and enhance the overall experience for organizers and participants. **Note**: Padel support is preserved in the backend schema for historical data but hidden from all UI forms and selectors (racquetball-only system).

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is a React 18 application built with TypeScript, using Vite for development and Tailwind CSS for styling. It leverages a component-based architecture with `shadcn/ui` for consistent design. Key decisions include `React Query` for server state management, `Wouter` for lightweight routing, and `Context API` for authentication.

**Navigation System**: The application uses a URL-based routing system with dedicated routes for each module (`/dashboard`, `/tournaments`, `/users`, etc.) managed through a centralized route configuration (`lib/routes.ts`). An `AppShell` component provides consistent layout (Sidebar + Header) across all pages. The Sidebar uses `wouter`'s `Link` and `useLocation` for navigation, ensuring the menu works from any page including tournament details and stats capture.

**Root Routing**: The root path `/` uses a `RootRedirect` component that inspects authentication state and performs role-based redirects:
- Unauthenticated users → `/auth`
- Jugadores → `/my-tournaments`
- All other roles → `/dashboard`
- Shows loading spinner during authentication check

## Backend Architecture
The backend is an Express.js application with TypeScript, designed with a modular structure. It uses `Passport.js` with a Local Strategy for authentication, `scrypt` for password hashing, and session-based authentication with PostgreSQL storage. A modular storage layer and `Zod` for type-safe data validation are also core components.

**Error Handling**: Centralized error handling system (`client/src/lib/error-handler.ts` + `queryClient.ts`) that:
- Preserves backend-specific error messages for validation and business logic errors (4xx)
- Provides Spanish translations as fallback for common HTTP errors (401, 403, 404, 500)
- Normalizes diverse response formats (JSON with message/error/detail/errors keys, plain text, arrays, objects)
- Attaches HTTP status metadata to Error objects for conditional logic (`is403Error` helper)
- Integrates automatically with all React Query queries and mutations via global error handlers

## Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe operations. The schema includes tables for `Users` (with role-based permissions), `Tournaments` (supporting various formats and sports), `Courts` (with status management), `Matches` (for bracket management and scoring), `Tournament Registrations`, and `Player Statistics`. Relationships include one-to-many and many-to-many connections between these entities.

## Authentication & Authorization
Session-based authentication with **hierarchical multi-tenant role-based access control** is implemented. This includes secure password hashing using Node.js `crypto.scrypt`, `Express-session` with a PostgreSQL store, client-side route protection, and dynamic UI rendering based on user roles.

### Multi-Tenant Role System
The system implements a hierarchical role architecture with two layers:

**Global Roles** (`users.role`):
- `superadmin`: Reserved exclusively for platform administrators with global access to all tournaments, clubs, courts, and system-level user management.
- Legacy `admin`: Preserved for backward compatibility with existing global user management endpoints only.

**Tournament-Scoped Roles** (`tournament_user_roles` table):
- `tournament_admin`: Full management permissions within their assigned tournament (manage matches, players, brackets, stats sessions)
- `organizador`: Tournament organizer with limited management capabilities
- `arbitro`: Referee role for match officiating
- `escrutador`: Scrutineer role for statistics capture
- `jugador`: Player role for tournament participation

### Authorization Architecture
All backend endpoints follow a consistent authorization pattern:
1. **Authentication check**: `req.isAuthenticated()` → 401 if not authenticated
2. **Resource existence verification**: Fetch resource to verify it exists → 404 if not found
3. **Permission validation**: 
   - `storage.isSuperAdmin(userId)` for global operations (create tournaments, manage clubs/courts)
   - `storage.canManageTournament(userId, tournamentId)` for tournament-scoped operations
   - `storage.canAssignRole(userId, roleToAssign, tournamentId)` for role assignment with hierarchical validation
4. **Action execution**: Perform the requested operation

### Authorization Helpers (`server/storage.ts`)
- `isSuperAdmin(userId)`: Checks if user has global superadmin role
- `canManageTournament(userId, tournamentId)`: Validates if user is superadmin OR has tournament_admin role for the specific tournament
- `canAssignRole(userId, role, tournamentId)`: Hierarchical permission check ensuring:
  - Only superadmin can assign superadmin role (blocked)
  - Only superadmin can assign tournament_admin role
  - Tournament admins can assign any role except superadmin and tournament_admin within their tournament
- `getUserTournamentRoles(userId, tournamentId)`: Retrieves all tournament-scoped roles for a user

### Security Features
- **Cross-tenant isolation**: Tournament admins cannot access or modify resources from other tournaments
- **Hierarchical role enforcement**: Lower-privilege roles cannot elevate themselves or assign higher-privilege roles
- **Composite unique index**: `(tournamentId, userId, role)` prevents duplicate role assignments
- **Cascade deletion**: Removing a tournament automatically cleans up associated role assignments

## Specific Features
- **Real-Time Match Statistics Capture**: Live scoring module for admin and scrutineer roles with racquetball-specific logic, WebSocket for real-time updates, and granular event recording including shot types and serve tracking.
- **Open IRT Format Implementation for Racquetball**: Specialized scoring logic for International Racquetball Tour (IRT) including server-only scoring, two-panel interface, timeout management, appellation system, and technical foul tracking.
- **Enhanced Statistics Module**: 
  - Tabbed interface for personal stats and a captures tab for admins/scrutineers
  - **Shot-type breakdown**: Tracks recto, esquina, cruzado, punto for detailed analytics
  - **Serve effectiveness**: Ace tracking by side (derecha/izquierda) with percentage-based effectiveness badges
  - **Color-coded performance tiers**: Visual indicators for serve effectiveness (Excellent ≥70%, Good ≥50%, Fair ≥30%, Poor <30%)
  - Summary metrics aggregated from all completed match events
  - **Stats capture from Statistics view**: Captures launched from the Statistics tab update scoreboard in real-time via mutation-based session state updates, working independently of WebSocket broadcasts
- **Comprehensive CRUD**: Full Create, Read, Update, Delete functionality for tournaments and matches, with role-based access controls for admins and organizers.
- **Bracket Generation**: System for generating tournament brackets with transactional safety.
- **Racquetball-Only UI**: Padel hidden from all tournament creation, court management, and calendar forms while preserving backend schema for historical data. Legacy padel matches display with "(Legacy)" badge in calendar view.
- **Tournament Doubles Integration**: Tournament detail page supports creating, editing, and viewing both singles and doubles matches:
  - Match creation/edit forms include modalidad selector (Singles/Doubles) with conditional player fields
  - Doubles matches require 4 unique players with Zod validation (player1 & player3 vs player2 & player4)
  - Match list displays modality badge and team-based formatting for doubles
  - Winner highlighting works for both individual (singles) and team (doubles) scenarios
  - **Auto-refreshing player lists**: Player queries in match forms use `refetchInterval` (30s) and `refetchOnWindowFocus` to automatically display newly registered players

# Recent Changes (November 2025)

## Multi-Tenant Role System Implementation
- ✅ Backend refactored to use hierarchical role system (superadmin + tournament-scoped roles)
- ✅ Authorization helpers: `isSuperAdmin`, `canManageTournament`, `canAssignRole`, `getSuperAdmins`, `isOnlySuperAdmin`
- ✅ All endpoints refactored for multi-tenant authorization
- ✅ UI for role management in tournament detail page (Roles tab)
  - Tab now visible for both SuperAdmin and Tournament Admin roles
  - Backend validates permissions via `canManageTournament` helper
  - GET /api/tournaments/:id includes `canManage` flag in response
- ✅ Navigation updated to support superadmin role
- ✅ Centralized error handling system with Spanish translations and backend message preservation
- ✅ Global user management UI with role-based permissions (SuperAdmin & Admin)
  - Defense-in-depth security: gate checks, defensive mutations, auto-reset on permission change
  - Tournament-scoped roles displayed as read-only badges
  - Protection against last-superadmin deletion/demotion
  - Admin legacy cannot modify/delete superadmin users
- ✅ Tournament access control with role-based filtering
  - GET /api/tournaments filters tournaments by user access
  - SuperAdmin sees all tournaments
  - Other users only see tournaments where they have assigned roles or are registered as players
  - `getUserTournaments()` method combines tournament_user_roles and tournament_registrations

## Known Limitations & Future Improvements

### Navigation System
**Current Implementation**: Navigation sidebar uses only `users.role` (global role) to determine visible routes.

**Limitation**: Users with tournament-scoped roles (e.g., `tournament_admin`, `arbitro`, `escrutador`) may not see relevant navigation options because their global role is typically `jugador`.

**Recommended Future Enhancement** (from architecture review):
Implement a **capability-based navigation service** that:
1. Queries both `users.role` AND `tournament_user_roles` for the current user
2. Resolves combined capabilities (e.g., `resolveUserCapabilities(user, tournamentRoles[])`)
3. Updates navigation logic to use capabilities instead of simple role checks
4. Allows tournament admins and scoped officials to see management routes for their assigned tournaments

**Acceptance Criteria for Future Implementation**:
- SuperAdmin: sees all global routes
- Tournament Admin: sees tournament management routes for assigned tournaments
- Scoped officials (arbitro, escrutador): see match-result workflows for their tournaments
- Players without scoped roles: retain current experience

**Workaround**: Tournament Admins can access their tournament management directly via URL `/tournaments/:id` where backend `canManage` checks work correctly.

# External Dependencies

- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle ORM**: Type-safe ORM for PostgreSQL.
- **connect-pg-simple**: PostgreSQL session store for Express.
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Vite**: Build tool and development server.
- **TypeScript**: Static type checking.
- **ESBuild**: Fast bundler.
- **Passport.js**: Authentication middleware.
- **Zod**: Runtime type validation.
- **drizzle-zod**: Drizzle and Zod integration.
- **TanStack Query**: Server state management.
- **React Hook Form**: Form state management.
- **@hookform/resolvers**: Zod integration for form validation.