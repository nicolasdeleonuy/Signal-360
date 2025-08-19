# Technology Stack and Standards for Signal-360

This document outlines the core technologies for the Signal-360 project. KIRO must adhere to this stack for all generated code.

## Frontend Framework & Tooling
- [cite_start]**Framework**: React (v18+) with Vite [cite: 62]
- **Language**: TypeScript
- **Package Manager**: npm

## Core Frontend Libraries
- **Routing**: `react-router-dom` for all client-side navigation.
- **Data Fetching**: `axios` for all HTTP requests to the Supabase backend. [cite_start]Do not use native `fetch`[cite: 381].
- [cite_start]**UI Components**: `shadcn/ui` built on top of Radix UI and Tailwind CSS[cite: 383].
- [cite_start]**Data Visualization**: `recharts` for rendering all charts and graphs[cite: 384].
- **State Management**: React Context API for global state. [cite_start]Avoid introducing other state management libraries unless specified[cite: 385].

## Backend Service & Client Library
- [cite_start]**Provider**: Supabase (Backend-as-a-Service) [cite: 63]
- [cite_start]**Database**: PostgreSQL (via Supabase) [cite: 64]
- [cite_start]**Client Library**: `@supabase/supabase-js` for all interactions with the backend[cite: 388].