"use client";

import { useState, useEffect, useRef } from "react";
import { useExtractionStore, type ExtractedItem } from "../store";
import { Button } from "./ui-lib/ui/button";
import { Input } from "./ui-lib/ui/input";
import {
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Upload,
  Image as ImageIcon,
  Plus,
} from "lucide-react";
import { logAuditEvent, logFieldUpdate } from "../lib/audit-logger";

export default function DataPanel() {
  const {
    extractedData,
    selectedField,
    currentItemId,
    collectionContext,
    setSelectedField,
    setCurrentItemId,
    addExtractedItem,
    updateExtractedItem,
    removeExtractedItem,
    setExtractedData,
    user, // ⭐ NEW: Get user from store
  } = useExtractionStore();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // selectedSizes removed - derived from priceLabels now
  const [priceLabels, setPriceLabels] = useState<
    { size: string; price: string }[]
  >([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const isExtractionActiveRef = useRef(false);

  // ⭐ Duplicate Detection Helper
  const checkForDuplicates = (
    itemName: string,
    currentItemId?: number | string
  ): string | null => {
    if (!itemName || itemName.trim().length === 0) return null;

    const normalizedName = itemName.trim().toLowerCase();

    // Check against all existing items except current item
    const duplicate = extractedData.find((item) => {
      if (item.id === currentItemId || item._id === currentItemId) return false;
      const existingName = (item.title || "").trim().toLowerCase();
      return existingName === normalizedName;
    });

    if (duplicate) {
      const source = duplicate.isManual
        ? "(manually added)"
        : duplicate._id
          ? "(from AI)"
          : "(from extraction)";
      return `⚠️ Duplicate found: "${duplicate.title}" ${source}`;
    }

    return null;
  };

  // Cleanup extraction mode when component unmounts or critical state changes
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isExtractionActiveRef.current) {
        const webview = document.querySelector("webview");
        if (webview) {
          (webview as any).executeJavaScript(`
            window.postMessage({ command: 'STOP_SELECTION' }, '*');
          `);
        }
      }
    };
  }, []);

  // Stop extraction when form is closed or item changes
  useEffect(() => {
    if (!showItemForm || !currentItemId) {
      // Inline stop extraction to avoid dependency issues
      setSelectedField(null);
      isExtractionActiveRef.current = false;

      const webview = document.querySelector("webview");
      if (webview) {
        try {
          (webview as any).executeJavaScript(`
            window.postMessage({ command: 'STOP_SELECTION' }, '*');
            window.postMessage({ command: 'CLEAR_ALL_HIGHLIGHTS' }, '*');
          `);
        } catch (error) {
          console.error("Error stopping extraction:", error);
        }
      }
    }
  }, [showItemForm, currentItemId, setSelectedField]);

  // Sync extraction ref with selectedField state
  useEffect(() => {
    isExtractionActiveRef.current = !!selectedField;
  }, [selectedField]);

  // Add keyboard shortcut to stop extraction (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedField) {
        e.preventDefault();
        e.stopPropagation();
        handleStopExtraction();
      }
    };

    if (selectedField) {
      window.addEventListener("keydown", handleKeyDown, true);
      return () => {
        window.removeEventListener("keydown", handleKeyDown, true);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
      // handleStopExtraction is intentionally omitted - cleanup should only run when selectedField changes
    }
  }, [selectedField]);

  const handleAddItem = async () => {
    // ⭐ NEW QC WORKFLOW: Create manual item via API
    if (!collectionContext?.collectionRestaurantId) {
      // No collection context - just add locally (legacy mode)
      const id = Date.now();
      const localItem = {
        id,
        title: "",
        description: "",
        image: "",
        price: "",
        category: "",
        url: collectionContext?.sourceUrl || "",
        timestamp: new Date().toISOString(),
        verified: false,
      };
      addExtractedItem(localItem as any);
      setCurrentItemId(id);
      setShowItemForm(true);
      return;
    }

    try {
      // ⭐ Check if "New Item" already exists
      const existingNewItem = extractedData.find(
        (item) => (item.title || "").trim().toLowerCase() === "new item"
      );

      // Generate unique name if duplicate exists
      let itemName = "New Item";
      if (existingNewItem) {
        let counter = 2;
        while (
          extractedData.some(
            (item) =>
              (item.title || "").trim().toLowerCase() === `new item ${counter}`
          )
        ) {
          counter++;
        }
        itemName = `New Item ${counter}`;
      }

      // Create via API using MenuItemService
      const { apiClient } = await import("../lib/api-client");

      const response = await apiClient.post<any>("/menu-items/manual", {
        collectionRestaurantId: collectionContext.collectionRestaurantId,
        sourceId: collectionContext.sourceId,
        name: itemName,
        description: "",
        price: 0,
        currency: "USD",
        category: "",
        isManual: true, // Mark as manually added (not from AI)
      });

      if (response.success && response.results && response.results.length > 0) {
        const result = response.results[0];

        // Add to local state
        const newItem = {
          id: result.itemId,
          _id: result.itemId,
          title: itemName, // Use the unique name
          description: "",
          price: "",
          category: "",
          currency: "USD",
          url: collectionContext.sourceUrl || "",
          timestamp: new Date().toISOString(),
          verified: true, // Manual items are automatically verified
          isManual: true,
        };

        addExtractedItem(newItem as any);
        setCurrentItemId(newItem.id);
        setShowItemForm(true);
        setPriceLabels([]);

        console.log("✅ Manual item created via API:", result.itemId);
      } else {
        throw new Error("Failed to create item");
      }
    } catch (error) {
      console.error("❌ Error creating manual item:", error);
      alert(
        `Failed to create item: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const toggleItemExpansion = (itemId: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleToggleSize = (size: string) => {
    setPriceLabels((prev) => {
      const exists = prev.some((label) => label.size === size);
      if (exists) {
        // Remove if already exists (toggle off)
        return prev.filter((label) => label.size !== size);
      } else {
        // Add new label if not exists (toggle on)
        return [...prev, { size, price: "" }];
      }
    });
  };

  const handleAddPriceLabel = () => {
    setPriceLabels((prev) => [...prev, { size: "", price: "" }]);
  };

  const handleRemovePriceLabel = (index: number) => {
    setPriceLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePriceLabel = (
    index: number,
    field: "size" | "price",
    value: string
  ) => {
    setPriceLabels((prev) =>
      prev.map((label, i) =>
        i === index ? { ...label, [field]: value } : label
      )
    );
  };

  const handleFieldSelect = (field: string) => {
    const webview = document.querySelector("webview");

    // If clicking the same field, toggle it off
    if (selectedField === field) {
      setSelectedField(null);
      if (webview) {
        (webview as any).executeJavaScript(`
          window.postMessage({ command: 'STOP_SELECTION' }, '*');
        `);
      }
      return;
    }

    // Otherwise, start new selection (stop old one first if exists)
    if (selectedField) {
      if (webview) {
        (webview as any).executeJavaScript(`
          window.postMessage({ command: 'STOP_SELECTION' }, '*');
        `);
      }
    }

    // Start new selection after a small delay to ensure cleanup
    setTimeout(() => {
      setSelectedField(field);
      if (webview) {
        (webview as any).executeJavaScript(`
          window.postMessage({ command: 'START_SELECTION', field: '${field}' }, '*');
        `);
      }
    }, 50);
  };

  const handleStopExtraction = () => {
    // Force stop - set state first
    setSelectedField(null);
    isExtractionActiveRef.current = false;

    // Then send message to webview
    const webview = document.querySelector("webview");
    if (webview) {
      try {
        (webview as any).executeJavaScript(`
          window.postMessage({ command: 'STOP_SELECTION' }, '*');
          // Also try to remove any lingering event listeners or highlights
          window.postMessage({ command: 'CLEAR_ALL_HIGHLIGHTS' }, '*');
        `);
      } catch (error) {
        console.error("Error stopping extraction:", error);
      }
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm("Delete this item?")) {
      await window.electronAPI.deleteExtractedData(id);
      removeExtractedItem(id);
    }
  };

  const handleUnverifyItem = async (item: ExtractedItem) => {
    if (!item._id) {
      alert("❌ Cannot unverify: Item ID not found");
      return;
    }

    if (!item.verified) {
      alert("❌ Item is not verified");
      return;
    }

    const shouldUnverify = confirm(
      `Are you sure you want to unverify "${item.title}"?\n\nThis will delete the verified manual item and mark the AI item as unverified.`
    );

    if (!shouldUnverify) {
      return;
    }

    try {
      console.log("🔓 Unverifying item via QC API...", item._id);

      const { unverifyItem } = await import("../services/qc-verification");

      // Unverify the item (deletes manual item, marks AI as unverified)
      const result = await unverifyItem(item._id, item.manualItemId);
      if (result?.success) {
        console.log("✅ Item unverified successfully:", result);

        // Update local state - mark as unverified
        updateExtractedItem(item.id, {
          verified: false,
          manualItemId: undefined,
        });

        // ⭐ Audit Log: Item unverified
        const { user } = useExtractionStore.getState();
        const context = useExtractionStore.getState().collectionContext;
        if (user) {
          await logAuditEvent(
            {
              menuItemId: item.manualItemId || item._id,
              itemType: item.manualItemId ? "manual" : "ai",
              operation: "unverify",
              notes: `Unverified item "${item.title}"`,
            },
            {
              userId: user._id,
              userRole: user.role,
              userName: user.name,
              collectionRestaurantId: context?.collectionRestaurantId,
            }
          );
        }

        alert(`✅ Item "${item.title}" has been unverified successfully.`);
      } else {
        throw new Error(result?.error || "Failed to unverify item");
      }
    } catch (error) {
      console.error("❌ Error unverifying item via QC API:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      alert(`Failed to unverify item:\n\n${errorMessage}`);
    }
  };

  const handleVerifyItem = async (item: ExtractedItem) => {
    const { collectionContext } = useExtractionStore.getState();

    // ⭐ QC Verification Mode - Use API to create MenuItemManual
    if (collectionContext?.hasAIData && item._id) {
      // ⭐ Optimistic Update: Update UI immediately
      const originalVerifiedState = item.verified;
      updateExtractedItem(item.id, { verified: true });

      try {
        console.log("🔐 Verifying AI item via QC API...", item._id);
        console.log("📦 Item ID:", item._id);
        console.log("📦 Context:", collectionContext);

        // Check auth token
        const authData = localStorage.getItem("authData");
        if (!authData) {
          throw new Error("Not authenticated. Please log in again.");
        }

        const auth = JSON.parse(authData);
        if (Date.now() > auth.expiresAt) {
          throw new Error("Session expired. Please log in again.");
        }

        const { verifyItem } = await import("../services/qc-verification");

        // Verify the AI item (creates MenuItemManual, marks AI as verified)
        const result = await verifyItem({
          aiItemId: item._id,
          edits: {
            name: item.title,
            description: item.description,
            price: parseFloat(item.price) || 0,
            currency: item.currency,
            category: item.category,
            masterHeaderId: item.masterHeaderId,
            masterHeaderName: item.masterHeaderName,
            menuHeaderName: item.menuHeaderName,
          },
        });

        console.log("✅ Verification result:", result);

        // ⭐ Audit Log: Item verified
        const { user } = useExtractionStore.getState();
        if (user) {
          await logAuditEvent(
            {
              menuItemId: item._id,
              itemType: "ai",
              operation: "verify",
              notes: `Verified item "${item.title}"`,
            },
            {
              userId: user._id,
              userRole: user.role,
              userName: user.name,
              collectionRestaurantId: collectionContext.collectionRestaurantId,
            }
          );
        }

        // ⭐ Refresh QC data to get updated progress and manual indicators
        if (collectionContext.sourceId) {
          console.log("🔄 Refreshing QC data...");
          await refreshQCData(collectionContext.sourceId);
        } else {
          // Fallback: just update local state (already done optimistically, but update other fields if needed)
          updateExtractedItem(item.id, {
            verified: true,
            hasManualVersion: true,
            manualItemId: result.item?._id,
          });
        }

        console.log("✅ Item verified and data refreshed");
      } catch (error) {
        // ❌ Revert optimistic update on error
        updateExtractedItem(item.id, { verified: originalVerifiedState });

        console.error("❌ Error verifying item via QC API:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Check if it's an auth error
        if (
          errorMessage.includes("Unauthorized") ||
          errorMessage.includes("expired") ||
          errorMessage.includes("authenticated")
        ) {
          alert(
            `🔐 Authentication Error:\n\n${errorMessage}\n\nPlease log in again from the login screen.`
          );

          // Trigger logout
          localStorage.removeItem("authData");
          window.location.reload();
        } else {
          alert(`Failed to verify item:\n\n${errorMessage}`);
        }
      }
    } else {
      // Legacy: Manual collection mode - just toggle locally
      await window.electronAPI.updateExtractedData(item.id, {
        verified: !item.verified,
      });
      updateExtractedItem(item.id, { verified: !item.verified });
    }
  };

  // ⭐ NEW: Refresh QC data from API (after verify, or on manual refresh)
  const refreshQCData = async (sourceId: string) => {
    try {
      const { getQCMergedItems, transformQCItemToExtractedItem } = await import(
        "../services/qc-verification"
      );

      const qcData = await getQCMergedItems(sourceId);

      console.log("✅ QC data refreshed:", qcData.items?.length || 0, "items");
      console.log("📊 Updated Progress:", qcData.stats);

      // Transform and update
      const transformedItems = qcData.items.map((item, index) =>
        transformQCItemToExtractedItem(item, index)
      );

      setExtractedData(transformedItems);

      // Update localStorage progress
      localStorage.setItem("qcProgress", JSON.stringify(qcData.stats));

      return qcData.stats;
    } catch (error) {
      console.error("❌ Error refreshing QC data:", error);
      throw error;
    }
  };

  /**
   * ⭐ NEW: Centralized field update handler
   * Handles both manual items and AI items in QC mode
   * - If manual item exists: updates it directly
   * - If AI item only: verifies it with the edit (creates manual version)
   */
  const handleFieldUpdate = async (field: string, value: any) => {
    if (!currentItem) return;

    // Map frontend field names to API field names
    const fieldMap: Record<string, string> = {
      title: "name",
      description: "description",
      price: "price",
      currency: "currency",
    };

    const apiFieldName = fieldMap[field] || field;

    try {
      if (currentItem.manualItemId) {
        // Manual version exists - update it directly
        const oldValue = currentItem[field as keyof ExtractedItem];
        const { updateMenuItem } = await import("../services/menu-items");
        await updateMenuItem(currentItem.manualItemId, {
          [field]: value,
        });
        console.log(`✅ ${field} updated via API (manual item)`);

        // ⭐ Audit Log: Field updated
        const { user } = useExtractionStore.getState();
        if (user) {
          await logFieldUpdate(
            currentItem.manualItemId,
            "manual",
            apiFieldName,
            oldValue,
            value,
            {
              userId: user._id,
              userRole: user.role,
              userName: user.name,
              collectionRestaurantId: collectionContext?.collectionRestaurantId,
            }
          );
        }
      } else if (currentItem._id && collectionContext?.hasAIData) {
        // AI item without manual version - verify it with the edit
        const { verifyItem } = await import("../services/qc-verification");
        const result = await verifyItem({
          aiItemId: currentItem._id,
          edits: { [apiFieldName]: value },
        });

        // Update local state with new manual item ID
        updateExtractedItem(currentItem.id, {
          manualItemId: result.item?.manualItemId,
          verified: true,
        });

        console.log(`✅ AI item verified with ${field} edit`);

        // Refresh QC data to update progress
        if (collectionContext.sourceId) {
          await refreshQCData(collectionContext.sourceId);
        }
      }
    } catch (error) {
      console.error(`❌ Error updating ${field}:`, error);
      // Show user-friendly error message
      alert(`Failed to update ${field}. Please try again.`);
    }
  };

  const handleCompleteCollection = async () => {
    if (!collectionContext) {
      alert("❌ No collection context found. Please start from the web app.");
      return;
    }

    const hasUnverified = extractedData.some((item) => !item.verified);

    if (hasUnverified) {
      const unverifiedCount = extractedData.filter(
        (item) => !item.verified
      ).length;
      const shouldContinue = confirm(
        `⚠️ Warning: ${unverifiedCount} items are not verified yet.\n\nIn verification mode, all AI items must be verified before completing.\n\nDo you want to continue anyway?`
      );
      if (!shouldContinue) {
        return;
      }
    }

    setShowCompleteModal(true);
  };

  const handleSaveToAPI = async () => {
    if (!collectionContext?.sourceId) {
      alert("❌ No collection context found. Please start from the web app.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const { apiClient } = await import("../lib/api-client");

      // All items should already be saved to the API when added/edited
      // Now we just need to mark the source collection as complete
      console.log(
        `✅ Completing manual collection for source: ${collectionContext.sourceId} `
      );
      console.log(`📍 Restaurant ID: ${collectionContext.restaurantId} `);

      // Call the complete-manual-collection endpoint
      console.log(
        `🌐 API Call: POST / sources / ${collectionContext.sourceId}/complete-manual-collection`
      );

      const response = await apiClient.post<any>(
        `/sources/${collectionContext.sourceId}/complete-manual-collection`,
        {}
      );

      console.log(`✅ API Response received:`, response);

      // API client returns parsed JSON directly
      // Response structure: { success: true, message: "...", data: { sourceId, restaurantId, ... } }
      if (response?.success) {
        const completionData = response.data || {};
        const message = completionData.collectionRestaurantCompleted
          ? `✅ Collection completed successfully!\n\n🎉 All sources for this restaurant are now complete.\n\nThe restaurant is ready for supervisor review.`
          : `✅ Collection completed for this source!\n\nNote: This restaurant has other sources that still need to be completed.`;

        alert(message);

        // Clear local state
        setExtractedData([]);
        setShowCompleteModal(false);

        console.log("✅ Manual collection marked as complete!");
        console.log(
          "📊 Restaurant completion:",
          completionData.collectionRestaurantCompleted ? "YES" : "NO"
        );
        console.log(
          "📊 All sources completed:",
          completionData.allSourcesCompleted ? "YES" : "NO"
        );
      } else {
        console.error("❌ API returned unsuccessful response:", response);
        throw new Error(
          response?.error ||
          response?.message ||
          "Failed to complete manual collection"
        );
      }
    } catch (error) {
      console.error("❌ Error completing collection:", error);

      // Enhanced error logging
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setSaveError(errorMessage);
      alert(
        `❌ Failed to complete collection: ${errorMessage}\n\nCheck the console for more details.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    const result = await window.electronAPI.exportData(exportFormat);
    setShowExportModal(false);

    if (result.success) {
      alert(`Exported ${result.count} items successfully!`);
    }
  };

  const currentItem = extractedData.find((item) => item.id === currentItemId);

  return (
    <aside className="w-96 flex flex-col border-l border-[#E5E5E5] bg-white relative">
      {/* Global Extraction Mode Indicator - Shows even outside form */}
      {selectedField && !showItemForm && (
        <div className="absolute top-4 left-4 right-4 z-50 px-4 py-3 bg-[#00D2A1] text-white rounded-lg shadow-lg flex items-center justify-between border-2 border-white animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
            <div className="flex flex-col">
              <span
                className="text-xs font-medium"
                style={{ fontFamily: "Montserrat" }}
              >
                EXTRACTION ACTIVE
              </span>
              <span
                className="text-sm font-bold capitalize"
                style={{ fontFamily: "Montserrat" }}
              >
                Selecting: {selectedField}
              </span>
            </div>
          </div>
          <button
            onClick={handleStopExtraction}
            className="px-4 py-2 bg-white text-[#00D2A1] hover:bg-gray-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 shadow-md"
            style={{ fontFamily: "Montserrat" }}
          >
            <X size={16} />
            STOP
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="font-semibold text-lg text-[#000000]"
            style={{ fontFamily: "Montserrat" }}
          >
            {currentItemId && showItemForm ? "New Item" : "Master Header"}
          </h3>

          {/* ⭐ User Info Display */}
          {user && !showItemForm && (
            <div className="flex flex-col items-end mr-4">
              <span
                className="text-xs font-semibold text-[#00D2A1]"
                style={{ fontFamily: "Montserrat" }}
              >
                {user.name}
              </span>
              <span
                className="text-[10px] text-[#737373] uppercase"
                style={{ fontFamily: "Montserrat" }}
              >
                {user.role}
              </span>
            </div>
          )}

          {!showItemForm && (
            <span
              className="px-3 py-1 rounded-full text-sm font-bold bg-[#00D2A1] text-white"
              style={{ fontFamily: "Montserrat" }}
            >
              {extractedData.length}
            </span>
          )}
          {showItemForm && (
            <button
              onClick={() => {
                setShowItemForm(false);
                setCurrentItemId(null);
                handleStopExtraction();
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} className="text-[#DC2626]" />
            </button>
          )}
        </div>

        {!showItemForm && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={handleAddItem}
                className="flex-1 bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-lg h-10"
                style={{ fontFamily: "Montserrat" }}
              >
                Add Template
              </Button>
              <Button
                onClick={handleAddItem}
                className="flex-1 bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-lg h-10"
                style={{ fontFamily: "Montserrat" }}
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span
                  className="text-sm text-[#000000]"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Master Header
                </span>
                <div className="w-10 h-6 bg-[#00D2A1] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-sm text-[#000000]"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Menu Headers
                </span>
                <div className="w-10 h-6 bg-[#00D2A1] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extraction Mode Banner */}
      {selectedField && showItemForm && (
        <div className="px-4 py-3 bg-[#00D2A1] text-white flex items-center justify-between border-b-2 border-[#00B890]">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
            <div className="flex flex-col">
              <span
                className="text-xs font-medium opacity-90"
                style={{ fontFamily: "Montserrat" }}
              >
                EXTRACTION MODE
              </span>
              <span
                className="text-sm font-bold capitalize"
                style={{ fontFamily: "Montserrat" }}
              >
                {selectedField}
              </span>
            </div>
          </div>
          <button
            onClick={handleStopExtraction}
            className="px-3 py-1.5 bg-white text-[#00D2A1] hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            style={{ fontFamily: "Montserrat" }}
          >
            <X size={14} />
            STOP (ESC)
          </button>
        </div>
      )}

      {/* New Item Form */}
      {showItemForm && currentItem && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Image Upload Section */}
            <div>
              <label
                className="block text-sm font-medium mb-2 text-[#000000]"
                style={{ fontFamily: "Montserrat" }}
              >
                Image
              </label>
              <div className="relative">
                {currentItem.image ? (
                  <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-[#E5E5E5]">
                    <img
                      src={currentItem.image}
                      alt="Item preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() =>
                        updateExtractedItem(currentItem.id, { image: "" })
                      }
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleFieldSelect("image")}
                    className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${selectedField === "image"
                      ? "border-[#00D2A1] bg-[#00D2A1]/5"
                      : "border-[#E5E5E5] hover:border-[#00D2A1]/50"
                      }`}
                  >
                    <div className="p-3 bg-[#00D2A1]/10 rounded-lg mb-2">
                      <ImageIcon className="text-[#00D2A1]" size={24} />
                    </div>
                    <span
                      className="text-sm font-medium text-[#00D2A1]"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      Upload Image
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label
                className="block text-sm font-medium mb-2 text-[#000000]"
                style={{ fontFamily: "Montserrat" }}
              >
                Name
              </label>
              <div className="relative">
                <Input
                  placeholder="4 Chicken Strips Combo"
                  value={currentItem.title || ""}
                  onChange={(e) => {
                    updateExtractedItem(currentItem.id, {
                      title: e.target.value,
                    });
                    // ⭐ Check for duplicates when title changes
                    const warning = checkForDuplicates(
                      e.target.value,
                      currentItem.id
                    );
                    setDuplicateWarning(warning);
                  }}
                  onBlur={(e) => handleFieldUpdate("title", e.target.value)}
                  className="h-11 rounded-lg border-[#E5E5E5] pr-10"
                  style={{ fontFamily: "Montserrat" }}
                />
                <button
                  onClick={() => handleFieldSelect("title")}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors ${selectedField === "title"
                    ? "bg-[#00D2A1] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  <Upload size={16} />
                </button>
              </div>

              {/* ⭐ Duplicate Warning Display */}
              {duplicateWarning && (
                <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle
                    className="text-yellow-600 flex-shrink-0 mt-0.5"
                    size={16}
                  />
                  <span
                    className="text-sm text-yellow-800"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    {duplicateWarning}
                  </span>
                </div>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label
                className="block text-sm font-medium mb-2 text-[#000000]"
                style={{ fontFamily: "Montserrat" }}
              >
                Description
              </label>
              <div className="relative">
                <Input
                  placeholder="Family Pack"
                  value={currentItem.description || ""}
                  onChange={(e) =>
                    updateExtractedItem(currentItem.id, {
                      description: e.target.value,
                    })
                  }
                  onBlur={(e) => handleFieldUpdate("description", e.target.value)}
                  className="h-11 rounded-lg border-[#E5E5E5] pr-10"
                  style={{ fontFamily: "Montserrat" }}
                />
                <button
                  onClick={() => handleFieldSelect("description")}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors ${selectedField === "description"
                    ? "bg-[#00D2A1] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  <Upload size={16} />
                </button>
              </div>
            </div>

            {/* Currency and Price */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  className="block text-sm font-medium mb-2 text-[#000000]"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Currency
                </label>
                <div className="relative">
                  <Input
                    placeholder="$"
                    value={currentItem.currency || "$"}
                    onChange={(e) =>
                      updateExtractedItem(currentItem.id, {
                        currency: e.target.value,
                      })
                    }
                    onBlur={(e) => handleFieldUpdate("currency", e.target.value)}
                    className="h-11 rounded-lg border-[#E5E5E5] text-center pr-10"
                    style={{ fontFamily: "Montserrat" }}
                  />
                  <button
                    onClick={() => handleFieldSelect("currency")}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors ${selectedField === "currency"
                      ? "bg-[#00D2A1] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    title="Extract currency symbol"
                  >
                    <Upload size={14} />
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label
                  className="block text-sm font-medium mb-2 text-[#000000]"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Price
                </label>
                <div className="relative">
                  <Input
                    placeholder="10"
                    value={currentItem.price || ""}
                    onChange={(e) =>
                      updateExtractedItem(currentItem.id, {
                        price: e.target.value,
                      })
                    }
                    onBlur={(e) => handleFieldUpdate("price", parseFloat(e.target.value) || 0)}
                    className="h-11 rounded-lg border-[#E5E5E5] pr-10"
                    style={{ fontFamily: "Montserrat" }}
                  />
                  <button
                    onClick={() => handleFieldSelect("price")}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors ${selectedField === "price"
                      ? "bg-[#00D2A1] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    title="Extract price (will auto-detect currency)"
                  >
                    <Upload size={16} />
                  </button>
                </div>
                <p
                  className="text-xs text-[#737373] mt-1"
                  style={{ fontFamily: "Montserrat" }}
                >
                  💡 Extracts currency automatically
                </p>
              </div>
            </div>

            {/* Menu Header Dropdown */}
            <div>
              <label
                className="block text-sm font-medium mb-2 text-[#000000]"
                style={{ fontFamily: "Montserrat" }}
              >
                Select Menu Header
              </label>
              <select
                value={currentItem.category || ""}
                onChange={(e) =>
                  updateExtractedItem(currentItem.id, {
                    category: e.target.value,
                  })
                }
                className="w-full h-11 rounded-lg border border-[#E5E5E5] px-3 bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="">Select Menu Header</option>
                <option value="Appetizers">Appetizers</option>
                <option value="Main Course">Main Course</option>
                <option value="Desserts">Desserts</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>

            {/* Add Screenshot Button */}
            <Button
              onClick={() => handleFieldSelect("screenshot")}
              className="w-full h-11 bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-lg flex items-center justify-center gap-2"
              style={{ fontFamily: "Montserrat" }}
            >
              <Upload size={18} />
              Add Screenshot Here
            </Button>

            {/* Size Selection */}
            <div>
              <label
                className="block text-sm font-medium mb-2 text-[#000000]"
                style={{ fontFamily: "Montserrat" }}
              >
                Price Labels
              </label>
              <div className="flex gap-2">
                {["S", "M", "L"].map((size) => {
                  const isSelected = priceLabels.some(
                    (label) => label.size === size
                  );
                  return (
                    <button
                      key={size}
                      onClick={() => handleToggleSize(size)}
                      className={`w-12 h-12 rounded-lg border-2 font-semibold transition-colors ${isSelected
                        ? "bg-[#00D2A1] border-[#00D2A1] text-white"
                        : "bg-white border-[#E5E5E5] text-[#000000] hover:border-[#00D2A1]/50"
                        }`}
                      style={{ fontFamily: "Montserrat" }}
                    >
                      {size}
                    </button>
                  );
                })}
                <button
                  onClick={handleAddPriceLabel}
                  className="w-12 h-12 rounded-lg border-2 border-[#00D2A1] bg-[#00D2A1]/10 text-[#00D2A1] hover:bg-[#00D2A1]/20 flex items-center justify-center transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* Price Labels */}
            {priceLabels.length > 0 && (
              <div className="space-y-2">
                {priceLabels.map((label, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Size"
                      value={label.size}
                      onChange={(e) =>
                        handleUpdatePriceLabel(index, "size", e.target.value)
                      }
                      className="h-10 rounded-lg border-[#E5E5E5]"
                      style={{ fontFamily: "Montserrat" }}
                    />
                    <Input
                      placeholder="Price"
                      value={label.price}
                      onChange={(e) =>
                        handleUpdatePriceLabel(index, "price", e.target.value)
                      }
                      className="h-10 rounded-lg border-[#E5E5E5]"
                      style={{ fontFamily: "Montserrat" }}
                    />
                    <button
                      onClick={() => handleRemovePriceLabel(index)}
                      className="px-3 py-2 rounded-lg bg-[#DC2626]/10 text-[#DC2626] hover:bg-[#DC2626]/20"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}



            {/* Verify Item Checkbox */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5]">
              <span
                className="text-sm font-medium text-[#000000]"
                style={{ fontFamily: "Montserrat" }}
              >
                {currentItem.verified ? "Verified" : "Verify Item"}
              </span>
              {currentItem.verified ? (
                <button
                  onClick={() => handleUnverifyItem(currentItem)}
                  className="px-4 py-2 text-sm rounded-lg font-medium transition-colors bg-red-100 text-red-600 hover:bg-red-200"
                  style={{ fontFamily: "Montserrat" }}
                >
                  ✗ Unverify
                </button>
              ) : (
                <button
                  onClick={() => handleVerifyItem(currentItem)}
                  className="w-12 h-6 rounded-full relative transition-colors bg-gray-300 hover:bg-[#00D2A1]"
                >
                  <div
                    className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all left-1"
                  ></div>
                </button>
              )}
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  setShowItemForm(false);
                  setCurrentItemId(null);
                  handleStopExtraction();
                }}
                variant="outline"
                className="flex-1 h-11 rounded-lg"
                style={{ fontFamily: "Montserrat" }}
              >
                Save & Close
              </Button>
              <Button
                onClick={() => handleDeleteItem(currentItem.id)}
                className="flex-1 h-11 rounded-lg bg-[#DC2626] hover:bg-[#DC2626]/90 text-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data List View */}
      {!showItemForm && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* ⭐ QC Progress Header */}
          {collectionContext?.hasAIData &&
            (() => {
              const progressData = localStorage.getItem("qcProgress");
              const stats = progressData ? JSON.parse(progressData) : null;

              return (
                stats && (
                  <div className="p-4 bg-gradient-to-r from-[#00D2A1]/10 to-[#00D2A1]/5 border-b border-[#E5E5E5]">
                    <div className="flex items-center justify-between mb-2">
                      <h3
                        className="text-sm font-semibold text-[#000000]"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        QC Progress for {collectionContext.restaurantName}
                      </h3>
                      <button
                        onClick={() =>
                          collectionContext.sourceId &&
                          refreshQCData(
                            collectionContext.sourceId
                          )
                        }
                        className="text-xs px-3 py-1 rounded-lg bg-white border border-[#E5E5E5] hover:bg-[#F7F7F7] text-[#737373]"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        🔄 Refresh
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div
                        className="flex items-center justify-between text-xs mb-1"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        <span className="text-[#737373]">
                          {stats.verified} of {stats.total} verified
                        </span>
                        <span className="font-semibold text-[#00D2A1]">
                          {stats.percentComplete}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#00D2A1] to-[#00B88F] transition-all duration-500"
                          style={{ width: `${stats.percentComplete}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Chips */}
                    <div className="flex gap-2 flex-wrap">
                      <div
                        className="px-2 py-1 bg-white rounded text-xs"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        ✅{" "}
                        <span className="font-semibold text-[#00D2A1]">
                          {stats.verified}
                        </span>{" "}
                        Verified
                      </div>
                      <div
                        className="px-2 py-1 bg-white rounded text-xs"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        ⏳{" "}
                        <span className="font-semibold text-[#F59E0B]">
                          {stats.pending}
                        </span>{" "}
                        Pending
                      </div>
                      {stats.conflicts > 0 && (
                        <div
                          className="px-2 py-1 bg-white rounded text-xs"
                          style={{ fontFamily: "Montserrat" }}
                        >
                          ⚠️{" "}
                          <span className="font-semibold text-[#DC2626]">
                            {stats.conflicts}
                          </span>{" "}
                          Conflicts
                        </div>
                      )}
                    </div>
                  </div>
                )
              );
            })()}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4">
            {extractedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-[#737373]">
                <div className="text-5xl mb-4">📊</div>
                <div
                  className="text-lg font-medium mb-2"
                  style={{ fontFamily: "Montserrat" }}
                >
                  No data extracted yet
                </div>
                <div className="text-sm" style={{ fontFamily: "Montserrat" }}>
                  Click &quot;Add Item&quot; to create your first item
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {extractedData.map((item, index) => {
                  const isExpanded = expandedItems.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border transition-all ${item.id === currentItemId
                        ? "border-[#00D2A1] shadow-md"
                        : "border-[#E5E5E5]"
                        } bg-white`}
                    >
                      {/* Minimized Header - Always Visible */}
                      <div
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#F7F7F7] rounded-t-xl"
                        onClick={() => toggleItemExpansion(item.id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {/* Expand/Collapse Icon */}
                          <button className="text-[#737373] hover:text-[#00D2A1] transition-colors">
                            {isExpanded ? (
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M5 7.5l5 5 5-5H5z" />
                              </svg>
                            ) : (
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M7.5 5l5 5-5 5V5z" />
                              </svg>
                            )}
                          </button>

                          {/* Item Title */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-semibold text-sm text-[#000000]"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                {index + 1}. {item.title || "Untitled Item"}
                              </span>
                              {/* ⭐ Verified Badge */}
                              {item.verified && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded bg-[#00D2A1]/20 text-[#00D2A1] font-medium"
                                  style={{ fontFamily: "Montserrat" }}
                                >
                                  ✓
                                </span>
                              )}
                              {/* ⭐ "Little Sign" - Shows item has been manually edited */}
                              {item.hasManualVersion && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded bg-[#3B82F6]/20 text-[#3B82F6] font-medium"
                                  style={{ fontFamily: "Montserrat" }}
                                  title="This item has been manually verified/edited"
                                >
                                  ✏️
                                </span>
                              )}
                              {/* ⭐ Conflict Indicator */}
                              {item.hasConflict && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded bg-[#DC2626]/20 text-[#DC2626] font-medium"
                                  style={{ fontFamily: "Montserrat" }}
                                  title={item.reviewNotes || "Has conflicts"}
                                >
                                  ⚠️
                                </span>
                              )}
                            </div>
                            {!isExpanded && (
                              <div
                                className="text-xs text-[#737373] mt-0.5"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                {item.price
                                  ? `${item.currency || "$"}${item.price}`
                                  : "No price"}{" "}
                                • {item.category || "No category"}
                              </div>
                            )}
                          </div>

                          {/* Quick Edit Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentItemId(item.id);
                              setShowItemForm(true);
                            }}
                            className="px-3 py-1.5 text-xs rounded-lg bg-[#00D2A1] hover:bg-[#00B890] text-white font-medium transition-colors"
                            style={{ fontFamily: "Montserrat" }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-3 border-t border-[#E5E5E5] pt-3">
                          {/* Image Preview */}
                          {item.image && (
                            <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Details Grid */}
                          <div className="space-y-2">
                            <div>
                              <label
                                className="text-xs font-semibold text-[#737373]"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                Name
                              </label>
                              <div
                                className="text-sm text-[#000000] mt-0.5"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                {item.title || "-"}
                              </div>
                            </div>

                            <div>
                              <label
                                className="text-xs font-semibold text-[#737373]"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                Description
                              </label>
                              <div
                                className="text-sm text-[#000000] mt-0.5"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                {item.description || "-"}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label
                                  className="text-xs font-semibold text-[#737373]"
                                  style={{ fontFamily: "Montserrat" }}
                                >
                                  Price
                                </label>
                                <div
                                  className="text-sm text-[#000000] mt-0.5"
                                  style={{ fontFamily: "Montserrat" }}
                                >
                                  {item.currency || "$"}
                                  {item.price || "0"}
                                </div>
                              </div>

                              <div>
                                <label
                                  className="text-xs font-semibold text-[#737373]"
                                  style={{ fontFamily: "Montserrat" }}
                                >
                                  Category
                                </label>
                                <div
                                  className="text-sm text-[#000000] mt-0.5"
                                  style={{ fontFamily: "Montserrat" }}
                                >
                                  {item.category || "-"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            {item.verified ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnverifyItem(item);
                                }}
                                className="flex-1 px-3 py-2 text-xs rounded-lg font-medium transition-colors bg-red-100 text-red-600 hover:bg-red-200"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                ✗ Unverify
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerifyItem(item);
                                }}
                                className="flex-1 px-3 py-2 text-xs rounded-lg font-medium transition-colors bg-[#FFA500]/20 text-[#FFA500] hover:bg-[#FFA500]/30"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                Verify Item
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                              className="px-3 py-2 text-xs rounded-lg bg-[#DC2626]/10 hover:bg-[#DC2626]/20 text-[#DC2626] font-medium transition-colors"
                              style={{ fontFamily: "Montserrat" }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!showItemForm && (
        <div className="p-4 border-t border-[#E5E5E5] space-y-2">
          {/* {collectionContext && (
            <div className="text-xs text-[#737373] mb-2 p-2 bg-[#F7F7F7] rounded-lg" style={{ fontFamily: "Montserrat" }}>
              <div><span className="font-medium text-[#000000]">Restaurant:</span> {collectionContext.restaurantName}</div>
              <div><span className="font-medium text-[#000000]">Mode:</span> {collectionContext.hasAIData ? 'Verification' : 'Manual Collection'}</div>
              {extractedData.length > 0 && (
                <div className="mt-1">
                  <span className="font-medium text-[#000000]">Verified:</span>{' '}
                  {extractedData.filter(item => item.verified).length} / {extractedData.length}
                </div>
              )}
            </div>
          )} */}

          <Button
            onClick={handleCompleteCollection}
            className="w-full bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-lg h-12"
            disabled={extractedData.length === 0}
            style={{ fontFamily: "Montserrat", fontWeight: 600 }}
          >
            Mark Restaurant Complete
          </Button>

          {/* Old export button for backward compatibility */}
          <Button
            onClick={() => setShowExportModal(true)}
            variant="outline"
            className="w-full rounded-lg h-10"
            disabled={extractedData.length === 0}
            style={{ fontFamily: "Montserrat" }}
          >
            Export Data (Local)
          </Button>
        </div>
      )}

      {/* Mark Restaurant Complete Modal */}
      {showCompleteModal && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-50 bg-black/50 backdrop-blur-sm">
          <div className="rounded-lg p-6 w-full max-w-md border bg-white border-[#E5E5E5] shadow-xl">
            <h3
              className="text-lg font-semibold mb-4 text-[#000000]"
              style={{ fontFamily: "Montserrat" }}
            >
              Mark Restaurant Complete
            </h3>

            <div className="space-y-3 mb-6">
              <div className="p-4 bg-[#F7F7F7] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm font-medium text-[#000000]"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    Total Items
                  </span>
                  <span
                    className="text-lg font-bold text-[#00D2A1]"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    {extractedData.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-medium text-[#000000]"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    Verified Items
                  </span>
                  <span
                    className="text-lg font-bold text-[#00D2A1]"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    {extractedData.filter((item) => item.verified).length}
                  </span>
                </div>
              </div>

              {collectionContext?.hasAIData && (
                <div className="p-3 bg-[#FFA500]/10 rounded-lg border border-[#FFA500]/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-[#FFA500] mt-0.5" />
                    <p
                      className="text-xs text-[#000000]"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      <strong>Verification Mode:</strong> All AI-extracted items
                      should be verified before completing.
                    </p>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-[#DC2626]/10 rounded-lg border border-[#DC2626]/30">
                  <p
                    className="text-xs text-[#DC2626]"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    {saveError}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSaveError(null);
                }}
                variant="outline"
                className="flex-1"
                disabled={isSaving}
                style={{ fontFamily: "Montserrat" }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveToAPI}
                className="flex-1 bg-[#00D2A1] hover:bg-[#00B890] text-white"
                disabled={isSaving}
                style={{ fontFamily: "Montserrat" }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save to Database"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-50 bg-black/50 backdrop-blur-sm">
          <div className="rounded-lg p-6 w-full max-w-sm border bg-card border-border shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Export Data</h3>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors hover:bg-muted border-border">
                <input
                  type="radio"
                  name="exportFormat"
                  value="json"
                  checked={exportFormat === "json"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="accent-primary"
                />
                <div>
                  <div className="font-medium">JSON Format</div>
                  <div className="text-sm text-muted-foreground">
                    Structured data with all fields
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors hover:bg-muted border-border">
                <input
                  type="radio"
                  name="exportFormat"
                  value="csv"
                  checked={exportFormat === "csv"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="accent-primary"
                />
                <div>
                  <div className="font-medium">CSV Format</div>
                  <div className="text-sm text-muted-foreground">
                    Spreadsheet compatible format
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowExportModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              {/* Export button - using gradient class */}
              <Button
                onClick={handleExport}
                className="flex-1 gradient-primary text-white"
              >
                Export
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
