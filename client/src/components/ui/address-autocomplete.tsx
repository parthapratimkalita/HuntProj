import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useAddressAutocomplete, type AddressSuggestion, type ParsedAddress } from "@/hooks/use-address-autocomplete";
import { MapPin, Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: ParsedAddress) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter address...",
  disabled = false,
  className,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { suggestions, isLoading, error, searchAddresses, parseAddress, clearSuggestions } = useAddressAutocomplete();

  // Handle input changes and trigger search
  useEffect(() => {
    if (searchQuery !== value) {
      setSearchQuery(value);
    }
  }, [value]);

  useEffect(() => {
    if (searchQuery.length >= 3) {
      searchAddresses(searchQuery);
      setIsOpen(true);
    } else {
      clearSuggestions();
      setIsOpen(false);
    }
  }, [searchQuery, searchAddresses, clearSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const parsedAddress = parseAddress(suggestion);
    
    // Update the input value
    setSearchQuery(suggestion.display_name);
    onChange(suggestion.display_name);
    
    // Notify parent component
    onAddressSelect(parsedAddress);
    
    // Close dropdown
    setIsOpen(false);
    clearSuggestions();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Dropdown with suggestions */}
      {isOpen && (suggestions.length > 0 || error) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {error && (
            <div className="px-3 py-2 text-sm text-red-600 border-b border-gray-100">
              {error}
            </div>
          )}
          
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.display_name}
                  </div>
                  {suggestion.address && (
                    <div className="text-xs text-gray-500 mt-1">
                      {[
                        suggestion.address.city || suggestion.address.town || suggestion.address.village,
                        suggestion.address.state,
                        suggestion.address.postcode
                      ].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          
          {suggestions.length === 0 && !error && !isLoading && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No addresses found
            </div>
          )}
        </div>
      )}

      {/* Help text */}
      {!isOpen && searchQuery.length > 0 && searchQuery.length < 3 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="px-3 py-2 text-xs text-gray-500">
            Type at least 3 characters to search for addresses
          </div>
        </div>
      )}
    </div>
  );
}