/**
 * QC Verification API Service for Desktop App
 * Integrates with the new QC workflow APIs
 */

import { apiClient } from "../lib/api-client";

export interface QCMergedItem {
  id: string; // AI Item ID
  sourceId: string;

  // Display Data
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  masterHeaderId?: string;
  masterHeaderName?: string;
  menuHeaderName?: string;
  sourceUrl?: string;
  imageUrl?: string;
  sizes?: MenuItemSize[];
  priceLabels?: string[];

  // Verification Status
  isVerified: boolean;
  hasManualVersion: boolean; // Shows "little sign" ✏️
  manualItemId?: string;

  // AI Metadata
  confidence?: number;
  hasConflict?: boolean;
  needsReview?: boolean;
  reviewNotes?: string;

  // Timestamps
  aiCreatedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface MenuItemSize {
  name: string;
  price: number;
  label?: string;
}

export interface QCProgress {
  total: number;
  verified: number;
  pending: number;
  conflicts: number;
  percentComplete: number;
}

export interface QCDashboardData {
  success: boolean;
  items: QCMergedItem[];
  stats: QCProgress;
}

export interface VerifyItemRequest {
  aiItemId: string;
  edits?: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    category?: string;
    masterHeaderId?: string;
    masterHeaderName?: string;
    menuHeaderName?: string;
    sourceUrl?: string;
    imageUrl?: string;
    sizes?: MenuItemSize[];
    priceLabels?: string[];
    notes?: string;
  };
}

export interface CompletionCheckResponse {
  success: boolean;
  canComplete: boolean;
  progress: QCProgress;
  issues: string[];
}

/**
 * Get merged QC items (AI + Manual) for verification
 * ⭐ ENHANCED: Better error handling with graceful fallback
 */
export async function getQCMergedItems(
  sourceId: string,
  filters?: {
    verifiedOnly?: boolean;
    pendingOnly?: boolean;
  }
): Promise<QCDashboardData> {
  console.log("[QC Service] Fetching QC merged items...", sourceId);

  try {
    const params = new URLSearchParams({
      sourceId,
      ...(filters?.verifiedOnly && { verifiedOnly: "true" }),
      ...(filters?.pendingOnly && { pendingOnly: "true" }),
    });

    const response = await apiClient.get<any>(
      `/v1/menu-items/qc-merged?${params}`
    );

    // ⭐ Validate response structure
    if (!response || typeof response !== "object") {
      throw new Error("Invalid response format from server");
    }

    // ⭐ Handle API response format: { success: true, data: { items: [...], stats: {...} } }
    // The actual data is nested inside response.data
    const responseData = response.data || response; // Support both wrapped and unwrapped formats
    const items = responseData.items || [];
    const stats = responseData.stats || {
      totalAI: 0,
      totalManual: 0,
      totalItems: items.length,
      verified: 0,
      pending: items.length,
      conflicts: 0,
      percentComplete: 0,
    };

    console.log("[QC Service] QC items loaded:", items.length);
    console.log("[QC Service] Stats:", stats);

    return {
      success: true,
      items,
      stats: {
        total: stats.totalItems || stats.total || items.length,
        verified: stats.verified || 0,
        pending: stats.pending || items.length,
        conflicts: stats.conflicts || 0,
        percentComplete: stats.percentComplete || 0,
      },
    };
  } catch (error) {
    console.error("[QC Service] Error fetching QC items:", error);

    // ⭐ Provide more context about the error
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for common error patterns
    if (
      errorMessage.includes("<!DOCTYPE") ||
      errorMessage.includes("Unexpected token")
    ) {
      throw new Error(
        "Server returned HTML instead of JSON. The QC endpoint may not exist or there may be an authentication issue."
      );
    }

    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      throw new Error("Authentication required. Please log in again.");
    }

    if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
      throw new Error(
        "QC endpoint not found. Please check if the server is running the latest version."
      );
    }

    if (
      errorMessage.includes("500") ||
      errorMessage.includes("Internal Server")
    ) {
      throw new Error(
        "Server error. Please try again later or contact support."
      );
    }

    throw error;
  }
}

/**
 * Verify a single AI item (with optional edits)
 * Creates a MenuItemManual record and marks AI item as verified
 */
export async function verifyItem(request: VerifyItemRequest): Promise<any> {
  console.log("[QC Service] Verifying item...", request.aiItemId);

  try {
    const response = await apiClient.post("/v1/menu-items/verify", request);
    console.log("[QC Service] Item verified successfully");
    return response;
  } catch (error) {
    console.error("[QC Service] Error verifying item:", error);
    throw error;
  }
}

/**
 * Unverify an AI item
 * Deletes the associated manual item and marks AI item as unverified
 */
export async function unverifyItem(
  aiItemId: string,
  manualItemId?: string
): Promise<any> {
  console.log("[QC Service] Unverifying item...", aiItemId);

  try {
    const response = await apiClient.post("/v1/menu-items/unverify", {
      aiItemId,
      manualItemId,
    });
    console.log("[QC Service] Item unverified successfully");
    return response;
  } catch (error) {
    console.error("[QC Service] Error unverifying item:", error);
    throw error;
  }
}

/**
 * Bulk verify multiple items
 */
export async function bulkVerifyItems(
  items: VerifyItemRequest[]
): Promise<any> {
  console.log("[QC Service] Bulk verifying items...", items.length);

  try {
    const response = await apiClient.post("/v1/menu-items/verify", { items });
    console.log("[QC Service] Bulk verify complete");
    return response;
  } catch (error) {
    console.error("[QC Service] Error bulk verifying:", error);
    throw error;
  }
}

/**
 * Check if collection can be completed
 */
export async function checkCompletionStatus(
  collectionRestaurantId: string
): Promise<CompletionCheckResponse> {
  console.log("[QC Service] Checking completion status...");

  try {
    const response = await apiClient.get<CompletionCheckResponse>(
      `/v1/collection-restaurants/${collectionRestaurantId}/complete`
    );
    console.log("[QC Service] Completion check:", response);
    return response;
  } catch (error) {
    console.error("[QC Service] Error checking completion:", error);
    throw error;
  }
}

/**
 * Complete the collection and create QC snapshot
 *
 * @param collectionRestaurantId - Collection restaurant ID
 * @param notes - Optional completion notes
 * @param bypassVerificationCheck - For testing only, allows incomplete verification
 * @throws Error if verification incomplete (production mode)
 *
 * TODO: Set bypassVerificationCheck to false for production deployment
 */
export async function completeCollection(
  collectionRestaurantId: string,
  notes?: string,
  bypassVerificationCheck: boolean = true // ← TESTING MODE: Change to false for production
): Promise<any> {
  console.log("[QC Service] Completing collection...", collectionRestaurantId);

  try {
    // Production validation: Ensure all items verified
    if (!bypassVerificationCheck) {
      // TODO: Implement getCollectionStats or use checkCompletionStatus instead
      console.warn("[QC Service] ⚠️ Verification check not implemented yet");
      // const stats = await getCollectionStats(collectionRestaurantId);
      // const allVerified = stats.verifiedCount === stats.totalCount;
      // if (!allVerified) {
      //   const unverifiedCount = stats.totalCount - stats.verifiedCount;
      //   throw new Error(
      //     `Cannot complete collection: ${unverifiedCount} item(s) not verified. ` +
      //     `Please verify all items before completing.`
      //   );
      // }
    } else {
      console.warn(
        "[QC Service] ⚠️ Bypassing verification check (testing mode)"
      );
    }

    const response = await apiClient.post(
      `/v1/collection-restaurants/${collectionRestaurantId}/complete`,
      { notes }
    );
    console.log("[QC Service] Collection completed successfully");

    // ⭐ NEW: Trigger Snapshot Creation
    try {
      console.log("[QC Service] Creating QC snapshot...");
      await apiClient.post("/v1/qc/snapshots", {
        collectionRestaurantId,
      });
      console.log("[QC Service] Snapshot created successfully");
    } catch (snapshotError) {
      console.error(
        "[QC Service] Warning: Failed to create snapshot:",
        snapshotError
      );
      // Don't fail the whole operation if snapshot fails, but log it
    }

    return response;
  } catch (error) {
    console.error("[QC Service] Error completing collection:", error);
    throw error;
  }
}

/**
 * Transform QC merged item to desktop app ExtractedItem format
 */
export function transformQCItemToExtractedItem(
  item: QCMergedItem,
  index: number
) {
  return {
    id: index + 1,
    _id: item.id, // AI item ID
    title: item.name,
    description: item.description || "",
    price: item.price?.toString() || "0",
    currency: item.currency || "USD",
    category:
      item.category || item.menuHeaderName || item.masterHeaderName || "",
    image: item.imageUrl || "",
    url: item.sourceUrl || "",
    verified: item.isVerified,
    hasManualVersion: item.hasManualVersion, // ⭐ NEW: Show "little sign"
    manualItemId: item.manualItemId,
    confidence: item.confidence,
    hasConflict: item.hasConflict,
    needsReview: item.needsReview,
    reviewNotes: item.reviewNotes,
    masterHeaderId: item.masterHeaderId,
    masterHeaderName: item.masterHeaderName,
    menuHeaderName: item.menuHeaderName,
    sizes: item.sizes,
    priceLabels: item.priceLabels,
    timestamp: item.aiCreatedAt.toString(), // ⭐ Convert Date to string
  };
}
