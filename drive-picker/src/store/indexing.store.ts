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
  indexQueue: string[];
  removeQueue: string[];
  setKnowledgeBaseId: (kbId: string | null) => void;
  addIndexedResource: (resourceId: string) => void;
  removeIndexedResource: (resourceId: string) => void;
  setIndexedResources: (resourceIds: string[]) => void; // For initial load
  isResourceIndexed: (resourceId: string) => boolean; // Helper for checking status
  clearIndexingState: () => void;
  queueIndexing: (resourceId: string) => void;
  queueRemoving: (resourceId: string) => void;
  processNextIndexing: () => void;
  processNextRemoving: () => void;
  setIndexingStatus: (resourceId: string, status: IndexingStatus) => void;
  getIndexingStatus: (resourceId: string) => IndexingStatus;
}

export const useIndexingStore = create<IndexingState>((set, get) => ({
  indexedResourceIds: new Set(),
  knowledgeBaseId: null,
  indexingStatus: {},
  indexQueue: [],
  removeQueue: [],
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
      indexQueue: [],
      removeQueue: [],
    }),
  queueIndexing: (resourceId) => {
    set((state) => {
      if (state.indexQueue.includes(resourceId)) return state;
      return {
        indexQueue: [...state.indexQueue, resourceId],
        indexingStatus: { ...state.indexingStatus, [resourceId]: "queued" },
      };
    });
    get().processNextIndexing();
  },
  queueRemoving: (resourceId) => {
    set((state) => {
      if (state.removeQueue.includes(resourceId)) return state;
      return {
        removeQueue: [...state.removeQueue, resourceId],
        indexingStatus: { ...state.indexingStatus, [resourceId]: "queued" },
      };
    });
    get().processNextRemoving();
  },
  processNextIndexing: async () => {
    const { indexQueue, indexingStatus } = get();
    if (indexQueue.length === 0) return;
    const currentId = indexQueue[0];
    if (indexingStatus[currentId] === "indexing") return; // already processing
    set((state) => ({
      indexingStatus: { ...state.indexingStatus, [currentId]: "indexing" },
    }));
    // Actual indexing logic should be handled in the component, this just manages the queue and status
  },
  processNextRemoving: async () => {
    const { removeQueue, indexingStatus } = get();
    if (removeQueue.length === 0) return;
    const currentId = removeQueue[0];
    if (indexingStatus[currentId] === "removing") return; // already processing
    set((state) => ({
      indexingStatus: { ...state.indexingStatus, [currentId]: "removing" },
    }));
    // Actual removing logic should be handled in the component, this just manages the queue and status
  },
  setIndexingStatus: (resourceId, status) =>
    set((state) => ({
      indexingStatus: { ...state.indexingStatus, [resourceId]: status },
    })),
  getIndexingStatus: (resourceId) => get().indexingStatus[resourceId] || "idle",
}));
