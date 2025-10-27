/**
 * Desktop Integration Utilities
 *
 * Handles deep linking and communication between the Next.js web app
 * and the Electron desktop application for manual data collection.
 */

export interface DesktopExtractionParams {
  sourceUrl: string
  restaurantId: string
  sourceId: string
  restaurantName?: string
  collectionPeriod?: string
}

/**
 * Triggers the desktop Electron app via deep linking protocol
 * Protocol format: dataextractor://extract?url=...&restaurantId=...&sourceId=...
 */
export function triggerDesktopExtraction(params: DesktopExtractionParams): void {
  const { sourceUrl, restaurantId, sourceId, restaurantName, collectionPeriod } = params

  // Build the protocol URL with all parameters
  const protocolUrl = new URL("dataextractor://extract")
  protocolUrl.searchParams.set("url", sourceUrl)
  protocolUrl.searchParams.set("restaurantId", restaurantId)
  protocolUrl.searchParams.set("sourceId", sourceId)

  if (restaurantName) {
    protocolUrl.searchParams.set("restaurantName", restaurantName)
  }

  if (collectionPeriod) {
    protocolUrl.searchParams.set("collectionPeriod", collectionPeriod)
  }

  console.log("[Desktop Integration] 🚀 Launching desktop app")
  console.log("[Desktop Integration] 📍 Source URL:", sourceUrl)
  console.log("[Desktop Integration] 🏪 Restaurant:", restaurantName || restaurantId)
  console.log("[Desktop Integration] 🔗 Protocol URL:", protocolUrl.href)

  // Trigger the desktop app
  window.location.href = protocolUrl.href
}

/**
 * Checks if the desktop app is installed by attempting to open it
 * Returns a promise that resolves to true if installed, false otherwise
 */
export async function checkDesktopAppInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false)
    }, 2000)

    // Try to open the desktop app
    const testUrl = "dataextractor://ping"
    window.location.href = testUrl

    // If we're still here after a short delay, app might not be installed
    setTimeout(() => {
      clearTimeout(timeout)
      resolve(true)
    }, 500)
  })
}

/**
 * Shows a user-friendly message if desktop app is not installed
 */
export function showDesktopAppNotInstalledMessage(): void {
  const message = `
    Desktop Data Extractor not found!
    
    Please install the DataEssential Desktop App to use manual collection features.
    
    Download from: https://datassential.com/downloads
  `

  alert(message)
}
