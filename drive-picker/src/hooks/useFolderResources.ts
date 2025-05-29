import { useEffect } from "react";
import useSWR, { SWRResponse } from "swr";
import { getConnectionResources } from "@/lib/api";
import { FileResource } from "@/types";
import { useAuthStore } from "@/store/auth.store";
import { useFilePickerStore } from "@/store/filePicker.store";

// Define a fetcher function for SWR
const fetcher = async ([connectionId, folderId]: [
  string | null,
  string | null
]) => {
  if (!connectionId) return [];
  // getConnectionResources expects resourceId, which is folderId here
  const resources = await getConnectionResources(connectionId, folderId || "/");
  return resources;
};

interface UseFolderResourcesResult {
  resources: FileResource[];
  isLoading: boolean;
  error: Error | null;
  mutate: SWRResponse<FileResource[], Error>["mutate"];
}

export function useFolderResources(
  folderId?: string
): UseFolderResourcesResult {
  const { connectionId } = useAuthStore();
  const { setResources } = useFilePickerStore(); // Use store action to update resources

  // SWR key includes the dependencies that should trigger a re-fetch
  const swrKey = [connectionId, folderId];

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () => fetcher(swrKey as [string | null, string | null]),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      cacheTime: 30000, // Cache for 30 seconds
      shouldRetryOnError: false,
    }
  );

  // Update the filePicker store whenever the data changes
  useEffect(() => {
    if (data) {
      // Normalize resources to always have 'modified_time'
      const normalized = data.map((r) => ({
        ...r,
        modified_time:
          r.modified_time ||
          (r as unknown as { modified_at?: string }).modified_at,
      }));
      setResources(normalized);
    }
  }, [data, setResources]);

  return {
    resources: data || [],
    isLoading,
    error,
    mutate,
  };
}
