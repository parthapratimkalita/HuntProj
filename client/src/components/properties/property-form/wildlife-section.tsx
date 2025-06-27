// FIXED: wildlife-section.tsx - Fixed species value preservation

import { 
  WildlifeInfo, 
  populationDensityOptions,
  wildlifeSpeciesList
} from "./property-form-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Info, Target } from "lucide-react";

interface WildlifeSectionProps {
  wildlifeInfo: WildlifeInfo[];
  onUpdateWildlife: (index: number, field: keyof WildlifeInfo, value: any) => void;
  onAddWildlife: () => void;
  onRemoveWildlife: (index: number) => void;
}

export default function WildlifeSection({
  wildlifeInfo,
  onUpdateWildlife,
  onAddWildlife,
  onRemoveWildlife,
}: WildlifeSectionProps) {
  
  // FIXED: Helper function to safely get species value
  const getSpeciesValue = (wildlife: WildlifeInfo): string => {
    // Handle both direct species string and any nested structure
    if (typeof wildlife.species === 'string') {
      return wildlife.species;
    }
    return "";
  };

  // FIXED: Helper function to safely get population density value
  const getPopulationDensityValue = (wildlife: WildlifeInfo): string => {
    if (typeof wildlife.populationDensity === 'string' && wildlife.populationDensity) {
      return wildlife.populationDensity;
    }
    return "moderate"; // Default value
  };

  // FIXED: Helper function to get species display name
  const getSpeciesDisplayName = (speciesId: string): string => {
    if (!speciesId) return "";
    const species = wildlifeSpeciesList.find(s => s.id === speciesId);
    return species ? species.name : speciesId;
  };

  // FIXED: Debug logging to track species values
  console.log('WildlifeSection rendered with data:', wildlifeInfo.map((w, i) => ({
    index: i,
    species: w.species,
    speciesType: typeof w.species,
    populationDensity: w.populationDensity,
    estimatedPopulation: w.estimatedPopulation
  })));
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-base font-medium flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Wildlife & Game Information
          </h4>
          <p className="text-sm text-gray-600">Specify what animals and birds hunters can expect to find</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddWildlife}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Species
        </Button>
      </div>
      
      <div className="space-y-4">
        {wildlifeInfo.map((wildlife, index) => {
          // FIXED: Get current values safely with proper type handling
          const currentSpecies = getSpeciesValue(wildlife);
          const currentDensity = getPopulationDensityValue(wildlife);
          const currentPopulation = typeof wildlife.estimatedPopulation === 'number' 
            ? wildlife.estimatedPopulation 
            : parseInt(wildlife.estimatedPopulation as any) || 0;
          const currentSeasonInfo = wildlife.seasonInfo || "";

          // FIXED: Get species display name
          const speciesDisplayName = getSpeciesDisplayName(currentSpecies);

          return (
            <Card key={`wildlife-${index}`} className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    Wildlife Species {index + 1}
                    {speciesDisplayName && (
                      <span className="text-xs text-gray-500 font-normal">
                        - {speciesDisplayName}
                      </span>
                    )}
                  </CardTitle>
                  {wildlifeInfo.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveWildlife(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Species/Animal *</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={currentSpecies} // FIXED: Use safe getter
                      onChange={(e) => {
                        console.log(`Updating wildlife ${index} species from "${currentSpecies}" to "${e.target.value}"`);
                        onUpdateWildlife(index, 'species', e.target.value);
                      }}
                      required
                    >
                      <option value="">Select species</option>
                      {wildlifeSpeciesList.map(species => (
                        <option key={species.id} value={species.id}>
                          {species.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Population Density *</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={currentDensity} // FIXED: Use safe getter
                      onChange={(e) => {
                        console.log(`Updating wildlife ${index} density from "${currentDensity}" to "${e.target.value}"`);
                        onUpdateWildlife(index, 'populationDensity', e.target.value);
                      }}
                      required
                    >
                      <option value="">Select density</option>
                      {populationDensityOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name} - {option.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Estimated Population *</label>
                    <Input 
                      type="number"
                      placeholder="e.g. 75"
                      value={currentPopulation || ""} // FIXED: Handle zero values properly
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0;
                        console.log(`Updating wildlife ${index} population from "${currentPopulation}" to "${newValue}"`);
                        onUpdateWildlife(index, 'estimatedPopulation', newValue);
                      }}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the estimated number of this species on the property
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Season Information (optional)</label>
                    <Input 
                      placeholder="e.g. Best in fall, Year-round, Nov-Jan"
                      value={currentSeasonInfo} // FIXED: Use safe getter
                      onChange={(e) => {
                        console.log(`Updating wildlife ${index} seasonInfo from "${currentSeasonInfo}" to "${e.target.value}"`);
                        onUpdateWildlife(index, 'seasonInfo', e.target.value);
                      }}
                    />
                  </div>
                </div>
                
                {/* Population density indicator */}
                {currentDensity && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full ${
                        currentDensity === 'abundant' ? 'bg-green-500' :
                        currentDensity === 'common' ? 'bg-blue-500' :
                        currentDensity === 'moderate' ? 'bg-yellow-500' :
                        currentDensity === 'limited' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}></div>
                      <span className="font-medium">
                        {populationDensityOptions.find(opt => opt.id === currentDensity)?.name}
                      </span>
                      <span className="text-gray-600">
                        - {populationDensityOptions.find(opt => opt.id === currentDensity)?.description}
                      </span>
                    </div>
                  </div>
                )}

                {/* FIXED: Debug information in development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Debug Wildlife {index}:</strong> 
                    <div>species="{currentSpecies}" (type: {typeof wildlife.species})</div>
                    <div>density="{currentDensity}"</div>
                    <div>population={currentPopulation}</div>
                    <div>Raw data: {JSON.stringify(wildlife, null, 2)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Helper information */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Wildlife Information Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Be honest about population estimates - it builds trust with hunters</li>
              <li>Select specific species from the dropdown for consistency</li>
              <li>Mention trophy potential and average sizes in population numbers</li>
              <li>Specify best hunting seasons and times of day</li>
              <li>This information helps hunters set realistic expectations</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Quick population guide */}
      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
        <div className="text-sm text-green-800">
          <p className="font-medium mb-2">Population Density Guide:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span><strong>Abundant:</strong> Multiple sightings daily</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span><strong>Common:</strong> Daily sightings likely</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span><strong>Moderate:</strong> Regular opportunities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span><strong>Limited:</strong> Patience required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span><strong>Rare:</strong> Trophy hunting only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}