import { useState, useCallback } from 'react';

export interface ReverseGeocodingResult {
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
  display_name: string;
}

export interface ParsedReverseAddress {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  fullAddress: string;
}

export const useReverseGeocoding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number): Promise<ParsedReverseAddress | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 300));

      // Try direct API first, then fallback to CORS proxy
      let response;
      let url = `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&` +
        `lat=${latitude}&` +
        `lon=${longitude}&` +
        `addressdetails=1&` +
        `zoom=18`;

      console.log('Reverse geocoding URL:', url);

      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'PropertyApp/1.0 (hunting-property-application)',
          },
        });
      } catch (corsError) {
        console.log('Direct API failed, trying CORS proxy:', corsError);
        
        // Fallback to CORS proxy
        url = `https://api.allorigins.win/get?url=${encodeURIComponent(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`
        )}`;
        
        console.log('CORS proxy URL:', url);
        
        const proxyResponse = await fetch(url);
        
        if (!proxyResponse.ok) {
          throw new Error(`Proxy API Error: ${proxyResponse.status}`);
        }
        
        const proxyData = await proxyResponse.json();
        const data = JSON.parse(proxyData.contents);
        
        console.log('Reverse geocoding data (via proxy):', data);
        
        if (!data || !data.address) {
          throw new Error('No address found for these coordinates');
        }

        return parseReverseGeocodingResult(data);
      }

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data: ReverseGeocodingResult = await response.json();
      console.log('Reverse geocoding data:', data);
      
      if (!data || !data.address) {
        throw new Error('No address found for these coordinates');
      }

      return parseReverseGeocodingResult(data);
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const parseReverseGeocodingResult = useCallback((result: ReverseGeocodingResult): ParsedReverseAddress => {
    const addr = result.address;
    
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
      fullAddress: result.display_name,
    };
  }, []);

  const validateCoordinates = useCallback((lat: string, lng: string): { isValid: boolean; error?: string } => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return { isValid: false, error: 'Coordinates must be valid numbers' };
    }

    if (latitude < -90 || latitude > 90) {
      return { isValid: false, error: 'Latitude must be between -90 and 90' };
    }

    if (longitude < -180 || longitude > 180) {
      return { isValid: false, error: 'Longitude must be between -180 and 180' };
    }

    return { isValid: true };
  }, []);

  return {
    isLoading,
    error,
    reverseGeocode,
    validateCoordinates,
  };
};