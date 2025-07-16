import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, ArrowLeft, MapPin, Users, 
  Home, Shield, CreditCard, Info, Check, Phone, Mail, User, Clock, AlertCircle,
  CheckCircle2, Timer, Star, Target
} from "lucide-react";
import { format } from "date-fns";
import { Booking } from "@/types/booking";
import { queryClient } from "@/lib/queryClient";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

// Configuration constants
const CONFIG = {
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || "1-800-HUNTSTAY",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "support@huntstay.com",
  ownerResponseDays: 5,
  redirectCountdown: 3
};

// Type for guest information
interface GuestInfo {
  leadHunterName: string;
  leadHunterPhone: string;
  leadHunterEmail: string;
  specialRequests: string;
}

// Custom hook for managing guest info
function useGuestInfo(booking: Booking) {
  const [guestInfo, setGuestInfo] = useState({
    leadHunterName: booking?.lead_hunter_name || "",
    leadHunterPhone: booking?.lead_hunter_phone || "",
    leadHunterEmail: booking?.lead_hunter_email || "",
    specialRequests: booking?.special_requests || ""
  });

  const handleGuestInfoChange = (field: string, value: string) => {
    setGuestInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return { guestInfo, handleGuestInfoChange };
}

// Main checkout form component with authorization flow
function CheckoutForm({ bookingData }: { bookingData: Booking }) {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [authorizationComplete, setAuthorizationComplete] = useState(false);
  const [countdown, setCountdown] = useState(CONFIG.redirectCountdown);
  const { guestInfo, handleGuestInfoChange } = useGuestInfo(bookingData);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      if (!bookingData) return;

      try {
        const response = await apiRequest("POST", "/api/v1/payments/create-payment-intent", {
          booking_id: bookingData.id,
          amount: Math.round(bookingData.total_price * 100), // Convert to cents
          currency: "usd"
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to create payment intent");
        }

        const data = await response.json();
        setClientSecret(data.client_secret);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to initialize payment. Please try again.",
          variant: "destructive"
        });
      }
    };

    createPaymentIntent();
  }, [bookingData, toast]);

  // Countdown timer for redirect
  useEffect(() => {
    if (authorizationComplete && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (authorizationComplete && countdown === 0) {
      navigate("/bookings");
    }
  }, [authorizationComplete, countdown, navigate]);

  // Show success state if authorization is complete
  if (authorizationComplete) {
    return (
      <div className="space-y-6">
        {/* Success Card */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-4">Payment Authorized!</h2>
            <p className="text-green-700 mb-6 text-lg">
              Your payment method has been authorized for <strong>${bookingData.total_price.toFixed(2)}</strong>. 
              No charge has been made to your card yet.
            </p>
            <div className="space-y-4 text-green-600">
              <div className="flex items-center justify-center gap-3 text-base">
                <Shield className="w-5 h-5" />
                <span>Your payment is securely held by Stripe</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-base">
                <Timer className="w-5 h-5" />
                <span>Waiting for property owner confirmation</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-base">
                <Check className="w-5 h-5" />
                <span>You'll only be charged if they accept your booking</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-green-800">Payment Authorized ✓</h4>
                  <p className="text-sm text-gray-600">Your payment method is verified and funds are held securely</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-800">Property Owner Review</h4>
                  <p className="text-sm text-gray-600">The property owner will review your booking details and special requests</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Booking Confirmed or Declined</h4>
                  <p className="text-sm text-gray-600">You'll be notified by email of their decision</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Your Booking Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Property</h4>
                <p className="text-sm">{bookingData.property_snapshot?.property_name}</p>
                <p className="text-xs text-gray-600 flex items-center mt-1">
                  <MapPin className="w-3 h-3 mr-1" />
                  {bookingData.property_snapshot?.property_city}, {bookingData.property_snapshot?.property_state}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Dates</h4>
                <p className="text-sm">
                  {format(new Date(bookingData.check_in_date), "MMM dd")} - {format(new Date(bookingData.check_out_date), "MMM dd, yyyy")}
                </p>
                <p className="text-xs text-gray-600">{bookingData.guest_count} {bookingData.guest_count === 1 ? 'hunter' : 'hunters'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Redirect Notice */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Redirecting to your bookings in <span className="font-bold text-primary">{countdown}</span> seconds...
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/bookings")}>
              View My Bookings
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Browse More Properties
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Setting up payment...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements 
      stripe={stripePromise}
      options={{
        clientSecret: clientSecret,
        appearance: {
          theme: 'stripe'
        }
      }}
    >
      <PaymentForm 
        bookingData={bookingData}
        guestInfo={guestInfo}
        handleGuestInfoChange={handleGuestInfoChange}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        paymentError={paymentError}
        setPaymentError={setPaymentError}
        clientSecret={clientSecret}
        setAuthorizationComplete={setAuthorizationComplete}
        navigate={navigate}
        toast={toast}
      />
    </Elements>
  );
}

function PaymentForm({ 
  bookingData, 
  guestInfo, 
  handleGuestInfoChange, 
  isProcessing,
  setIsProcessing,
  paymentError,
  setPaymentError,
  clientSecret,
  setAuthorizationComplete,
  navigate,
  toast
}: {
  bookingData: Booking;
  guestInfo: GuestInfo;
  handleGuestInfoChange: (field: string, value: string) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  paymentError: string | null;
  setPaymentError: (value: string | null) => void;
  clientSecret: string;
  setAuthorizationComplete: (value: boolean) => void;
  navigate: (path: string) => void;
  toast: any;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // First, update booking with guest info
      await apiRequest("PUT", `/api/v1/bookings/${bookingData.id}`, {
        lead_hunter_name: guestInfo.leadHunterName,
        lead_hunter_phone: guestInfo.leadHunterPhone,
        lead_hunter_email: guestInfo.leadHunterEmail,
        special_requests: guestInfo.specialRequests
      });

      // Confirm payment for authorization (not capture)
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?booking_id=${bookingData.id}`,
          payment_method_data: {
            billing_details: {
              name: guestInfo.leadHunterName || bookingData.lead_hunter_name,
              email: guestInfo.leadHunterEmail || bookingData.lead_hunter_email,
              phone: guestInfo.leadHunterPhone || bookingData.lead_hunter_phone,
            },
          },
        },
        redirect: 'if_required'
      });

      if (error) {
        setPaymentError(error.message || "An error occurred");
        setIsProcessing(false);
        return;
      }

      // Check if authorization was successful
      if (paymentIntent && paymentIntent.status === "requires_capture") {
        // Authorization successful - confirm with backend
        try {
          const confirmResponse = await apiRequest("POST", "/api/v1/payments/confirm-authorization", {
            payment_intent_id: paymentIntent.id
          });

          if (!confirmResponse.ok) {
            const errorData = await confirmResponse.json();
            throw new Error(errorData.detail || "Failed to confirm authorization");
          }

          const result = await confirmResponse.json();
          setAuthorizationComplete(true);
          
          // Invalidate bookings query to ensure fresh data
          queryClient.invalidateQueries({ queryKey: ["/api/v1/bookings"] });
          
          toast({
            title: "Payment authorized!",
            description: "Your payment method has been authorized. The property owner will review your booking.",
          });

        } catch (error) {
          toast({
            title: "Authorization error",
            description: "Payment was authorized but confirmation failed. Please contact support.",
            variant: "destructive"
          });
        }
      } else {
        setPaymentError(`Unexpected payment status: ${paymentIntent?.status}`);
      }
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Guest Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Guest Information
          </CardTitle>
          <CardDescription>
            Please provide the lead hunter's contact information for this booking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadHunterName">Lead Hunter Name *</Label>
              <Input
                id="leadHunterName"
                value={guestInfo.leadHunterName}
                onChange={(e) => handleGuestInfoChange('leadHunterName', e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadHunterEmail">Email Address *</Label>
              <Input
                id="leadHunterEmail"
                type="email"
                value={guestInfo.leadHunterEmail}
                onChange={(e) => handleGuestInfoChange('leadHunterEmail', e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="leadHunterPhone">Phone Number</Label>
            <Input
              id="leadHunterPhone"
              type="tel"
              value={guestInfo.leadHunterPhone}
              onChange={(e) => handleGuestInfoChange('leadHunterPhone', e.target.value)}
              placeholder="Enter phone number (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
            <Textarea
              id="specialRequests"
              value={guestInfo.specialRequests}
              onChange={(e) => handleGuestInfoChange('specialRequests', e.target.value)}
              placeholder="Any special requests, dietary restrictions, or questions for the property owner..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Authorization Flow Info */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>How this works:</strong> We'll authorize your payment method for ${bookingData.total_price.toFixed(2)} 
          but won't charge you until the property owner confirms your booking. They have {CONFIG.ownerResponseDays} days to respond. 
          If they decline, no charge will be made to your card.
        </AlertDescription>
      </Alert>

      {/* Payment Information */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment Authorization
            </CardTitle>
            <CardDescription>
              Choose your payment method to authorize the payment (you won't be charged yet)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-gray-50">
              <PaymentElement
                options={{
                  layout: 'tabs',
                  paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'link'],
                  fields: {
                    billingDetails: {
                      name: 'auto',
                      email: 'auto',
                      phone: 'auto',
                      address: {
                        country: 'auto',
                        postalCode: 'auto'
                      }
                    }
                  }
                }}
              />
            </div>

            {paymentError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Your payment is secure:</strong> We use Stripe's industry-leading security. 
                Your card will only be charged after the property owner confirms your booking.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              disabled={!stripe || isProcessing || !guestInfo.leadHunterName || !guestInfo.leadHunterEmail} 
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authorizing payment...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Authorize ${bookingData.total_price.toFixed(2)}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Terms and Conditions */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <p className="text-xs text-gray-600 text-center">
            By clicking "Authorize", you agree to our{" "}
            <a href="/terms" className="underline hover:text-primary">Terms of Service</a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a>.
            Your payment method will be authorized but not charged until the property owner confirms your booking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Get booking data from URL parameters
  const bookingId = new URLSearchParams(window.location.search).get('booking_id');
  
  const { data: booking, isLoading, error } = useQuery<Booking>({
    queryKey: [`/api/v1/bookings/${bookingId}`],
    enabled: !!bookingId,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading booking details...</p>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Booking Not Found</h1>
            <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  // Check if booking belongs to current user
  console.log('Booking object:', booking);
  console.log('Booking user_id:', booking.user_id, 'Current user id:', user?.id);
  if (booking.user_id !== user?.id) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">You don't have permission to view this booking.</p>
            <Button onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  // Check if booking is already authorized or paid
  if (booking.payment_status === 'authorized') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Payment Already Authorized</h1>
            <p className="text-gray-600 mb-6">
              Your payment has been authorized and the property owner has been notified. 
              You'll be charged only if they confirm your booking.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/bookings")}>View My Bookings</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
            </div>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  if (booking.payment_status === 'paid') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Booking Confirmed & Paid</h1>
            <p className="text-gray-600 mb-6">This booking has been confirmed and payment has been processed.</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/bookings")}>View My Bookings</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
            </div>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-grow max-w-7xl">
        {/* Back button */}
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Secure Your Booking</h1>
              <p className="text-gray-600">
                Authorize your payment to reserve this hunting experience. You'll only be charged if the property owner confirms your booking.
              </p>
            </div>
            
            <CheckoutForm bookingData={booking} />
          </div>

          {/* Right Column - Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
                <CardDescription>Review your hunting adventure details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Info */}
                <div>
                  <h3 className="font-semibold text-lg">{booking.property_snapshot?.property_name}</h3>
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {booking.property_snapshot?.property_city}, {booking.property_snapshot?.property_state}
                  </p>
                </div>

                <Separator />

                {/* Booking Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" />
                    {booking.status}
                  </Badge>
                </div>

                {/* Dates */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Check-in</span>
                    <span className="font-medium">
                      {format(new Date(booking.check_in_date), "EEE, MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Check-out</span>
                    <span className="font-medium">
                      {format(new Date(booking.check_out_date), "EEE, MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Duration</span>
                    <span className="font-medium">{booking.hunting_package_duration} days</span>
                  </div>
                </div>

                <Separator />

                {/* Package Details */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-900">{booking.hunting_package_name}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Type</span>
                      <Badge variant="outline" className="text-xs border-blue-200 text-blue-800">
                        {booking.hunting_package_type?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Hunters</span>
                      <span className="flex items-center text-blue-900">
                        <Users className="w-4 h-4 mr-1" />
                        {booking.guest_count} {booking.guest_count === 1 ? 'hunter' : 'hunters'}
                      </span>
                    </div>
                  </div>
                </div>

                {booking.accommodation_included && (
                  <>
                    <Separator />
                    <div className="flex items-center text-sm">
                      <Home className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-green-600 font-medium">Accommodation included</span>
                    </div>
                  </>
                )}

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Package price</span>
                    <span>${booking.package_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service fee</span>
                    <span>${booking.service_fee.toFixed(2)}</span>
                  </div>
                  {booking.taxes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxes</span>
                      <span>${booking.taxes.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Authorization Amount</span>
                    <span className="text-primary">${booking.total_price.toFixed(2)}</span>
                  </div>
                </div>


                {/* Contact Information */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Need Help?</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{CONFIG.supportPhone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      <span>{CONFIG.supportEmail}</span>
                    </div>
                  </div>
                </div>

                {/* Trust Indicators */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>SSL Secured</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Stripe Protected</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}