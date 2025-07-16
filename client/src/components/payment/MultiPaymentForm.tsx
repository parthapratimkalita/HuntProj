import { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MultiPaymentFormProps {
  bookingId: number;
  amount: number;
  currency?: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

export const MultiPaymentForm = ({ 
  bookingId, 
  amount, 
  currency = 'usd',
  onSuccess,
  onError 
}: MultiPaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');

  // Initialize payment intent when component mounts
  useEffect(() => {
    createPaymentIntent().catch(err => {
      setError('Failed to initialize payment');
    });
  }, [bookingId, amount, currency]);

  // Create Payment Intent
  const createPaymentIntent = async (): Promise<string> => {
    try {
      const response = await fetch('/api/v1/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          amount: amount * 100, // Convert to cents
          currency: currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      setClientSecret(data.client_secret);
      return data.client_secret;
    } catch (err) {
      throw new Error('Failed to create payment intent');
    }
  };


  // Handle traditional card payment
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      let secret = clientSecret;
      if (!secret) {
        secret = await createPaymentIntent();
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: secret,
        confirmParams: {
          return_url: `${window.location.origin}/booking-confirmation`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setError(error.message || 'An error occurred');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent) {
        onSuccess(paymentIntent);
        toast({
          title: 'Payment Successful!',
          description: 'Your hunting trip has been booked successfully.',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          PayPal Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Traditional Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Element (supports multiple payment methods) */}
          {clientSecret && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <CreditCard className="w-4 h-4" />
                <span>PayPal payment</span>
              </div>
              
              <div className="p-3 border rounded-lg bg-gray-50">
                <PaymentElement />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center text-sm text-gray-600">
            <Lock className="w-4 h-4 mr-2" />
            Secure 256-bit SSL encryption
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500 text-center">
              <p>• PayPal Account</p>
              <p>• Secure PayPal checkout</p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!stripe || processing || !clientSecret}
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Pay ${amount.toFixed(2)}
              </>
            )}
          </Button>
        </form>

        {/* Security badges */}
        <div className="flex items-center justify-center space-x-4 pt-4 border-t">
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <div className="w-6 h-4 bg-blue-600 rounded text-white text-center text-[10px] leading-4">SSL</div>
            <span>Secure</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <div className="w-8 h-4 bg-indigo-600 rounded text-white text-center text-[8px] leading-4">STRIPE</div>
            <span>Powered by Stripe</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};