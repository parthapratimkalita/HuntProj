import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NotificationSetting {
  title: string;
  description: string;
  email: boolean;
  sms: boolean;
}

const notificationSettings: NotificationSetting[] = [
  {
    title: "Booking Confirmations",
    description: "Receive notifications when your booking is confirmed",
    email: true,
    sms: true,
  },
  {
    title: "Booking Reminders",
    description: "Get reminders about upcoming trips",
    email: true,
    sms: false,
  },
  {
    title: "Promotions and Deals",
    description: "Stay updated with special offers and discounts",
    email: true,
    sms: false,
  },
  {
    title: "Account Updates",
    description: "Important information about your account",
    email: true,
    sms: false,
  },
];

export const NotificationPreferences = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Control how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notificationSettings.map(({ title, description, email, sms }) => (
            <div key={title} className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-gray-600 text-sm">{description}</p>
              </div>
              <div className="flex items-center">
                <div className="mr-4">
                  <label className="text-sm mr-2">Email</label>
                  <input type="checkbox" defaultChecked={email} />
                </div>
                <div>
                  <label className="text-sm mr-2">SMS</label>
                  <input type="checkbox" defaultChecked={sms} />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-8">
          <Button>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
};