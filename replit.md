# Overview

This is a sports tournament management system built with a full-stack TypeScript architecture. The application supports multiple sports (padel and racquetball) and provides comprehensive tournament administration capabilities including user management, tournament creation, match scheduling, court management, and player statistics tracking.

The system features role-based access control with five distinct user roles: admin, player (jugador), organizer (organizador), referee (arbitro), and scrutineer (escrutador). Each role has specific permissions and access to different parts of the application.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using React 18 with TypeScript, utilizing a component-based architecture with shadcn/ui components for consistent design. The frontend uses Vite as the build tool and development server, with Tailwind CSS for styling.

**Key Frontend Decisions:**
- **React Query (TanStack Query)** for server state management and caching, chosen for its excellent data synchronization and background updates
- **Wouter** for lightweight client-side routing instead of React Router, reducing bundle size
- **shadcn/ui component library** built on Radix UI primitives for accessible, customizable components
- **Context-based authentication** with React Context API for user session management

## Backend Architecture
The server uses Express.js with TypeScript in ESM format, following a modular structure with separate concerns for authentication, routing, storage, and database operations.

**Key Backend Decisions:**
- **Passport.js with Local Strategy** for authentication, using scrypt for password hashing
- **Session-based authentication** with PostgreSQL session storage for security and scalability
- **Modular storage layer** with interface-based design for potential future database migrations
- **Zod schema validation** integrated with Drizzle for type-safe data validation

## Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe database operations and migrations.

**Schema Architecture:**
- **Users table** with role-based permissions (admin, jugador, organizador, arbitro, escrutador)
- **Tournaments table** supporting multiple formats (elimination, round_robin, groups) and sports
- **Courts table** with status management (available, maintenance, blocked)
- **Matches table** for tournament bracket management with detailed scoring
- **Tournament registrations** for player enrollment tracking
- **Player statistics** for performance analytics across tournaments

**Database Relationships:**
- One-to-many: Users to Tournaments (organizer relationship)
- Many-to-many: Users to Tournaments (via registrations table)
- One-to-many: Tournaments to Matches
- Many-to-one: Matches to Courts

## Authentication & Authorization
The system implements session-based authentication with role-based access control:

- **Password Security:** Uses Node.js crypto.scrypt with salt for secure password hashing
- **Session Management:** Express-session with PostgreSQL store for persistence
- **Protected Routes:** Client-side route protection with authentication checks
- **Role-based UI:** Dynamic navigation and component rendering based on user roles

# External Dependencies

## Database
- **Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket connections
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## UI Framework
- **Radix UI**: Accessible component primitives for complex UI components
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Consistent icon library for UI elements

## Development Tools
- **Vite**: Fast build tool and development server with React plugin
- **TypeScript**: Static type checking across frontend and backend
- **ESBuild**: Fast bundling for production server builds

## Authentication & Validation
- **Passport.js**: Modular authentication middleware with local strategy
- **Zod**: Runtime type validation and schema definition
- **drizzle-zod**: Integration between Drizzle schemas and Zod validation

## State Management
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form state management with validation
- **@hookform/resolvers**: Zod integration for form validation

# Recent Changes

- **2025-10-04**: ✅ **ENHANCED TOURNAMENT AND STATISTICS MANAGEMENT** - Club-based venue selection and comprehensive statistics module
  - **Club-Based Venue Selection**:
    - Added `clubId` foreign key to tournaments table referencing clubs
    - Modified tournament creation/edit forms to use club dropdown instead of text input
    - System now stores both `clubId` (for relationships) and `venue` (club name for display)
    - Frontend fetches clubs from `/api/clubs` endpoint and populates dropdown
    - Proper cache invalidation on tournament mutations
  - **Session Time Tracking Display**:
    - Enhanced stats capture page to display session `startedAt` and `completedAt` timestamps
    - Added visual indicators for active sessions (sessions without completion time)
    - User-friendly date/time formatting for session tracking
  - **Statistics Module Implementation**:
    - Complete rewrite of `statistics-view.tsx` with tabbed interface
    - Personal stats tab for all users showing their match participation
    - Captures tab (admin/escribano only) showing all completed scoring sessions
    - Backend endpoint GET `/api/stats/sessions` with role-based access control
    - Database method `getAllStatsSessions()` with joins to matches, tournaments, and users
    - Session listings include: players, tournament, sport, scores, start/end times, duration
    - Summary metrics: total sessions, sessions by sport (padel/racquetball)
    - Proper authorization: statistics capture data visible only to admin and escribano roles
