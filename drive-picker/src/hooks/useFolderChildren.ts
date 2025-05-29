import useSWR from "swr";
import { getConnectionResources } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
// import { useFilePickerStore } from "@/store/filePicker.store"; // Not used here
import { FileResource } from "@/types";
import { useMemo } from "react";

// Define a fetcher function for SWR
const fetcher = async ([connectionId, folderId]: [string, string]) => {
  if (!connectionId || !folderId) return [];
  // getConnectionResources expects resourceId, which is folderId here
  const resources = await getConnectionResources(connectionId, folderId);
  return resources;
};

interface UseFolderChildrenResult {
  children: FileResource[]; // This hook doesn't update the store directly, it fetches for a single folder
  isLoading: boolean;
  error: Error | null;
}

export function useFolderChildren(
  folderId: string | null
): UseFolderChildrenResult {
  const { connectionId } = useAuthStore();

  // SWR key includes the dependencies that should trigger a re-fetch
  // Only fetch if folderId and connectionId are available
  const swrKey = connectionId && folderId ? [connectionId, folderId] : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    () => fetcher(swrKey as [string, string]), // Cast is safe due to swrKey check
    { revalidateOnFocus: false }
  );

  const normalizedChildren = useMemo(
    () =>
      (data || []).map((r) => ({
        ...r,
        modified_time:
          r.modified_time ||
          (r as unknown as { modified_at?: string }).modified_at,
      })),
    [data]
  );

  return {
    children: normalizedChildren,
    isLoading,
    error,
  };
}
