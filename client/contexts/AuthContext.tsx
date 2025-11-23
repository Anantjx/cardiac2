import { createContext, useContext, useState } from "react";

interface AuthContextType {
  currentUser: null;
  loading: false;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // No authentication - always return null user
  const currentUser = null;
  const loading = false;

  async function signup(email: string, password: string, displayName?: string) {
    // No-op - authentication disabled
    return Promise.resolve();
  }

  async function login(email: string, password: string) {
    // No-op - authentication disabled
    return Promise.resolve();
  }

  async function loginWithGoogle() {
    // No-op - authentication disabled
    return Promise.resolve();
  }

  async function logout() {
    // No-op - authentication disabled
    return Promise.resolve();
  }

  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
