import { create } from "zustand";

interface IndexingState {
  indexedResourceIds: Set<string>;
  knowledgeBaseId: string | null;
  setKnowledgeBaseId: (kbId: string | null) => void;
  addIndexedResource: (resourceId: string) => void;
  removeIndexedResource: (resourceId: string) => void;
  setIndexedResources: (resourceIds: string[]) => void; // For initial load
  isResourceIndexed: (resourceId: string) => boolean; // Helper for checking status
  clearIndexingState: () => void;
}

export const useIndexingStore = create<IndexingState>((set, get) => ({
  indexedResourceIds: new Set(),
  knowledgeBaseId: null,
  setKnowledgeBaseId: (kbId) => set({ knowledgeBaseId: kbId }),
  addIndexedResource: (resourceId) =>
    set((state) => ({
      indexedResourceIds: new Set(state.indexedResourceIds).add(resourceId),
    })),
  removeIndexedResource: (resourceId) =>
    set((state) => {
      const newSet = new Set(state.indexedResourceIds);
      newSet.delete(resourceId);
      return { indexedResourceIds: newSet };
    }),
  setIndexedResources: (resourceIds) =>
    set({ indexedResourceIds: new Set(resourceIds) }),
  isResourceIndexed: (resourceId) => get().indexedResourceIds.has(resourceId),
  clearIndexingState: () =>
    set({ indexedResourceIds: new Set(), knowledgeBaseId: null }),
}));
