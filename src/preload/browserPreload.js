const { contextBridge, ipcRenderer } = require('electron')

// Injection script for data extraction - similar to content script
let isSelecting = false
let currentField = null
let highlightedElements = []
let extractedData = []
let currentTemplate = { image: null, title: null, description: null, price: null }
let extractionMode = 'manual' // 'manual' or 'template'

// Expose browser-specific API
contextBridge.exposeInMainWorld('browserAPI', {
  startSelection: (field) => startSelection(field),
  stopSelection: () => stopSelection(),
  findSimilar: () => findSimilar(),
  clearHighlights: () => clearHighlights(),
  setExtractionMode: (mode) => setExtractionMode(mode),
  getExtractedData: () => extractedData,
  sendDataToMain: (data) => ipcRenderer.send('browser-data-extracted', data),
  getCurrentUrl: () => window.location.href
})

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Browser preload script loaded')
  setupExtractionListeners()
  injectStyles()
})

function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    /* Selection highlights */
    .extractor-selected {
      outline: 3px solid #4DEAC7 !important;
      outline-offset: 2px !important;
      background-color: rgba(77, 234, 199, 0.15) !important;
      position: relative !important;
    }

    .extractor-selected::after {
      content: "✓" !important;
      position: absolute !important;
      top: -12px !important;
      right: -12px !important;
      background: #4DEAC7 !important;
      color: #1e293b !important;
      border-radius: 50% !important;
      width: 20px !important;
      height: 20px !important;
      font-size: 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999 !important;
      font-weight: bold !important;
      box-shadow: 0 2px 8px rgba(77, 234, 199, 0.3) !important;
    }

    .extractor-similar {
      outline: 3px solid #34d399 !important;
      outline-offset: 2px !important;
      background-color: rgba(52, 211, 153, 0.15) !important;
      position: relative !important;
    }

    .extractor-similar::after {
      content: "~" !important;
      position: absolute !important;
      top: -12px !important;
      right: -12px !important;
      background: #34d399 !important;
      color: #1e293b !important;
      border-radius: 50% !important;
      width: 20px !important;
      height: 20px !important;
      font-size: 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999 !important;
      font-weight: bold !important;
      box-shadow: 0 2px 8px rgba(52, 211, 153, 0.3) !important;
    }

    /* Selection mode styles */
    body.extractor-selecting {
      user-select: none !important;
      cursor: crosshair !important;
    }

    body.extractor-selecting *:hover {
      outline: 2px solid #4DEAC7 !important;
      outline-offset: 2px !important;
      background-color: rgba(77, 234, 199, 0.1) !important;
    }

    /* Selection overlay */
    .extractor-overlay {
      position: fixed !important;
      top: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(102, 126, 234, 0.95) !important;
      color: white !important;
      padding: 8px 16px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      text-align: center !important;
      pointer-events: none !important;
      z-index: 999999 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
  `
  document.head.appendChild(style)
}

function setupExtractionListeners() {
  document.addEventListener('mouseover', handleMouseOver, true)
  document.addEventListener('mouseout', handleMouseOut, true)
  document.addEventListener('click', handleClick, true)
}

function handleMouseOver(e) {
  if (!isSelecting) return
  
  e.preventDefault()
  e.stopPropagation()
  
  highlightElement(e.target)
}

function handleMouseOut(e) {
  if (!isSelecting) return
  
  removeHighlight(e.target)
}

function handleClick(e) {
  if (!isSelecting) return

  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()

  extractDataFromElement(e.target)
  return false
}

function highlightElement(element) {
  if (element === document.body || element === document.documentElement) return

  element.style.outline = "2px solid #667eea"
  element.style.outlineOffset = "2px"
  element.style.backgroundColor = "rgba(102, 126, 234, 0.1)"
}

function removeHighlight(element) {
  element.style.outline = ""
  element.style.outlineOffset = ""
  element.style.backgroundColor = ""
}

function extractDataFromElement(element) {
  const value = extractValue(element, currentField)
  const selector = generateSelector(element)
  
  if (extractionMode === 'template') {
    // Template mode - save selector for later use
    currentTemplate[currentField] = { element, selector, value }
    ipcRenderer.send('browser-element-selected', {
      field: currentField,
      value,
      selector,
      mode: 'template'
    })
  } else {
    // Manual mode - extract single item
    const extractedItem = {
      [currentField]: value,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      verified: false
    }
    
    extractedData.push(extractedItem)
    ipcRenderer.send('browser-data-extracted', extractedItem)
  }

  // Add permanent highlight
  element.classList.add("extractor-selected")
  highlightedElements.push(element)

  // Stop selecting after extraction
  stopSelection()
}

function extractValue(element, type) {
  switch (type) {
    case "image":
      if (element.tagName === "IMG") {
        return element.src || element.getAttribute("data-src") || element.getAttribute("data-lazy")
      }
      
      const bgImage = window.getComputedStyle(element).backgroundImage
      if (bgImage && bgImage !== "none") {
        const match = bgImage.match(/url\(["']?([^"')]+)["']?\)/)
        return match ? match[1] : ""
      }
      
      const childImg = element.querySelector("img")
      if (childImg) {
        return childImg.src || childImg.getAttribute("data-src") || childImg.getAttribute("data-lazy")
      }
      return ""
      
    case "title":
      return element.title || element.alt || element.textContent?.trim() || element.getAttribute("aria-label") || ""
      
    case "description":
      return element.textContent?.trim() || element.getAttribute("data-description") || element.getAttribute("aria-description") || ""
      
    case "price":
      const priceText = element.textContent?.trim() || ""
      
      // Enhanced price extraction patterns
      const currencyPattern = /(?:Rs\.?\s*|PKR\s*|₹\s*|[\$€£¥₽₩￥]\s*)[,\d]+(?:\.\d{1,2})?/gi
      const currencyMatch = priceText.match(currencyPattern)
      if (currencyMatch) {
        return currencyMatch[0].trim()
      }
      
      const fromPricePattern = /From\s*(?:Rs\.?\s*|PKR\s*|₹\s*|[\$€£¥₽₩￥]\s*)[,\d]+(?:\.\d{1,2})?/gi
      const fromMatch = priceText.match(fromPricePattern)
      if (fromMatch) {
        return fromMatch[0].trim()
      }
      
      const numberCurrencyPattern = /[,\d]+(?:\.\d{1,2})?\s*(?:Rs\.?|PKR|₹|[\$€£¥₽₩￥])/gi
      const numberMatch = priceText.match(numberCurrencyPattern)
      if (numberMatch) {
        return numberMatch[0].trim()
      }
      
      return ""
      
    default:
      return element.textContent?.trim() || element.value || ""
  }
}

function generateSelector(element) {
  const selectors = []

  if (element.id) {
    return `#${element.id}`
  }

  if (element.className && typeof element.className === "string") {
    const classes = element.className.split(" ")
      .filter(c => c.trim() && !c.match(/^(active|hover|selected|focus)$/))
      .slice(0, 3)
    if (classes.length > 0) {
      selectors.push(element.tagName.toLowerCase() + "." + classes.join("."))
    }
  }

  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith("data-") && !attr.name.includes("index") && !attr.name.includes("id"))
    .slice(0, 2)

  if (dataAttrs.length > 0) {
    const dataSelector = element.tagName.toLowerCase() + 
      dataAttrs.map(attr => `[${attr.name}="${attr.value}"]`).join("")
    selectors.push(dataSelector)
  }

  const path = []
  let current = element
  while (current && current !== document.body && path.length < 4) {
    const tag = current.tagName.toLowerCase()
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => child.tagName === current.tagName)
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        path.unshift(`${tag}:nth-of-type(${index})`)
      } else {
        path.unshift(tag)
      }
    }
    current = parent
  }
  
  if (path.length > 0) {
    selectors.push(path.join(" > "))
  }

  return selectors[0] || element.tagName.toLowerCase()
}

