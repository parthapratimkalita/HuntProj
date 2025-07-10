import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { apiUrl } from '@/lib/api';

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string, username?: string, fullName?: string) => Promise<any>;
  logout: () => Promise<void>;
  logoutMutation: UseMutationResult<void, Error, void, unknown>;
  loading: boolean;
  isLoading: boolean;
  refreshUserProfile: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false); // Prevent concurrent operations

  // Function to sync user profile to backend database
  const syncProfile = async (supabaseUser: any, token: string) => {
    console.log('AUTH DEBUG: Syncing profile to backend database...');
    
    // Get profile data from Supabase user metadata
    const profileData = {
      email: supabaseUser.email,
      username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0],
      full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
    };

    console.log('AUTH DEBUG: Syncing profile data from Supabase metadata:', profileData);

    try {
      const response = await fetch(apiUrl('/api/v1/users/sync-profile'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('AUTH DEBUG: Profile sync successful:', result);
        
        // Check if the response is a user object or a message object
        if (result.id) {
          // It's a user object
          return result;
        } else if (result.user_id) {
          // It's a message object, need to fetch the user
          console.log('AUTH DEBUG: Got message response, fetching user profile...');
          const userResponse = await fetch(apiUrl('/api/v1/users/me'), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('AUTH DEBUG: User profile fetched after sync:', userData);
            return userData;
          } else {
            throw new Error('Failed to fetch user profile after sync');
          }
        } else {
          throw new Error('Unexpected response format from sync endpoint');
        }
      } else {
        const errorText = await response.text();
        console.error('AUTH DEBUG: Profile sync failed:', response.status, errorText);
        throw new Error(`Sync failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('AUTH DEBUG: Error during profile sync:', error);
      throw error;
    }
  };

  // Function to refresh user profile externally (for profile picture updates)
  const refreshUserProfile = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        console.log('AUTH DEBUG: No active session for refresh');
        return null;
      }

      const token = session.data.session.access_token;
      console.log('AUTH DEBUG: Refreshing user profile...');
      
      const response = await fetch(apiUrl('/api/v1/users/me'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const updatedUser = await response.json();
        console.log('AUTH DEBUG: User profile refreshed successfully:', updatedUser);
        
        // Only update if avatar actually changed
        const currentAvatarUrl = user?.avatarUrl || user?.avatar_url;
        const newAvatarUrl = updatedUser.avatarUrl || updatedUser.avatar_url;
        
        if (currentAvatarUrl !== newAvatarUrl || JSON.stringify(user) !== JSON.stringify(updatedUser)) {
          setUser(updatedUser);
        }
        
        return updatedUser;
      } else {
        console.error('AUTH DEBUG: Failed to refresh user profile:', response.status);
        return null;
      }
    } catch (error) {
      console.error('AUTH DEBUG: Error refreshing user profile:', error);
      return null;
    }
  }, []);

  // Function to fetch user profile from your backend
  const fetchUserProfile = async (supabaseUser: any) => {
    if (!supabaseUser) {
      console.log('AUTH DEBUG: No supabase user provided to fetchUserProfile');
      setUser(null);
      return null;
    }

    // Prevent concurrent operations
    if (isProcessingAuth) {
      console.log('AUTH DEBUG: Auth operation already in progress, skipping...');
      return null;
    }

    setIsProcessingAuth(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        console.log('AUTH DEBUG: No active session found');
        setUser(null);
        return null;
      }

      const token = session.data.session.access_token;
      
      console.log('AUTH DEBUG: Fetching user profile from backend...');
      
      const response = await fetch(apiUrl('/api/v1/users/me'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const backendUser = await response.json();
        console.log('AUTH DEBUG: Backend user loaded successfully:', backendUser);
        console.log('AUTH DEBUG: Setting user state with backend data...');
        setUser(backendUser);
        console.log('AUTH DEBUG: User state set. Current user should now be:', backendUser.email);
        return backendUser;
      } else if (response.status === 404) {
        console.log('AUTH DEBUG: User not found in backend, syncing profile...');
        
        try {
          // User exists in Supabase but not in backend - sync the profile
          const syncedUser = await syncProfile(supabaseUser, token);
          console.log('AUTH DEBUG: Profile synced successfully:', syncedUser);
          setUser(syncedUser);
          return syncedUser;
        } catch (syncError) {
          console.error('AUTH DEBUG: Profile sync failed, using fallback user:', syncError);
          // If sync fails, create a fallback user object
          const fallbackUser = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0],
            fullName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
            role: 'user', // Default role
            created_at: supabaseUser.created_at,
          };
          setUser(fallbackUser);
          return fallbackUser;
        }
      } else {
        console.error('AUTH DEBUG: Error fetching user profile:', response.status);
        // Create fallback user object for other errors
        const fallbackUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0],
          fullName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
          role: 'user',
          created_at: supabaseUser.created_at,
        };
        setUser(fallbackUser);
        return fallbackUser;
      }
    } catch (error) {
      console.error('AUTH DEBUG: Error fetching user profile:', error);
      // Create fallback user object even on error
      const fallbackUser = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0],
        fullName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
        role: 'user',
        created_at: supabaseUser.created_at,
      };
      setUser(fallbackUser);
      return fallbackUser;
    } finally {
      setIsProcessingAuth(false);
    }
  };

  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    let authStateChangeTimeout: NodeJS.Timeout | null = null;

    // Initial session check
    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log('AUTH DEBUG: Initial session check:', data.session?.user?.email);
        
        if (isMounted && !isProcessingAuth) {
          if (data.session?.user) {
            await fetchUserProfile(data.session.user);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('AUTH DEBUG: Error during initial session check:', error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes with debouncing
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AUTH DEBUG: Auth state change:', event, session?.user?.email);
      
      if (!isMounted) return; // Don't update state if component unmounted
      
      // Clear any pending auth state change
      if (authStateChangeTimeout) {
        clearTimeout(authStateChangeTimeout);
      }
      
      // Debounce auth state changes to prevent rapid-fire updates
      authStateChangeTimeout = setTimeout(async () => {
        if (!isMounted || isProcessingAuth) return;
        
        try {
          if (session?.user) {
            await fetchUserProfile(session.user);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('AUTH DEBUG: Error in auth state change handler:', error);
          // Set user to null on error
          setUser(null);
        } finally {
          // Always set loading to false after handling auth state change
          if (isMounted) {
            setLoading(false);
          }
        }
      }, 100); // 100ms debounce
    });

    return () => {
      isMounted = false;
      if (authStateChangeTimeout) {
        clearTimeout(authStateChangeTimeout);
      }
      listener.subscription.unsubscribe();
    };
  }, []); // Remove isProcessingAuth from dependencies to prevent unnecessary re-runs

  const login = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Don't set user here - let the auth state change handler do it
    // This ensures we fetch the backend profile
    console.log('AUTH DEBUG: Login successful, waiting for auth state change...');
    return data.user;
  };

  const signup = async (email: string, password: string, username?: string, fullName?: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    
    // Don't set user here - let the auth state change handler do it
    console.log('AUTH DEBUG: Signup successful, waiting for auth state change...');
    return data.user;
  };

  const logout = async (_?: void) => {
    console.log('AUTH DEBUG: Logging out...');
    
    try {
      // Prevent other auth operations during logout
      setIsProcessingAuth(true);
      
      // Clear user state immediately for better UX
      setUser(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AUTH DEBUG: Logout error:', error);
        throw error;
      }
      
      console.log('AUTH DEBUG: Logout successful');
      
    } catch (error) {
      console.error('AUTH DEBUG: Logout failed:', error);
      // Even if logout fails, clear local state
      setUser(null);
      throw error;
    } finally {
      setIsProcessingAuth(false);
      setLoading(false);
    }
  };

  const logoutMutation = useMutation<void, Error, void>(logout);

  // Debug log current state
  useEffect(() => {
    console.log('AUTH DEBUG: State update - user:', !!user, 'loading:', loading, 'userEmail:', user?.email, 'userName:', user?.username);
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      logoutMutation, 
      loading, 
      isLoading: loading,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}