export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function apiUrl(path: string) {
  // Remove trailing slash from base URL and leading slash from path
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  
  // Only add slash if path is not empty
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
}