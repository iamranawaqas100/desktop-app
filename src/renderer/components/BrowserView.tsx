import { useEffect, useRef } from 'react'
import { useExtractionStore } from '../store'

interface BrowserViewProps {
  url: string
  webviewRef: React.RefObject<any>
}

export default function BrowserView({ url, webviewRef }: BrowserViewProps) {
  const localWebviewRef = useRef<any>(null)
  const { currentItemId, selectedField, addExtractedItem, updateExtractedItem } = useExtractionStore()

  useEffect(() => {
    if (localWebviewRef.current) {
      webviewRef.current = localWebviewRef.current
    }
  }, [])

  useEffect(() => {
    if (url && webviewRef.current) {
      webviewRef.current.src = url
    }
  }, [url])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDomReady = () => {
      console.log('Webview DOM ready')
      // Inject extraction script
      injectExtractionScript(webview)
    }

    const handleConsoleMessage = (e: any) => {
      console.log('[Webview]:', e.message)
      
      if (e.message.startsWith('EXTRACT:')) {
        try {
          const data = JSON.parse(e.message.substring(8))
          if (data.type === 'data-extracted') {
            handleDataExtracted(data.payload)
          }
        } catch (err) {
          console.error('Failed to parse extraction message:', err)
        }
      }
    }

    webview.addEventListener('dom-ready', handleDomReady)
    webview.addEventListener('console-message', handleConsoleMessage)

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('console-message', handleConsoleMessage)
    }
  }, [currentItemId, selectedField])

  const handleDataExtracted = async (data: any) => {
    const field = Object.keys(data).find(key => key !== 'url' && key !== 'timestamp')
    if (!field) return

    if (currentItemId) {
      const updatedItem = {
        [field]: data[field],
        timestamp: new Date().toISOString(),
      }
      await window.electronAPI.updateExtractedData(currentItemId, updatedItem)
      updateExtractedItem(currentItemId, updatedItem)
    } else {
      const newItem = {
        title: '',
        description: '',
        image: '',
        price: '',
        category: '',
        url: data.url || '',
        timestamp: new Date().toISOString(),
        verified: false,
        [field]: data[field],
      }
      const savedItem = await window.electronAPI.saveExtractedData(newItem)
      addExtractedItem(savedItem)
    }
  }

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
                outline-offset: 4px !important;
                background-color: rgba(0, 210, 161, 0.1) !important;
                cursor: crosshair !important;
                position: relative !important;
                z-index: 9999 !important;
                transition: all 0.15s ease !important;
              }
              
              .extractor-selected {
                outline: 3px solid #00d2a1 !important;
                outline-offset: 4px !important;
                background-color: rgba(0, 210, 161, 0.15) !important;
                position: relative !important;
                z-index: 9999 !important;
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
        
        function handleExtractClick(e) {
          if (!window.extractionState.isSelecting) return;
          
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          const element = e.target;
          const field = window.extractionState.currentField;
          let value = '';
          let imageUrl = '';
          
          // Extract based on field type
          if (field === 'image' || field === 'Image') {
            // Handle image extraction
            if (element.tagName === 'IMG') {
              imageUrl = element.src || element.getAttribute('data-src') || element.getAttribute('srcset')?.split(',')[0]?.split(' ')[0] || '';
              value = imageUrl;
            } else {
              // Look for image in clicked element or its children
              const img = element.querySelector('img') || element.closest('*:has(img)')?.querySelector('img');
              if (img) {
                imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(',')[0]?.split(' ')[0] || '';
                value = imageUrl;
              } else {
                // Check background image
                const bgImage = window.getComputedStyle(element).backgroundImage;
                const urlMatch = bgImage.match(/url\\(["']?([^"')]+)["']?\\)/);
                if (urlMatch) {
                  imageUrl = urlMatch[1];
                  value = imageUrl;
                }
              }
            }
          } else if (field === 'price' || field === 'Price') {
            const text = element.textContent || '';
            const priceMatch = text.match(/[\\$€£¥]?\\s*[\\d,]+\\.?\\d*/);
            value = priceMatch ? priceMatch[0].trim() : text.trim();
          } else {
            // Extract text content
            value = element.textContent || element.value || element.innerText || '';
          }
          
          // Remove hover class and add selected class
          element.classList.remove('extractor-hover');
          element.classList.add('extractor-selected');
          
          sendToHost('data-extracted', {
            [field.toLowerCase()]: value.trim(),
            url: window.location.href,
            timestamp: new Date().toISOString()
          });
          
          setTimeout(() => stopSelection(), 100);
          
          return false;
        }
      }
    `

    webview.executeJavaScript(script).catch((err: any) => {
      console.error('Error injecting script:', err)
    })
  }

  return (
    <div className="flex-1 relative">
      {/* 
        Security Note: webSecurity is disabled on the webview element ONLY
        to allow web scraping functionality (cross-origin requests, etc).
        The main renderer process has proper security enabled.
        This is intentional for the scraping use case.
      */}
      <webview
        ref={localWebviewRef}
        src="about:blank"
        style={{ width: '100%', height: '100%' }}
        nodeintegration="false"
        webpreferences="contextIsolation=false, webSecurity=false"
        partition="persist:webview"
        disablewebsecurity="true"
        allowpopups="true"
      />
    </div>
  )
}
