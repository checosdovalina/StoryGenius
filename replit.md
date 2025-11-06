# Overview

This project is a comprehensive sports tournament management system, built with a full-stack TypeScript architecture. It supports multiple sports like padel and racquetball and offers extensive features for tournament administration. Key capabilities include user and role management (admin, player, organizer, referee, scrutineer), tournament creation, match scheduling, court management, and detailed player statistics tracking. The system aims to streamline tournament operations and enhance the overall experience for organizers and participants.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is a React 18 application built with TypeScript, using Vite for development and Tailwind CSS for styling. It leverages a component-based architecture with `shadcn/ui` for consistent design. Key decisions include `React Query` for server state management, `Wouter` for lightweight routing, and `Context API` for authentication.

## Backend Architecture
The backend is an Express.js application with TypeScript, designed with a modular structure. It uses `Passport.js` with a Local Strategy for authentication, `scrypt` for password hashing, and session-based authentication with PostgreSQL storage. A modular storage layer and `Zod` for type-safe data validation are also core components.

## Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe operations. The schema includes tables for `Users` (with role-based permissions), `Tournaments` (supporting various formats and sports), `Courts` (with status management), `Matches` (for bracket management and scoring), `Tournament Registrations`, and `Player Statistics`. Relationships include one-to-many and many-to-many connections between these entities.

## Authentication & Authorization
Session-based authentication with role-based access control is implemented. This includes secure password hashing using Node.js `crypto.scrypt`, `Express-session` with a PostgreSQL store, client-side route protection, and dynamic UI rendering based on user roles (admin, jugador, organizador, arbitro, escrutador).

## Specific Features
- **Padel Pairs System**: Supports partner registration and tournament enrollment for padel, including search, invitation, and linking of registered/unregistered partners.
- **Real-Time Match Statistics Capture**: Live scoring module for admin and scrutineer roles, with sport-specific logic (Padel, Racquetball), WebSocket for real-time updates, and granular event recording.
- **Open IRT Format Implementation for Racquetball**: Specialized scoring logic for International Racquetball Tour (IRT) including server-only scoring, two-panel interface, timeout management, appellation system, and technical foul tracking.
- **Comprehensive CRUD**: Full Create, Read, Update, Delete functionality for tournaments and matches, with role-based access controls for admins and organizers.
- **Bracket Generation**: System for generating tournament brackets with transactional safety.
- **Enhanced Statistics Module**: Tabbed interface for personal stats and a captures tab for admins/scrutineers to view all completed scoring sessions, including summary metrics.

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