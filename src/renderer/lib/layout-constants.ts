/**
 * Layout Constants
 * Centralized className patterns for consistent spacing and layout across the application.
 * Following DRY principles to avoid repetition and ensure maintainability.
 */

export const LAYOUT = {
  // Container patterns
  container: {
    page: "min-h-screen bg-background",
    content: "flex-1 p-6 lg:p-8",
    card: "rounded-lg border bg-card p-6",
    section: "space-y-6",
  },

  // Grid patterns
  grid: {
    responsive: "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
    twoCol: "grid gap-6 md:grid-cols-2",
    table: "grid gap-4",
  },

  // Flex patterns
  flex: {
    between: "flex items-center justify-between",
    center: "flex items-center justify-center",
    start: "flex items-center gap-4",
    col: "flex flex-col gap-4",
  },

  // Spacing patterns
  spacing: {
    section: "space-y-6",
    stack: "space-y-4",
    inline: "space-x-4",
    tight: "space-y-2",
  },

  // Common component patterns
  header: {
    page: "space-y-2",
    title: "text-3xl font-bold tracking-tight",
    subtitle: "text-muted-foreground",
  },

  // Table patterns
  table: {
    wrapper: "rounded-lg border bg-card",
    header: "grid gap-4 border-b bg-muted/50 p-4 font-medium",
    row: "grid gap-4 border-b p-4 last:border-0 hover:bg-muted/50 transition-colors",
    cell: "flex items-center",
  },
} as const

/**
 * Status color mappings for consistent status indicators
 */
export const STATUS_COLORS = {
  completed: "text-emerald-600 bg-emerald-50",
  pending: "text-orange-600 bg-orange-50",
  error: "text-red-600 bg-red-50",
  inProgress: "text-blue-600 bg-blue-50",
  info: "text-cyan-600 bg-cyan-50",
} as const

/**
 * Button variant mappings for consistent button styling
 */
export const BUTTON_VARIANTS = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  success: "bg-emerald-500 text-white hover:bg-emerald-600",
  warning: "bg-orange-500 text-white hover:bg-orange-600",
  error: "bg-red-500 text-white hover:bg-red-600",
  info: "bg-cyan-500 text-white hover:bg-cyan-600",
} as const
