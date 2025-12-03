"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useExtractionStore, type ExtractedItem } from "../store";
import { Button } from "./ui-lib/ui/button";
import { Input } from "./ui-lib/ui/input";
import {
  Trash2,
  X,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  Layers,
  Check,
} from "lucide-react";
import { logAuditEvent, logFieldUpdate } from "../lib/audit-logger";

// ============================================================================
// TYPES
// ============================================================================

interface TemplateFieldMapping {
  selector: string;
  xpath: string;
  tagName: string;
  className: string;
  parentSelector: string;
  relativePosition: number;
  sampleValue: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

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
    user,
  } = useExtractionStore();

  // Form State
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [priceLabels, setPriceLabels] = useState<
    { size: string; price: string }[]
  >([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const isExtractionActiveRef = useRef(false);
  const [isCompleteCollapsed, setIsCompleteCollapsed] = useState(true);

  // ============================================================================
  // TEMPLATE MODE STATE
  // ============================================================================

  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [templateFields, setTemplateFields] = useState<
    Record<string, TemplateFieldMapping | null>
  >({
    image: null,
    title: null,
    description: null,
    price: null,
  });
  const [similarItemsFound, setSimilarItemsFound] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const checkForDuplicates = (
    itemName: string,
    currentItemId?: number | string
  ): string | null => {
    if (!itemName || itemName.trim().length === 0) return null;
    const normalizedName = itemName.trim().toLowerCase();
    const duplicate = extractedData.find((item) => {
      if (item.id === currentItemId || item._id === currentItemId) return false;
      return (item.title || "").trim().toLowerCase() === normalizedName;
    });
    if (duplicate) {
      const source = duplicate.isManual
        ? "(manually added)"
        : duplicate._id
          ? "(from AI)"
          : "(from extraction)";
      return `⚠️ Duplicate: "${duplicate.title}" ${source}`;
    }
    return null;
  };

  const getTemplateFieldsCount = () => {
    return Object.values(templateFields).filter((f) => f !== null).length;
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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

  // Stop extraction when form closes
  useEffect(() => {
    if (!showItemForm || !currentItemId) {
      if (!isTemplateMode) {
        setSelectedField(null);
        isExtractionActiveRef.current = false;
        const webview = document.querySelector("webview");
        if (webview) {
          try {
            (webview as any).executeJavaScript(`
              window.postMessage({ command: 'STOP_SELECTION' }, '*');
              window.postMessage({ command: 'CLEAR_ALL_HIGHLIGHTS' }, '*');
            `);
          } catch {
            // Ignore webview execution errors
          }
        }
      }
    }
  }, [showItemForm, currentItemId, isTemplateMode, setSelectedField]);

  useEffect(() => {
    isExtractionActiveRef.current = !!selectedField;
  }, [selectedField]);

  // Listen for template field selections from webview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "TEMPLATE_FIELD_SELECTED" && isTemplateMode) {
        const { field, mapping } = event.data;
        console.log(`📌 Template field "${field}" mapped:`, mapping);
        setTemplateFields((prev) => ({ ...prev, [field]: mapping }));
        setSelectedField(null);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isTemplateMode, setSelectedField]);

  // ============================================================================
  // EXTRACTION HANDLERS
  // ============================================================================

  const handleStopExtraction = useCallback(() => {
    setSelectedField(null);
    isExtractionActiveRef.current = false;
    const webview = document.querySelector("webview");
    if (webview) {
      try {
        (webview as any).executeJavaScript(`
          window.postMessage({ command: 'STOP_SELECTION' }, '*');
          window.postMessage({ command: 'CLEAR_ALL_HIGHLIGHTS' }, '*');
        `);
      } catch {
        // Ignore webview execution errors
      }
    }
  }, [setSelectedField]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedField) {
        e.preventDefault();
        handleStopExtraction();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [selectedField, handleStopExtraction]);

  const handleFieldSelect = (field: string) => {
    const webview = document.querySelector("webview");

    if (selectedField === field) {
      setSelectedField(null);
      if (webview) {
        (webview as any).executeJavaScript(`
          window.postMessage({ command: 'STOP_SELECTION' }, '*');
        `);
      }
      return;
    }

    if (selectedField && webview) {
      (webview as any).executeJavaScript(`
        window.postMessage({ command: 'STOP_SELECTION' }, '*');
      `);
    }

    setTimeout(() => {
      setSelectedField(field);
      if (webview) {
        const command = isTemplateMode
          ? "START_TEMPLATE_FIELD_SELECTION"
          : "START_SELECTION";
        (webview as any).executeJavaScript(`
          window.postMessage({ command: '${command}', field: '${field}' }, '*');
        `);
      }
    }, 50);
  };

  // ============================================================================
  // TEMPLATE MODE HANDLERS
  // ============================================================================

  const handleStartTemplateMode = () => {
    setIsTemplateMode(true);
    setShowItemForm(true);
    setTemplateFields({
      image: null,
      title: null,
      description: null,
      price: null,
    });
    setSimilarItemsFound([]);

    // Create a temporary item for template mapping
    const tempId = Date.now();
    addExtractedItem({
      id: tempId,
      title: "",
      description: "",
      image: "",
      price: "",
      category: "",
      currency: "$",
      url: collectionContext?.sourceUrl || "",
      timestamp: new Date().toISOString(),
      verified: false,
      isTemplate: true,
    } as any);
    setCurrentItemId(tempId);
  };

  const handleCancelTemplateMode = () => {
    // Remove the temporary template item
    if (currentItemId) {
      removeExtractedItem(currentItemId);
    }
    setIsTemplateMode(false);
    setShowItemForm(false);
    setCurrentItemId(null);
    setTemplateFields({
      image: null,
      title: null,
      description: null,
      price: null,
    });
    setSimilarItemsFound([]);
    handleStopExtraction();

    // Clear highlights
    const webview = document.querySelector("webview");
    if (webview) {
      (webview as any).executeJavaScript(`
        window.postMessage({ command: 'CLEAR_TEMPLATE_HIGHLIGHTS' }, '*');
      `);
    }
  };

  const handleFindSimilar = async () => {
    const mappedFields = Object.entries(templateFields).filter(
      ([, v]) => v !== null
    );

    if (mappedFields.length < 2) {
      alert(
        "Please select at least 2 fields (e.g., title and price) to find similar items."
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      const webview = document.querySelector("webview");
      if (!webview) return;

      // Build the analysis script
      const fieldMappings = JSON.stringify(
        Object.fromEntries(mappedFields.map(([k, v]) => [k, v]))
      );

      // Get existing item titles for duplicate detection
      const existingTitles = extractedData
        .map((item) => (item.title || "").trim().toLowerCase())
        .filter((t) => t.length > 0);

      const result = await (webview as any).executeJavaScript(`
        (function() {
          const fieldMappings = ${fieldMappings};
          const existingTitles = ${JSON.stringify(existingTitles)};
          const results = [];
          const highlightedElements = new Set();
          const seenTitles = new Set(); // Track titles we've already extracted to avoid duplicates
          
          console.log('🔍 Starting ADVANCED DOM analysis with mappings:', fieldMappings);
          
          // ================================================================
          // EXCLUSION PATTERNS - Elements to NEVER extract
          // ================================================================
          
          const EXCLUDED_TAGS = ['HEADER', 'FOOTER', 'NAV', 'ASIDE', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'];
          
          const EXCLUDED_ROLES = ['navigation', 'banner', 'contentinfo', 'complementary', 'search', 'form'];
          
          const EXCLUDED_CLASS_PATTERNS = [
            /header/i, /footer/i, /nav/i, /navigation/i, /menu-bar/i, /toolbar/i,
            /sidebar/i, /aside/i, /banner/i, /cookie/i, /popup/i, /modal/i,
            /overlay/i, /toast/i, /notification/i, /alert/i, /social/i,
            /share/i, /follow/i, /subscribe/i, /newsletter/i, /copyright/i,
            /legal/i, /terms/i, /privacy/i, /breadcrumb/i, /pagination/i,
            /filter/i, /sort/i, /search-bar/i, /cart-icon/i, /login/i, /signup/i
          ];
          
          const EXCLUDED_ID_PATTERNS = [
            /header/i, /footer/i, /nav/i, /sidebar/i, /menu-bar/i
          ];
          
          // Navigation-like text patterns (short, common nav items)
          const NAV_TEXT_PATTERNS = [
            /^(home|about|contact|menu|cart|login|sign\\s*(in|up|out)|register|account|profile|settings|help|faq|support|blog|news|shop|store|checkout|order|track|search|find|explore|discover|browse|view\\s*all|see\\s*more|load\\s*more|show\\s*more|read\\s*more|learn\\s*more|get\\s*started|subscribe|follow|share|like|comment|reply|submit|send|cancel|close|back|next|prev|previous|continue|proceed|confirm|ok|yes|no|skip|dismiss|accept|decline|agree|disagree)$/i,
            /^\\d+$/, // Just numbers
            /^[\\$€£¥₹]$/, // Just currency symbols
            /^(©|®|™)/, // Copyright symbols
          ];
          
          // ================================================================
          // HELPER FUNCTIONS
          // ================================================================
          
          function isExcludedElement(el) {
            if (!el || el === document.body || el === document.documentElement) return false;
            
            // Check tag name
            if (EXCLUDED_TAGS.includes(el.tagName)) {
              console.log('⛔ Excluded by tag:', el.tagName);
              return true;
            }
            
            // Check ARIA role
            const role = el.getAttribute('role');
            if (role && EXCLUDED_ROLES.includes(role.toLowerCase())) {
              console.log('⛔ Excluded by role:', role);
              return true;
            }
            
            // Check class name patterns
            const className = el.className || '';
            if (typeof className === 'string') {
              for (const pattern of EXCLUDED_CLASS_PATTERNS) {
                if (pattern.test(className)) {
                  console.log('⛔ Excluded by class:', className.match(pattern)?.[0]);
                  return true;
                }
              }
            }
            
            // Check ID patterns
            const id = el.id || '';
            for (const pattern of EXCLUDED_ID_PATTERNS) {
              if (pattern.test(id)) {
                console.log('⛔ Excluded by id:', id);
                return true;
              }
            }
            
            // Check if inside an excluded ancestor
            let parent = el.parentElement;
            let depth = 0;
            while (parent && parent !== document.body && depth < 10) {
              if (EXCLUDED_TAGS.includes(parent.tagName)) return true;
              const parentRole = parent.getAttribute('role');
              if (parentRole && EXCLUDED_ROLES.includes(parentRole.toLowerCase())) return true;
              const parentClass = parent.className || '';
              if (typeof parentClass === 'string') {
                for (const pattern of EXCLUDED_CLASS_PATTERNS) {
                  if (pattern.test(parentClass)) return true;
                }
              }
              parent = parent.parentElement;
              depth++;
            }
            
            return false;
          }
          
          function isNavigationText(text) {
            if (!text || text.length < 2) return true;
            if (text.length > 200) return true; // Too long for a title
            
            const trimmed = text.trim();
            
            for (const pattern of NAV_TEXT_PATTERNS) {
              if (pattern.test(trimmed)) return true;
            }
            
            // Check if it's mostly non-text characters
            const alphaNumeric = trimmed.replace(/[^a-zA-Z0-9]/g, '');
            if (alphaNumeric.length < 2) return true;
            
            return false;
          }
          
          function isDuplicate(text) {
            if (!text) return false;
            const normalized = text.trim().toLowerCase();
            
            // Check against existing items from the store
            if (existingTitles.some(t => t === normalized || 
                (t.length > 3 && normalized.includes(t)) || 
                (normalized.length > 3 && t.includes(normalized)))) {
              return true;
            }
            
            // Check against items we've already found in this batch
            if (seenTitles.has(normalized)) return true;
            
            return false;
          }
          
          function getElementByMapping(mapping) {
            try {
              // Try selector first
              if (mapping.selector) {
                const el = document.querySelector(mapping.selector);
                if (el) return el;
              }
              // Try XPath as fallback
              if (mapping.xpath) {
                const xpathResult = document.evaluate(
                  mapping.xpath, document, null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE, null
                );
                if (xpathResult.singleNodeValue) return xpathResult.singleNodeValue;
              }
            } catch (e) {
              console.warn('Error finding element:', e);
            }
            return null;
          }
          
          function getAncestors(el, maxDepth = 20) {
            const ancestors = [];
            let current = el;
            let depth = 0;
            while (current && current !== document.body && current !== document.documentElement && depth < maxDepth) {
              ancestors.push(current);
              current = current.parentElement;
              depth++;
            }
            return ancestors;
          }
          
          function findLCA(elements) {
            if (elements.length === 0) return null;
            if (elements.length === 1) return elements[0].parentElement;
            
            const ancestorSets = elements.map(el => new Set(getAncestors(el)));
            const firstAncestors = getAncestors(elements[0]);
            
            for (const ancestor of firstAncestors) {
              if (ancestorSets.every(set => set.has(ancestor))) {
                return ancestor;
              }
            }
            return document.body;
          }
          
          // Get stable class names (filter dynamic/state classes)
          function getStableClasses(el) {
            if (!el.className || typeof el.className !== 'string') return [];
            return el.className.split(/\\s+/)
              .filter(c => 
                c && c.length > 1 && 
                !c.match(/^(hover|active|focus|selected|template|extractor|js-|is-|has-|ng-|_\\w|--)/i)
              )
              .map(c => {
                // Strip numeric suffixes from page builder classes (e.g., fusion-title-1 -> fusion-title)
                // But keep meaningful numbers like col-md-4
                if (c.match(/[_-]\\d+$/)) {
                  return c.replace(/[_-]\\d+$/, '');
                }
                return c;
              })
              .filter((c, i, arr) => arr.indexOf(c) === i); // Remove duplicates after stripping
          }
          
          // Build multiple selector strategies for an element
          function buildSelectors(el) {
            const selectors = [];
            const tag = el.tagName.toLowerCase();
            const classes = getStableClasses(el);
            
            // Strategy 1: Tag + all stable classes (most specific)
            if (classes.length > 0) {
              selectors.push(tag + '.' + classes.join('.'));
            }
            
            // Strategy 2: Tag + first 2 classes
            if (classes.length >= 2) {
              selectors.push(tag + '.' + classes.slice(0, 2).join('.'));
            }
            
            // Strategy 3: Tag + first class only
            if (classes.length >= 1) {
              selectors.push(tag + '.' + classes[0]);
            }
            
            // Strategy 4: Data attributes (very reliable for frameworks)
            const dataAttrs = Array.from(el.attributes)
              .filter(a => a.name.startsWith('data-') && 
                !a.name.includes('template') && 
                !a.name.includes('index') &&
                !a.name.includes('id'))
              .map(a => '[' + a.name + ']');
            if (dataAttrs.length > 0) {
              selectors.push(tag + dataAttrs[0]);
              if (classes.length > 0) {
                selectors.push(tag + '.' + classes[0] + dataAttrs[0]);
              }
            }
            
            // Strategy 5: Just tag name (last resort)
            selectors.push(tag);
            
            return [...new Set(selectors)];
          }
          
          // Build relative path from container to target with multiple strategies
          function getRelativePath(container, target) {
            const path = [];
            let current = target;
            
            while (current && current !== container && current !== document.body) {
              const tag = current.tagName.toLowerCase();
              const classes = getStableClasses(current);
              
              // Build selector for this level
              let selector = tag;
              if (classes.length > 0) {
                selector += '.' + classes.slice(0, 2).join('.');
              }
              
              // Get nth-child position for more precision
              let nthChild = 0;
              if (current.parentElement) {
                const siblings = Array.from(current.parentElement.children);
                nthChild = siblings.indexOf(current);
              }
              
              path.unshift({ 
                selector, 
                tag, 
                classes: classes.slice(0, 3), 
                nthChild,
                element: current 
              });
              current = current.parentElement;
            }
            
            return path;
          }
          
          // Try to find element using flexible matching with scoring
          function findFieldInContainer(container, relativePath, fieldType, sampleValue) {
            if (!relativePath || relativePath.length === 0) return null;
            
            const candidates = [];
            
            // Strategy 1: Direct CSS selector path (exact match)
            const cssPath = relativePath.map(p => p.selector).join(' ');
            try {
              const found = container.querySelector(cssPath);
              if (found) candidates.push({ el: found, score: 100 });
            } catch (e) {}
            
            // Strategy 2: Tag-only path
            const tagPath = relativePath.map(p => p.tag).join(' ');
            try {
              const found = container.querySelector(tagPath);
              if (found) candidates.push({ el: found, score: 80 });
            } catch (e) {}
            
            // Strategy 3: Last element selector within container
            const lastPart = relativePath[relativePath.length - 1];
            if (lastPart) {
              try {
                const found = container.querySelector(lastPart.selector);
                if (found) candidates.push({ el: found, score: 70 });
              } catch (e) {}
              
              // Try with nth-child
              if (lastPart.nthChild >= 0) {
                try {
                  const parent = container.querySelector(relativePath.slice(0, -1).map(p => p.tag).join(' ') || '*');
                  if (parent && parent.children[lastPart.nthChild]) {
                    candidates.push({ el: parent.children[lastPart.nthChild], score: 65 });
                  }
                } catch (e) {}
              }
            }
            
            // Strategy 4: Field-type specific heuristics
            if (fieldType === 'image') {
              const imgs = container.querySelectorAll('img, picture img, [style*="background-image"]');
              imgs.forEach(img => candidates.push({ el: img, score: 60 }));
            }
            
            if (fieldType === 'title') {
              // Headings first
              const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
              headings.forEach(h => candidates.push({ el: h, score: 75 }));
              
              // Then title-like classes
              const titleEls = container.querySelectorAll('[class*="title"], [class*="name"], [class*="heading"], [class*="product-name"], [class*="item-name"]');
              titleEls.forEach(el => candidates.push({ el, score: 70 }));
              
              // Strong/bold text
              const strongEls = container.querySelectorAll('strong, b');
              strongEls.forEach(el => {
                if (el.textContent && el.textContent.length > 2 && el.textContent.length < 100) {
                  candidates.push({ el, score: 50 });
                }
              });
            }
            
            if (fieldType === 'price') {
              const priceEls = container.querySelectorAll('[class*="price"], [class*="cost"], [class*="amount"], [class*="value"]');
              priceEls.forEach(el => candidates.push({ el, score: 70 }));
              
              // Elements with currency symbols
              const allText = container.querySelectorAll('span, div, p, strong');
              allText.forEach(el => {
                const text = el.textContent || '';
                if (/[$€£¥₹]|Rs\\.?|\\d+[.,]\\d{2}/.test(text) && text.length < 30) {
                  candidates.push({ el, score: 60 });
                }
              });
            }
            
            if (fieldType === 'description') {
              const descEls = container.querySelectorAll('[class*="desc"], [class*="detail"], [class*="info"], [class*="summary"], p');
              descEls.forEach(el => {
                const text = el.textContent || '';
                if (text.length > 10 && text.length < 500) {
                  candidates.push({ el, score: 65 });
                }
              });
            }
            
            // Strategy 5: Match by class substring
            if (lastPart && lastPart.classes.length > 0) {
              lastPart.classes.forEach(cls => {
                try {
                  const found = container.querySelectorAll('[class*="' + cls + '"]');
                  found.forEach(el => candidates.push({ el, score: 55 }));
                } catch (e) {}
              });
            }
            
            // Score bonus: if text is similar to sample value
            if (sampleValue && sampleValue.length > 2) {
              candidates.forEach(c => {
                const text = extractValue(c.el, fieldType);
                if (text && text.length > 0) {
                  // Boost score if similar structure/length
                  const lengthRatio = Math.min(text.length, sampleValue.length) / Math.max(text.length, sampleValue.length);
                  if (lengthRatio > 0.3) {
                    c.score += 10 * lengthRatio;
                  }
                }
              });
            }
            
            // Return best candidate
            candidates.sort((a, b) => b.score - a.score);
            return candidates.length > 0 ? candidates[0].el : null;
          }
          
          // Extract value from element based on field type
          function extractValue(el, fieldType) {
            if (!el) return '';
            
            if (fieldType === 'image') {
              // Try multiple image sources
              return el.src || 
                     el.getAttribute('data-src') || 
                     el.getAttribute('data-lazy-src') ||
                     el.getAttribute('data-original') ||
                     el.querySelector('img')?.src ||
                     el.querySelector('img')?.getAttribute('data-src') ||
                     (el.style?.backgroundImage?.match(/url\\(['"]?([^'"\\)]+)['"]?\\)/) || [])[1] || 
                     (window.getComputedStyle(el).backgroundImage?.match(/url\\(['"]?([^'"\\)]+)['"]?\\)/) || [])[1] ||
                     '';
            }
            
            // For text fields, get clean text content
            let text = '';
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
              const parent = node.parentElement;
              if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
                text += node.textContent;
              }
            }
            
            return text.trim().replace(/\\s+/g, ' ');
          }
          
          // Highlight an element with color based on confidence
          function highlightElement(el, index, confidence = 'high') {
            if (highlightedElements.has(el)) return;
            highlightedElements.add(el);
            
            const colors = {
              high: { border: '#00D2A1', bg: 'rgba(0, 210, 161, 0.15)' },
              medium: { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
              low: { border: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)' }
            };
            
            const color = colors[confidence] || colors.high;
            
            el.style.outline = '3px solid ' + color.border;
            el.style.outlineOffset = '2px';
            el.setAttribute('data-template-item', index.toString());
            
            // Brief flash animation
            el.style.transition = 'background-color 0.3s';
            el.style.backgroundColor = color.bg;
            setTimeout(() => {
              el.style.backgroundColor = '';
            }, 500);
          }
          
          // Calculate structural similarity between two elements
          function getStructuralSimilarity(el1, el2) {
            if (!el1 || !el2) return 0;
            
            let score = 0;
            
            // Same tag
            if (el1.tagName === el2.tagName) score += 30;
            
            // Similar child count
            const childDiff = Math.abs(el1.children.length - el2.children.length);
            if (childDiff === 0) score += 20;
            else if (childDiff <= 2) score += 10;
            
            // Similar class structure
            const classes1 = getStableClasses(el1);
            const classes2 = getStableClasses(el2);
            const commonClasses = classes1.filter(c => classes2.includes(c));
            score += commonClasses.length * 10;
            
            // Similar child tag structure
            const childTags1 = Array.from(el1.children).map(c => c.tagName).slice(0, 5).join(',');
            const childTags2 = Array.from(el2.children).map(c => c.tagName).slice(0, 5).join(',');
            if (childTags1 === childTags2) score += 25;
            else if (childTags1.split(',')[0] === childTags2.split(',')[0]) score += 10;
            
            return score;
          }
          
          // ================================================================
          // MAIN ALGORITHM
          // ================================================================
          
          // Step 1: Get all mapped elements
          const mappedElements = [];
          for (const [field, mapping] of Object.entries(fieldMappings)) {
            const el = getElementByMapping(mapping);
            if (el) {
              mappedElements.push({ field, element: el, mapping });
              console.log('✅ Found element for field:', field, '- Sample:', mapping.sampleValue?.substring(0, 30));
            } else {
              console.log('❌ Could not find element for field:', field);
            }
          }
          
          if (mappedElements.length < 2) {
            return { error: 'Could not locate mapped elements. Please re-select the fields.', items: [] };
          }
          
          // Step 2: Find the item container (LCA)
          const itemContainer = findLCA(mappedElements.map(m => m.element));
          if (!itemContainer) {
            return { error: 'Could not find common container', items: [] };
          }
          
          console.log('📦 Item container:', itemContainer.tagName, itemContainer.className?.substring?.(0, 50));
          
          // Check if the container itself is excluded
          if (isExcludedElement(itemContainer)) {
            console.log('⚠️ Sample item is in excluded area - expanding search');
          }
          
          // Step 3: Build relative paths for each field
          const fieldPaths = {};
          const sampleValues = {};
          for (const { field, element, mapping } of mappedElements) {
            fieldPaths[field] = getRelativePath(itemContainer, element);
            sampleValues[field] = mapping.sampleValue || extractValue(element, field);
            console.log('📍 Path for', field + ':', fieldPaths[field].map(p => p.selector).join(' > '));
          }
          
          // Step 4: Find ALL similar containers using multiple strategies
          const containerSelectors = buildSelectors(itemContainer);
          console.log('🎯 Container selectors to try:', containerSelectors);
          
          let allCandidates = new Map(); // Map to track candidates with their source strategy
          
          // Strategy A: Search in parent's siblings (same level)
          const parent = itemContainer.parentElement;
          if (parent) {
            for (const sel of containerSelectors) {
              try {
                const found = parent.querySelectorAll(':scope > ' + sel);
                found.forEach(el => {
                  if (!allCandidates.has(el)) {
                    allCandidates.set(el, { source: 'parent-children', similarity: getStructuralSimilarity(itemContainer, el) });
                  }
                });
              } catch (e) {}
            }
          }
          
          // Strategy B: Search in grandparent (wider scope)
          const grandparent = parent?.parentElement;
          if (grandparent) {
            for (const sel of containerSelectors.slice(0, 3)) { // Use more specific selectors
              try {
                const found = grandparent.querySelectorAll(sel);
                found.forEach(el => {
                  if (!allCandidates.has(el)) {
                    allCandidates.set(el, { source: 'grandparent', similarity: getStructuralSimilarity(itemContainer, el) });
                  }
                });
              } catch (e) {}
            }
          }
          
          // Strategy C: Search great-grandparent (even wider)
          const greatGrandparent = grandparent?.parentElement;
          if (greatGrandparent && greatGrandparent !== document.body) {
            for (const sel of containerSelectors.slice(0, 2)) { // Use most specific selectors only
              try {
                const found = greatGrandparent.querySelectorAll(sel);
                found.forEach(el => {
                  if (!allCandidates.has(el)) {
                    allCandidates.set(el, { source: 'great-grandparent', similarity: getStructuralSimilarity(itemContainer, el) });
                  }
                });
              } catch (e) {}
            }
          }
          
          // Strategy D: Document-wide search with most specific selector
          if (containerSelectors.length > 0) {
            const mostSpecific = containerSelectors[0];
            try {
              const found = document.querySelectorAll(mostSpecific);
              found.forEach(el => {
                if (!allCandidates.has(el)) {
                  allCandidates.set(el, { source: 'document', similarity: getStructuralSimilarity(itemContainer, el) });
                }
              });
            } catch (e) {}
          }
          
          // Strategy E: Find by structural similarity (deep search)
          const containerTag = itemContainer.tagName.toLowerCase();
          const containerClasses = getStableClasses(itemContainer);
          
          if (containerClasses.length > 0) {
            // Search for elements with at least one matching class
            containerClasses.slice(0, 2).forEach(cls => {
              try {
                const found = document.querySelectorAll(containerTag + '[class*="' + cls + '"]');
                found.forEach(el => {
                  const similarity = getStructuralSimilarity(itemContainer, el);
                  if (similarity >= 40 && !allCandidates.has(el)) {
                    allCandidates.set(el, { source: 'class-match', similarity });
                  }
                });
              } catch (e) {}
            });
          }
          
          // ================================================================
          // Strategy F: PAGE BUILDER DETECTION (Fusion Builder, Elementor, etc.)
          // These builders use predictable class patterns with numeric suffixes
          // ================================================================
          
          const pageBuilderPatterns = [
            // Fusion Builder (WordPress)
            { pattern: /fusion[_-]?(builder[_-])?column[_-]?\\d*[_-]?\\d*/i, baseClass: 'fusion-layout-column' },
            { pattern: /fusion[_-]?layout[_-]?column/i, baseClass: 'fusion-layout-column' },
            { pattern: /fusion[_-]?flex[_-]?column/i, baseClass: 'fusion-flex-column' },
            // Elementor
            { pattern: /elementor[_-]?column/i, baseClass: 'elementor-column' },
            { pattern: /elementor[_-]?widget[_-]?wrap/i, baseClass: 'elementor-widget-wrap' },
            // WPBakery
            { pattern: /vc[_-]?column/i, baseClass: 'vc_column' },
            { pattern: /wpb[_-]?column/i, baseClass: 'wpb_column' },
            // Divi
            { pattern: /et[_-]?pb[_-]?column/i, baseClass: 'et_pb_column' },
            // Generic grid/card patterns
            { pattern: /col[_-]?(md|lg|sm|xs)?[_-]?\\d+/i, baseClass: null },
            { pattern: /grid[_-]?item/i, baseClass: 'grid-item' },
            { pattern: /card[_-]?item/i, baseClass: 'card' },
            { pattern: /menu[_-]?item/i, baseClass: 'menu-item' },
            { pattern: /product[_-]?item/i, baseClass: 'product' },
          ];
          
          // Check if container matches any page builder pattern
          const containerClassName = itemContainer.className || '';
          let detectedBuilder = null;
          
          for (const builder of pageBuilderPatterns) {
            if (builder.pattern.test(containerClassName)) {
              detectedBuilder = builder;
              console.log('🏗️ Detected page builder pattern:', builder.pattern.toString());
              break;
            }
          }
          
          if (detectedBuilder) {
            // Extract base class pattern (remove numeric suffixes)
            const baseClassMatch = containerClassName.match(detectedBuilder.pattern);
            if (baseClassMatch) {
              // Build a flexible selector that matches similar columns
              const baseClass = baseClassMatch[0].replace(/[_-]?\\d+[_-]?\\d*$/g, '').replace(/[_-]$/g, '');
              console.log('🏗️ Base class pattern:', baseClass);
              
              // Search for all elements with similar base class
              try {
                // Try multiple selector strategies for page builders
                const selectors = [
                  '[class*="' + baseClass + '"]',
                  '.' + baseClass.replace(/[_-]/g, '-'),
                  '.' + baseClass.replace(/[_-]/g, '_'),
                ];
                
                selectors.forEach(sel => {
                  try {
                    const found = document.querySelectorAll(sel);
                    console.log('🏗️ Found with selector "' + sel + '":', found.length, 'elements');
                    found.forEach(el => {
                      // Check structural similarity
                      const similarity = getStructuralSimilarity(itemContainer, el);
                      if (similarity >= 30 && !allCandidates.has(el)) {
                        allCandidates.set(el, { source: 'page-builder', similarity: similarity + 20 }); // Boost score for page builder matches
                      }
                    });
                  } catch (e) {}
                });
              } catch (e) {
                console.warn('🏗️ Page builder search failed:', e);
              }
            }
          }
          
          // Strategy G: Look for repeating sibling patterns
          // Find the nearest ancestor that has multiple similar children
          let searchAncestor = itemContainer.parentElement;
          let ancestorDepth = 0;
          const maxAncestorDepth = 5;
          
          while (searchAncestor && searchAncestor !== document.body && ancestorDepth < maxAncestorDepth) {
            const siblings = Array.from(searchAncestor.children);
            const sameTagSiblings = siblings.filter(s => s.tagName === itemContainer.tagName);
            
            // If we find 3+ siblings with same tag, this is likely the item container level
            if (sameTagSiblings.length >= 3) {
              console.log('🔄 Found repeating pattern at depth', ancestorDepth, ':', sameTagSiblings.length, 'siblings');
              
              sameTagSiblings.forEach(sibling => {
                const similarity = getStructuralSimilarity(itemContainer, sibling);
                if (similarity >= 25 && !allCandidates.has(sibling)) {
                  allCandidates.set(sibling, { source: 'sibling-pattern', similarity: similarity + 15 });
                }
              });
              break; // Found the pattern level, stop searching
            }
            
            searchAncestor = searchAncestor.parentElement;
            ancestorDepth++;
          }
          
          console.log('🔎 Total candidates found:', allCandidates.size);
          
          // Step 5: Filter and sort candidates by similarity
          const sortedCandidates = Array.from(allCandidates.entries())
            .filter(([el, info]) => !isExcludedElement(el)) // Filter out excluded elements
            .sort((a, b) => b[1].similarity - a[1].similarity);
          
          console.log('🔎 Candidates after exclusion filter:', sortedCandidates.length);
          
          // Step 6: Extract data from each candidate
          let itemIndex = 0;
          for (const [container, info] of sortedCandidates) {
            const item = {};
            let validFields = 0;
            let hasTitle = false;
            let confidence = 'high';
            
            for (const [field, path] of Object.entries(fieldPaths)) {
              const sampleValue = sampleValues[field];
              const el = findFieldInContainer(container, path, field, sampleValue);
              const value = extractValue(el, field);
              
              if (value) {
                if (field === 'price') {
                  const priceMatch = value.match(/[\\d,]+\\.?\\d*/);
                  item[field] = priceMatch ? priceMatch[0].replace(/,/g, '') : value;
                  const currencyMatch = value.match(/^([^\\d\\s]+)|([^\\d\\s]+)$/);
                  if (currencyMatch) {
                    item.currency = (currencyMatch[1] || currencyMatch[2] || '$').trim();
                  }
                } else {
                  item[field] = value;
                }
                validFields++;
                if (field === 'title' && value.length > 0) hasTitle = true;
              }
            }
            
            // ⭐ STRICT VALIDATION
            const titleValue = item.title || '';
            
            // Must have title
            if (!hasTitle || !titleValue) {
              console.log('⏭️ Skipping - no title');
              continue;
            }
            
            // Title length check
            if (titleValue.length < 2 || titleValue.length > 200) {
              console.log('⏭️ Skipping - title length invalid:', titleValue.length);
              continue;
            }
            
            // Must have at least 2 fields
            if (validFields < 2) {
              console.log('⏭️ Skipping - not enough fields:', validFields);
              continue;
            }
            
            // Skip navigation-like text
            if (isNavigationText(titleValue)) {
              console.log('⏭️ Skipping navigation-like:', titleValue.substring(0, 30));
              continue;
            }
            
            // Skip duplicates
            if (isDuplicate(titleValue)) {
              console.log('⏭️ Skipping duplicate:', titleValue.substring(0, 30));
              continue;
            }
            
            // Determine confidence based on similarity score and source
            if (info.similarity < 50) confidence = 'low';
            else if (info.similarity < 70 || info.source === 'document') confidence = 'medium';
            
            // Add to results
            seenTitles.add(titleValue.trim().toLowerCase());
            
            // Highlight with confidence color
            highlightElement(container, itemIndex, confidence);
            
            results.push({
              ...item,
              index: itemIndex,
              confidence,
              similarity: info.similarity,
            });
            itemIndex++;
            
            console.log('✨ Found item #' + itemIndex + ' (' + confidence + '):', titleValue.substring(0, 40));
          }
          
          console.log('🎉 Total items extracted:', results.length);
          
          return {
            itemCount: results.length,
            items: results,
          };
        })()
      `);

      console.log("📊 Analysis result:", result);

      if (result.error) {
        alert(`Analysis failed: ${result.error}`);
        return;
      }

      if (result.items.length === 0) {
        alert(
          "No similar items found. Try selecting different fields or elements that are more representative of menu items."
        );
        return;
      }

      setSimilarItemsFound(result.items);
    } catch (error) {
      console.error("Error analyzing template:", error);
      alert("Failed to analyze page structure. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExtractAllSimilar = async () => {
    if (similarItemsFound.length === 0) return;

    setIsExtracting(true);

    try {
      // Remove the template item first
      if (currentItemId) {
        removeExtractedItem(currentItemId);
      }

      // Add all found items
      for (const item of similarItemsFound) {
        const newItem = {
          id: Date.now() + Math.random(),
          title: item.title || "",
          description: item.description || "",
          image: item.image || "",
          price: item.price || "",
          currency: item.currency || "$",
          category: "",
          url: collectionContext?.sourceUrl || "",
          timestamp: new Date().toISOString(),
          verified: false,
        };
        addExtractedItem(newItem as any);
      }

      // Clear template mode
      setIsTemplateMode(false);
      setShowItemForm(false);
      setCurrentItemId(null);
      setTemplateFields({
        image: null,
        title: null,
        description: null,
        price: null,
      });
      setSimilarItemsFound([]);

      // Clear highlights
      const webview = document.querySelector("webview");
      if (webview) {
        await (webview as any).executeJavaScript(`
          document.querySelectorAll('[data-template-item]').forEach(el => {
            el.style.outline = '';
            el.style.outlineOffset = '';
            el.removeAttribute('data-template-item');
          });
        `);
      }

      alert(`✅ Successfully extracted ${similarItemsFound.length} items!`);
    } catch (error) {
      console.error("Error extracting items:", error);
      alert("Failed to extract items. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  // ============================================================================
  // ITEM HANDLERS
  // ============================================================================

  const handleAddItem = async () => {
    // ⭐ Use sourceId as the primary identifier (collectionRestaurantId is optional)
    if (!collectionContext?.sourceId) {
      // Fallback to local-only item if no context at all
      const id = Date.now();
      addExtractedItem({
        id,
        title: "",
        description: "",
        image: "",
        price: "",
        category: "",
        url: collectionContext?.sourceUrl || "",
        timestamp: new Date().toISOString(),
        verified: true, // ⭐ Manual items are verified by default
        isManual: true,
      } as any);
      setCurrentItemId(id);
      setShowItemForm(true);
      return;
    }

    // ⭐ OPTIMISTIC UPDATE: Create local item immediately
    const tempId = Date.now();
    let itemName = "New Item";
    const existingNames = extractedData.map((i) =>
      (i.title || "").toLowerCase()
    );
    if (existingNames.includes("new item")) {
      let counter = 2;
      while (existingNames.includes(`new item ${counter}`)) counter++;
      itemName = `New Item ${counter}`;
    }

    const newItem = {
      id: tempId,
      _id: undefined as string | undefined, // Will be set after API call
      title: itemName,
      description: "",
      price: "",
      category: "",
      currency: "USD",
      url: collectionContext.sourceUrl || "",
      timestamp: new Date().toISOString(),
      verified: true, // ⭐ Manual items are verified by default
      isManual: true,
      hasManualVersion: true,
    };

    // Add to UI immediately
    addExtractedItem(newItem as any);
    setCurrentItemId(tempId);
    setShowItemForm(true);
    setPriceLabels([]);

    try {
      const { apiClient } = await import("../lib/api-client");
      const response = await apiClient.post<any>("/v1/menu-items/manual", {
        sourceId: collectionContext.sourceId,
        collectionRestaurantId:
          collectionContext.collectionRestaurantId || undefined,
        name: itemName,
        description: "",
        price: 0,
        currency: "USD",
        category: "",
        isManual: true,
        verified: true, // ⭐ Manual items are verified by default
      });

      // ⭐ Handle response format: { success: true, data: { results: [...] } }
      const responseData = response?.data || response;

      if (responseData?.results?.length > 0) {
        const result = responseData.results[0];
        // Update the item with the real ID from server
        updateExtractedItem(tempId, {
          _id: result.itemId || result._id,
        });
        console.log("✅ Item created successfully:", result.itemId);
      } else if (responseData?.count > 0) {
        // Alternative response format
        console.log("✅ Item created (count-based response)");
      } else {
        console.warn("⚠️ Item may not have been saved to server");
      }
    } catch (error) {
      console.error("Error creating item:", error);
      // ⭐ Don't remove the item on error - let user continue editing
      // Just show a warning
      console.warn("Item created locally but may not be saved to server");
    }
  };

  const toggleItemExpansion = (itemId: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      newSet.has(itemId) ? newSet.delete(itemId) : newSet.add(itemId);
      return newSet;
    });
  };

  const handleToggleSize = (size: string) => {
    setPriceLabels((prev) => {
      const exists = prev.some((l) => l.size === size);
      return exists
        ? prev.filter((l) => l.size !== size)
        : [...prev, { size, price: "" }];
    });
  };

  const handleAddPriceLabel = () =>
    setPriceLabels((prev) => [...prev, { size: "", price: "" }]);
  const handleRemovePriceLabel = (index: number) =>
    setPriceLabels((prev) => prev.filter((_, i) => i !== index));
  const handleUpdatePriceLabel = (
    index: number,
    field: "size" | "price",
    value: string
  ) => {
    setPriceLabels((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm("Delete this item?")) {
      await window.electronAPI?.deleteExtractedData?.(id);
      removeExtractedItem(id);
    }
  };

  // ============================================================================
  // VERIFY/UNVERIFY HANDLERS
  // ============================================================================

  const handleUnverifyItem = async (item: ExtractedItem) => {
    if (!item._id || !item.verified) return;
    if (!confirm(`Unverify "${item.title}"?`)) return;

    // ⭐ OPTIMISTIC UPDATE: Immediately update UI
    const originalState = {
      verified: item.verified,
      manualItemId: item.manualItemId,
      hasManualVersion: item.hasManualVersion,
    };

    updateExtractedItem(item.id, {
      verified: false,
      manualItemId: undefined,
      hasManualVersion: false,
    });

    try {
      const { unverifyItem } = await import("../services/qc-verification");
      const result = await unverifyItem(item._id, item.manualItemId);

      // Check if API call was successful
      const responseData = result?.data || result;
      if (!responseData?.aiItemId && !result?.success) {
        throw new Error("Failed to unverify item on server");
      }

      // Log audit event (don't await to not block UI)
      const { user } = useExtractionStore.getState();
      const context = useExtractionStore.getState().collectionContext;
      if (user) {
        logAuditEvent(
          {
            menuItemId: item.manualItemId || item._id,
            itemType: item.manualItemId ? "manual" : "ai",
            operation: "unverify",
            notes: `Unverified "${item.title}"`,
          },
          {
            userId: user._id,
            userRole: user.role,
            userName: user.name,
            collectionRestaurantId: context?.collectionRestaurantId,
          }
        ).catch(console.warn); // Don't fail on audit log error
      }

      console.log("✅ Item unverified successfully:", item.title);
    } catch (error) {
      console.error("Error unverifying:", error);

      // ⭐ ROLLBACK: Restore original state on error
      updateExtractedItem(item.id, originalState);

      alert(
        `Failed to unverify: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleVerifyItem = async (item: ExtractedItem) => {
    const { collectionContext } = useExtractionStore.getState();

    if (collectionContext?.hasAIData && item._id) {
      // ⭐ OPTIMISTIC UPDATE: Immediately update UI
      const originalState = {
        verified: item.verified,
        hasManualVersion: item.hasManualVersion,
        manualItemId: item.manualItemId,
      };

      updateExtractedItem(item.id, {
        verified: true,
        hasManualVersion: true,
      });

      try {
        const authData = localStorage.getItem("authData");
        if (!authData) throw new Error("Not authenticated");
        const auth = JSON.parse(authData);
        if (Date.now() > auth.expiresAt) throw new Error("Session expired");

        const { verifyItem } = await import("../services/qc-verification");
        const result = await verifyItem({
          aiItemId: item._id,
          edits: {
            name: item.title,
            description: item.description,
            price: parseFloat(item.price) || 0,
            currency: item.currency,
            category: item.category,
          },
        });

        // ⭐ Extract response data (handle wrapped format)
        const responseData = result?.data || result;
        const manualItemId = responseData?.item?._id || responseData?.item?.id;

        // Update with actual manual item ID from server
        updateExtractedItem(item.id, {
          verified: true,
          hasManualVersion: true,
          manualItemId: manualItemId,
        });

        // Log audit event (don't await to not block UI)
        const { user } = useExtractionStore.getState();
        if (user) {
          logAuditEvent(
            {
              menuItemId: item._id,
              itemType: "ai",
              operation: "verify",
              notes: `Verified "${item.title}"`,
            },
            {
              userId: user._id,
              userRole: user.role,
              userName: user.name,
              collectionRestaurantId: collectionContext.collectionRestaurantId,
            }
          ).catch(console.warn); // Don't fail on audit log error
        }

        console.log("✅ Item verified successfully:", item.title);
      } catch (error) {
        console.error("Error verifying:", error);

        // ⭐ ROLLBACK: Restore original state on error
        updateExtractedItem(item.id, originalState);

        const msg = error instanceof Error ? error.message : "Unknown error";
        if (msg.includes("Unauthorized") || msg.includes("expired")) {
          alert(`Auth error: ${msg}`);
          localStorage.removeItem("authData");
          window.location.reload();
        } else {
          alert(`Failed to verify: ${msg}`);
        }
      }
    } else {
      await window.electronAPI?.updateExtractedData?.(item.id, {
        verified: !item.verified,
      });
      updateExtractedItem(item.id, { verified: !item.verified });
    }
  };

  const refreshQCData = async (sourceId: string) => {
    const { getQCMergedItems, transformQCItemToExtractedItem } = await import(
      "../services/qc-verification"
    );
    const qcData = await getQCMergedItems(sourceId);
    const items = qcData.items.map((item, idx) =>
      transformQCItemToExtractedItem(item, idx)
    );
    setExtractedData(items);
    localStorage.setItem("qcProgress", JSON.stringify(qcData.stats));
    return qcData.stats;
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!currentItem) return;
    const fieldMap: Record<string, string> = {
      title: "name",
      description: "description",
      price: "price",
      currency: "currency",
    };
    const apiField = fieldMap[field] || field;

    // ⭐ OPTIMISTIC UPDATE: Update UI immediately
    const oldValue = currentItem[field as keyof ExtractedItem];

    try {
      // Case 1: Item has a manualItemId - update the manual item
      if (currentItem.manualItemId) {
        const { updateMenuItem } = await import("../services/menu-items");
        await updateMenuItem(currentItem.manualItemId, { [field]: value });

        // Log audit event (don't await)
        const { user } = useExtractionStore.getState();
        if (user) {
          logFieldUpdate(
            currentItem.manualItemId,
            "manual",
            apiField,
            oldValue,
            value,
            {
              userId: user._id,
              userRole: user.role,
              userName: user.name,
              collectionRestaurantId: collectionContext?.collectionRestaurantId,
            }
          ).catch(console.warn);
        }
      }
      // Case 2: Item has _id and is a manual item (isManual=true) - update via _id
      else if (currentItem._id && currentItem.isManual) {
        const { updateMenuItem } = await import("../services/menu-items");
        await updateMenuItem(currentItem._id, { [field]: value });
        console.log(`✅ Updated manual item field: ${field}`);
      }
      // Case 3: Item has _id and is AI data - verify with edits
      else if (currentItem._id && collectionContext?.hasAIData) {
        const { verifyItem } = await import("../services/qc-verification");
        const result = await verifyItem({
          aiItemId: currentItem._id,
          edits: { [apiField]: value },
        });

        // Handle response format
        const responseData = result?.data || result;
        const manualItemId = responseData?.item?._id || responseData?.item?.id;

        updateExtractedItem(currentItem.id, {
          manualItemId: manualItemId,
          verified: true,
          hasManualVersion: true,
        });

        // Don't refresh all data - just update this item
        console.log(`✅ Verified AI item with edit: ${field}`);
      }
      // Case 4: No _id yet - item not saved to server, just update locally
      else {
        console.log(`📝 Local update only (no server ID): ${field}`);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      // Don't show alert for every field update error - just log it
      console.warn(`Failed to sync ${field} to server - changes saved locally`);
    }
  };

  // ============================================================================
  // COMPLETE COLLECTION HANDLERS
  // ============================================================================

  const handleCompleteCollection = async () => {
    if (!collectionContext) {
      alert("No collection context found.");
      return;
    }
    const unverifiedCount = extractedData.filter((i) => !i.verified).length;
    if (
      unverifiedCount > 0 &&
      !confirm(`${unverifiedCount} items not verified. Continue?`)
    )
      return;
    setShowCompleteModal(true);
  };

  const handleSaveToAPI = async () => {
    if (!collectionContext?.sourceId) {
      alert("No collection context found.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const { apiClient } = await import("../lib/api-client");
      const response = await apiClient.post<any>(
        `/v1/sources/${collectionContext.sourceId}/complete-manual-collection`,
        {}
      );

      if (response?.success) {
        const msg = response.data?.collectionRestaurantCompleted
          ? "✅ Collection completed! All sources done. You can still add more items if needed."
          : "✅ Source marked as complete! You can still add more items if needed.";
        alert(msg);
        // ⭐ FIX: Don't clear data - allow collector to add more items
        // setExtractedData([]); // REMOVED - keep items visible
        setShowCompleteModal(false);

        // ⭐ NEW: Mark items as "completed" visually but keep them
        // This allows the collector to continue adding items if needed
        console.log(
          "✅ Collection completed - items remain visible for potential additions"
        );
      } else {
        throw new Error(response?.error || "Failed to complete");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      setSaveError(msg);
      alert(`Failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    const result = await window.electronAPI?.exportData?.(exportFormat);
    setShowExportModal(false);
    if (result?.success) alert(`Exported ${result.count} items!`);
  };

  const currentItem = extractedData.find((item) => item.id === currentItemId);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <aside className="w-80 flex flex-col border-l border-[#E5E5E5] bg-white relative">
      {/* Extraction Mode Banner */}
      {selectedField && !showItemForm && (
        <div className="absolute top-2 left-2 right-2 z-50 px-3 py-2 bg-[#00D2A1] text-white rounded-lg shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            <span
              className="text-xs font-bold capitalize"
              style={{ fontFamily: "Montserrat" }}
            >
              {selectedField}
            </span>
          </div>
          <button
            onClick={handleStopExtraction}
            className="px-2 py-1 bg-white text-[#00D2A1] rounded text-xs font-bold"
          >
            ESC
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-3 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-sm text-black"
              style={{ fontFamily: "Montserrat" }}
            >
              {isTemplateMode
                ? "Template Mode"
                : showItemForm
                  ? "Edit Item"
                  : "Menu Items"}
            </h3>
            {!showItemForm && !isTemplateMode && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#00D2A1] text-white">
                {extractedData.length}
              </span>
            )}
          </div>

          {user && !showItemForm && (
            <span
              className="text-xs font-medium text-[#00D2A1]"
              style={{ fontFamily: "Montserrat" }}
            >
              {user.name}
            </span>
          )}

          {(showItemForm || isTemplateMode) && (
            <button
              onClick={
                isTemplateMode
                  ? handleCancelTemplateMode
                  : () => {
                      setShowItemForm(false);
                      setCurrentItemId(null);
                      handleStopExtraction();
                    }
              }
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={18} className="text-[#DC2626]" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        {!showItemForm && !isTemplateMode && (
          <div className="flex gap-2">
            <Button
              onClick={handleStartTemplateMode}
              className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg h-8 text-xs"
              style={{ fontFamily: "Montserrat" }}
            >
              <Layers size={14} className="mr-1" />
              Template
            </Button>
            <Button
              onClick={handleAddItem}
              className="flex-1 bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-lg h-8 text-xs"
              style={{ fontFamily: "Montserrat" }}
            >
              <Plus size={14} className="mr-1" />
              Add Item
            </Button>
          </div>
        )}
      </div>

      {/* Template Mode Instructions */}
      {isTemplateMode && !similarItemsFound.length && (
        <div className="p-3 bg-[#3B82F6]/10 border-b border-[#3B82F6]/30">
          <p
            className="text-xs text-[#3B82F6] mb-2"
            style={{ fontFamily: "Montserrat" }}
          >
            <strong>Step 1:</strong> Select fields from ONE menu item below
          </p>
          <p
            className="text-xs text-[#3B82F6]/80"
            style={{ fontFamily: "Montserrat" }}
          >
            <strong>Step 2:</strong> Click &quot;Find Similar&quot; to detect
            all items
          </p>

          {/* Field Status */}
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(templateFields).map(([field, mapping]) => (
              <span
                key={field}
                className={`text-[10px] px-2 py-0.5 rounded ${
                  mapping
                    ? "bg-[#00D2A1] text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {mapping ? <Check size={10} className="inline mr-1" /> : null}
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Similar Items Found Panel */}
      {isTemplateMode && similarItemsFound.length > 0 && (
        <div className="p-3 bg-[#00D2A1]/10 border-b border-[#00D2A1]/30">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-bold text-[#00D2A1]"
              style={{ fontFamily: "Montserrat" }}
            >
              Found {similarItemsFound.length} items
            </span>
            <button
              onClick={() => setSimilarItemsFound([])}
              className="text-xs text-[#737373] hover:text-black"
            >
              Reset
            </button>
          </div>

          {/* Preview of found items */}
          <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
            {similarItemsFound.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="text-xs p-1 bg-white rounded border border-[#E5E5E5] truncate"
              >
                {item.title || "Untitled"} - {item.currency || "$"}
                {item.price || "0"}
              </div>
            ))}
            {similarItemsFound.length > 5 && (
              <div className="text-xs text-[#737373] text-center">
                +{similarItemsFound.length - 5} more...
              </div>
            )}
          </div>

          <Button
            onClick={handleExtractAllSimilar}
            disabled={isExtracting}
            className="w-full bg-[#00D2A1] hover:bg-[#00B890] text-white rounded h-8 text-xs"
            style={{ fontFamily: "Montserrat" }}
          >
            {isExtracting ? (
              <>
                <img
                  src="./logo.png"
                  alt=""
                  className="w-4 h-4 animate-pulse mr-1"
                />
                Extracting...
              </>
            ) : (
              <>
                <Check size={14} className="mr-1" />
                Extract All ({similarItemsFound.length})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Extraction Mode Banner (in form) */}
      {selectedField && showItemForm && (
        <div className="px-3 py-2 bg-[#00D2A1] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span
              className="text-xs font-bold capitalize"
              style={{ fontFamily: "Montserrat" }}
            >
              Selecting: {selectedField}
            </span>
          </div>
          <button
            onClick={handleStopExtraction}
            className="px-2 py-1 bg-white text-[#00D2A1] rounded text-xs font-bold"
          >
            ESC
          </button>
        </div>
      )}

      {/* Item Form */}
      {showItemForm && currentItem && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-3">
            {/* Image */}
            <div>
              <label
                className="block text-xs font-medium mb-1 text-black"
                style={{ fontFamily: "Montserrat" }}
              >
                Image{" "}
                {isTemplateMode && templateFields.image && (
                  <Check size={12} className="inline text-[#00D2A1]" />
                )}
              </label>
              {currentItem.image ? (
                <div className="relative w-full h-20 bg-gray-100 rounded overflow-hidden border">
                  <img
                    src={currentItem.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() =>
                      updateExtractedItem(currentItem.id, { image: "" })
                    }
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleFieldSelect("image")}
                  className={`w-full h-16 border-2 border-dashed rounded flex items-center justify-center gap-2 ${
                    selectedField === "image"
                      ? "border-[#00D2A1] bg-[#00D2A1]/5"
                      : "border-[#E5E5E5]"
                  }`}
                >
                  <ImageIcon size={18} className="text-[#00D2A1]" />
                  <span className="text-xs text-[#00D2A1]">Select Image</span>
                </button>
              )}
            </div>

            {/* Title */}
            <div>
              <label
                className="block text-xs font-medium mb-1 text-black"
                style={{ fontFamily: "Montserrat" }}
              >
                Name{" "}
                {isTemplateMode && templateFields.title && (
                  <Check size={12} className="inline text-[#00D2A1]" />
                )}
              </label>
              <div className="relative">
                <Input
                  placeholder="Item name"
                  value={currentItem.title || ""}
                  onChange={(e) => {
                    updateExtractedItem(currentItem.id, {
                      title: e.target.value,
                    });
                    setDuplicateWarning(
                      checkForDuplicates(e.target.value, currentItem.id)
                    );
                  }}
                  onBlur={(e) =>
                    !isTemplateMode &&
                    handleFieldUpdate("title", e.target.value)
                  }
                  className="h-9 text-sm rounded border-[#E5E5E5] pr-8"
                />
                <button
                  onClick={() => handleFieldSelect("title")}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded ${
                    selectedField === "title"
                      ? "bg-[#00D2A1] text-white"
                      : "bg-gray-100"
                  }`}
                >
                  <Upload size={14} />
                </button>
              </div>
              {duplicateWarning && (
                <div className="mt-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-1">
                  <AlertCircle size={12} className="text-yellow-600" />
                  <span className="text-[10px] text-yellow-800">
                    {duplicateWarning}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                className="block text-xs font-medium mb-1 text-black"
                style={{ fontFamily: "Montserrat" }}
              >
                Description{" "}
                {isTemplateMode && templateFields.description && (
                  <Check size={12} className="inline text-[#00D2A1]" />
                )}
              </label>
              <div className="relative">
                <Input
                  placeholder="Description"
                  value={currentItem.description || ""}
                  onChange={(e) =>
                    updateExtractedItem(currentItem.id, {
                      description: e.target.value,
                    })
                  }
                  onBlur={(e) =>
                    !isTemplateMode &&
                    handleFieldUpdate("description", e.target.value)
                  }
                  className="h-9 text-sm rounded border-[#E5E5E5] pr-8"
                />
                <button
                  onClick={() => handleFieldSelect("description")}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded ${
                    selectedField === "description"
                      ? "bg-[#00D2A1] text-white"
                      : "bg-gray-100"
                  }`}
                >
                  <Upload size={14} />
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label
                  className="block text-xs font-medium mb-1 text-black"
                  style={{ fontFamily: "Montserrat" }}
                >
                  $
                </label>
                <Input
                  value={currentItem.currency || "$"}
                  onChange={(e) =>
                    updateExtractedItem(currentItem.id, {
                      currency: e.target.value,
                    })
                  }
                  className="h-9 text-sm text-center rounded border-[#E5E5E5]"
                />
              </div>
              <div className="col-span-3">
                <label
                  className="block text-xs font-medium mb-1 text-black"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Price{" "}
                  {isTemplateMode && templateFields.price && (
                    <Check size={12} className="inline text-[#00D2A1]" />
                  )}
                </label>
                <div className="relative">
                  <Input
                    placeholder="0.00"
                    value={currentItem.price || ""}
                    onChange={(e) =>
                      updateExtractedItem(currentItem.id, {
                        price: e.target.value,
                      })
                    }
                    onBlur={(e) =>
                      !isTemplateMode &&
                      handleFieldUpdate(
                        "price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="h-9 text-sm rounded border-[#E5E5E5] pr-8"
                  />
                  <button
                    onClick={() => handleFieldSelect("price")}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded ${
                      selectedField === "price"
                        ? "bg-[#00D2A1] text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    <Upload size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Category (not in template mode) */}
            {!isTemplateMode && (
              <div>
                <label
                  className="block text-xs font-medium mb-1 text-black"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Category
                </label>
                <select
                  value={currentItem.category || ""}
                  onChange={(e) =>
                    updateExtractedItem(currentItem.id, {
                      category: e.target.value,
                    })
                  }
                  className="w-full h-9 text-sm rounded border border-[#E5E5E5] px-2 bg-white"
                >
                  <option value="">Select category</option>
                  <option value="Appetizers">Appetizers</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>
            )}

            {/* Size Labels (not in template mode) */}
            {!isTemplateMode && (
              <>
                <div>
                  <label
                    className="block text-xs font-medium mb-1 text-black"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    Sizes
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {["S", "M", "L"].map((size) => (
                      <button
                        key={size}
                        onClick={() => handleToggleSize(size)}
                        className={`w-8 h-8 rounded text-xs font-bold ${
                          priceLabels.some((l) => l.size === size)
                            ? "bg-[#00D2A1] text-white"
                            : "bg-gray-100"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                    <button
                      onClick={handleAddPriceLabel}
                      className="w-8 h-8 rounded bg-[#00D2A1]/10 text-[#00D2A1]"
                    >
                      <Plus size={16} className="mx-auto" />
                    </button>
                  </div>
                </div>

                {priceLabels.length > 0 && (
                  <div className="space-y-1">
                    {priceLabels.map((label, idx) => (
                      <div key={idx} className="flex gap-1">
                        <Input
                          placeholder="Size"
                          value={label.size}
                          onChange={(e) =>
                            handleUpdatePriceLabel(idx, "size", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Price"
                          value={label.price}
                          onChange={(e) =>
                            handleUpdatePriceLabel(idx, "price", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                        <button
                          onClick={() => handleRemovePriceLabel(idx)}
                          className="px-2 rounded bg-red-100 text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Template Mode: Find Similar Button */}
            {isTemplateMode && (
              <Button
                onClick={handleFindSimilar}
                disabled={isAnalyzing || getTemplateFieldsCount() < 2}
                className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded h-9 text-xs"
                style={{ fontFamily: "Montserrat" }}
              >
                {isAnalyzing ? (
                  <>
                    <img
                      src="./logo.png"
                      alt=""
                      className="w-4 h-4 animate-pulse mr-1"
                    />
                    Analyzing DOM...
                  </>
                ) : (
                  <>
                    <Search size={14} className="mr-1" />
                    Find Similar ({getTemplateFieldsCount()}/4 fields)
                  </>
                )}
              </Button>
            )}

            {/* Non-template: Verify & Actions */}
            {!isTemplateMode && (
              <>
                <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
                  <span
                    className="text-xs font-medium text-black"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    {currentItem.verified ? "✓ Verified" : "Verify"}
                  </span>
                  {currentItem.verified ? (
                    <button
                      onClick={() => handleUnverifyItem(currentItem)}
                      className="px-2 py-1 text-xs rounded bg-red-100 text-red-600"
                    >
                      Unverify
                    </button>
                  ) : (
                    <button
                      onClick={() => handleVerifyItem(currentItem)}
                      className="w-10 h-5 rounded-full bg-gray-300 relative"
                    >
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => {
                      setShowItemForm(false);
                      setCurrentItemId(null);
                      handleStopExtraction();
                    }}
                    variant="outline"
                    className="flex-1 h-8 text-xs rounded"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => handleDeleteItem(currentItem.id)}
                    className="flex-1 h-8 text-xs rounded bg-[#DC2626] text-white"
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete
                  </Button>
                </div>
              </>
            )}

            {/* Template Mode: Cancel Button */}
            {isTemplateMode && (
              <Button
                onClick={handleCancelTemplateMode}
                variant="outline"
                className="w-full h-8 text-xs rounded"
              >
                Cancel Template
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Items List View */}
      {!showItemForm && !isTemplateMode && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* QC Progress */}
          {collectionContext?.hasAIData &&
            (() => {
              const stats = JSON.parse(
                localStorage.getItem("qcProgress") || "null"
              );
              return (
                stats && (
                  <div className="p-2 bg-[#00D2A1]/10 border-b border-[#E5E5E5]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-black">
                        {stats.verified}/{stats.total} verified
                      </span>
                      <span className="text-xs font-bold text-[#00D2A1]">
                        {stats.percentComplete}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00D2A1] transition-all"
                        style={{ width: `${stats.percentComplete}%` }}
                      />
                    </div>
                  </div>
                )
              );
            })()}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-2">
            {extractedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <img
                  src="./logo.png"
                  alt=""
                  className="w-16 h-16 opacity-30 mb-3"
                />
                <p
                  className="text-sm text-[#737373]"
                  style={{ fontFamily: "Montserrat" }}
                >
                  No items yet
                </p>
                <p className="text-xs text-[#999]">Use Template or Add Item</p>
              </div>
            ) : (
              <div className="space-y-2">
                {extractedData
                  .filter((i) => !i.isTemplate)
                  .map((item, index) => {
                    const isExpanded = expandedItems.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border transition-all ${item.id === currentItemId ? "border-[#00D2A1] shadow" : "border-[#E5E5E5]"} bg-white`}
                      >
                        <div
                          className="p-2 flex items-center gap-2 cursor-pointer hover:bg-[#F7F7F7]"
                          onClick={() => toggleItemExpansion(item.id)}
                        >
                          <button className="text-[#737373]">
                            {isExpanded ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronUp size={16} className="rotate-90" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-black truncate">
                                {index + 1}. {item.title || "Untitled"}
                              </span>
                              {item.verified && (
                                <span className="text-[10px] px-1 rounded bg-[#00D2A1]/20 text-[#00D2A1]">
                                  ✓
                                </span>
                              )}
                              {item.hasManualVersion && (
                                <span className="text-[10px] px-1 rounded bg-blue-100 text-blue-600">
                                  ✏
                                </span>
                              )}
                            </div>
                            {!isExpanded && (
                              <p className="text-[10px] text-[#737373] truncate">
                                {item.currency || "$"}
                                {item.price || "0"} •{" "}
                                {item.category || "No category"}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentItemId(item.id);
                              setShowItemForm(true);
                            }}
                            className="px-2 py-1 text-[10px] rounded bg-[#00D2A1] text-white font-medium"
                          >
                            Edit
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="px-2 pb-2 pt-1 border-t border-[#E5E5E5] space-y-2">
                            {item.image && (
                              <img
                                src={item.image}
                                alt=""
                                className="w-full h-20 object-cover rounded"
                              />
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-[#737373]">Price:</span>{" "}
                                <span className="text-black">
                                  {item.currency || "$"}
                                  {item.price || "0"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#737373]">
                                  Category:
                                </span>{" "}
                                <span className="text-black">
                                  {item.category || "-"}
                                </span>
                              </div>
                            </div>
                            {item.description && (
                              <p className="text-xs text-[#737373] line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            <div className="flex gap-1 pt-1">
                              {item.verified ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnverifyItem(item);
                                  }}
                                  className="flex-1 px-2 py-1 text-[10px] rounded bg-red-100 text-red-600"
                                >
                                  Unverify
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifyItem(item);
                                  }}
                                  className="flex-1 px-2 py-1 text-[10px] rounded bg-orange-100 text-orange-600"
                                >
                                  Verify
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item.id);
                                }}
                                className="px-2 py-1 text-[10px] rounded bg-red-100 text-red-600"
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

      {/* Footer - Collapsible Complete Section */}
      {!showItemForm && !isTemplateMode && (
        <div className="border-t border-[#E5E5E5]">
          <button
            onClick={() => setIsCompleteCollapsed(!isCompleteCollapsed)}
            className="w-full p-2 flex items-center justify-between hover:bg-[#F7F7F7]"
          >
            <span
              className="text-xs font-medium text-black"
              style={{ fontFamily: "Montserrat" }}
            >
              Complete Collection
            </span>
            {isCompleteCollapsed ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
          {!isCompleteCollapsed && (
            <div className="p-2 pt-0 space-y-2">
              <Button
                onClick={handleCompleteCollection}
                className="w-full bg-[#00D2A1] hover:bg-[#00B890] text-white rounded h-9 text-xs"
                disabled={extractedData.length === 0}
              >
                Mark Restaurant Complete
              </Button>
              <Button
                onClick={() => setShowExportModal(true)}
                variant="outline"
                className="w-full rounded h-8 text-xs"
                disabled={extractedData.length === 0}
              >
                Export (Local)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-50 bg-black/50 backdrop-blur-sm">
          <div className="rounded-lg p-4 w-full max-w-sm bg-white shadow-xl">
            <h3 className="text-sm font-semibold mb-3 text-black">
              Complete Collection
            </h3>
            <div className="space-y-2 mb-4">
              <div className="p-3 bg-[#F7F7F7] rounded">
                <div className="flex justify-between text-xs mb-1">
                  <span>Total</span>
                  <span className="font-bold text-[#00D2A1]">
                    {extractedData.length}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Verified</span>
                  <span className="font-bold text-[#00D2A1]">
                    {extractedData.filter((i) => i.verified).length}
                  </span>
                </div>
              </div>
              {saveError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-red-600">{saveError}</p>
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
                className="flex-1 h-8 text-xs"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveToAPI}
                className="flex-1 h-8 text-xs bg-[#00D2A1] text-white"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <img
                      src="./logo.png"
                      alt=""
                      className="w-4 h-4 animate-pulse mr-1"
                    />
                    Saving...
                  </>
                ) : (
                  "Complete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-50 bg-black/50 backdrop-blur-sm">
          <div className="rounded-lg p-4 w-full max-w-sm bg-white shadow-xl">
            <h3 className="text-sm font-semibold mb-3">Export Data</h3>
            <div className="space-y-2 mb-4">
              {["json", "csv"].map((fmt) => (
                <label
                  key={fmt}
                  className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={fmt}
                    checked={exportFormat === fmt}
                    onChange={(e) => setExportFormat(e.target.value)}
                  />
                  <div>
                    <div className="text-xs font-medium uppercase">{fmt}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowExportModal(false)}
                variant="outline"
                className="flex-1 h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                className="flex-1 h-8 text-xs bg-[#00D2A1] text-white"
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
