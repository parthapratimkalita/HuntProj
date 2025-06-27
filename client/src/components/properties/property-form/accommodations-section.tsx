import { 
    AccommodationOption, 
    accommodationTypes, 
    accommodationAmenities 
  } from "./property-form-schema";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Checkbox } from "@/components/ui/checkbox";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Plus, Trash2, Info } from "lucide-react";
  
  interface AccommodationsSectionProps {
    accommodations: AccommodationOption[];
    onUpdateAccommodation: (index: number, field: keyof AccommodationOption, value: any) => void;
    onAddAccommodation: () => void;
    onRemoveAccommodation: (index: number) => void;
  }
  
  export default function AccommodationsSection({
    accommodations,
    onUpdateAccommodation,
    onAddAccommodation,
    onRemoveAccommodation,
  }: AccommodationsSectionProps) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">Accommodation Options</h3>
            <p className="text-sm text-gray-600">Available lodging for hunters (included or as add-on)</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddAccommodation}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        </div>
        
        <div className="space-y-4">
          {accommodations.map((acc, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">
                    Accommodation Option {index + 1}
                  </CardTitle>
                  {accommodations.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveAccommodation(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={acc.type}
                      onChange={(e) => onUpdateAccommodation(index, 'type', e.target.value)}
                    >
                      <option value="">Select type</option>
                      {accommodationTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input 
                      placeholder="e.g. Deluxe Lodge Room"
                      value={acc.name}
                      onChange={(e) => onUpdateAccommodation(index, 'name', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Bedrooms</label>
                    <Input 
                      type="number"
                      min="0"
                      value={acc.bedrooms}
                      onChange={(e) => onUpdateAccommodation(index, 'bedrooms', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Bathrooms</label>
                    <Input 
                      type="number"
                      min="0"
                      step="0.5"
                      value={acc.bathrooms}
                      onChange={(e) => onUpdateAccommodation(index, 'bathrooms', parseFloat(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Max Capacity</label>
                    <Input 
                      type="number"
                      min="1"
                      value={acc.capacity}
                      onChange={(e) => onUpdateAccommodation(index, 'capacity', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Additional Cost per Night ($)</label>
                    <Input 
                      type="number"
                      min="0"
                      value={acc.pricePerNight}
                      onChange={(e) => onUpdateAccommodation(index, 'pricePerNight', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Set to 0 if included in package
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Textarea 
                    placeholder="Brief description of this accommodation"
                    value={acc.description}
                    onChange={(e) => onUpdateAccommodation(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
                
                {/* Accommodation Amenities */}
                <div>
                  <label className="text-sm font-medium block mb-2">Amenities:</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {accommodationAmenities.map((amenity) => (
                      <div key={amenity.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={acc.amenities?.includes(amenity.id) || false}
                          onCheckedChange={(checked) => {
                            const currentAmenities = acc.amenities || [];
                            const newAmenities = checked
                              ? [...currentAmenities, amenity.id]
                              : currentAmenities.filter(a => a !== amenity.id);
                            onUpdateAccommodation(index, 'amenities', newAmenities);
                          }}
                        />
                        <label className="text-sm">{amenity.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Accommodation Pricing:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>If accommodation is included in a hunting package, set the price to $0</li>
                <li>If accommodation is an add-on, set the nightly rate hunters will pay extra</li>
                <li>Hunters can choose their accommodation when booking a package</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }