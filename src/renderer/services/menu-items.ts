/**
 * API Service for Menu Items
 * Replaces direct MongoDB access with API calls
 */

import { apiClient } from "../lib/api-client";

export interface MenuItem {
  _id?: string;
  id?: number; // Frontend sequential ID
  title: string;
  description: string;
  price: number;
  currency: string;
  masterHeaderId?: string;
  masterHeaderName?: string;
  menuHeaderName?: string;
  restaurantId?: string;
  collectionId?: string;
  sourceId?: string;
  aiItemId?: string;
  verified?: boolean;
}

export interface GetMenuItemsParams {
  restaurantId: string;
  sourceId: string;
  isAIVerification?: boolean;
}

export interface SaveMenuItemParams {
  restaurantId: string;
  collectionId: string;
  sourceId: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  masterHeaderId?: string;
  masterHeaderName?: string;
  menuHeaderName?: string;
  aiItemId?: string;
  verified?: boolean;
}

export interface UpdateMenuItemParams {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  masterHeaderId?: string;
  masterHeaderName?: string;
  menuHeaderName?: string;
}

/**
 * Get menu items (AI-collected or manual)
 */
export async function getMenuItems(
  params: GetMenuItemsParams
): Promise<MenuItem[]> {
  const { restaurantId, sourceId, isAIVerification } = params;

  console.log("[API Service] Fetching menu items...", params);

  try {
    if (isAIVerification) {
      // Fetch AI-collected items
      const response = await apiClient.get<any>(
        `/menu-items/ai/collected?restaurant_id=${restaurantId}&source_id=${sourceId}`
      );

      console.log("[API Service] AI menu items response:", response);

      // Transform the grouped response to flat array
      const items: MenuItem[] = [];
      if (response.raw && Array.isArray(response.raw)) {
        // Use raw data if available
        return response.raw.map((item: any, index: number) => ({
          _id: item._id.toString(),
          id: index + 1,
          title: item.name || "",
          description: item.description || "",
          price: item.price || 0,
          currency: item.currency || "USD",
          masterHeaderId: item.masterHeaderId,
          masterHeaderName: item.masterHeaderName,
          menuHeaderName: item.menuHeaderName,
        }));
      }

      // Fallback: flatten grouped items
      if (response.items) {
        let id = 1;
        for (const [header, headerItems] of Object.entries(response.items)) {
          for (const item of headerItems as any[]) {
            items.push({
              _id: item._id,
              id: id++,
              title: item.name || "",
              description: item.description || "",
              price: item.price || 0,
              currency: item.currency || "USD",
              menuHeaderName: header,
              masterHeaderId: item.masterHeaderId,
            });
          }
        }
      }

      return items;
    } else {
      // Fetch manual items (would need collection ID for this)
      console.warn("[API Service] Manual items fetch not implemented yet");
      return [];
    }
  } catch (error) {
    console.error("[API Service] Error fetching menu items:", error);
    throw error;
  }
}

/**
 * Save a new menu item (manual collection or verification)
 */
export async function saveMenuItem(
  data: SaveMenuItemParams
): Promise<MenuItem> {
  console.log("[API Service] Saving menu item...", data);

  try {
    const response = await apiClient.post<any>("/menu-items/manual", data);

    console.log("[API Service] Save response:", response);

    if (response.results && response.results.length > 0) {
      return {
        _id: response.results[0].itemId,
        title: data.name,
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "USD",
      };
    }

    throw new Error("Failed to save menu item");
  } catch (error) {
    console.error("[API Service] Error saving menu item:", error);
    throw error;
  }
}

/**
 * Update an existing menu item
 */
export async function updateMenuItem(
  itemId: string,
  data: UpdateMenuItemParams
): Promise<void> {
  console.log("[API Service] Updating menu item...", itemId, data);

  try {
    // Transform the data to match API expectations
    const updateData: any = {};

    if (data.title !== undefined) updateData.name = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.masterHeaderId !== undefined)
      updateData.masterHeaderId = data.masterHeaderId;
    if (data.masterHeaderName !== undefined)
      updateData.masterHeaderName = data.masterHeaderName;
    if (data.menuHeaderName !== undefined)
      updateData.menuHeaderName = data.menuHeaderName;

    // Note: We'll need to create an update endpoint in the API
    // For now, we'll use a PATCH to the manual items endpoint
    await apiClient.patch(`/menu-items/manual/${itemId}`, updateData);

    console.log("[API Service] Menu item updated successfully");
  } catch (error) {
    console.error("[API Service] Error updating menu item:", error);
    throw error;
  }
}

/**
 * Get a specific source
 */
export async function getSource(sourceId: string): Promise<any> {
  console.log("[API Service] Fetching source...", sourceId);

  try {
    const response = await apiClient.get(`/sources/${sourceId}`);
    return response.source;
  } catch (error) {
    console.error("[API Service] Error fetching source:", error);
    throw error;
  }
}
