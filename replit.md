# Overview
This project is a full-stack TypeScript sports tournament management system specifically for racquetball. It offers comprehensive features for tournament administration, including multi-role user management (admin, player, organizer, referee, scrutineer), tournament creation, match scheduling, court management, and detailed player statistics with shot-type analysis. The system aims to streamline tournament operations, enhance participant experience, and provide specialized scoring for formats like the International Racquetball Tour (IRT). While the backend schema preserves historical Padel data, the user interface is strictly racquetball-focused.

# User Preferences
Preferred communication style: Simple, everyday language.
Preferred language: Spanish

# System Architecture

## Frontend Architecture
The frontend is a React 18 application built with TypeScript, using Vite, Tailwind CSS, and `shadcn/ui`. It leverages `React Query` for server state management, `Wouter` for routing, and the `Context API` for authentication. A consistent `AppShell` provides layout, and root routing dynamically redirects users based on authentication and role.

## Backend Architecture
The backend is a modular Express.js application with TypeScript. It uses `Passport.js` with a Local Strategy for session-based authentication, `scrypt` for password hashing, and PostgreSQL for session storage. `Zod` provides type-safe data validation, and a centralized error handling system offers Spanish translations for common HTTP errors.

## Database Design
The system uses PostgreSQL (Neon serverless) with Drizzle ORM. The schema includes tables for `Users`, `Tournaments`, `Courts`, `Matches`, `Tournament Registrations`, and `Player Statistics`, all interconnected through defined relationships. The DATABASE_URL is configured as a Replit Secret for secure connection to the external Neon database.

## Authentication & Authorization
The system employs session-based authentication with a hierarchical multi-tenant role-based access control (RBAC). Passwords are hashed using Node.js `crypto.scrypt`. RBAC includes global roles (`superadmin`) and tournament-scoped roles (`tournament_admin`, `organizador`, `arbitro`, `escrutador`, `jugador`). Authorization checks on all backend endpoints verify authentication, resource existence, and permissions based on both global and tournament-specific roles.

## UI/UX Decisions
The interface is designed to be racquetball-only, hiding all Padel-related elements. Player profiles are enhanced with profile photos, nationality flags, and category badges. Public display components feature real-time scoreboards with player information (photos, flags), live scores, and sponsor banners, all accessible without authentication.

## Feature Specifications
-   **Real-Time Match Statistics Capture**: Live scoring module with racquetball-specific logic, granular event recording (shot types, serves). Roles with access: superadmin, admin (global), and tournament_admin, organizador, arbitro, escrutador (tournament-scoped).
-   **Open IRT Format Implementation**: Specialized scoring for International Racquetball Tour (IRT) matches, including server-only scoring, timeouts, appellations, technical fouls, undo functionality, and fault tracking.
-   **Enhanced Statistics Module**: Tracks shot-type breakdown, serve effectiveness (ace tracking), and aggregates summary metrics (wins/losses, sets) from completed matches. Differentiates singles and doubles performance.
-   **Comprehensive CRUD**: Full Create, Read, Update, Delete functionality for tournaments and matches with role-based access controls.
-   **Bracket Generation**: System for generating tournament brackets with transactional safety.
-   **Tournament Doubles Integration**: Supports creating, editing, and viewing singles and doubles matches with conditional player fields and team formatting.
-   **Excel Import Module**: Bulk import functionality for players and matches (Singles/Doubles) with automatic data processing, validation, and category mapping.
-   **Tournament-Scoped Calendar System**: Integrated calendar showing scheduled matches. Players see their own matches; admins can manage matches within tournaments. SuperAdmins/Admins have a global "All Tournaments" view. Displays matches in the tournament's configured timezone.
-   **Tournament Timezone Support**: Each tournament can have a configurable timezone. Backend queries are timezone-aware.
-   **IRT Ranking System**: Automatic calculation and permanent accumulation of IRT ranking points based on tournament tiers, match types, and rounds reached. Global IRT ranking displays top PRO_SINGLES_IRT players by cumulative points. SuperAdmins can manually adjust points with audit trails.
-   **Match and Player Categories**: Comprehensive categorization system with 13 official competition categories. Players can be assigned up to 3 categories.
-   **Player Profile Enhancement**: Players can have profile photos (uploaded to Replit Object Storage), nationality, and up to 3 assigned categories. Admins have full control over player profiles.
-   **Real-Time Public Display System**: Live scoreboard system (`/public-display`) with WebSocket real-time updates (throttled and sanitized), automatic match rotation, player information, live scores, and sponsor banners.

## System Design Choices
-   **WebSocket Architecture**: A unified WebSocket server with two channels: a protected stats capture channel and a public display channel. All match state changes broadcast to both channels with appropriate throttling and sanitization for public views. Heartbeat mechanism ensures connection health.
-   **Tournament Management**: Supports tournament creation, editing, deletion, and resetting (removes unrolled players and matches while preserving those with assigned roles).
-   **Permission Control**: Only the user who initiated stats capture can modify or reopen recording sessions (except admins).
-   **Calendar System**: Unified calendar for scheduled and bracket matches with timezone support and completed match filtering.

# Recent Additions (Session: Nov 21, 2025)
- Fixed calendar display: Completed matches now properly hidden; duplicate match deduplication implemented
- Permission control: Added startedBy validation for stats session reopening  
- Tournament reset feature: Button in configuration section to clear players (except those with roles) and all matches
- Tournament deletion: Fixed cascade deletion to properly remove all associated data (matches, sessions, roles, stats)
- External database: Connected to Neon PostgreSQL via DATABASE_URL secret for persistent data storage

# External Dependencies
-   **Neon PostgreSQL**: Serverless PostgreSQL database.
-   **Drizzle ORM**: Type-safe ORM for PostgreSQL.
-   **connect-pg-simple**: PostgreSQL session store.
-   **Radix UI**: Accessible component primitives.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Lucide React**: Icon library.
-   **Vite**: Build tool and development server.
-   **TypeScript**: Static type checking.
-   **Passport.js**: Authentication middleware.
-   **Zod**: Runtime type validation.
-   **drizzle-zod**: Drizzle and Zod integration.
-   **TanStack Query**: Server state management.
-   **React Hook Form**: Form state management.
-   **@hookform/resolvers**: Zod integration for form validation.
-   **xlsx**: Library for Excel parsing.
-   **multer**: Middleware for handling multipart/form-data file uploads.
-   **@google-cloud/storage**: Google Cloud Storage SDK for Replit Object Storage integration.