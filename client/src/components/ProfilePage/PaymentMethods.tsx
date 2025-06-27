import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export const PaymentMethods = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Manage your payment information and transaction history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No payment methods yet</h3>
          <p className="text-gray-600 mt-2 mb-6">
            Add a payment method to make booking hunting properties quicker and easier
          </p>
          <Button>
            <CreditCard className="mr-2 h-4 w-4" />
            Add Payment Method
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};