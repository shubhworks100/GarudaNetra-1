# Overview

GarudaNetra is an AI-powered attendance system designed for educational institutions. The application provides multiple attendance tracking methods including QR code scanning, face recognition, and manual entry. It features role-based access control for administrators and teachers, comprehensive student management, attendance analytics, and reporting capabilities. The system also includes a parent portal for attendance monitoring and supports bulk operations for efficient data management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with route-based code splitting
- **State Management**: React Context API for authentication state, TanStack Query for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Form Handling**: React Hook Form with Zod validation schemas for type-safe form management

## Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **File Handling**: Multer for multipart file uploads (Excel imports, photos)
- **Session Management**: In-memory storage with planned PostgreSQL session store integration

## Authentication & Authorization
- **Authentication**: Username/password based login with role validation
- **Authorization**: Role-based access control (admin, teacher roles)
- **Session Storage**: Currently in-memory with user data stored in localStorage
- **Security**: Input validation using Zod schemas, CORS configuration for API protection

## Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: Neon Database serverless PostgreSQL
- **Schema Management**: Centralized schema definitions in shared directory with automatic migrations
- **Tables**: Users, students, attendance records, classes, and attendance reports with proper foreign key relationships

## Core Features Architecture

### Attendance Tracking
- **QR Code System**: QR generation and scanning with student data validation
- **Face Recognition**: Placeholder implementation with confidence scoring and bounding box detection
- **Manual Entry**: Bulk attendance marking with class and date filtering
- **Multiple Status Types**: Present, absent, late with tracking of marking method and timestamp

### Student Management
- **CRUD Operations**: Full student lifecycle management with photo uploads
- **Bulk Import**: Excel file processing for mass student registration
- **Search & Filtering**: Real-time search with class and section filters
- **QR Generation**: Automatic QR code generation for each student profile

### Reporting System
- **Report Types**: Daily, weekly, monthly, and custom date range reports
- **Data Export**: PDF and Excel export capabilities
- **Analytics**: Attendance percentage calculations and trend analysis
- **Visual Charts**: Placeholder chart components for attendance visualization

## File Structure
- **Monorepo Structure**: Client, server, and shared directories for code organization
- **Shared Schema**: Centralized Zod validation schemas and TypeScript types
- **Component Organization**: UI components separated from page components with custom hooks
- **Asset Management**: Vite-based asset handling with alias configuration

## Development Architecture
- **Build System**: Vite for frontend, esbuild for backend production builds
- **Development Server**: Vite dev server with HMR and Express API proxy
- **Type Safety**: Full TypeScript coverage with strict configuration
- **Code Quality**: ESLint and Prettier integration with import path aliases

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle Kit**: Database migration and schema management toolkit

## UI & Styling
- **shadcn/ui**: Comprehensive React component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Radix UI**: Unstyled, accessible component primitives
- **Lucide React**: Modern SVG icon library

## Development Tools
- **Vite**: Fast build tool with React plugin and development server
- **TanStack Query**: Powerful data fetching and caching library
- **React Hook Form**: Performant form library with validation integration
- **Zod**: TypeScript-first schema validation library

## File Processing
- **Multer**: Express middleware for handling multipart/form-data uploads
- **XLSX**: Excel file reading and writing capabilities
- **PDFKit**: PDF document generation for reports
- **QRCode**: QR code generation library

## Replit Integration
- **Replit Plugins**: Development environment integration with error overlay and cartographer
- **Replit Banner**: Development mode banner for external access indication