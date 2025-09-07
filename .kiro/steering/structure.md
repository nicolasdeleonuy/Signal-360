# Project Structure and Naming Conventions

This document outlines the file organization for the Signal-360 project. KIRO must place all new files in their designated directories.

## Root Directories
- `public/`: Static assets (images, fonts).
- `src/`: Main application source code.

## `src` Directory Structure
- `src/assets/`: Project-specific static assets like images for components.
- `src/components/`: Reusable React components.
  - `src/components/auth/`: Components related to authentication (LoginForm, SignUpForm).
  - `src/components/dashboard/`: Components for the main analysis dashboard.
  - `src/components/ui/`: General-purpose UI elements (Buttons, Modals), likely managed by shadcn/ui.
- `src/lib/`: Utility functions and third-party client initializations.
  - `src/lib/supabaseClient.ts`: The file that initializes and exports the Supabase client instance.
- `src/pages/`: Top-level route components corresponding to application views.
  - `LoginPage.tsx`
  - `SignUpPage.tsx`
  - `ProfilePage.tsx`
  - `DashboardPage.tsx`
- `src/styles/`: Global CSS files.
- `src/App.tsx`: The main application component that sets up routing.
- `src/main.tsx`: The application entry point.

## Naming Conventions
- **Components & Pages**: `PascalCase` (e.g., `DashboardPage.tsx`).
- **Functions & Variables**: `camelCase` (e.g., `fetchAnalysisData`).
- **Types & Interfaces**: `PascalCase` (e.g., `interface TickerData`).