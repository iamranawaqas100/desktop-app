# Architecture Overview

## System Architecture

The Data Extractor is built as a standalone Electron application with a clear separation of concerns between the main process, renderer process, and preload scripts.

## Application Structure

### Main Process (`src/main/`)

The main process handles all Node.js operations, system interactions, and application lifecycle.

#### Core (`src/main/core/`)

- **lifecycle.js** - Application lifecycle management (startup, shutdown, updates)
- **menu.js** - Application menu configuration
- **window.js** - Window management and creation

#### Services (`src/main/services/`)

- **data.js** - Data persistence and retrieval
- **database.js** - Local database operations
- **export.js** - Data export functionality (JSON, CSV)
- **protocol.js** - Custom protocol handler (`dataextractor://`)
- **session.js** - Session management and authentication
- **updater.js** - Auto-update functionality

#### IPC (`src/main/ipc/`)

- **handlers.js** - Inter-Process Communication handlers

#### Utilities (`src/main/utils/`)

- **errorTracking.js** - Error monitoring and reporting
- **logger.js** - Application logging
- **performance.js** - Performance monitoring
- **security.js** - Security utilities

### Renderer Process (`src/renderer/`)

The renderer process is a React application that provides the user interface.

#### Components (`src/renderer/components/`)

**Application Components:**

- **App.tsx** - Root application component with authentication
- **MainLayout.tsx** - Main application layout
- **TitleBar.tsx** - Custom title bar with navigation
- **DataPanel.tsx** - Data management panel
- **BrowserView.tsx** - Web view for data extraction

**UI Library (`src/renderer/components/ui-lib/`):**

Base UI Components:

- `ui/button.tsx` - Button component with variants
- `ui/input.tsx` - Input fields
- `ui/label.tsx` - Labels
- `ui/checkbox.tsx` - Checkboxes
- `ui/radio-group.tsx` - Radio button groups
- `ui/select.tsx` - Select dropdowns
- `ui/dialog.tsx` - Modal dialogs
- `ui/alert-dialog.tsx` - Alert dialogs
- `ui/dropdown-menu.tsx` - Dropdown menus
- `ui/card.tsx` - Card containers
- `ui/badge.tsx` - Badges
- `ui/toast.tsx` - Toast notifications
- `ui/use-toast.tsx` - Toast hook
- `ui/pagination.tsx` - Pagination controls
- `ui/multi-select.tsx` - Multi-select component
- `ui/textarea.tsx` - Text area

Feature Components:

- `login-form.tsx` - Login form
- `header.tsx` - Application header
- `empty-state.tsx` - Empty state placeholder
- `notifications-list.tsx` - Notifications display
- `restaurant-table.tsx` - Restaurant data table
- `restaurant-detail.tsx` - Restaurant details
- `restaurant-sources-manager.tsx` - Source management
- `collection-period-card.tsx` - Collection period card
- `create-collection-period-dialog.tsx` - Create collection period
- `add-restaurant-to-quarter-dialog.tsx` - Add restaurant dialog
- `session-provider.tsx` - Session context provider
- `role-hydrator.tsx` - Role-based access control
- `toast-provider.tsx` - Toast notifications provider

Admin Components (`admin/`):

- `sidebar.tsx` - Admin sidebar
- `topbar.tsx` - Admin top bar
- `user-management.tsx` - User management
- `restaurant-management.tsx` - Restaurant management
- `restaurant-list-management.tsx` - Restaurant list management
- `collection-period-management.tsx` - Collection period management
- `collection-periods-table.tsx` - Collection periods table
- `collection-period-form.tsx` - Collection period form
- `collection-period-form-v2.tsx` - Enhanced form
- `collection-period-form-step2.tsx` - Multi-step form
- `assign-collectors-dialog.tsx` - Assign collectors
- `bulk-restaurant-assignment.tsx` - Bulk assignment
- `collector-workload-dashboard.tsx` - Workload dashboard
- `admin-dashboard-table.tsx` - Admin dashboard
- `quarter-management.tsx` - Quarter management

Collector Components (`collector/`):

- `sidebar.tsx` - Collector sidebar
- `topbar.tsx` - Collector top bar
- `empty-state.tsx` - Empty state for collectors
- `collector-dashboard.tsx` - Collector dashboard

#### Libraries (`src/renderer/lib/`)

- **utils.ts** - Utility functions (cn, etc.)
- **layout-constants.ts** - Layout configuration constants
- **useAsyncAction.ts** - Async action hook
- **desktop-integration.ts** - Desktop integration utilities

#### State Management (`src/renderer/store.ts`)

- Zustand-based state management
- Extraction data management
- Collection context
- Mode management (manual, verification)

#### Styles (`src/renderer/styles/`)

- **index.css** - Main application styles
- **ui-lib/globals.css** - UI library styles
- **ui-lib/theme-only.css** - Theme-only styles

