import { UseFormReturn } from "react-hook-form";
import { PropertyFormData, propertyFacilities } from "./property-form-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

interface FacilitiesSectionProps {
  form: UseFormReturn<PropertyFormData>;
}

export default function FacilitiesSection({ form }: FacilitiesSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Property Facilities</h3>
      <FormField
        control={form.control}
        name="facilities"
        render={() => (
          <FormItem>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {propertyFacilities.map((facility) => (
                <FormField
                  key={facility.id}
                  control={form.control}
                  name="facilities"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={facility.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(facility.id)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              return checked
                                ? field.onChange([...currentValue, facility.id])
                                : field.onChange(
                                    currentValue.filter(
                                      (value) => value !== facility.id
                                    )
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          {facility.label}
                        </FormLabel>
                      </FormItem>
                    );
                  }}
                />
              ))}
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}