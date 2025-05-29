import {
  FileResource,
  User,
  LoginCredentials,
  GoogleDriveConnection,
  CreateKnowledgeBaseResponse,
  KnowledgeBase,
} from "@/types";
import { useAuthStore } from "@/store/auth.store";

const API_BASE_URL = "https://api.stack-ai.com";
const SUPABASE_AUTH_URL = "https://sb.stack-ai.com";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3VhZGZxaGtseG9rbWxodHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzM0NTg5ODAsImV4cCI6MTk4OTAzNDk4MH0.Xjry9m7oc42_MsLRc1bZhTTzip3srDjJ6fJMkwhXQ9s";

export async function login(credentials: LoginCredentials): Promise<User> {
  try {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          gotrue_meta_security: {},
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Invalid credentials");
    }

    const data = await response.json();
    const accessToken = data.access_token;

    // Set the access token cookie with secure flags
    document.cookie = `access_token=${accessToken}; path=/; max-age=2592000; SameSite=Strict`;

    // Get user info using the access token
    const userResponse = await fetch(`${SUPABASE_AUTH_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Apikey: SUPABASE_ANON_KEY,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to get user info");
    }

    const userData = await userResponse.json();

    // Get organization info
    const orgResponse = await fetch(
      `${API_BASE_URL}/organizations/me/current`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!orgResponse.ok) {
      throw new Error("Failed to get organization info");
    }

    const orgData = await orgResponse.json();

    // Store auth state
    const user: User = {
      id: userData.id,
      email: userData.email,
      organization_id: orgData.org_id,
    };

    // Store in Zustand
    useAuthStore.getState().setUser(user);
    useAuthStore
      .getState()
      .setAuthInfo(accessToken, { Authorization: `Bearer ${accessToken}` });
    useAuthStore.getState().setOrganizationId(orgData.org_id);

    return user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  // Clear the access token cookie
  document.cookie =
    "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  // Clear local state
  useAuthStore.getState().clearAuthInfo();
}

export async function getGoogleDriveConnections(): Promise<
  GoogleDriveConnection[]
> {
  const authHeaders = useAuthStore.getState().authHeaders;
  if (!authHeaders) throw new Error("Not authenticated");

  const response = await fetch(
    `${API_BASE_URL}/connections?connection_provider=gdrive&limit=5`,
    {
      headers: authHeaders,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Google Drive connections");
  }
  const data = await response.json();
  return data; // Assuming response is directly the array of connections
}

export async function getConnectionResources(
  connectionId: string,
  resourceId: string | null
): Promise<FileResource[]> {
  const authHeaders = useAuthStore.getState().authHeaders;
  if (!authHeaders) throw new Error("Not authenticated");

  const url =
    resourceId === "/" || resourceId === null
      ? `${API_BASE_URL}/connections/${connectionId}/resources/children` // Root directory
      : `${API_BASE_URL}/connections/${connectionId}/resources/children?resource_id=${resourceId}`; // Subdirectory

  const response = await fetch(url, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch connection resources");
  }
  const data = await response.json();
  // The notebook shows resources are often nested under a 'data' key
  return data.data || data;
}

export async function getKnowledgeBaseResources(
  kbId: string
): Promise<FileResource[]> {
  const authHeaders = useAuthStore.getState().authHeaders;
  if (!authHeaders) throw new Error("Not authenticated");

  const url = `${API_BASE_URL}/knowledge_bases/${kbId}/resources/children?resource_path=/`; // Assuming fetching root resources for now

  const response = await fetch(url, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch knowledge base resources");
  }
  const data = await response.json();
  // The notebook shows resources are often nested under a 'data' key
  return data.data || data;
}

export async function getKnowledgeBases(): Promise<KnowledgeBase[]> {
  const authHeaders = useAuthStore.getState().authHeaders;
  if (!authHeaders) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE_URL}/knowledge_bases`, {
    headers: authHeaders,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch knowledge bases");
  }
  const data = await response.json();
  // The notebook shows KBs might be returned directly as an array or in a data key
  return data.data || data; // Adjust based on actual API response structure
}

export async function createKnowledgeBase(
  connectionId: string,
  resourceIds: string[],
  name: string,
  description: string,
  organizationId: string
): Promise<CreateKnowledgeBaseResponse> {
  const authHeaders = useAuthStore.getState().authHeaders;
  if (!authHeaders) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE_URL}/knowledge_bases`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connection_id: connectionId,
      connection_source_ids: resourceIds,
      name: name,
      description: description,
      org_id: organizationId,
      // Include other necessary fields based on API spec/notebook
      indexing_params: {
        ocr: false,
        unstructured: true,
        embedding_params: { embedding_model: "text-embedding-ada-002" }, // Simplified
        chunker_params: {
          chunk_size: 1500,
          chunk_overlap: 500,
          chunker_type: "sentence",
        }, // Simplified
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create knowledge base");
  }

  return response.json();
}

export async function deleteKnowledgeBaseResource(
  kbId: string,
  resourcePath: string
): Promise<void> {
  const authHeaders = useAuthStore.getState().authHeaders;
  if (!authHeaders) throw new Error("Not authenticated");

  const url = `${API_BASE_URL}/knowledge_bases/${kbId}/resources?resource_path=${encodeURIComponent(
    resourcePath
  )}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: authHeaders,
  });

  if (!response.ok) {
    // Handle 404 specifically if needed, but general error is fine for now
    throw new Error(`Failed to delete resource: ${response.statusText}`);
  }
  // Successful deletion might return 200 or 204 with no body
}
