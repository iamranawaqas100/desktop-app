import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Join URL parts properly, avoiding double slashes
 * @param baseUrl - Base URL (e.g., "https://example.com" or "https://example.com/")
 * @param path - Path to append (e.g., "/api/auth" or "api/auth")
 * @returns Properly joined URL
 */
export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, ""); // Remove trailing slashes
  const cleanPath = path.startsWith("/") ? path : `/${path}`; // Ensure path starts with /
  return `${base}${cleanPath}`;
}
