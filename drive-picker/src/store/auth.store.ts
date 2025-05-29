import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  organization_id: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  authHeaders: Record<string, string> | null;
  organizationId: string | null;
  connectionId: string | null;
  setUser: (user: User | null) => void;
  setAuthInfo: (
    accessToken: string | null,
    authHeaders: Record<string, string> | null
  ) => void;
  setOrganizationId: (organizationId: string | null) => void;
  setConnectionId: (connectionId: string | null) => void;
  clearAuthInfo: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      authHeaders: null,
      organizationId: null,
      connectionId: null,
      setUser: (user) => set({ user }),
      setAuthInfo: (accessToken, authHeaders) =>
        set({ accessToken, authHeaders }),
      setOrganizationId: (organizationId) => set({ organizationId }),
      setConnectionId: (connectionId) => set({ connectionId }),
      clearAuthInfo: () =>
        set({
          user: null,
          accessToken: null,
          authHeaders: null,
          organizationId: null,
          connectionId: null,
        }),
    }),
    {
      name: "auth-storage", // unique name for localStorage
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        authHeaders: state.authHeaders,
        organizationId: state.organizationId,
      }),
    }
  )
);
