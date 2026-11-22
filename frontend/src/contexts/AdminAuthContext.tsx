
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { adminService } from "../services/adminService";
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

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const user = await adminService.getMe();

      setToken("cookie-session");
      setAdminUser(user);
      return true;
    } catch {
      setToken(null);
      setAdminUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const login = async (
    credentials: { username: string; password: string }
  ): Promise<void> => {
    setAuthError(null);
    setIsLoading(true);

    try {
      await adminService.login(credentials);

      // Verify the session using the HttpOnly authentication cookie.
      const user = await adminService.getMe();

      setToken("cookie-session");
      setAdminUser(user);
    } catch (err: unknown) {
      setToken(null);
      setAdminUser(null);

      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to sign in. Please verify your credentials.";

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
