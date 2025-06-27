import React from "react";
import { 
    HuntingPackage, 
    AccommodationOption, 
    huntingTypes, 
    packageInclusions 
  } from "./property-form-schema";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Checkbox } from "@/components/ui/checkbox";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Plus, Trash2, AlertTriangle } from "lucide-react";
  
  interface HuntingPackagesSectionProps {
    huntingPackages: HuntingPackage[];
    accommodations: AccommodationOption[];
    onUpdatePackage: (index: number, field: keyof HuntingPackage, value: any) => void;
    onAddPackage: () => void;
    onRemovePackage: (index: number) => void;
  }
  
  export default function HuntingPackagesSection({
    huntingPackages,
    accommodations,
    onUpdatePackage,
    onAddPackage,
    onRemovePackage,
  }: HuntingPackagesSectionProps) {
    
    // Helper to safely handle included items updates
    const handleIncludedItemsChange = (packageIndex: number, itemId: string, checked: boolean) => {
      const currentPackage = huntingPackages[packageIndex];
      const currentItems = currentPackage.includedItems || [];
      
      let newItems: string[];
      if (checked) {
        // Add item if not already present
        newItems = currentItems.includes(itemId) ? currentItems : [...currentItems, itemId];
      } else {
        // Remove item
        newItems = currentItems.filter(item => item !== itemId);
      }
      
      console.log(`Updating package ${packageIndex} includedItems:`, newItems);
      onUpdatePackage(packageIndex, 'includedItems', newItems);
    };

    // Helper to safely handle field updates with proper typing
    const handleFieldUpdate = (packageIndex: number, field: keyof HuntingPackage, value: any) => {
      console.log(`Updating package ${packageIndex} field ${field}:`, value);
      
      // Ensure proper data types
      let processedValue = value;
      if (field === 'duration' || field === 'maxHunters') {
        processedValue = parseInt(value) || 0;
      } else if (field === 'price') {
        processedValue = parseFloat(value) || 0;
      }
      
      onUpdatePackage(packageIndex, field, processedValue);
    };
    
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">Hunting Packages</h3>
            <p className="text-sm text-gray-600">Define your hunting packages with pricing and inclusions</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddPackage}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Package
          </Button>
        </div>
        
        {/* Debug info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-xs text-yellow-800">
              <strong>Debug:</strong> {huntingPackages.length} packages in state
              {huntingPackages.map((pkg, idx) => (
                <div key={idx} className="mt-1">
                  Package {idx + 1}: {pkg.name || 'Unnamed'} - Items: {pkg.includedItems?.length || 0}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {huntingPackages.map((pkg, index) => (
            <Card key={`package-${index}`} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    Hunting Package {index + 1}
                    {pkg.name && (
                      <span className="text-sm text-gray-500 font-normal">
                        - {pkg.name}
                      </span>
                    )}
                  </CardTitle>
                  {huntingPackages.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePackage(index)}
                      title="Remove this package"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Package Name *</label>
                    <Input 
                      placeholder="e.g. 3-Day Whitetail Hunt"
                      value={pkg.name || ""}
                      onChange={(e) => handleFieldUpdate(index, 'name', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Hunting Type *</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={pkg.huntingType || ""}
                      onChange={(e) => handleFieldUpdate(index, 'huntingType', e.target.value)}
                    >
                      <option value="">Select hunting type</option>
                      {huntingTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Duration (days) *</label>
                    <Input 
                      type="number"
                      min="1"
                      value={pkg.duration || ""}
                      onChange={(e) => handleFieldUpdate(index, 'duration', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Package Price ($) *</label>
                    <Input 
                      type="number"
                      min="1"
                      value={pkg.price || ""}
                      onChange={(e) => handleFieldUpdate(index, 'price', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Max Hunters *</label>
                    <Input 
                      type="number"
                      min="1"
                      value={pkg.maxHunters || ""}
                      onChange={(e) => handleFieldUpdate(index, 'maxHunters', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Accommodation *</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={pkg.accommodationStatus || "without"}
                      onChange={(e) => handleFieldUpdate(index, 'accommodationStatus', e.target.value)}
                    >
                      <option value="included">Included in package</option>
                      <option value="extra">Available as add-on</option>
                      <option value="without">Without accommodation</option>
                    </select>
                  </div>
                </div>
                
                {pkg.accommodationStatus === "included" && accommodations.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Default Accommodation (included)</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={pkg.defaultAccommodation || ""}
                      onChange={(e) => handleFieldUpdate(index, 'defaultAccommodation', e.target.value)}
                    >
                      <option value="">Select accommodation</option>
                      {accommodations.map((acc, idx) => (
                        <option key={`acc-${idx}`} value={acc.name}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Package Description *</label>
                  <Textarea 
                    placeholder="Describe what's special about this hunt package"
                    value={pkg.description || ""}
                    onChange={(e) => handleFieldUpdate(index, 'description', e.target.value)}
                    rows={3}
                  />
                </div>
                
                {/* Package Inclusions */}
                <div>
                  <label className="text-sm font-medium block mb-2">Package Includes:</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {packageInclusions
                      .filter((item) => {
                        if (pkg.accommodationStatus === "without") {
                          const accommodationRelatedItems = ['lodging', 'accommodation'];
                          return !accommodationRelatedItems.includes(item.id);
                        }
                        return true;
                      })
                      .map((item) => {
                        const isChecked = (pkg.includedItems || []).includes(item.id);
                        
                        return (
                          <div key={`${index}-${item.id}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`package-${index}-item-${item.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                handleIncludedItemsChange(index, item.id, !!checked);
                              }}
                            />
                            <label 
                              htmlFor={`package-${index}-item-${item.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {item.label}
                            </label>
                          </div>
                        );
                      })}
                  </div>
                  
                  {/* Status-specific help text */}
                  {pkg.accommodationStatus === "included" && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ Accommodation is included in the package price
                    </p>
                  )}
                  
                  {pkg.accommodationStatus === "extra" && (
                    <p className="text-xs text-blue-600 mt-2">
                      ℹ️ Hunters can add accommodation for an additional cost
                    </p>
                  )}
                  
                  {pkg.accommodationStatus === "without" && (
                    <p className="text-xs text-gray-500 mt-2">
                      * Accommodation not included in this package
                    </p>
                  )}
                </div>

                {/* Validation warnings */}
                {(!pkg.name || !pkg.huntingType || !pkg.description || 
                  pkg.duration < 1 || pkg.price < 1 || pkg.maxHunters < 1) && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="text-sm text-red-800">
                        <p className="font-medium">Required fields missing:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {!pkg.name && <li>Package name is required</li>}
                          {!pkg.huntingType && <li>Hunting type is required</li>}
                          {!pkg.description && <li>Description is required</li>}
                          {pkg.duration < 1 && <li>Duration must be at least 1 day</li>}
                          {pkg.price < 1 && <li>Price must be greater than $0</li>}
                          {pkg.maxHunters < 1 && <li>Must allow at least 1 hunter</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }