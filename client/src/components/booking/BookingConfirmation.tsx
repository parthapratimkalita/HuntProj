import { useState } from 'react';
import { MultiPaymentForm } from '@/components/payment/MultiPaymentForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle, Calendar, MapPin, Users, DollarSign } from 'lucide-react';

interface BookingConfirmationProps {
  booking: {
    id: number;
    property: {
      property_name: string;
      city: string;
      state: string;
    };
    hunting_package: {
      name: string;
      duration: number;
    };
    guest_count: number;
    total_price: number;
    package_price: number;
    service_fee: number;
  };
  onBookingComplete: () => void;
}

export const BookingConfirmation = ({ booking, onBookingComplete }: BookingConfirmationProps) => {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      // Update booking status on backend
      await fetch(`/api/v1/bookings/${booking.id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntent.id,
        }),
      });

      setPaymentSuccess(true);
      setShowPayment(false);
      
      // Trigger parent callback
      setTimeout(() => {
        onBookingComplete();
      }, 2000);
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  if (paymentSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-4">
            Your hunting trip to {booking.property.property_name} has been successfully booked.
          </p>
          <p className="text-sm text-gray-500">
            You'll receive a confirmation email shortly with all the details.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property Details */}
          <div className="flex items-start gap-4">
            <MapPin className="w-5 h-5 text-gray-500 mt-1" />
            <div>
              <h3 className="font-semibold">{booking.property.property_name}</h3>
              <p className="text-gray-600">{booking.property.city}, {booking.property.state}</p>
            </div>
          </div>

          {/* Package Details */}
          <div className="flex items-start gap-4">
            <Calendar className="w-5 h-5 text-gray-500 mt-1" />
            <div>
              <h3 className="font-semibold">{booking.hunting_package.name}</h3>
              <p className="text-gray-600">{booking.hunting_package.duration} days</p>
            </div>
          </div>

          {/* Guest Count */}
          <div className="flex items-center gap-4">
            <Users className="w-5 h-5 text-gray-500" />
            <span>{booking.guest_count} {booking.guest_count === 1 ? 'hunter' : 'hunters'}</span>
          </div>

          {/* Price Breakdown */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span>Package Price</span>
              <span>${booking.package_price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span>Service Fee</span>
              <span>${booking.service_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center font-semibold text-lg border-t pt-2">
              <span>Total</span>
              <span>${booking.total_price.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Button */}
          <Button
            onClick={() => setShowPayment(true)}
            className="w-full"
            size="lg"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Proceed to Payment
          </Button>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Payment</DialogTitle>
            <DialogDescription>
              Secure payment processing for your hunting trip booking.
            </DialogDescription>
          </DialogHeader>
          <MultiPaymentForm
            bookingId={booking.id}
            amount={booking.total_price}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};