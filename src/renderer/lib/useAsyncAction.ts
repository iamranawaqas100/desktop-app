import { useState } from "react"

/**
 * Hook for managing loading/submitting states with error handling
 * Provides consistent UX across all forms and actions
 */
export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async <T,>(
    action: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void
      onError?: (error: Error) => void
      successMessage?: string
      errorMessage?: string
    }
  ): Promise<T | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await action()
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(options?.errorMessage || errorMessage)
      options?.onError?.(err as Error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setIsLoading(false)
    setError(null)
  }

  return {
    isLoading,
    error,
    execute,
    reset,
  }
}

/**
 * Hook for managing multiple async operations
 * Useful when you have multiple buttons/actions in a component
 */
export function useAsyncActions<T extends string>() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  const setLoading = (key: T, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }))
  }

  const setError = (key: T, error: string | null) => {
    setErrors((prev) => ({ ...prev, [key]: error }))
  }

  const execute = async <R,>(
    key: T,
    action: () => Promise<R>,
    options?: {
      onSuccess?: (result: R) => void
      onError?: (error: Error) => void
    }
  ): Promise<R | null> => {
    setLoading(key, true)
    setError(key, null)

    try {
      const result = await action()
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(key, errorMessage)
      options?.onError?.(err as Error)
      return null
    } finally {
      setLoading(key, false)
    }
  }

  const isLoading = (key: T) => loadingStates[key] || false
  const getError = (key: T) => errors[key] || null
  const isAnyLoading = Object.values(loadingStates).some((loading) => loading)

  const reset = (key?: T) => {
    if (key) {
      setLoading(key, false)
      setError(key, null)
    } else {
      setLoadingStates({})
      setErrors({})
    }
  }

  return {
    isLoading,
    getError,
    isAnyLoading,
    execute,
    reset,
  }
}

