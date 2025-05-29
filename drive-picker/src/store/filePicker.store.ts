import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FileResource } from "@/types";

// Extended FileResource with folder state and hierarchy tracking
export interface FileResourceWithExpanded extends FileResource {
  isExpanded?: boolean;
  parentId?: string | null;
  created_at?: string; // Ensure this line is present
}

interface FilePickerState {
  resources: FileResourceWithExpanded[];
  breadcrumbs: { id: string | null; name: string }[];
  currentFolderId: string | null;
  currentConnectionId: string | null;
  error: string | null;

  // Actions
  setResources: (resources: FileResourceWithExpanded[]) => void;
  setError: (error: string | null) => void;
  setBreadcrumbs: (breadcrumbs: { id: string | null; name: string }[]) => void;
  setCurrentFolderId: (id: string | null) => void;
  setCurrentConnectionId: (id: string | null) => void;
  navigateToFolder: (folderId: string | null, folderName: string) => void;
  reset: () => void;

  toggleFolderExpanded: (folderId: string) => void;
  addChildrenToFolder: (folderId: string, children: FileResource[]) => void;
  addChildrenAndExpand: (folderId: string, children: FileResource[]) => void;
}

// Utility to update a specific resource in the list
const updateResourceInList = (
  resources: FileResourceWithExpanded[],
  resourceId: string,
  updater: (resource: FileResourceWithExpanded) => void
): FileResourceWithExpanded[] => {
  return resources.map((res) => {
    if (res.resource_id === resourceId) {
      const updated = { ...res };
      updater(updated);
      return updated;
    }
    return res;
  });
};

export const useFilePickerStore = create<FilePickerState>()(
  persist(
    (set) => ({
      resources: [],
      breadcrumbs: [{ id: null, name: "Root" }],
      currentFolderId: null,
      currentConnectionId: null,
      error: null,

      setResources: (resources) =>
        set({
          resources: resources.map((r) => ({ ...r, isExpanded: false })),
          error: null,
        }),

      setError: (error) => set({ error }),

      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

      setCurrentFolderId: (id) => set({ currentFolderId: id }),

      setCurrentConnectionId: (id) => set({ currentConnectionId: id }),

      navigateToFolder: (folderId, folderName) =>
        set((state) => {
          const index = state.breadcrumbs.findIndex(
            (crumb) => crumb.id === folderId
          );

          const newBreadcrumbs =
            folderId === null || index !== -1
              ? folderId === null
                ? [{ id: null, name: "Root" }]
                : state.breadcrumbs.slice(0, index + 1)
              : [...state.breadcrumbs, { id: folderId, name: folderName }];

          return {
            currentFolderId: folderId,
            breadcrumbs: newBreadcrumbs,
            resources: [],
            error: null,
          };
        }),

      reset: () =>
        set({
          resources: [],
          breadcrumbs: [{ id: null, name: "Root" }],
          currentFolderId: null,
          error: null,
        }),

      toggleFolderExpanded: (folderId) =>
        set((state) => {
          const folder = state.resources.find(
            (r) => r.resource_id === folderId
          );
          if (!folder || folder.inode_type !== "directory") return state;

          const wasExpanded = folder.isExpanded;

          let updated = updateResourceInList(
            state.resources,
            folderId,
            (res) => {
              res.isExpanded = !wasExpanded;
            }
          );

          if (wasExpanded) {
            const toRemove = new Set<string>();
            const collectDescendants = (parentId: string) => {
              updated.forEach((res) => {
                if (res.parentId === parentId) {
                  toRemove.add(res.resource_id);
                  if (res.inode_type === "directory") {
                    collectDescendants(res.resource_id);
                  }
                }
              });
            };
            collectDescendants(folderId);
            updated = updated.filter((res) => !toRemove.has(res.resource_id));
          }

          return { resources: updated };
        }),

      addChildrenToFolder: (folderId, children) =>
        set((state) => {
          const parent = state.resources.find(
            (r) => r.resource_id === folderId
          );
          if (!parent || parent.inode_type !== "directory") return state;

          const existingIds = new Set(
            state.resources
              .filter((r) => r.parentId === folderId)
              .map((r) => r.resource_id)
          );

          const newChildren: FileResourceWithExpanded[] = children
            .filter((c) => !existingIds.has(c.resource_id))
            .map((c) => ({
              ...c,
              isExpanded: false,
              parentId: folderId,
            }));

          const parentIndex = state.resources.findIndex(
            (r) => r.resource_id === folderId
          );
          if (parentIndex === -1) return state;

          const before = state.resources.slice(0, parentIndex + 1);
          const after = state.resources.slice(parentIndex + 1);

          return {
            resources: [...before, ...newChildren, ...after],
          };
        }),

      addChildrenAndExpand: (folderId, children) =>
        set((state) => {
          const folder = state.resources.find(
            (r) => r.resource_id === folderId
          );
          if (!folder || folder.inode_type !== "directory") return state;

          const existingIds = new Set(
            state.resources
              .filter((r) => r.parentId === folderId)
              .map((r) => r.resource_id)
          );

          const newChildren: FileResourceWithExpanded[] = children
            .filter((c) => !existingIds.has(c.resource_id))
            .map((c) => ({
              ...c,
              isExpanded: false,
              parentId: folderId,
            }));

          const parentIndex = state.resources.findIndex(
            (r) => r.resource_id === folderId
          );
          if (parentIndex === -1) return state;

          const before = state.resources.slice(0, parentIndex + 1);
          const after = state.resources.slice(parentIndex + 1);

          const inserted = [...before, ...newChildren, ...after];

          const expanded = updateResourceInList(inserted, folderId, (res) => {
            res.isExpanded = true;
          });

          return { resources: expanded };
        }),
    }),
    {
      name: "file-picker-store",
      partialize: (state) => ({
        currentFolderId: state.currentFolderId,
        breadcrumbs: state.breadcrumbs,
      }),
    }
  )
);
