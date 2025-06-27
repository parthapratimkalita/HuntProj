import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Shield, CreditCard, Bell, Home } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";

interface User {
  avatarUrl?: string;
  avatar_url?: string;
  fullName?: string;
  username?: string;
  email?: string;
  createdAt?: string;
  role?: string;
}

interface ProfileSidebarProps {
  user: User;
  selectedTab: string;
  onTabChange: (tab: string) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  onNavigate: (path: string) => void;
  isUploading: boolean;
  isRemoving: boolean;
}

const navigationItems = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "security", icon: Shield, label: "Security" },
  { id: "payments", icon: CreditCard, label: "Payment Methods" },
  { id: "notifications", icon: Bell, label: "Notifications" },
];

export const ProfileSidebar = ({
  user,
  selectedTab,
  onTabChange,
  onImageUpload,
  onImageRemove,
  onNavigate,
  isUploading,
  isRemoving
}: ProfileSidebarProps) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex justify-center">
          <ProfileAvatar
            user={user}
            size="md"
            onImageUpload={onImageUpload}
            onImageRemove={onImageRemove}
            isUploading={isUploading}
            isRemoving={isRemoving}
          />
        </div>
        <div className="text-center mt-4">
          <CardTitle className="text-xl">{user.fullName || user.username}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
          <div className="mt-2 text-sm">
            Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <nav className="flex flex-col space-y-1">
          {navigationItems.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant="ghost"
              className={`justify-start ${
                selectedTab === id ? "bg-primary/10 text-primary font-medium" : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => onTabChange(id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          ))}
          {user.role === "user" && (
            <Button
              variant="ghost"
              className="justify-start text-gray-700 hover:bg-gray-100"
              onClick={() => onNavigate("/provider/apply")}
            >
              <Home className="mr-2 h-4 w-4" />
              Become a Host
            </Button>
          )}
        </nav>
      </CardContent>
    </Card>
  );
};