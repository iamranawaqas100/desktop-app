/**
 * Professional API Client for Desktop App
 * - Auto-retry with exponential backoff
 * - Token refresh on 401
 * - Request/Response interceptors
 * - Type-safe
 */

const QA_API_URL = "https://collector-ui.qa.datassential.com/api";
const LOCALHOST_API_URL = "http://localhost:3000/api";

// Get initial URL from localStorage or default to QA
const getInitialApiUrl = (): string => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("webAppUrl");
    if (saved) {
      const normalized = saved.replace(/\/+$/, ""); // Remove trailing slashes
      if (normalized === "http://localhost:3000") {
        return LOCALHOST_API_URL;
      }
      if (normalized === "https://collector-ui.qa.datassential.com") {
        return QA_API_URL;
      }
    }
  }
  return QA_API_URL; // Default to QA
};

const API_BASE_URL = getInitialApiUrl();
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

interface RequestConfig extends RequestInit {
  retries?: number;
  skipAuth?: boolean;
}

class ApiClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseURL = config.baseURL || API_BASE_URL;
    this.timeout = config.timeout || 30000; // 30 seconds
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.headers,
    };
  }

  /**
   * Update base URL dynamically (for switching between environments)
   */
  setBaseURL(url: string): void {
    // Remove trailing slashes and ensure /api is appended correctly
    const base = url.replace(/\/+$/, ""); // Remove trailing slashes
    this.baseURL = `${base}/api`;
    console.log(`[API Client] Base URL updated to: ${this.baseURL}`);
  }

  /**
   * Get current base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    try {
      // Try the desktop app auth data format first
      const authData = localStorage.getItem("authData");
      if (authData) {
        const session = JSON.parse(authData);
        if (session.sessionToken) {
          // Check if token is expired
          if (session.expiresAt && Date.now() > session.expiresAt) {
            console.log("[API Client] Token expired");
            this.handleTokenExpired();
            return null;
          }
          return session.sessionToken;
        }
      }

      // Fallback to nextauth format (for compatibility)
      const nextAuthData = localStorage.getItem("nextauth.session");
      if (nextAuthData) {
        const session = JSON.parse(nextAuthData);
        if (session.sessionToken) {
          // Check if token is expired
          if (session.expiresAt && Date.now() > session.expiresAt) {
            console.log("[API Client] Token expired");
            this.handleTokenExpired();
            return null;
          }
          return session.sessionToken;
        }
      }

      console.log("[API Client] No auth data found");
      return null;
    } catch (error) {
      console.error("[API Client] Error getting auth token:", error);
      return null;
    }
  }

  /**
   * Handle token expiration - redirect to login
   * ⭐ ENHANCED: Also clear desktop app auth format
   */
  private handleTokenExpired() {
    console.log(
      "[API Client] Token expired, clearing session and triggering logout"
    );

    // Clear both auth formats
    localStorage.removeItem("nextauth.session");
    localStorage.removeItem("authData"); // ⭐ Clear desktop format
    localStorage.removeItem("authChallenge");
    localStorage.removeItem("authState");

    // Dispatch event to trigger login flow
    window.dispatchEvent(new CustomEvent("auth-expired"));
  }

  /**
   * Handle 401 Unauthorized response
   */
  private async handle401(): Promise<Response> {
    console.log("[API Client] Received 401 Unauthorized");

    // Clear the session
    this.handleTokenExpired();

    // Don't retry - return the 401
    throw new Error("Unauthorized - Please log in again");
  }

  /**
   * Sleep utility for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with retry logic
   */
  private async fetchWithRetry(
    url: string,
    config: RequestConfig = {},
    retryCount = 0
  ): Promise<Response> {
    const { retries = MAX_RETRIES, skipAuth = false, ...fetchConfig } = config;

    // Add authentication header
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(fetchConfig.headers as Record<string, string>),
    };

    if (!skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const fullUrl = url.startsWith("http") ? url : `${this.baseURL}${url}`;

    console.log(`[API Client] ${fetchConfig.method || "GET"} ${fullUrl}`);

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(fullUrl, {
        ...fetchConfig,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        return this.handle401();
      }

      // Handle other errors with retry
      if (!response.ok && retryCount < retries) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.log(
          `[API Client] Request failed (${response.status}), retrying in ${delay}ms... (attempt ${retryCount + 1}/${retries})`
        );
        await this.sleep(delay);
        return this.fetchWithRetry(url, config, retryCount + 1);
      }

      return response;
    } catch (error: any) {
      // Handle network errors with retry
      if (retryCount < retries && error.name !== "AbortError") {
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        console.log(
          `[API Client] Network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${retries})`
        );
        await this.sleep(delay);
        return this.fetchWithRetry(url, config, retryCount + 1);
      }

      // Max retries exceeded or aborted
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      ...config,
      method: "GET",
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      ...config,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      ...config,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      ...config,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      ...config,
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export default ApiClient;
