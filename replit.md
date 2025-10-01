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