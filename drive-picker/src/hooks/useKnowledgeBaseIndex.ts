import { useEffect, useCallback } from "react";
import useSWR, { SWRResponse } from "swr";
import { getKnowledgeBaseResources } from "@/lib/api";
import { useIndexingStore } from "@/store/indexing.store";
import { FileResource } from "@/types";

// Define a fetcher function for SWR
const fetcher = async (kbId: string | null) => {
  if (!kbId) return [];
  const indexedFiles = await getKnowledgeBaseResources(kbId);
  return indexedFiles.map((res: FileResource) => res.resource_id);
};

interface UseKnowledgeBaseIndexResult {
  indexedIds: Set<string>;
  isLoading: boolean;
  error: SWRResponse<string[] | undefined, Error>["error"];
  refresh: SWRResponse<string[] | undefined, Error>["mutate"];
  isIndexed: (resourceId: string) => boolean;
}

export function useKnowledgeBaseIndex(): UseKnowledgeBaseIndexResult {
  const {
    knowledgeBaseId,
    indexedResourceIds,
    setIndexedResources,
    isResourceIndexed,
  } = useIndexingStore();

  // SWR key is the knowledgeBaseId
  const swrKey = knowledgeBaseId;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () => fetcher(swrKey),
    { revalidateOnFocus: false }
  );

  // Update the indexing store whenever the data changes
  useEffect(() => {
    if (data) {
      setIndexedResources(data);
    } else if (knowledgeBaseId && !data && !isLoading && !error) {
      // If there's a KB selected but no data fetched (e.g., empty KB), clear indexed resources in store
      setIndexedResources([]);
    }
  }, [data, knowledgeBaseId, isLoading, error, setIndexedResources]); // Add relevant dependencies

  const refresh = useCallback(() => {
    // Use mutate to re-fetch the data for the current SWR key (knowledgeBaseId)
    return mutate();
  }, [mutate]);

  return {
    indexedIds: indexedResourceIds,
    isLoading,
    error,
    refresh,
    isIndexed: isResourceIndexed,
  };
}
