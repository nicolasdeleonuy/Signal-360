# Signal-360

A Software-as-a-Service (SaaS) investment and trading analysis tool that provides a unified platform for Fundamental, Technical, and ESG analysis.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```

3. Configure your Supabase credentials in `.env`:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

4. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Technology Stack

- **Frontend**: React 18 with TypeScript and Vite
- **Backend**: Supabase (PostgreSQL database with authentication)
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Testing**: Jest with React Testing Library

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React Context providers
├── lib/           # External service configurations
├── pages/         # Route-level components
├── App.tsx        # Main application component
└── index.tsx      # Application entry point
```