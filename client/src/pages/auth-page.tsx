import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  const { login, signup, user, loading } = useAuth();
  const [_, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      console.log('AUTH PAGE: User is already logged in, redirecting to home');
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    try {
      if (isLogin) {
        await login(email, password);
        setSuccess('Logged in successfully!');
        // The AuthProvider will handle the redirect via the auth state change
      } else {
        await signup(email, password, username, fullName);
        setSuccess('Account created! Please check your email to verify.');
        setTimeout(() => {
          setIsLogin(true);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };



  const handleOAuthLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setOauthLoading(provider);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
    } finally {
      setOauthLoading(null);
    }
  };

  // Show loading if checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">{isLogin ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        {error && <div className="text-red-500">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}
        
        <button
          type="submit"
          className="w-full bg-amber-500 text-white py-2 rounded font-semibold"
          disabled={submitting}
        >
          {submitting ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Login' : 'Sign Up')}
        </button>
      </form>
      
      <div className="mt-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleOAuthLogin('google')}
            className="w-full flex items-center justify-center border border-gray-300 bg-white py-2 rounded font-medium text-gray-700 hover:bg-gray-50"
            disabled={!!oauthLoading}
          >
            {oauthLoading === 'google' ? 'Redirecting...' : 'Sign in with Google'}
          </button>
          <button
            onClick={() => handleOAuthLogin('facebook')}
            className="w-full flex items-center justify-center border border-gray-300 bg-white py-2 rounded font-medium text-gray-700 hover:bg-gray-50"
            disabled={!!oauthLoading}
          >
            {oauthLoading === 'facebook' ? 'Redirecting...' : 'Sign in with Facebook'}
          </button>
          <button
            onClick={() => handleOAuthLogin('apple')}
            className="w-full flex items-center justify-center border border-gray-300 bg-white py-2 rounded font-medium text-gray-700 hover:bg-gray-50"
            disabled={!!oauthLoading}
          >
            {oauthLoading === 'apple' ? 'Redirecting...' : 'Sign in with Apple'}
          </button>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <button
          className="text-amber-600 underline"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}