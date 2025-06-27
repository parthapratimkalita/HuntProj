import { UseFormReturn } from "react-hook-form";
import { PropertyFormData } from "./property-form-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

interface LocationSectionProps {
  form: UseFormReturn<PropertyFormData>;
  isApproved?: boolean; // Only true when property status is "APPROVED"
}

export default function LocationSection({ form, isApproved = false }: LocationSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        Location
        {isApproved && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Some fields locked
          </span>
        )}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="flex items-center gap-2">
                Street Address *
                {isApproved && <Lock className="w-3 h-3 text-gray-400" />}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. 123 Ranch Road"
                  {...field} 
                  disabled={isApproved}
                  className={isApproved ? 'bg-gray-50 cursor-not-allowed' : ''}
                />
              </FormControl>
              {isApproved && (
                <p className="text-xs text-gray-500">
                  Address cannot be changed for approved properties
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                City *
                {isApproved && <Lock className="w-3 h-3 text-gray-400" />}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. Fredericksburg"
                  {...field} 
                  disabled={isApproved}
                  className={isApproved ? 'bg-gray-50 cursor-not-allowed' : ''}
                />
              </FormControl>
              {isApproved && (
                <p className="text-xs text-gray-500">
                  City cannot be changed for approved properties
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                State *
                {isApproved && <Lock className="w-3 h-3 text-gray-400" />}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. Texas"
                  {...field} 
                  disabled={isApproved}
                  className={isApproved ? 'bg-gray-50 cursor-not-allowed' : ''}
                />
              </FormControl>
              {isApproved && (
                <p className="text-xs text-gray-500">
                  State cannot be changed for approved properties
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="zipCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Zip Code *
                {isApproved && <Lock className="w-3 h-3 text-gray-400" />}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. 78624"
                  {...field} 
                  disabled={isApproved}
                  className={isApproved ? 'bg-gray-50 cursor-not-allowed' : ''}
                />
              </FormControl>
              {isApproved && (
                <p className="text-xs text-gray-500">
                  Zip code cannot be changed for approved properties
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* FIXED: Country field now follows same pattern as other fields */}
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Country *
                {isApproved && <Lock className="w-3 h-3 text-gray-400" />}
              </FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  disabled={isApproved}
                  className={isApproved ? 'bg-gray-50 cursor-not-allowed' : ''}
                  value={field.value || "United States"}
                  placeholder="e.g. United States"
                />
              </FormControl>
              {isApproved ? (
                <p className="text-xs text-gray-500">
                  Country cannot be changed for approved properties
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Default is "United States" - can be changed if needed
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="latitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Latitude *
                {isApproved && <Lock className="w-3 h-3 text-gray-400" />}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. 30.2711" 
                  {...field} 
                  disabled={isApproved}
                  className={isApproved ? 'bg-gray-50 cursor-not-allowed' : ''}
                />
              </FormControl>
              {isApproved ? (
                <p className="text-xs text-gray-500">
                  Latitude cannot be changed for approved properties
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Enter the latitude coordinate for your property location
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="longitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Longitude *
                {isApproved && <Lock className="w-3 h-3 text-gray-400" />}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. -98.6889" 
                  {...field} 
                  disabled={isApproved}
                  className={isApproved ? 'bg-gray-50 cursor-not-allowed' : ''}
                />
              </FormControl>
              {isApproved ? (
                <p className="text-xs text-gray-500">
                  Longitude cannot be changed for approved properties
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Enter the longitude coordinate for your property location
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      {/* Status information */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-blue-600 mt-2"></div>
            <div>
              <p className="font-medium mb-1">Location Information:</p>
              <ul className="space-y-1">
                {isApproved ? (
                  <>
                    <li>• All location fields are locked for approved properties to maintain consistency</li>
                    <li>• Contact support if you need to update location information</li>
                  </>
                ) : (
                  <>
                    <li>• All location fields can be edited until property is approved</li>
                    <li>• Ensure coordinates are accurate for proper property mapping</li>
                    <li>• Default country is "United States" but can be changed if needed</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional help for coordinates */}
      {!isApproved && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">Need help finding coordinates?</p>
            <p>You can use Google Maps to find your property's latitude and longitude:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Go to maps.google.com and search for your property address</li>
              <li>Right-click on the exact location of your property</li>
              <li>Click on the coordinates that appear to copy them</li>
              <li>The first number is latitude, the second is longitude</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}