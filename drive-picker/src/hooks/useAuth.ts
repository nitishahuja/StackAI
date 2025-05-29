import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import type { LoginCredentials } from "@/types";

export function useAuth() {
  const router = useRouter();
  const { setUser, setAuthInfo, setOrganizationId } = useAuthStore();

  const handleLogin = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const user = await login(credentials);
        if (user) {
          setUser(user);
          setOrganizationId(user.organization_id);
          // Note: setAuthInfo should be called with the actual token and headers from the response
          // This would need to be updated based on your actual API response structure
          router.push("/dashboard");
          return user;
        }
        throw new Error("Login failed - no user returned");
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    [router, setUser, setAuthInfo, setOrganizationId]
  );

  return { handleLogin };
}
