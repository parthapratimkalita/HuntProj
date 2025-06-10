import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Booking } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, MapPin, Users, Home, Clock } from "lucide-react";
import { format } from "date-fns";

export default function BookingsPage() {
  const [_, navigate] = useLocation();
  
  // Fetch user bookings
  const { data: bookings, isLoading, error } = useQuery<(Booking & { property: any })[]>({
    queryKey: ["/api/v1/user/bookings"],
  });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch (error) {
      return dateStr;
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">My Bookings</h1>
            <Button onClick={() => navigate("/")}>
              Find more properties
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">Failed to load bookings. Please try again later.</p>
            </div>
          ) : bookings && bookings.length > 0 ? (
            <div className="space-y-6">
              {bookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-1/4 h-48 md:h-auto">
                      <img 
                        src={booking.property.images?.[0] || "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400"}
                        alt={booking.property.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="w-full md:w-3/4 p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-semibold">{booking.property.title}</h2>
                          <p className="text-gray-600 flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {booking.property.location}
                          </p>
                        </div>
                        
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium">Check-in</p>
                            <p className="text-sm">{formatDate(booking.startDate as unknown as string)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium">Check-out</p>
                            <p className="text-sm">{formatDate(booking.endDate as unknown as string)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium">Guests</p>
                            <p className="text-sm">{booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <div>
                          <p className="font-medium">Total Price</p>
                          <p className="text-2xl font-semibold text-primary">${booking.totalPrice}</p>
                        </div>
                        
                        <div className="space-x-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/properties/${booking.propertyId}`)}>
                            View Property
                          </Button>
                          {booking.status === "pending" && (
                            <Button variant="destructive" size="sm">
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="h-20 w-20 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No bookings yet</h2>
              <p className="text-gray-600 mb-6">
                You haven't made any bookings yet. Start exploring available properties!
              </p>
              <Button onClick={() => navigate("/")}>
                Find Properties
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
