import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for auth token in localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUserProfile(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        
        // Convert string dates to Date objects
        if (user.createdAt) {
          user.createdAt = new Date(user.createdAt);
        }
        
        setCurrentUser({
          id: user.id.toString(),
          email: user.email,
          displayName: user.display_name || user.email.split('@')[0],
          photoURL: user.photo_url || null,
          createdAt: new Date(user.created_at)
        });
      } else {
        // Token is invalid or expired
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      // Save token
      localStorage.setItem('auth_token', data.token);
      
      // Set user
      const user = data.user;
      setCurrentUser({
        id: user.id.toString(),
        email: user.email,
        displayName: user.display_name || user.email.split('@')[0],
        photoURL: user.photo_url || null,
        createdAt: new Date(user.created_at)
      });
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, displayName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      
      // Save token
      localStorage.setItem('auth_token', data.token);
      
      // Set user
      const user = data.user;
      setCurrentUser({
        id: user.id.toString(),
        email: user.email,
        displayName: user.display_name || user.email.split('@')[0],
        photoURL: user.photo_url || null,
        createdAt: new Date(user.created_at)
      });
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (userData: Partial<User>) => {
    if (!currentUser) return;
    
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: userData.displayName,
          photo_url: userData.photoURL
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const data = await response.json();
      const updatedUser = data.user;
      
      setCurrentUser({
        ...currentUser,
        displayName: updatedUser.display_name || currentUser.displayName,
        photoURL: updatedUser.photo_url || currentUser.photoURL
      });
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    isLoading,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
