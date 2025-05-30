import { create } from "zustand";

export type IndexingStatus =
  | "idle"
  | "queued"
  | "indexing"
  | "done"
  | "error"
  | "removing";

interface IndexingState {
  indexedResourceIds: Set<string>;
  knowledgeBaseId: string | null;
  indexingStatus: Record<string, IndexingStatus>; // resource_id -> status
  setKnowledgeBaseId: (kbId: string | null) => void;
  addIndexedResource: (resourceId: string) => void;
  removeIndexedResource: (resourceId: string) => void;
  setIndexedResources: (resourceIds: string[]) => void; // For initial load
  isResourceIndexed: (resourceId: string) => boolean; // Helper for checking status
  clearIndexingState: () => void;
  setIndexingStatus: (resourceId: string, status: IndexingStatus) => void;
  getIndexingStatus: (resourceId: string) => IndexingStatus;
}

export const useIndexingStore = create<IndexingState>((set, get) => ({
  indexedResourceIds: new Set(),
  knowledgeBaseId: null,
  indexingStatus: {},
  setKnowledgeBaseId: (kbId) => set({ knowledgeBaseId: kbId }),
  addIndexedResource: (resourceId) =>
    set((state) => ({
      indexedResourceIds: new Set(state.indexedResourceIds).add(resourceId),
      indexingStatus: { ...state.indexingStatus, [resourceId]: "done" },
    })),
  removeIndexedResource: (resourceId) =>
    set((state) => {
      const newSet = new Set(state.indexedResourceIds);
      newSet.delete(resourceId);
      const { [resourceId]: omitted, ...rest } = state.indexingStatus;
      void omitted;
      return { indexedResourceIds: newSet, indexingStatus: rest };
    }),
  setIndexedResources: (resourceIds) =>
    set((state) => {
      const newStatus = { ...state.indexingStatus };
      resourceIds.forEach((id) => {
        newStatus[id] = "done";
      });
      return {
        indexedResourceIds: new Set(resourceIds),
        indexingStatus: newStatus,
      };
    }),
  isResourceIndexed: (resourceId) => get().indexedResourceIds.has(resourceId),
  clearIndexingState: () =>
    set({
      indexedResourceIds: new Set(),
      knowledgeBaseId: null,
      indexingStatus: {},
    }),
  setIndexingStatus: (resourceId, status) =>
    set((state) => ({
      indexingStatus: { ...state.indexingStatus, [resourceId]: status },
    })),
  getIndexingStatus: (resourceId) => get().indexingStatus[resourceId] || "idle",
}));
