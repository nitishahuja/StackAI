export interface UserMetadata {
  avatar_url?: string;
  email: string;
  email_verified: boolean;
  full_name?: string;
  iss?: string;
  name?: string;
  phone_verified: boolean;
  picture?: string;
  provider_id?: string;
  sub?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AppMetadata {
  provider: string;
  providers: string[];
}

export interface Identity {
  identity_id: string;
  id: string;
  user_id: string;
  identity_data: {
    email: string;
    email_verified: boolean;
    phone_verified: boolean;
    sub: string;
    [key: string]: unknown;
  };
  provider: string;
  last_sign_in_at: string;
  created_at: string;
  updated_at: string;
  email: string;
}

export interface User {
  id: string;
  email: string;
  organization_id: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: User;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface DriveResource {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  [key: string]: unknown;
}

export interface Connection {
  id: string;
  provider: string;
  name: string;
  [key: string]: unknown;
}

export interface KnowledgeBaseResponse {
  knowledge_base_id: string;
}

export interface DriveResourceResponse {
  resources?: DriveResource[];
  data?: DriveResource[];
  items?: DriveResource[];
}

export interface GoogleDriveConnection {
  connection_id: string;
  name: string;
  user_id?: string;
}

export interface FileResource {
  resource_id: string;
  inode_type: "file" | "directory";
  inode_path: {
    path: string;
  };
  knowledge_base_id: string | null;
  dataloader_metadata?: {
    content_mime?: string;
    last_modified_at?: string;
    last_modified_by?: string | null;
    created_at?: string;
    created_by?: string;
    web_url?: string;
    path?: string;
  };
  size?: number;
  modified_time?: string;
  mime_type?: string;
  user_metadata?: Record<string, string | number | boolean | null>;
  indexed_at?: string | null;
  status?: "pending" | "indexed" | "failed" | "unknown";
}

export type CreateKnowledgeBaseResponse = {
  knowledge_base_id: string;
};

export type Organization = {
  org_id: string;
  created_at: string;
  org_name: string;
  org_plan: string;
  public_key: string;
  private_key: string;
  stripe_customer_id: string | null;
  client_reference_id: string | null;
  rate_limit: number;
  runs: number;
  runs_date: string;
  runs_day: string;
  runs_per_day: number;
  knowledge_base_max_files_to_sync: number;
  knowledge_base_max_urls_to_sync: number;
  storage_max_bytes_limit: number;
  seats_limit: number | null;
  daily_token_limit: number;
  daily_token_date: string;
  daily_token_usage: number;
  token_usage_last_sent: string | null;
  trial_ends: string | null;
};

export type KnowledgeBase = {
  knowledge_base_id: string;
  connection_id: string;
  created_at: string;
  updated_at: string;
  connection_source_ids: string[];
  website_sources: unknown[];
  connection_provider_type: string;
  is_empty: boolean;
  total_size: number;
  name: string;
  description: string;
  indexing_params: {
    ocr: boolean;
    unstructured: boolean;
    embedding_params: {
      api: string | null;
      base_url: string | null;
      embedding_model: string;
      batch_size: number;
      track_usage: boolean;
      timeout: number;
    };
    chunker_params: {
      chunk_size: number;
      chunk_overlap: number;
      chunker_type: string;
    };
  };
  cron_job_id: string | null;
  org_id: string;
  org_level_role: string | null;
  user_metadata_schema: unknown | null;
  dataloader_metadata_schema: unknown | null;
};
