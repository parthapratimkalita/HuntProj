import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAuthPage() {
  const { user, loginMutation, logoutMutation, registerMutation } = useAuth();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({ 
    username: "", 
    password: "", 
    email: "", 
    fullName: "" 
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Current Auth State:</h2>
        <pre className="bg-white p-4 rounded overflow-auto max-h-60">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {!user ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Username</label>
                    <Input
                      value={loginData.username}
                      onChange={e => setLoginData({...loginData, username: e.target.value})}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      value={loginData.password}
                      onChange={e => setLoginData({...loginData, password: e.target.value})}
                      placeholder="Enter password"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loginMutation.isPending}
                    className="w-full"
                  >
                    {loginMutation.isPending ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Register</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Username</label>
                    <Input
                      value={registerData.username}
                      onChange={e => setRegisterData({...registerData, username: e.target.value})}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={registerData.email}
                      onChange={e => setRegisterData({...registerData, email: e.target.value})}
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Full Name</label>
                    <Input
                      value={registerData.fullName}
                      onChange={e => setRegisterData({...registerData, fullName: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      value={registerData.password}
                      onChange={e => setRegisterData({...registerData, password: e.target.value})}
                      placeholder="Enter password"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={registerMutation.isPending}
                    className="w-full"
                  >
                    {registerMutation.isPending ? "Registering..." : "Register"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Logged In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <p>You are logged in as: <strong>{user.username}</strong></p>
                <p>Your role is: <strong>{user.role}</strong></p>
                <div className="flex space-x-4">
                  <Button onClick={handleLogout} variant="destructive">
                    Logout
                  </Button>
                  <Link href="/account-settings">
                    <Button>Go to Account Settings</Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline">Go to Home</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Navigation Links:</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/"><Button variant="outline" size="sm">Home</Button></Link>
          <Link href="/auth"><Button variant="outline" size="sm">Auth Page</Button></Link>
          <Link href="/account-settings"><Button variant="outline" size="sm">Account Settings</Button></Link>
          <Link href="/profile"><Button variant="outline" size="sm">Profile</Button></Link>
        </div>
      </div>
    </div>
  );
}