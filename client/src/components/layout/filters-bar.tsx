import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Map, SlidersHorizontal } from "lucide-react";

interface FiltersBarProps {
  onFilterChange?: (filters: any) => void;
  onMapToggle?: () => void;
  showMap?: boolean;
}

export default function FiltersBar({ onFilterChange, onMapToggle, showMap = false }: FiltersBarProps) {
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [filters, setFilters] = useState({
    displayTotal: false,
    season: "",
    huntingType: [],
  });
  
  const handlePriceChange = (value: number[]) => {
    setPriceRange(value);
    if (onFilterChange) {
      onFilterChange({ ...filters, priceRange: value });
    }
  };
  
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };
  
  const huntingTypes = [
    "Deer", "Elk", "Turkey", "Bird", "Waterfowl", "Bear", "Boar"
  ];
  
  const seasons = [
    "Spring", "Summer", "Fall", "Winter"
  ];
  
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  <span>Filters</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search with these filters.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Price range</h3>
                    <div className="space-y-4">
                      <Slider
                        defaultValue={priceRange}
                        max={1000}
                        step={10}
                        onValueChange={handlePriceChange}
                      />
                      <div className="flex justify-between">
                        <span>${priceRange[0]}</span>
                        <span>${priceRange[1]}+</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Hunting Type</h3>
                    <div className="space-y-2">
                      {huntingTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`hunting-type-${type}`} 
                            onCheckedChange={(checked) => {
                              const selectedTypes = [...filters.huntingType];
                              if (checked) {
                                selectedTypes.push(type);
                              } else {
                                const index = selectedTypes.indexOf(type);
                                if (index > -1) {
                                  selectedTypes.splice(index, 1);
                                }
                              }
                              handleFilterChange('huntingType', selectedTypes);
                            }}
                          />
                          <Label htmlFor={`hunting-type-${type}`}>{type}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Season</h3>
                    <div className="space-y-2">
                      {seasons.map((season) => (
                        <div key={season} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`season-${season}`} 
                            checked={filters.season === season}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleFilterChange('season', season);
                              } else {
                                handleFilterChange('season', '');
                              }
                            }}
                          />
                          <Label htmlFor={`season-${season}`}>{season}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Display total</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="display-total"
                    checked={filters.displayTotal}
                    onCheckedChange={(checked) => {
                      handleFilterChange('displayTotal', !!checked);
                    }}
                  />
                  <Label htmlFor="display-total">Show price with taxes</Label>
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Season: {filters.season || "Any"}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  {seasons.map((season) => (
                    <div key={season} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`season-popup-${season}`} 
                        checked={filters.season === season}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleFilterChange('season', season);
                          } else {
                            handleFilterChange('season', '');
                          }
                        }}
                      />
                      <Label htmlFor={`season-popup-${season}`}>{season}</Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Hunting Type</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  {huntingTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`hunting-type-popup-${type}`} 
                        checked={filters.huntingType.includes(type)}
                        onCheckedChange={(checked) => {
                          const selectedTypes = [...filters.huntingType];
                          if (checked) {
                            selectedTypes.push(type);
                          } else {
                            const index = selectedTypes.indexOf(type);
                            if (index > -1) {
                              selectedTypes.splice(index, 1);
                            }
                          }
                          handleFilterChange('huntingType', selectedTypes);
                        }}
                      />
                      <Label htmlFor={`hunting-type-popup-${type}`}>{type}</Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Price</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Price range per night</h3>
                  <Slider
                    defaultValue={priceRange}
                    max={1000}
                    step={10}
                    onValueChange={handlePriceChange}
                  />
                  <div className="flex justify-between">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}+</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={onMapToggle} 
            className="px-4 py-2 text-sm font-medium flex items-center text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            <span>{showMap ? "Hide map" : "Show map"}</span>
            <Map className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
