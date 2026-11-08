import { createContext, useContext, useState, ReactNode } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  setAuthToken,
  AuthUser,
} from '@/services/api';

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      setToken(res.token);
      setAuthToken(res.token);
      setUser(res.data);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiRegister(name, email, password, password);
      setToken(res.token);
      setAuthToken(res.token);
      setUser(res.data);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await apiLogout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