- **2025-10-01**: ✅ **IMPLEMENTED REAL-TIME MATCH STATISTICS CAPTURE SYSTEM** - Complete live scoring module for admin and escribano roles
  - **Database Schema**:
    - Added `escribano` role to user roles enum for dedicated statistics capture personnel
    - Created `match_stats_sessions` table to track active scoring sessions with status (active, paused, completed)
    - Created `match_events` table for granular point-by-point event recording with timestamps
    - Sessions store real-time scores (player1/2CurrentScore), sets won, games per set, and current set number
  - **Backend Infrastructure**:
    - REST API endpoints for session lifecycle: POST `/api/matches/:matchId/stats/start`, PUT `/api/stats/sessions/:id`, POST `/api/stats/sessions/:id/complete`
    - Event recording endpoint: POST `/api/stats/sessions/:id/events` for point-by-point capture
    - WebSocket server (`server/websocket.ts`) for real-time broadcasting of match events to multiple clients
    - Per-match rooms for isolated real-time updates with heartbeat mechanism
    - Authorization: All stats endpoints require admin or escribano role
  - **Frontend Implementation**:
    - Stats capture page (`/stats/capture/:matchId`) with live scoring interface
    - Sport-specific scoring logic (`client/src/lib/scoring.ts`):
      - Padel: 15-30-40-game progression with deuce/advantage handling, sets to 6 games (2-game lead), best of 3 sets
      - Racquetball: Rally scoring to 15 points (2-point lead), best of 3 games
    - Real-time WebSocket client integration for live score updates across multiple devices
    - "Capturar estadísticas" button on match listings (visible to admin/escribano, hidden for completed matches)
    - Automatic score calculation and session state management
  - **Security & UX**:
    - Role-based access control: stats capture restricted to admin and escribano only
    - WebSocket authentication and per-match room isolation
    - Automatic session detection (resume active sessions)
    - Mobile-responsive touch targets (min-h-[44px])
- **2025-10-01**: ✅ **IMPLEMENTED FULL CRUD FOR TOURNAMENTS AND MATCHES** - Complete administrative control for tournaments and matches
  - **Backend API**: 
    - Added PUT `/api/matches/:id` endpoint for match updates (admin only)
    - Added DELETE `/api/matches/:id` endpoint for match deletion (admin only)
    - Added `updateMatch` and `deleteMatch` methods to storage interface
    - Existing PUT/DELETE tournament endpoints verified with proper authorization (admin or organizer)
  - **Frontend UI - Tournaments**:
    - Edit tournament dialog with complete form (name, description, sport, format, venue, dates, max players, registration fee)
    - Delete tournament confirmation dialog with AlertDialog
    - Buttons visible only to admin and organizers
    - Form resets correctly when tournament data loads using useEffect
  - **Frontend UI - Matches**:
    - Edit match dialog with complete form (players, round, court, scheduled date/time)
    - Delete match confirmation dialog with AlertDialog
    - Admin-only visibility for edit/delete buttons
    - Court filtering by venue and sport maintained in match forms
  - **Security & Authorization**:
    - Match CRUD restricted to admin role only
    - Tournament CRUD restricted to admin or organizer (owner)
    - All mutations invalidate cache correctly
    - Success/error toasts for user feedback
  - **Mobile Support**: All interactive elements use min-h-[44px] for proper touch targets
- **2025-09-19**: ✅ **IMPLEMENTED PADEL PAIRS SYSTEM** - Complete end-to-end padel partner registration system
  - **Database Schema**: Added `phone` field to users table, `padelPairs` table for partner management, `pairId` field in tournament registrations
  - **Backend API**: Secure endpoints for pair creation, phone-based partner search, and pair-based tournament registration with full authorization controls
  - **Frontend UX**: Automatic padel tournament detection, partner search forms, real-time phone lookup, invitation system for unregistered partners
  - **Security Features**: Authentication requirements, PII protection, pair ownership verification, minimal data exposure in API responses
  - **Testing**: End-to-end functionality confirmed with proper form validation, API responses, user feedback, and security controls
  - **Use Cases**: Supports registered user + unregistered partner (creates invitation), registered user + registered partner (direct linking), automatic future linking when partners register
- **2025-09-19**: Implemented comprehensive bracket generation system with transaction safety and authorization controls
- **2025-09-19**: Enhanced security measures including regeneration safeguards and proper admin controls for tournament brackets
- **2025-09-19**: Fixed critical PII exposure in player data endpoints and strengthened authorization requirements