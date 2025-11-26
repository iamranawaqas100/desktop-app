import { useEffect, useRef, useState } from "react";
import { useExtractionStore } from "../store";

interface BrowserViewProps {
  url: string;
  webviewRef: React.RefObject<any>;
}

export default function BrowserView({ url, webviewRef }: BrowserViewProps) {
  const localWebviewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isWebviewReady, setIsWebviewReady] = useState(false);
  const pendingUrlRef = useRef<string | null>(null);
  const {
    currentItemId,
    selectedField,
    extractedData,
    addExtractedItem,
    updateExtractedItem,
  } = useExtractionStore();

  // Get the current item to access its MongoDB _id
  const currentItem = extractedData.find((item) => item.id === currentItemId);

  // ⭐ FIX: Initialize webview ref with ready state tracking
  useEffect(() => {
    const webview = localWebviewRef.current;
    if (!webview) return;

    // Set up the webview ref for parent component
    webviewRef.current = webview;

    // Wait for webview to be actually ready before marking as ready
    const checkWebviewReady = () => {
      try {
        // Check if webview is fully initialized (has required properties)
        if (webview.getWebContentsId && webview.src !== undefined) {
          console.log("✅ Webview is ready and initialized");
          setIsWebviewReady(true);

          // Load pending URL if there is one
          if (pendingUrlRef.current) {
            console.log("🔄 Loading pending URL:", pendingUrlRef.current);
            webview.src = pendingUrlRef.current;
            pendingUrlRef.current = null;
          }
        } else {
          // Webview not ready yet, check again
          setTimeout(checkWebviewReady, 50);
        }
      } catch (error) {
        console.warn("⚠️ Webview not ready yet, retrying...", error);
        setTimeout(checkWebviewReady, 50);
      }
    };

    // Start checking for webview readiness
    checkWebviewReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // webviewRef is a ref and doesn't need to be in dependencies
  }, []);

  // ⭐ ENHANCED: Better URL loading with ready check, loading state, and error handling
  useEffect(() => {
    const webview = webviewRef.current;

    // Check if webview exists
    if (!webview) {
      console.log("⚠️ Webview not available yet, waiting...");
      // Store URL to load it once webview is ready
      if (url) {
        pendingUrlRef.current = url;
      }
      return;
    }

    // Check if webview is fully initialized
    if (!isWebviewReady) {
      console.log(
        "⚠️ Webview exists but not fully initialized, storing URL as pending..."
      );
      // Store URL to load it once webview is ready
      if (url) {
        pendingUrlRef.current = url;
        setIsLoading(true);
      }
      return;
    }

    // If URL is empty, clear the webview (for reset functionality)
    if (!url) {
      console.log("🧹 Clearing webview (empty URL)");
      setIsLoading(false);
      setLoadError(null);
      pendingUrlRef.current = null;
      webview.src = "about:blank";
      return;
    }

    // Load new URL with loading state
    console.log("🌐 Loading URL in webview:", url);
    setIsLoading(true);
    setLoadError(null);

    try {
      webview.src = url;
      console.log("✅ URL set successfully on webview");
    } catch (error) {
      console.error("❌ Failed to set webview URL:", error);
      setLoadError(
        `Failed to load: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsLoading(false);
      // Retry after a short delay
      setTimeout(() => {
        console.log("🔄 Retrying URL load...");
        try {
          webview.src = url;
        } catch (retryError) {
          console.error("❌ Retry failed:", retryError);
        }
      }, 500);
    }
  }, [url, webviewRef, isWebviewReady]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => {
      console.log("✅ Webview DOM ready");
      setIsLoading(false);
      setLoadError(null);
      // Inject extraction script
      injectExtractionScript(webview);
    };

    const handleDidFinishLoad = () => {
      console.log("✅ Webview finished loading");
      setIsLoading(false);
    };

    const handleDidFailLoad = (event: any) => {
      console.error("❌ Webview failed to load:", event);
      setIsLoading(false);
      if (event.errorCode !== -3) {
        // -3 is ERR_ABORTED (normal for redirects)
        setLoadError(
          `Failed to load page: ${event.errorDescription || "Unknown error"}`
        );
      }
    };

    const handleConsoleMessage = (e: any) => {
      console.log("[Webview]:", e.message);

      if (e.message.startsWith("EXTRACT:")) {
        try {
          const data = JSON.parse(e.message.substring(8));
          if (data.type === "data-extracted") {
            handleDataExtracted(data.payload);
          }
        } catch (err) {
          console.error("Failed to parse extraction message:", err);
        }
      }
    };

    webview.addEventListener("dom-ready", handleDomReady);
    webview.addEventListener("did-finish-load", handleDidFinishLoad);
    webview.addEventListener("did-fail-load", handleDidFailLoad);
    webview.addEventListener("console-message", handleConsoleMessage);

    return () => {
      webview.removeEventListener("dom-ready", handleDomReady);
      webview.removeEventListener("did-finish-load", handleDidFinishLoad);
      webview.removeEventListener("did-fail-load", handleDidFailLoad);
      webview.removeEventListener("console-message", handleConsoleMessage);
    };
  }, [
    currentItemId,
    selectedField,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // handleDataExtracted and webviewRef are intentionally omitted - refs don't need dependencies
  ]);

  const handleDataExtracted = async (data: any) => {
    const field = Object.keys(data).find(
      (key) => key !== "url" && key !== "timestamp"
    );
    if (!field) return;

    // Extract currency from price text if price field is being extracted
    const extractCurrencyFromPrice = (
      priceText: string
    ): { currency: string; price: string } => {
      if (!priceText) return { currency: "", price: "" };

      // Common currency patterns
      const currencyPatterns = [
        { regex: /^(Rs\.?|₹)\s*(.+)$/i, currency: "Rs." }, // Indian Rupee
        { regex: /^(\$|USD)\s*(.+)$/i, currency: "$" }, // US Dollar
        { regex: /^(€|EUR)\s*(.+)$/i, currency: "€" }, // Euro
        { regex: /^(£|GBP)\s*(.+)$/i, currency: "£" }, // British Pound
        { regex: /^(¥|JPY|CNY)\s*(.+)$/i, currency: "¥" }, // Yen/Yuan
        { regex: /^(AED)\s*(.+)$/i, currency: "AED" }, // UAE Dirham
        { regex: /^(SAR)\s*(.+)$/i, currency: "SAR" }, // Saudi Riyal
        { regex: /(.+?)\s*(Rs\.?|₹)$/i, currency: "Rs." }, // Suffix format
        { regex: /(.+?)\s*(\$|USD)$/i, currency: "$" },
      ];

      for (const pattern of currencyPatterns) {
        const match = priceText.match(pattern.regex);
        if (match) {
          // Extract the numeric part
          const numericPart = match[2] || match[1];
          const cleanPrice = numericPart.replace(/[^\d.,]/g, "").trim();
          return {
            currency: pattern.currency,
            price: cleanPrice,
          };
        }
      }

      // If no currency found, try to extract just numbers
      const numericOnly = priceText.replace(/[^\d.,]/g, "").trim();
      return {
        currency: "",
        price: numericOnly || priceText,
      };
    };

    if (currentItemId && currentItem) {
      let updatedItem: any = {
        [field]: data[field],
        timestamp: new Date().toISOString(),
      };

      // Auto-detect and extract currency from price
      if (field === "price" && typeof data[field] === "string") {
        const extracted = extractCurrencyFromPrice(data[field]);
        updatedItem = {
          price: extracted.price,
          timestamp: new Date().toISOString(),
        };
        // Only update currency if one was detected
        if (extracted.currency) {
          updatedItem.currency = extracted.currency;
        }
      }

      // Update via API (no more electron IPC!)
      if (currentItem._id) {
        const { updateMenuItem } = await import("../services/menu-items");
        try {
          await updateMenuItem(currentItem._id, {
            title: field === "title" ? updatedItem[field] : undefined,
            description:
              field === "description" ? updatedItem[field] : undefined,
            price:
              field === "price" ? parseFloat(updatedItem.price) : undefined,
            currency: updatedItem.currency,
          });
          console.log("✅ Item updated via API during extraction");
        } catch (error) {
          console.error("❌ Error updating item via API:", error);
        }
      }

      // Use frontend id for store update
      updateExtractedItem(currentItemId, updatedItem);
    } else {
      // Create new item via API
      const { collectionContext } = useExtractionStore.getState();
      if (!collectionContext) {
        console.error("❌ No collection context available");
        return;
      }

      const { saveMenuItem } = await import("../services/menu-items");

      try {
        const savedItem = await saveMenuItem({
          restaurantId: collectionContext.restaurantId,
          collectionId: collectionContext.collectionId,
          sourceId: collectionContext.sourceId,
          name: field === "title" ? data[field] : "",
          description: field === "description" ? data[field] : "",
          price: field === "price" ? parseFloat(data[field]) || 0 : 0,
          currency: data.currency || "$",
        });

        console.log("✅ New item created via API");
        addExtractedItem(savedItem);
      } catch (error) {
        console.error("❌ Error saving new item via API:", error);
      }
    }
  };

  const injectExtractionScript = (webview: any) => {
    const script = `
      if (!window.webviewInitialized) {
        window.webviewInitialized = true;
        
        window.extractionState = {
          isSelecting: false,
          currentField: null,
          mode: 'manual'
        };
        
        function sendToHost(type, payload) {
          console.log('EXTRACT:' + JSON.stringify({ type, payload }));
        }
        
        window.addEventListener('message', (event) => {
          if (event.data && event.data.command) {
            console.log('Received command:', event.data.command);
            
            if (event.data.command === 'START_SELECTION') {
              startSelection(event.data.field);
            } else if (event.data.command === 'STOP_SELECTION') {
              stopSelection();
            } else if (event.data.command === 'CLEAR_ALL_HIGHLIGHTS') {
              clearAllHighlights();
            }
          }
        });
        
        function startSelection(field) {
          console.log('Starting selection for:', field);
          window.extractionState.isSelecting = true;
          window.extractionState.currentField = field;
          
          document.addEventListener('click', handleExtractClick, true);
          document.addEventListener('mouseover', handleHover, true);
          document.addEventListener('mouseout', handleHoverOut, true);
          
          // Inject hover styles
          if (!document.getElementById('extractor-styles')) {
            const style = document.createElement('style');
            style.id = 'extractor-styles';
            style.textContent = \`
              .extractor-hover {
                outline: 2px dashed #00d2a1 !important;
                outline-offset: 2px !important;
                background-color: rgba(0, 210, 161, 0.1) !important;
                cursor: crosshair !important;
                transition: all 0.15s ease !important;
              }
              
              .extractor-selected {
                outline: 3px solid #00d2a1 !important;
                outline-offset: 2px !important;
                background-color: rgba(0, 210, 161, 0.2) !important;
              }
            \`;
            document.head.appendChild(style);
          }
          
          const overlay = document.createElement('div');
          overlay.id = 'extract-overlay';
          overlay.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
            'background:#00d2a1;color:white;padding:12px 24px;border-radius:8px;z-index:999999;' +
            'font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:system-ui;';
          overlay.textContent = '🎯 Click to select ' + field;
          document.body.appendChild(overlay);
          document.body.style.cursor = 'crosshair';
        }
        
        let hoveredElement = null;
        
        function handleHover(e) {
          if (!window.extractionState.isSelecting) return;
          
          // Remove hover from previous element
          if (hoveredElement && hoveredElement !== e.target) {
            hoveredElement.classList.remove('extractor-hover');
          }
          
          // Add hover to current element
          e.target.classList.add('extractor-hover');
          hoveredElement = e.target;
          
          e.stopPropagation();
        }
        
        function handleHoverOut(e) {
          if (!window.extractionState.isSelecting) return;
          // Don't remove hover on out - let next hover handle it
        }
        
        function stopSelection() {
          window.extractionState.isSelecting = false;
          window.extractionState.currentField = null;
          
          document.removeEventListener('click', handleExtractClick, true);
          document.removeEventListener('mouseover', handleHover, true);
          document.removeEventListener('mouseout', handleHoverOut, true);
          
          // Remove hover from last element
          if (hoveredElement) {
            hoveredElement.classList.remove('extractor-hover');
            hoveredElement = null;
          }
          
          const overlay = document.getElementById('extract-overlay');
          if (overlay) overlay.remove();
          
          document.body.style.cursor = '';
        }
        
        function clearAllHighlights() {
          // Remove all extractor classes from all elements
          const hoveredElements = document.querySelectorAll('.extractor-hover');
          hoveredElements.forEach(el => el.classList.remove('extractor-hover'));
          
          const selectedElements = document.querySelectorAll('.extractor-selected');
          selectedElements.forEach(el => el.classList.remove('extractor-selected'));
          
          // Clear hovered element reference
          hoveredElement = null;
          
          // Remove overlay
          const overlay = document.getElementById('extract-overlay');
          if (overlay) overlay.remove();
          
          // Reset cursor
          document.body.style.cursor = '';
          
          console.log('Cleared all highlights');
        }
        
        function handleExtractClick(e) {
          if (!window.extractionState.isSelecting) return;
          
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          const element = e.target;
          const field = window.extractionState.currentField;
          let value = '';
          let imageUrl = '';
          
          // Helper function to get deep text content (including nested spans)
          function getDeepTextContent(el) {
            try {
              // Get all text nodes recursively
              let text = '';
              const walk = document.createTreeWalker(
                el,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );
              
              let node;
              while (node = walk.nextNode()) {
                // Skip script and style tags
                const parent = node.parentElement;
                if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
                  text += node.textContent;
                }
              }
              
              return text.trim();
            } catch (error) {
              console.error('Error in getDeepTextContent:', error);
              // Fallback to simple text extraction
              return el.textContent || el.innerText || '';
            }
          }
          
          // Helper function to extract currency and price separately
          function extractCurrencyAndPrice(text) {
            // Try to extract both currency and numeric value
            const patterns = [
              { regex: /^(Rs\\.?|₹)\\s*([\\d,]+\\.?\\d*)$/i, hasCurrency: true },
              { regex: /^(\\$|USD)\\s*([\\d,]+\\.?\\d*)$/i, hasCurrency: true },
              { regex: /^(€|EUR)\\s*([\\d,]+\\.?\\d*)$/i, hasCurrency: true },
              { regex: /^(£|GBP)\\s*([\\d,]+\\.?\\d*)$/i, hasCurrency: true },
              { regex: /^(¥|JPY|CNY)\\s*([\\d,]+\\.?\\d*)$/i, hasCurrency: true },
              { regex: /^(AED|SAR)\\s*([\\d,]+\\.?\\d*)$/i, hasCurrency: true },
              { regex: /([\\d,]+\\.?\\d*)\\s*(Rs\\.?|₹)$/i, hasCurrency: true, suffix: true },
            ];
            
            for (const pattern of patterns) {
              const match = text.match(pattern.regex);
              if (match) {
                return {
                  fullText: text,
                  currency: pattern.suffix ? match[2] : match[1],
                  price: pattern.suffix ? match[1] : match[2]
                };
              }
            }
            
            // If no currency found, just return the text
            return { fullText: text, currency: null, price: null };
          }
          
          // Extract based on field type
          if (field === 'image' || field === 'Image') {
            // Handle image extraction
            if (element.tagName === 'IMG') {
              imageUrl = element.src || element.getAttribute('data-src') || element.getAttribute('srcset')?.split(',')[0]?.split(' ')[0] || '';
              value = String(imageUrl);
            } else {
              // Look for image in clicked element or its children
              const img = element.querySelector('img') || element.closest('*:has(img)')?.querySelector('img');
              if (img) {
                imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(',')[0]?.split(' ')[0] || '';
                value = String(imageUrl);
              } else {
                // Check background image
                const bgImage = window.getComputedStyle(element).backgroundImage;
                const urlMatch = bgImage.match(/url\\(["']?([^"')]+)["']?\\)/);
                if (urlMatch) {
                  imageUrl = urlMatch[1];
                  value = String(imageUrl);
                }
              }
            }
          } else if (field === 'price' || field === 'Price') {
            // Get deep text content from the element including nested spans
            const text = getDeepTextContent(element);
            
            // Try to extract currency and price
            const extracted = extractCurrencyAndPrice(text);
            
            // Return the full text with currency (will be parsed by backend)
            value = String(extracted.fullText || text);
          } else if (field === 'currency' || field === 'Currency') {
            // Extract just the currency symbol
            const text = getDeepTextContent(element);
            const extracted = extractCurrencyAndPrice(text);
            
            // Return just the currency if found, otherwise the text
            value = String(extracted.currency || text);
          } else {
            // Extract text content - use deep extraction for better results
            value = getDeepTextContent(element);
            
            // Fallback to basic methods if deep extraction fails
            if (!value) {
              value = element.textContent || element.value || element.innerText || '';
            }
            
            // Ensure it's a string
            value = String(value);
          }
          
          // Remove hover class and add selected class
          element.classList.remove('extractor-hover');
          element.classList.add('extractor-selected');
          
          // Ensure we only send simple, cloneable data
          const extractedData = {
            [field.toLowerCase()]: String(value.trim()),
            url: String(window.location.href),
            timestamp: new Date().toISOString()
          };
          
          // Send only plain objects (no DOM nodes, functions, or complex objects)
          try {
            sendToHost('data-extracted', extractedData);
          } catch (error) {
            console.error('Error sending extracted data:', error);
            // Try sending minimal data as fallback
            sendToHost('data-extracted', {
              [field.toLowerCase()]: String(value),
              url: window.location.href,
              timestamp: new Date().toISOString()
            });
          }
          
          setTimeout(() => stopSelection(), 100);
          
          return false;
        }
      }
    `;

    webview.executeJavaScript(script).catch((err: any) => {
      console.error("Error injecting script:", err);
    });
  };

  return (
    <div className="flex-1 relative">
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center">
            <div className="h-12 w-12 rounded-lg mx-auto mb-4 gradient-primary animate-pulse" />
            <p className="text-foreground text-lg font-medium">
              Loading page...
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {loadError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg z-20 max-w-md">
          <p className="text-sm font-medium">⚠️ {loadError}</p>
        </div>
      )}

      {/* 
        Security Note: webSecurity is disabled on the webview element ONLY
        to allow web scraping functionality (cross-origin requests, etc).
        The main renderer process has proper security enabled.
        This is intentional for the scraping use case.
      */}
      <webview
        ref={localWebviewRef}
        src="about:blank"
        style={{ width: "100%", height: "100%" }}
        nodeintegration="false"
        webpreferences="contextIsolation=false, webSecurity=false"
        partition="persist:webview"
        disablewebsecurity="true"
        allowpopups="true"
      />
    </div>
  );
}