function startSelection(field) {
  currentField = field
  isSelecting = true
  document.body.classList.add('extractor-selecting')
  
  showSelectionOverlay(field)
}

function stopSelection() {
  isSelecting = false
  currentField = null
  document.body.classList.remove('extractor-selecting')
  
  hideSelectionOverlay()
}

function showSelectionOverlay(field) {
  hideSelectionOverlay() // Remove any existing overlay
  
  const overlay = document.createElement('div')
  overlay.className = 'extractor-overlay'
  overlay.id = 'extractor-selection-overlay'
  overlay.textContent = `🎯 Selecting ${field} - Click to extract`
  
  document.body.appendChild(overlay)
  
  // Hide after 2 seconds
  setTimeout(() => {
    hideSelectionOverlay()
  }, 2000)
}

function hideSelectionOverlay() {
  const overlay = document.getElementById('extractor-selection-overlay')
  if (overlay) {
    overlay.remove()
  }
}

function findSimilar() {
  if (extractionMode !== 'template') {
    console.log('Find similar only works in template mode')
    return
  }
  
  const templateFields = Object.keys(currentTemplate).filter(field => currentTemplate[field])
  
  if (templateFields.length === 0) {
    console.log('No template fields set')
    return
  }
  
  console.log('Finding similar elements...')
  
  const referenceElement = currentTemplate[templateFields[0]].element
  const containerSelector = generateContainerSelector(referenceElement)
  const containers = document.querySelectorAll(containerSelector)
  
  const similarData = []
  
  containers.forEach(container => {
    if (container.classList.contains("extractor-selected")) return
    
    const compoundData = {
      image: null,
      title: null,
      description: null,
      price: null,
      verified: false,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }
    
    let hasValidData = false
    
    templateFields.forEach(field => {
      const templateInfo = currentTemplate[field]
      const similarElement = findSimilarElementInContainer(container, templateInfo)
      
      if (similarElement) {
        const value = extractValue(similarElement, field)
        if (value && value.trim()) {
          compoundData[field] = value
          hasValidData = true
          similarElement.classList.add("extractor-similar")
          highlightedElements.push(similarElement)
        }
      }
    })
    
    if (hasValidData && !isDuplicate(compoundData)) {
      similarData.push(compoundData)
      extractedData.push(compoundData)
    }
  })
  
  if (similarData.length > 0) {
    ipcRenderer.send('browser-data-extracted', similarData)
  }
  
  console.log(`Found ${similarData.length} similar items`)
}

