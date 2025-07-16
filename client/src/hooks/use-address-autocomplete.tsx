import { useState, useCallback } from 'react';

export interface AddressSuggestion {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  lat: string;
  lon: string;
  place_id: string;
}

export interface ParsedAddress {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: string;
  longitude: string;
}

export const useAddressAutocomplete = () => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAddresses = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 300));

      // Try direct API first, then fallback to CORS proxy
      let response;
      const directUrl = `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(query)}&` +
        `limit=5&` +
        `addressdetails=1&` +
        `dedupe=1`;

      try {
        response = await fetch(directUrl, {
          headers: {
            'User-Agent': 'PropertyApp/1.0 (hunting-property-application)',
          },
        });
      } catch (corsError) {
        console.log('Direct API failed, trying CORS proxy for search:', corsError);
        
        // Fallback to CORS proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`;
        const proxyResponse = await fetch(proxyUrl);
        
        if (!proxyResponse.ok) {
          throw new Error('Failed to fetch address suggestions via proxy');
        }
        
        const proxyData = await proxyResponse.json();
        const data = JSON.parse(proxyData.contents);
        setSuggestions(data);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch address suggestions');
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const parseAddress = useCallback((suggestion: AddressSuggestion): ParsedAddress => {
    const addr = suggestion.address;
    
    // Build street address
    const streetParts = [];
    if (addr.house_number) streetParts.push(addr.house_number);
    if (addr.road) streetParts.push(addr.road);
    const streetAddress = streetParts.join(' ') || '';

    // Get city (try different fields - more comprehensive for rural areas)
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.suburb || '';

    // Get state
    const state = addr.state || '';

    // Get zip code
    const zipCode = addr.postcode || '';

    // Get country
    const country = addr.country || '';

    return {
      address: streetAddress,
      city,
      state,
      zipCode,
      country,
      latitude: suggestion.lat,
      longitude: suggestion.lon,
    };
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    searchAddresses,
    parseAddress,
    clearSuggestions,
  };
};