### Preload Scripts (`src/preload/`)

Preload scripts bridge the main and renderer processes securely.

- **preload.js** - Main preload script with Electron API
- **browserPreload.js** - Browser-specific preload
- **stealthPreload.js** - Stealth mode preload
- **webviewPreload.js** - WebView-specific preload

## Data Flow

### Authentication Flow

```
1. User clicks "Sign in"
   ↓
2. App generates challenge & state
   ↓
3. Opens web browser with auth URL
   ↓
4. User authenticates on web app
   ↓
5. Web app redirects to dataextractor://callback
   ↓
6. Protocol handler catches callback
   ↓
7. App exchanges code for session token
   ↓
8. Token stored in localStorage
   ↓
9. User authenticated, app loads data
```

### Data Extraction Flow

#### AI Collection Flow

```
1. Web app triggers AI collection
   ↓
2. Protocol handler receives collection data
   ↓
3. App fetches AI-extracted items from API
   ↓
4. Items loaded into extraction store
   ↓
5. Source URL opened in webview
   ↓
6. User verifies/edits AI items
   ↓
7. Items saved to API on completion
```

#### Manual Collection Flow

```
1. Web app triggers manual collection
   ↓
2. Protocol handler receives collection context
   ↓
3. Source URL opened in webview
   ↓
4. User adds items manually
   ↓
5. User selects fields to extract
   ↓
6. Data extracted from webview
   ↓
7. Items saved locally
   ↓
8. Items saved to API on completion
```

## Security Model

### Context Isolation

- Main process runs with full Node.js access
- Renderer process runs in sandboxed environment
- No direct Node.js access from renderer
- Communication only via IPC

### Content Security Policy

```javascript
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' http://localhost:* https://*;
```

### Preload Scripts

- Expose only necessary APIs to renderer
- Validate all IPC messages
- Sanitize user input
- No eval() or unsafe code execution

## State Management

### Zustand Store

```typescript
interface ExtractionStore {
  // Data
  extractedData: ExtractedItem[];

  // Context
  collectionContext: CollectionContext | null;

  // UI State
  currentMode: "manual" | "verification";
  selectedField: string | null;
  currentItemId: number | null;

  // Actions
  addExtractedItem: (item) => void;
  updateExtractedItem: (id, data) => void;
  removeExtractedItem: (id) => void;
  setExtractedData: (data) => void;
  setCollectionContext: (context) => void;
  setCurrentMode: (mode) => void;
}
```

## Build Process

### Development Build

```
1. Vite starts dev server (port 5173)
   ↓
2. React app served with HMR
   ↓
3. Electron loads from dev server
   ↓
4. Hot reload enabled
```

### Production Build

```
1. Vite builds React app → dist-renderer/
   ↓
2. Copy main process files → dist/
   ↓
3. Generate icons → assets/
   ↓
4. electron-builder creates installer
   ↓
5. Output: Data Extractor Setup.exe
```

## Technology Decisions

### Why Electron?

- Cross-platform desktop support
- Access to Node.js APIs for file system, networking
- Web view integration for data extraction
- Native system integration (protocols, notifications)

### Why React?

- Component-based architecture
- Large ecosystem of libraries
- Excellent TypeScript support
- Fast development with hooks

### Why Zustand?

- Simple, lightweight state management
- No boilerplate
- TypeScript-first
- Better than Redux for small apps

### Why Vite?

- Fast HMR (Hot Module Replacement)
- Modern build tool
- Excellent TypeScript support
- Optimized production builds

### Why Radix UI?

- Accessible components out of the box
- Unstyled, fully customizable
- Excellent keyboard navigation
- ARIA compliance

## Performance Considerations

### Optimizations

- Code splitting (React, UI vendors)
- Tree shaking
- Minification
- Source map generation disabled in production
- CSS bundled as single file
- Lazy loading of routes (if implemented)

### Memory Management

- Webview process isolation
- Proper cleanup on component unmount
- Efficient state updates
- Image optimization

## Deployment

### Windows Installer (NSIS)

- Per-user installation (no admin required)
- Custom install directory
- Desktop shortcut
- Start menu entry
- Uninstaller
- Update notifications

### Auto-Updates

- Check for updates on startup
- Download in background
- Notify user when ready
- Silent installation option

## Future Enhancements

### Planned Features

- [ ] Multi-window support
- [ ] Offline mode with sync
- [ ] Advanced data filtering
- [ ] Custom keyboard shortcuts
- [ ] Plugin system
- [ ] Export templates
- [ ] Batch operations
- [ ] Advanced search

### Technical Improvements

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] CI/CD pipeline
- [ ] Code coverage
- [ ] Performance monitoring
- [ ] Error reporting service
- [ ] Analytics

---

This architecture provides a solid foundation for a maintainable, scalable, and professional desktop application.
