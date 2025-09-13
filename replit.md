# Overview

Borealis is a directional drilling portal application built as a modern full-stack web application. It provides a dashboard interface for monitoring drilling operations, managing rigs and wells, and configuring system settings in a multi-tenant environment. The application is designed to support both edge and cloud deployment scenarios for the oil and gas industry.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built with React and TypeScript, using Vite as the build tool and development server. The UI leverages shadcn/ui components built on top of Radix UI primitives for a consistent design system. State management is handled through TanStack Query for server state and React hooks for local state. The application uses Wouter for lightweight client-side routing.

## Backend Architecture
The server is an Express.js application written in TypeScript that provides a RESTful API. It follows a modular structure with separate route handlers for different domains (health, authentication, rigs, wells, settings). The application supports both in-memory storage for development and database persistence for production environments.

## Database Design
The application uses Drizzle ORM with PostgreSQL as the primary database. The schema defines four main entities:
- Users: Authentication and role-based access control
- Rigs: Drilling rig management with status tracking
- Wells: Well operations with progress monitoring and rig associations
- System Settings: Configuration management with tenant-specific overrides

## Multi-Tenancy
The system implements a multi-tenant architecture where data is isolated by tenant identifier. Each API request can include a tenant header to scope data access, with "public" as the default tenant. This allows multiple drilling companies to use the same system instance while maintaining data separation.

## Development and Build Process
The project uses a monorepo structure with shared TypeScript types and schemas. The build process includes TypeScript compilation, Vite bundling for the frontend, and esbuild bundling for the backend. The development server integrates Vite's hot module replacement with Express for a seamless development experience.

## Authentication and Authorization
The application includes a basic authentication framework with role-based access control. Users have roles (like BRLS_Viewer) that determine their permissions within the system. The current implementation includes stub endpoints that can be extended with proper authentication providers.

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL database service for cloud deployment
- **Drizzle ORM**: Type-safe database ORM for schema management and queries
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## UI Framework
- **React**: Frontend framework with functional components and hooks
- **Radix UI**: Headless UI components for accessibility and behavior
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Pre-built component library based on Radix UI

## State Management
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation and schema parsing

## Development Tools
- **Vite**: Build tool and development server with hot module replacement
- **TypeScript**: Static type checking for JavaScript
- **esbuild**: Fast JavaScript bundler for production builds
- **Replit Plugins**: Development environment integrations for error handling and debugging