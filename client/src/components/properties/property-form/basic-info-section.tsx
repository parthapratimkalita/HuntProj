import { UseFormReturn } from "react-hook-form";
import { PropertyFormData, AcreageBreakdown, WildlifeInfo, terrainTypes } from "./property-form-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Info } from "lucide-react";
import WildlifeSection from "./wildlife-section";

interface BasicInfoSectionProps {
  form: UseFormReturn<PropertyFormData>;
  acreageBreakdown: AcreageBreakdown[];
  onUpdateAcreageBreakdown: (index: number, field: keyof AcreageBreakdown, value: any) => void;
  onAddAcreageBreakdown: () => void;
  onRemoveAcreageBreakdown: (index: number) => void;
  // Wildlife props
  wildlifeInfo: WildlifeInfo[];
  onUpdateWildlife: (index: number, field: keyof WildlifeInfo, value: any) => void;
  onAddWildlife: () => void;
  onRemoveWildlife: (index: number) => void;
}

export default function BasicInfoSection({ 
  form, 
  acreageBreakdown,
  onUpdateAcreageBreakdown,
  onAddAcreageBreakdown,
  onRemoveAcreageBreakdown,
  // Wildlife handlers
  wildlifeInfo,
  onUpdateWildlife,
  onAddWildlife,
  onRemoveWildlife,
}: BasicInfoSectionProps) {
  
  // Calculate total acreage from breakdown
  const calculatedTotal = acreageBreakdown.reduce((sum, item) => sum + (item.acres || 0), 0);
  
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Property Information</h3>
      <div className="space-y-6">
        {/* REMOVED: Property name field - now handled in main form */}
        
        {/* Property Description - Always editable */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Description *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your hunting ground, terrain, wildlife and what makes it special. Feel free to also describe yourinfrastructure." 
                  {...field} 
                  rows={4}
                />
              </FormControl>
              <p className="text-xs text-gray-500 mt-1">
                Provide a detailed description to attract hunters to your property
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Total Acreage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="totalAcres"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Property Acreage *</FormLabel>
                <FormControl>
                  <Input type="number" min="1" placeholder="e.g. 500" {...field} />
                </FormControl>
                <FormMessage />
                {calculatedTotal > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    Breakdown total: {calculatedTotal} acres
                    {calculatedTotal !== (field.value || 0) && (
                      <span className="text-orange-600 ml-2">
                        ⚠️ Totals don't match
                      </span>
                    )}
                  </p>
                )}
              </FormItem>
            )}
          />
          
        </div>

        {/* Detailed Acreage Breakdown */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-base font-medium">Acreage Breakdown by Terrain</h4>
              <p className="text-sm text-gray-600">Break down your property by different terrain types</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddAcreageBreakdown}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Terrain
            </Button>
          </div>
          
          <div className="space-y-3">
            {acreageBreakdown.map((breakdown, index) => (
              <Card key={`acreage-${index}`} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">
                      Terrain Area {index + 1}
                    </CardTitle>
                    {acreageBreakdown.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveAcreageBreakdown(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Acreage *</label>
                      <Input 
                        type="number"
                        min="1"
                        placeholder="e.g. 250"
                        value={breakdown.acres || ""}
                        onChange={(e) => onUpdateAcreageBreakdown(index, 'acres', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Terrain Type *</label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={breakdown.terrainType || ""}
                        onChange={(e) => onUpdateAcreageBreakdown(index, 'terrainType', e.target.value)}
                      >
                        <option value="">Select terrain type</option>
                        {terrainTypes.map(terrain => (
                          <option key={terrain.id} value={terrain.id}>{terrain.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Empty state */}
          {acreageBreakdown.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 mb-2">No terrain breakdown added yet</p>
              <p className="text-sm text-gray-400">Add terrain areas to provide detailed property information</p>
            </div>
          )}
          
          {/* Acreage Breakdown Helper information */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Acreage Breakdown Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Break down your property by major terrain types for better marketing</li>
                  <li>Include details about hunting opportunities in each terrain area</li>
                  <li>The breakdown total should match your total property acreage</li>
                  <li>This helps hunters understand what terrain they'll be hunting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Wildlife Information Section */}
        <WildlifeSection
          wildlifeInfo={wildlifeInfo}
          onUpdateWildlife={onUpdateWildlife}
          onAddWildlife={onAddWildlife}
          onRemoveWildlife={onRemoveWildlife}
        />
      </div>
    </div>
  );
}