function generateContainerSelector(element) {
  let container = element
  let level = 0
  
  while (container && level < 8) {
    const classes = Array.from(container.classList || [])
    
    if (classes.some(cls => 
      cls.includes('card') || 
      cls.includes('item') || 
      cls.includes('product') || 
      cls.includes('menu') ||
      cls.includes('col-')
    )) {
      const cardContainer = container
      const parentContainer = cardContainer.parentElement
      
      if (parentContainer) {
        const siblings = Array.from(parentContainer.children).filter(child => {
          const childClasses = Array.from(child.classList || [])
          return childClasses.some(cls => 
            cls.includes('col-') || 
            childClasses.some(c => classes.includes(c))
          )
        })
        
        if (siblings.length >= 2) {
          const cardClass = classes.find(cls => 
            cls.includes('card') || 
            cls.includes('item') || 
            cls.includes('menu') ||
            cls.includes('col-')
          )
          
          if (cardClass) {
            return `.${cardClass}`
          }
        }
      }
    }
    
    container = container.parentElement
    level++
  }
  
  container = element.parentElement
  level = 0
  
  while (container && level < 5) {
    const children = Array.from(container.children)
    if (children.length >= 3) {
      const style = window.getComputedStyle(container)
      if (style.display.includes('grid') || style.display.includes('flex') || 
          container.className.includes('row') || container.className.includes('grid')) {
        return container.tagName.toLowerCase() + (container.className ? '.' + container.className.split(' ').join('.') : '')
      }
    }
    container = container.parentElement
    level++
  }
  
  return element.tagName.toLowerCase()
}

function findSimilarElementInContainer(container, templateInfo) {
  try {
    const exactMatch = container.querySelector(templateInfo.selector.split(" ").pop())
    if (exactMatch) return exactMatch
  } catch (e) {}
  
  const templateElement = templateInfo.element
  const candidates = container.querySelectorAll(templateElement.tagName.toLowerCase())
  
  for (const candidate of candidates) {
    if (isStructurallySimilar(candidate, templateElement)) {
      return candidate
    }
  }
  
  return null
}

function isStructurallySimilar(element1, element2) {
  if (element1.tagName !== element2.tagName) return false
  
  const classes1 = Array.from(element1.classList)
  const classes2 = Array.from(element2.classList)
  const commonClasses = classes1.filter(cls => classes2.includes(cls))
  
  if (classes1.length > 0 && classes2.length > 0) {
    const similarity = commonClasses.length / Math.max(classes1.length, classes2.length)
    if (similarity < 0.3) return false
  }
  
  const parent1 = element1.parentElement
  const parent2 = element2.parentElement
  
  if (parent1 && parent2) {
    const index1 = Array.from(parent1.children).indexOf(element1)
    const index2 = Array.from(parent2.children).indexOf(element2)
    const maxIndex = Math.max(parent1.children.length, parent2.children.length)
    
    const positionSimilarity = 1 - Math.abs(index1 - index2) / maxIndex
    return positionSimilarity > 0.8
  }
  
  return true
}

function isDuplicate(newData) {
  return extractedData.some(existing => {
    const titleMatch = (existing.title && newData.title) ? 
      existing.title.toLowerCase().trim() === newData.title.toLowerCase().trim() : false
    
    const imageMatch = (existing.image && newData.image) ? 
      existing.image === newData.image : false
    
    const priceMatch = (existing.price && newData.price) ? 
      existing.price === newData.price : false
    
    return titleMatch || (imageMatch && priceMatch)
  })
}

function clearHighlights() {
  highlightedElements.forEach(element => {
    element.classList.remove("extractor-selected", "extractor-similar")
    removeHighlight(element)
  })
  highlightedElements = []
  extractedData = []
  currentTemplate = { image: null, title: null, description: null, price: null }
}

function setExtractionMode(mode) {
  extractionMode = mode
  console.log(`Extraction mode set to: ${mode}`)
}

// Listen for messages from main process
ipcRenderer.on('start-selection', (event, field) => {
  startSelection(field)
})

ipcRenderer.on('stop-selection', () => {
  stopSelection()
})

ipcRenderer.on('find-similar', () => {
  findSimilar()
})

ipcRenderer.on('clear-highlights', () => {
  clearHighlights()
})

ipcRenderer.on('set-extraction-mode', (event, mode) => {
  setExtractionMode(mode)
})

console.log('Browser preload script initialized')
