import { useState, useEffect } from 'react'
import { useExtractionStore } from './store'
import MainLayout from './components/MainLayout'
import { Button } from './components/ui-lib/ui/button'
import { Monitor, ExternalLink } from 'lucide-react'

// Extend Window interface for TypeScript
// (Actual type definition is in types.d.ts)

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [webAppUrl, setWebAppUrl] = useState('http://localhost:3000') // Default fallback
  const { setExtractedData, setCollectionContext, setCurrentMode } = useExtractionStore()

  console.log('🚀 App component rendering, state:', { isAuthenticated, isLoading })

  // Get API URL from Electron on mount
  useEffect(() => {
    const loadApiUrl = async () => {
      try {
        if (window.electronAPI?.getApiUrl) {
          const apiUrl = await window.electronAPI.getApiUrl()
          console.log('🌐 API URL loaded:', apiUrl)
          setWebAppUrl(apiUrl)
        }
      } catch (error) {
        console.error('❌ Error loading API URL:', error)
      }
    }
    loadApiUrl()
  }, [])

  useEffect(() => {
    console.log('🔄 App mounted, checking authentication...')
    console.log('📦 electronAPI available:', !!window.electronAPI)
    checkAuth()

    // Listen for auth callback from protocol handler
    window.electronAPI?.onAuthCallback?.((authData: any) => {
      console.log('🔐 Auth callback received:', authData)
      handleAuthCallback(authData)
    })

    // Listen for AI collection callback from protocol handler
    window.electronAPI?.onAICollectionCallback?.((collectionData: any) => {
      console.log('🤖 AI Collection callback received:', collectionData)
      handleAICollectionCallback(collectionData)
    })

    // Listen for view AI menu callback from protocol handler
    window.electronAPI?.onViewAIMenu?.((viewData: any) => {
      console.log('👁️ View AI Menu callback received:', viewData)
      processViewAIMenu(viewData)
    })

    // Listen for manual extraction callback from protocol handler
    window.electronAPI?.onProtocolExtract?.((_event: any, data: any) => {
      console.log('🎯 Manual extraction callback received:', data)
      handleManualExtraction(data)
    })
  }, [])

  const checkAuth = () => {
    const authData = localStorage.getItem('authData')

    if (!authData) {
      console.log('❌ Not authenticated')
      setIsAuthenticated(false)
      setIsLoading(false)
      return
    }

    try {
      const parsed = JSON.parse(authData)
      const expiresAt = parsed.expiresAt || 0

      if (Date.now() < expiresAt) {
        console.log('✅ Auth valid, loading data...')
        setUser(parsed.user)
        setIsAuthenticated(true)
        loadData()
      } else {
        console.log('⏰ Auth expired')
        localStorage.removeItem('authData')
        setIsAuthenticated(false)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('❌ Error parsing auth data:', error)
      localStorage.removeItem('authData')
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }

  const handleAuthCallback = async (authData: any) => {
    try {
      console.log('🔄 Processing auth callback...', authData)

      // Get the stored challenge
      const storedChallenge = localStorage.getItem('authChallenge')
      const storedState = localStorage.getItem('authState')

      console.log('📝 Stored challenge:', storedChallenge)
      console.log('📝 Stored state:', storedState)
      console.log('📝 Received state:', authData.state)

      // Verify state matches
      if (authData.state !== storedState) {
        console.error('❌ State mismatch!')
        throw new Error('State verification failed')
      }

      // Exchange auth code for session token
      const url = `${webAppUrl}/api/auth/desktop/authorize?code=${authData.code}&challenge=${storedChallenge}`
      console.log('🌐 Calling:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API error:', errorData)
        throw new Error(errorData.error || 'Failed to exchange auth code')
      }

      const tokenData = await response.json()
      console.log('✅ Token data received:', tokenData)

      // Store auth data
      const authDataToStore = {
        user: tokenData.user,
        sessionToken: tokenData.sessionToken,
        signature: tokenData.signature,
        expiresAt: Date.now() + (tokenData.expiresIn * 1000),
      }

      localStorage.setItem('authData', JSON.stringify(authDataToStore))

      // Clean up challenge and state
      localStorage.removeItem('authChallenge')
      localStorage.removeItem('authState')

      setUser(tokenData.user)
      setIsAuthenticated(true)
      setIsLoading(false)
      loadData()

      // Check for pending extraction or collection after successful login
      const pendingCollection = localStorage.getItem('pendingCollection')
      if (pendingCollection) {
        console.log('🔄 Processing pending AI collection after login')
        const collectionData = JSON.parse(pendingCollection)
        localStorage.removeItem('pendingCollection')
        processAICollection(collectionData)
      }

      // Check for pending view AI menu after successful login
      const pendingViewAIMenu = localStorage.getItem('pendingViewAIMenu')
      if (pendingViewAIMenu) {
        console.log('🔄 Processing pending view AI menu after login')
        const viewData = JSON.parse(pendingViewAIMenu)
        localStorage.removeItem('pendingViewAIMenu')
        processViewAIMenu(viewData)
      }

      const pendingExtraction = localStorage.getItem('pendingExtraction')
      if (pendingExtraction) {
        console.log('🔄 Processing pending manual extraction after login')
        const extractionData = JSON.parse(pendingExtraction)
        localStorage.removeItem('pendingExtraction')
        handleManualExtraction(extractionData)
      }

      console.log('✅ Authentication successful!')
    } catch (error) {
      console.error('❌ Auth callback error:', error)
      setIsLoading(false)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Authentication failed: ${errorMessage}\n\nPlease try again.`)
    }
  }

  const loadData = async () => {
    try {
      if (!window.electronAPI) {
        console.error('❌ electronAPI not available!')
        setIsLoading(false)
        return
      }

      console.log('📥 Loading data from Electron...')
      const data = await window.electronAPI.getExtractedData()
      console.log('✅ Data loaded:', data?.length || 0, 'items')
      setExtractedData(data || [])
    } catch (error) {
      console.error('❌ Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginClick = () => {
    // Generate challenge for PKCE-like flow
    const challenge = crypto.randomUUID()
    const state = crypto.randomUUID()

    // Store challenge and state for verification
    localStorage.setItem('authChallenge', challenge)
    localStorage.setItem('authState', state)

    // Open web browser for authentication
    const authUrl = `${webAppUrl}/auth/desktop?state=${state}&challenge=${challenge}&client_id=desktop-app`

    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(authUrl)
    } else {
      window.open(authUrl, '_blank')
    }
  }

  const handleLogout = () => {
    console.log('👋 Logging out...')
    localStorage.removeItem('authData')
    localStorage.removeItem('authChallenge')
    localStorage.removeItem('authState')
    setUser(null)
    setIsAuthenticated(false)
  }

  const handleAICollectionCallback = async (collectionData: any) => {
    console.log('🤖 Processing AI collection callback...', collectionData)

    // Check if user is authenticated
    const authData = localStorage.getItem('authData')

    if (!authData) {
      console.log('❌ Not authenticated, storing collection data and redirecting to login')
      // Store collection data for after login
      localStorage.setItem('pendingCollection', JSON.stringify(collectionData))
      setIsAuthenticated(false)
      setIsLoading(false)
      return
    }

    // User is authenticated, proceed with collection
    await processAICollection(collectionData)
  }

  const handleManualExtraction = (data: any) => {
    console.log('🎯 Processing manual extraction...', data)

    // Check if user is authenticated
    const authData = localStorage.getItem('authData')

    if (!authData) {
      console.log('❌ Not authenticated, storing extraction data and redirecting to login')
      // Store extraction data for after login
      localStorage.setItem('pendingExtraction', JSON.stringify(data))
      setIsAuthenticated(false)
      setIsLoading(false)
      return
    }

    // Set collection context for pure manual collection (no AI data)
    setCollectionContext({
      restaurantId: data.restaurantId,
      restaurantName: data.restaurantName || 'Unknown Restaurant',
      collectionId: data.collectionId,
      collectionName: data.collectionName || '',
      quarterId: data.quarterId,
      quarterName: data.quarterName || '',
      sourceId: data.sourceId,
      sourceUrl: data.url,
      hasAIData: false, // This is pure manual collection
    })

    // Set mode to manual
    setCurrentMode('manual')

    // User is authenticated, open the URL directly
    console.log('🌐 Opening source URL:', data.url)

    // Dispatch event to MainLayout to load the URL
    window.dispatchEvent(new CustomEvent('open-source-url', {
      detail: data.url
    }))

    // Show notification
    alert(`✅ Manual Collection Started!\n\nSource URL opened in webview.\nYou can now extract data manually.`)
  }

  const processViewAIMenu = async (viewData: any) => {
    console.log('👁️ Processing view AI menu request...', viewData)

    // Check if user is authenticated
    const authData = localStorage.getItem('authData')

    if (!authData) {
      console.log('❌ Not authenticated, storing view data and redirecting to login')
      // Store view data for after login
      localStorage.setItem('pendingViewAIMenu', JSON.stringify(viewData))
      // Redirect to login
      handleLogin()
      return
    }

    // User is authenticated, fetch AI menu items
    try {
      console.log('📥 Fetching AI-collected menu items from API...')

      // Get auth token
      const sessionToken = JSON.parse(authData).sessionToken

      // Log the exact IDs we're using
      console.log('🔍 Desktop App Query IDs:', {
        restaurant_id: viewData.restaurantId,
        source_id: viewData.sourceId,
        collection_id: viewData.collectionId,
      })

      const queryParams = new URLSearchParams({
        restaurant_id: viewData.restaurantId,
        source_id: viewData.sourceId,
        ...(viewData.collectionId && { collection_id: viewData.collectionId }),
      })

      const apiUrl = `${webAppUrl}${viewData.apiEndpoint}?${queryParams}`
      console.log('🌐 Fetching from URL:', apiUrl)
      console.log('🔑 Auth token:', sessionToken ? `${sessionToken.substring(0, 20)}...` : 'NO TOKEN')

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('API Error Response:', text)
        throw new Error(`API returned status: ${response.status} - ${text.substring(0, 100)}`)
      }

      const responseText = await response.text()
      console.log('Raw API Response:', responseText.substring(0, 200))

      let menuData
      try {
        menuData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError)
        console.error('Response was:', responseText)
        throw new Error('Invalid JSON response from API')
      }
      console.log('✅ AI menu items received:', menuData)

      // Store collection context
      setCollectionContext({
        restaurantId: viewData.restaurantId,
        restaurantName: viewData.restaurantName || menuData.restaurant?.name || '',
        collectionId: viewData.collectionId || '',
        collectionName: '',
        quarterId: '',
        quarterName: '',
        sourceId: viewData.sourceId,
        sourceUrl: '',
        hasAIData: true,
      })

      // Convert grouped items to flat array
      const allItems = []
      for (const [header, items] of Object.entries(menuData.items || {})) {
        for (const item of items as any[]) {
          allItems.push({
            ...item,
            menuHeaderName: header,
          })
        }
      }

      // Format items for display
      const formattedItems = allItems.map((item: any, index: number) => ({
        id: index + 1,
        _id: item._id,
        title: item.name || '',
        description: item.description || '',
        image: '',
        price: item.price?.toString() || '0',
        category: item.menuHeaderName || '',
        url: '',
        timestamp: item.collected_at || new Date().toISOString(),
        verified: false,
        collectionId: viewData.collectionId || '',
        quarterId: '',
      }))

      addExtractedItems(formattedItems)
      setCurrentMode('verification')

      console.log('✅ View AI menu completed, showing', formattedItems.length, 'items')

    } catch (error: any) {
      console.error('❌ Error fetching AI menu items:', error)
      console.error('❌ Error details:', {
        message: error.message,
        restaurant_id: viewData.restaurantId,
        source_id: viewData.sourceId,
        collection_id: viewData.collectionId,
        apiEndpoint: viewData.apiEndpoint,
      })
      alert(`Failed to fetch AI menu items: ${error.message}\n\nCheck console for details.`)
    }
  }

  const processAICollection = async (collectionData: any) => {
    try {
      console.log('📥 Fetching AI-extracted menu items from API...')

      // Store collection context for later use
      localStorage.setItem('currentCollection', JSON.stringify(collectionData))

      // Set collection context in store
      setCollectionContext({
        restaurantId: collectionData.restaurantId,
        restaurantName: collectionData.restaurantName,
        collectionId: collectionData.collectionId,
        collectionName: collectionData.collectionName || '',
        quarterId: collectionData.quarterId,
        quarterName: collectionData.quarterName || '',
        sourceId: collectionData.sourceId,
        sourceUrl: collectionData.sourceUrl,
        hasAIData: true, // This is AI collection, so we have AI data
      })

      // Set mode to verification since we have AI data
      setCurrentMode('verification')

      let menuItems = []

      try {
        // Get auth token
        const authData = localStorage.getItem('authData')
        const sessionToken = authData ? JSON.parse(authData).sessionToken : null

        const response = await fetch(
          `${webAppUrl}/api/menu-items/ai?restaurantId=${collectionData.restaurantId}&sourceId=${collectionData.sourceId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
            },
          }
        )

        if (response.ok) {
          const menuData = await response.json()
          menuItems = menuData.items || []
          console.log('✅ AI menu items received from API:', menuItems.length)
        } else {
          throw new Error(`API returned status: ${response.status}`)
        }
      } catch (apiError) {
        console.warn('⚠️ API fetch failed, using local mock data:', apiError)

        // Generate local mock data for manual QC
        menuItems = generateMockMenuItems(
          collectionData.restaurantId,
          collectionData.sourceId,
          collectionData.restaurantName
        )
        console.log('✅ Generated local mock data:', menuItems.length, 'items')
      }

      // Convert AI menu items to ExtractedItem format
      const formattedItems = menuItems.map((item: any, index: number) => ({
        id: index + 1,
        _id: item._id,
        title: item.name || '',
        description: item.description || '',
        image: '',
        price: item.price?.toString() || '0',
        category: item.menuHeaderName || item.masterHeaderName || '',
        url: collectionData.sourceUrl || '',
        timestamp: item.createdAt || new Date().toISOString(),
        verified: false,
        collectionId: item.collectionId,
        quarterId: item.quarterId,
        sourceId: item.sourceId,
        currency: item.currency || 'USD',
        masterHeaderId: item.masterHeaderId,
        masterHeaderName: item.masterHeaderName,
        menuHeaderName: item.menuHeaderName,
        isManual: false, // These are AI items
        aiItemId: item._id, // Store the AI item ID
      }))

      // Store menu items in extraction store
      setExtractedData(formattedItems)

      // Open the source URL in the app silently (no alert)
      console.log('🌐 Opening source URL for verification:', collectionData.sourceUrl)

      // Dispatch event to MainLayout to load the source URL in webview
      window.dispatchEvent(new CustomEvent('open-source-url', {
        detail: collectionData.sourceUrl
      }))

    } catch (error) {
      console.error('❌ Error processing AI collection:', error)
      alert(`❌ Failed to load collection data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generate mock menu items locally
  const generateMockMenuItems = (restaurantId: string, sourceId: string, _restaurantName: string) => {
    const mockItems = [
      { name: 'Classic Burger', category: 'Burgers', price: '$12.99', description: 'Juicy beef patty with lettuce, tomato, and cheese' },
      { name: 'Caesar Salad', category: 'Salads', price: '$9.99', description: 'Fresh romaine with parmesan and croutons' },
      { name: 'Margherita Pizza', category: 'Pizza', price: '$14.99', description: 'Fresh mozzarella, basil, and tomato sauce' },
      { name: 'Grilled Chicken', category: 'Mains', price: '$16.99', description: 'Herb-marinated grilled chicken breast' },
      { name: 'Pasta Carbonara', category: 'Pasta', price: '$13.99', description: 'Creamy pasta with bacon and parmesan' },
      { name: 'Fish & Chips', category: 'Seafood', price: '$15.99', description: 'Crispy battered fish with golden fries' },
      { name: 'Chocolate Cake', category: 'Desserts', price: '$7.99', description: 'Rich chocolate layer cake' },
      { name: 'Ice Cream Sundae', category: 'Desserts', price: '$6.99', description: 'Vanilla ice cream with toppings' },
      { name: 'Steak Frites', category: 'Mains', price: '$24.99', description: 'Grilled ribeye with french fries' },
      { name: 'Veggie Wrap', category: 'Appetizers', price: '$10.99', description: 'Fresh vegetables in a whole wheat wrap' },
      { name: 'Chicken Wings', category: 'Appetizers', price: '$11.99', description: 'Spicy buffalo wings with ranch' },
      { name: 'Greek Salad', category: 'Salads', price: '$10.99', description: 'Feta cheese, olives, and fresh vegetables' },
      { name: 'Pepperoni Pizza', category: 'Pizza', price: '$16.99', description: 'Classic pepperoni with mozzarella' },
      { name: 'Shrimp Scampi', category: 'Seafood', price: '$18.99', description: 'Garlic butter shrimp over linguine' },
      { name: 'Tiramisu', category: 'Desserts', price: '$8.99', description: 'Italian coffee-flavored dessert' },
    ]

    return mockItems.map((item, index) => ({
      _id: `mock-${index + 1}`,
      ...item,
      restaurantId,
      sourceId,
      extractedAt: new Date().toISOString(),
      status: 'needs-qc',
      source: 'mock-data',
      notes: 'Generated for manual QC - AI extraction pending',
    }))
  }

  // Check for pending collection after successful auth
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const pendingCollection = localStorage.getItem('pendingCollection')
      if (pendingCollection) {
        console.log('🔄 Processing pending collection after auth')
        const collectionData = JSON.parse(pendingCollection)
        localStorage.removeItem('pendingCollection')
        processAICollection(collectionData)
      }
    }
  }, [isAuthenticated, isLoading])

  console.log('📊 App state:', { isLoading, isAuthenticated })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-background">
        <div className="text-center">
          <div className="h-12 w-12 rounded-lg mx-auto mb-4 gradient-primary animate-pulse" />
          <p className="text-foreground text-lg font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-background">
        <div className="max-w-md w-full p-8 text-center">
          <div className="mb-8">
            <div
              className="inline-flex items-center justify-center rounded-2xl mb-4"
            >
              <img src="assets/full-logo.png" alt="Collector Desktop" />
            </div>
          </div>
          <Button
            onClick={handleLoginClick}
            size="lg"
            className="w-full text-white text-lg py-6 gradient-primary hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Sign in with Web Browser
          </Button>

          <div className="mt-6 p-4 rounded-lg text-sm bg-muted text-muted-foreground">
            <p>
              Clicking this button will open your web browser where you can sign in securely.
              After signing in, you'll be redirected back to this app automatically.
            </p>
          </div>
        </div>
      </div>
    )
  }

  console.log('🏠 Rendering MainLayout')
  return <MainLayout onLogout={handleLogout} user={user} />
}

export default App
