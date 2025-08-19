# Project Structure

## Current Organization
```
.
├── .kiro/
│   └── steering/          # AI assistant steering rules
├── .vscode/
│   └── settings.json      # VSCode workspace settings
├── public/
│   └── index.html         # HTML template
├── src/
│   ├── components/
│   │   └── protected-route.js  # Route protection component
│   ├── contexts/
│   │   └── auth-context.js     # Authentication context
│   ├── lib/
│   │   └── supabase.js         # Supabase client configuration
│   ├── pages/
│   │   ├── login.js            # Login page
│   │   ├── sign-up.js          # Registration page
│   │   └── profile.js          # Protected profile page
│   ├── App.js             # Main app with routing
│   ├── index.js           # App entry point
│   └── index.css          # Global styles
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
└── README.md             # Project documentation
```

## Directory Conventions
- **`src/components/`**: Reusable UI components and utilities
- **`src/contexts/`**: React Context providers for global state
- **`src/lib/`**: External service configurations and utilities
- **`src/pages/`**: Route-level components (pages)
- **`public/`**: Static assets and HTML template
- **`.kiro/steering/`**: AI assistant guidance documents

## File Naming
- Use kebab-case for multi-word files (e.g., `protected-route.js`)
- Use PascalCase for React component files when they export a component
- Keep filenames descriptive and concise
- Configuration files follow their respective conventions

## Component Organization
- **Pages**: Top-level route components in `src/pages/`
- **Components**: Reusable components in `src/components/`
- **Contexts**: Global state providers in `src/contexts/`
- **Utilities**: Helper functions and configurations in `src/lib/`

## Authentication Architecture
- **Context-based**: Authentication state managed via React Context
- **Route Protection**: Higher-order component for protected routes
- **Session Management**: Automatic session handling via Supabase
- **Error Handling**: Comprehensive error states and user feedback

## Maintenance
- Keep components small and focused on single responsibility
- Update steering rules as authentication patterns evolve
- Document any new organizational patterns in this file
- Maintain clear separation between public and protected routes