# Data Extractor - Desktop Application

Professional Electron desktop application for data collection and restaurant management.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build:win
```

## Available Commands

```bash
# Development
npm run dev              # Run app with hot-reload
npm run dev:vite         # Start Vite dev server only
npm run dev:prod         # Build and run production mode

# Building
npm run build            # Build for current platform
npm run build:win        # Build Windows x64 installer
npm run build:win32      # Build Windows x86 installer
npm run build:win-all    # Build all Windows variants
npm run package          # Package without installer

# Utilities
npm run clean            # Clean build artifacts
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run verify           # Verify build environment
npm run generate-icon    # Generate app icons
```

## Project Structure

```
src/
├── main/           # Electron main process (Node.js)
├── preload/        # Preload scripts (security bridge)
└── renderer/       # React UI application
    ├── components/
    │   ├── ui-lib/    # Complete UI component library (48 components)
    │   └── ...        # Application components
    ├── lib/           # Utilities
    └── styles/        # Styles
```

## Features

- 🔐 Secure authentication with web app integration
- 🌐 Built-in web view for data extraction
- 📊 AI-extracted data verification
- 📝 Manual data collection
- 💾 Auto-save and data persistence
- 📤 JSON/CSV export
- 🎨 Modern, professional UI
- 🔄 Auto-updates

## Technology Stack

- Electron 38.x
- React 18.x
- TypeScript 5.x
- Vite 5.x
- Tailwind CSS 3.x
- Zustand (State Management)
- Radix UI (Components)

## Configuration

### API URL
Set via environment variable:
```bash
# Windows
$env:API_URL = "https://your-api.com"

# Linux/Mac
export API_URL="https://your-api.com"
```

### Theme
Edit `src/renderer/index.css` to customize colors.

## Documentation

See `ARCHITECTURE.md` for detailed architecture documentation.

## Build Output

Production builds are created in the `dist/` directory:
- `Data Extractor Setup-{version}-x64.exe` - Windows installer

## License

MIT License - Copyright © 2025 Data Extractor Team
# desktop-app
# desktop-app
