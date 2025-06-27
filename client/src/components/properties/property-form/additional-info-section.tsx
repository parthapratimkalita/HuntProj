import { UseFormReturn } from "react-hook-form";
import { PropertyFormData } from "./property-form-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface AdditionalInfoSectionProps {
  form: UseFormReturn<PropertyFormData>;
}

export default function AdditionalInfoSection({ form }: AdditionalInfoSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Additional Information</h3>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Rules</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="e.g. Check-in time, quiet hours, hunting zones, safety requirements"
                  {...field} 
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="safety"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Safety Information</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="e.g. Required safety gear, emergency procedures, first aid locations"
                  {...field} 
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="licenses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>License Requirements</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="e.g. Required licenses, where to obtain them, any restrictions"
                  {...field} 
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="seasonInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Season Information</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="e.g. Best hunting seasons, weather conditions, what to expect"
                  {...field} 
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}