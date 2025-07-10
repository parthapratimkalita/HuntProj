import { 
  WildlifeInfo, 
  wildlifeSpeciesList
} from "./property-form-schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
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
  
  // Helper function to safely get species value
  const getSpeciesValue = (wildlife: WildlifeInfo): string => {
    if (typeof wildlife.species === 'string') {
      return wildlife.species;
    }
    return "";
  };

  // Helper function to safely get population density value
  const getPopulationDensityValue = (wildlife: WildlifeInfo): number => {
    if (typeof wildlife.populationDensity === 'number') {
      return wildlife.populationDensity;
    }
    return 50; // Default value
  };

  // Helper function to get species display name
  const getSpeciesDisplayName = (speciesId: string): string => {
    if (!speciesId) return "";
    const species = wildlifeSpeciesList.find(s => s.id === speciesId);
    return species ? species.name : speciesId;
  };

  // Helper function to get density description based on value
  const getDensityDescription = (value: number): string => {
    if (value >= 80) return "Very High - Multiple sightings guaranteed";
    if (value >= 60) return "High - Daily sightings likely";
    if (value >= 40) return "Moderate - Regular opportunities";
    if (value >= 20) return "Low - Patience required";
    return "Very Low - Rare sightings";
  };

  // Helper function to get density color based on value
  const getDensityColor = (value: number): string => {
    if (value >= 80) return "bg-green-500";
    if (value >= 60) return "bg-blue-500";
    if (value >= 40) return "bg-yellow-500";
    if (value >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  // Debug logging
  console.log('WildlifeSection rendered with data:', wildlifeInfo.map((w, i) => ({
    index: i,
    species: w.species,
    populationDensity: w.populationDensity,
  })));
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-base font-medium flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Wildlife & Game Information
          </h4>
          <p className="text-sm text-gray-600">Specify what animals hunters can expect to find</p>
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
          const currentSpecies = getSpeciesValue(wildlife);
          const currentDensity = getPopulationDensityValue(wildlife);
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
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium">Species/Animal *</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={currentSpecies}
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
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">0% (Very Low)</span>
                        <span className="text-sm font-medium text-gray-900">{currentDensity}%</span>
                        <span className="text-sm text-gray-600">100% (Very High)</span>
                      </div>
                      <Slider
                        value={[currentDensity]}
                        onValueChange={(value) => {
                          console.log(`Updating wildlife ${index} density from "${currentDensity}" to "${value[0]}"`);
                          onUpdateWildlife(index, 'populationDensity', value[0]);
                        }}
                        max={100}
                        min={0}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-3 h-3 rounded-full ${getDensityColor(currentDensity)}`}></div>
                        <span className="font-medium text-gray-700">
                          {getDensityDescription(currentDensity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Debug information in development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Debug Wildlife {index}:</strong> 
                    <div>species="{currentSpecies}" (type: {typeof wildlife.species})</div>
                    <div>density={currentDensity}%</div>
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
            <p className="font-medium mb-1">Population Density Guidelines:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>80-100%:</strong> Very High - Multiple sightings guaranteed daily</li>
              <li><strong>60-79%:</strong> High - Daily sightings very likely</li>
              <li><strong>40-59%:</strong> Moderate - Regular hunting opportunities</li>
              <li><strong>20-39%:</strong> Low - Patience and skill required</li>
              <li><strong>0-19%:</strong> Very Low - Rare sightings, trophy hunting only</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}