# Overview
This project is a comprehensive full-stack TypeScript sports tournament management system specifically designed for **racquetball**. It offers robust features for tournament administration, including user and role management, tournament creation, match scheduling, court management, and detailed player statistics tracking with shot-type analysis. The system aims to streamline tournament operations and enhance the experience for organizers and participants. Padel support is preserved in the backend schema for historical data but is hidden from all UI forms and selectors to ensure a racquetball-only user experience.

# User Preferences
Preferred communication style: Simple, everyday language.
Preferred language: Spanish

# System Architecture

## Frontend Architecture
The frontend is a React 18 application built with TypeScript, utilizing Vite, Tailwind CSS, and `shadcn/ui`. It employs `React Query` for server state management, `Wouter` for routing, and the `Context API` for authentication. The UI features a consistent `AppShell` with a Sidebar and Header, and root routing dynamically redirects users based on authentication state and role.

## Backend Architecture
The backend is an Express.js application developed with TypeScript, featuring a modular design. It uses `Passport.js` with a Local Strategy for authentication, `scrypt` for password hashing, and session-based authentication with PostgreSQL storage. `Zod` ensures type-safe data validation. A centralized error handling system provides Spanish translations for common HTTP errors.

## Database Design
The system uses PostgreSQL with Drizzle ORM. The schema includes tables for `Users`, `Tournaments`, `Courts`, `Matches`, `Tournament Registrations`, and `Player Statistics`, interconnected through one-to-many and many-to-many relationships.

## Authentication & Authorization
The system implements session-based authentication with a hierarchical multi-tenant role-based access control. Password hashing is handled by Node.js `crypto.scrypt`, and sessions are managed with `Express-session` using a PostgreSQL store.
- **Global Roles**: `superadmin`.
- **Tournament-Scoped Roles**: `tournament_admin`, `organizador`, `arbitro`, `escrutador`, `jugador`.
All backend endpoints enforce authorization through authentication checks, resource existence verification, and permission validation based on these roles.

## System Design Choices
- **Real-Time Match Statistics Capture**: Features a live scoring module with racquetball-specific logic, granular event recording including shot types, and serve tracking. Authorization includes global and tournament-scoped roles.
- **Open IRT Format Implementation**: Specialized scoring logic for International Racquetball Tour (IRT), including server-only scoring, timeout management, appellation system, technical foul tracking, undo functionality, and fault/double-fault tracking.
- **Enhanced Statistics Module**: Tracks shot-type breakdown, serve effectiveness, and aggregates summary metrics. Differentiates between singles and doubles performance, with player statistics automatically updating upon match completion.
- **Comprehensive CRUD**: Full Create, Read, Update, Delete functionality for tournaments and matches with role-based access controls.
- **Bracket Generation**: System for generating tournament brackets with transactional safety.
- **Racquetball-Only UI**: Padel-related elements are hidden from the UI.
- **Tournament Doubles Integration**: Supports singles and doubles matches with conditional player fields, validation for unique players in doubles, and team-based formatting.
- **Excel Import Module**: Bulk import functionality for players and matches (Singles/Doubles) with automatic data processing, player creation, and tournament registration. Includes templates, Zod validation, and category mapping.
- **Tournament-Scoped Calendar System**: Integrated calendar accessible via sidebar, with role-based filtering. Admins can manage matches; SuperAdmins/Admins have a global "All Tournaments" view. Displays matches in the tournament's configured timezone.
- **Tournament Timezone Support**: Each tournament can have its own timezone setting. Backend queries are timezone-aware.
- **IRT Ranking System**: Implements the official International Racquetball Tour (IRT) ranking system with automatic point calculation based on tournament tier, match type, round, and result. Points accumulate permanently and are visible in a global ranking view for PRO_SINGLES_IRT players.
- **Match and Player Categories**: Comprehensive categorization system with 13 official categories. Players can be assigned up to 3 categories.
- **Player Profile Enhancement**: Players can upload profile photos, specify nationality, and have up to 3 assigned categories. Admins have full control over player profiles within tournaments.
- **Real-Time Public Display System**: Live scoreboard display system accessible without authentication at `/public-display`. Features WebSocket real-time updates (throttled and sanitized), automatic match rotation, player information display, live score display, and a sponsor banner system.

## WebSocket Architecture
A unified WebSocket server with two channels:
- **Stats Capture Channel** (`/ws/match-stats`): Protected, requires session authentication for match officials.
- **Public Display Channel** (`/ws/public-display`): Public, read-only for scoreboard displays with tournament filtering.
Match state changes broadcast to both channels, with throttled updates to public displays. A heartbeat mechanism ensures connection health.

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
-   **multer**: Middleware for handling multipart/form-data file uploads.
-   **@google-cloud/storage**: Google Cloud Storage SDK for Replit Object Storage integration.