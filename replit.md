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
-   **Open IRT Format Implementation**: Specialized scoring logic for International Racquetball Tour (IRT) including server-only scoring, two-panel interface, timeout management, appellation system, and technical foul tracking.
-   **Enhanced Statistics Module**: Tracks shot-type breakdown (recto, esquina, cruzado, punto), serve effectiveness (ace tracking by side with percentage-based badges and color-coded performance tiers), and aggregates summary metrics from completed matches. Statistics capture from this view updates the scoreboard in real-time.
-   **Comprehensive CRUD**: Full Create, Read, Update, Delete functionality for tournaments and matches with role-based access controls.
-   **Bracket Generation**: System for generating tournament brackets with transactional safety.
-   **Racquetball-Only UI**: Padel-related elements are hidden from the UI, maintaining focus on racquetball.
-   **Tournament Doubles Integration**: Supports creating, editing, and viewing both singles and doubles matches with conditional player fields, Zod validation for unique players in doubles, modality badges, and team-based formatting. Player lists auto-refresh.
-   **Excel Import Module**: Bulk import functionality for players and matches (Singles/Doubles) with automatic data processing, player creation, and tournament registration. It includes downloadable templates, Zod validation with detailed error reporting, and a results preview. Authorization is restricted to SuperAdmin and Tournament Admin roles.
-   **Tournament-Scoped Calendar System**: Integrated calendar module accessible via sidebar menu with role-based filtering. Players view only their scheduled matches, while admins can create, edit, and delete matches within specific tournaments. SuperAdmins and Admins have access to a global "All Tournaments" view showing all scheduled matches for a selected date across all tournaments, grouped by tournament for easy overview. Calendar displays matches in the tournament's configured timezone, ensuring matches appear on the correct date regardless of server timezone.
-   **Tournament Timezone Support**: Each tournament can have its own timezone setting (configurable by SuperAdmins during tournament creation/editing). Supported timezones include major cities in Mexico, USA, Latin America, and Europe. Default timezone is America/Mexico_City. Backend queries properly convert tournament local time to UTC for database filtering, ensuring accurate date-based match retrieval.

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