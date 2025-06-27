import { useState, useEffect, useCallback } from 'react';

// Global cache for avatar URLs and their blob URLs
const avatarCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string>>();

export const useAvatar = (avatarUrl: string | undefined) => {
  const [blobUrl, setBlobUrl] = useState<string | undefined>(() => {
    // Initialize with cached value if available
    return avatarUrl ? avatarCache.get(avatarUrl) : undefined;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadAvatar = useCallback(async (url: string): Promise<string> => {
    // Check if we already have a cached blob URL
    const cached = avatarCache.get(url);
    if (cached) {
      return cached;
    }

    // Check if we're already loading this URL
    const existingPromise = loadingPromises.get(url);
    if (existingPromise) {
      return existingPromise;
    }

    // Create a new loading promise
    const loadPromise = fetch(url)
      .then(response => {
        if (!response.ok) throw new Error('Failed to load image');
        return response.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        avatarCache.set(url, blobUrl);
        loadingPromises.delete(url);
        return blobUrl;
      })
      .catch(err => {
        loadingPromises.delete(url);
        throw err;
      });

    loadingPromises.set(url, loadPromise);
    return loadPromise;
  }, []);

  useEffect(() => {
    if (!avatarUrl) {
      setBlobUrl(undefined);
      setError(false);
      return;
    }

    setIsLoading(true);
    setError(false);

    loadAvatar(avatarUrl)
      .then(url => {
        setBlobUrl(url);
        setIsLoading(false);
      })
      .catch(() => {
        setError(true);
        setIsLoading(false);
      });
  }, [avatarUrl, loadAvatar]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Don't revoke blob URLs on unmount as they might be used elsewhere
      // Instead, we could implement a reference counting system if needed
    };
  }, []);

  return { blobUrl, isLoading, error };
};

// Clear cache for a specific URL (use when avatar is updated)
export const invalidateAvatarCache = (url: string) => {
  const blobUrl = avatarCache.get(url);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    avatarCache.delete(url);
  }
  loadingPromises.delete(url);
};

// Clear all old URLs except the new one (use after avatar update)
export const clearOldAvatarCache = (keepUrl?: string) => {
  avatarCache.forEach((blobUrl, url) => {
    if (url !== keepUrl) {
      URL.revokeObjectURL(blobUrl);
      avatarCache.delete(url);
    }
  });
  
  loadingPromises.forEach((_, url) => {
    if (url !== keepUrl) {
      loadingPromises.delete(url);
    }
  });
};

// Utility to preload avatars
export const preloadAvatar = async (url: string) => {
  if (!url || avatarCache.has(url)) return;
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      avatarCache.set(url, blobUrl);
    }
  } catch (error) {
    console.error('Failed to preload avatar:', error);
  }
};

// Cleanup function to revoke all blob URLs (call on app unmount if needed)
export const cleanupAvatarCache = () => {
  avatarCache.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
  avatarCache.clear();
  loadingPromises.clear();
};