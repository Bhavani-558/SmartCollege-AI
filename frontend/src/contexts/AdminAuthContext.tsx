import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  adminService,
  getStoredAdminToken,
  removeStoredAdminToken,
} from "../services/adminService";
import type { AdminUser } from "../types/admin";

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  checkSession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getStoredAdminToken());
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkSession = useCallback(async (): Promise<boolean> => {
    const existingToken = getStoredAdminToken();
    if (!existingToken) {
      setToken(null);
      setAdminUser(null);
      setIsLoading(false);
      return false;
    }

    try {
      const user = await adminService.getMe(existingToken);
      setToken(existingToken);
      setAdminUser(user);
      setIsLoading(false);
      return true;
    } catch {
      removeStoredAdminToken();
      setToken(null);
      setAdminUser(null);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const login = async (credentials: { username: string; password: string }): Promise<void> => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const response = await adminService.login(credentials);
      setToken(response.access_token);
      try {
        const user = await adminService.getMe(response.access_token);
        setAdminUser(user);
      } catch {
        setAdminUser({ username: response.username, role: "admin" });
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.";
      setAuthError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await adminService.logout();
    } finally {
      removeStoredAdminToken();
      setToken(null);
      setAdminUser(null);
      setAuthError(null);
      setIsLoading(false);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        token,
        isAuthenticated: !!token && !!adminUser,
        isLoading,
        authError,
        login,
        logout,
        clearAuthError,
        checkSession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
