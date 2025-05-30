"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  useFilePickerStore,
  FileResourceWithExpanded,
} from "@/store/filePicker.store";
import { useFolderResources } from "@/hooks/useFolderResources";
import { useFolderChildren } from "@/hooks/useFolderChildren";
import { useIndexingStore } from "@/store/indexing.store";
import { isFileIndexed, createKnowledgeBase, removeFromKB } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { getConnectionResources } from "@/lib/api"; // Ensure this is imported
import { mutate } from "swr";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  ArrowUpDown,
  Filter,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { cn, formatFileSize, formatDate } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { getFileIcon } from "@/lib/fileIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { IndexingStatus } from "@/store/indexing.store";

interface FilePickerProps {
  connectionId: string;
}

const typeOptions = [
  { label: "All", value: "all" },
  { label: "Folders", value: "directory" },
  { label: "Files", value: "file" },
];

// Calculate how deep to indent each row
const getIndentationLevel = (
  resource: FileResourceWithExpanded,
  all: FileResourceWithExpanded[]
): number => {
  let level = 0;
  let current = resource;
  while (current.parentId) {
    const parent = all.find((r) => r.resource_id === current.parentId);
    if (parent) {
      level++;
      current = parent;
    } else break;
  }
  return level;
};

// Unique SWR key helper
const folderKey = (connectionId: string, folderId: string) =>
  folderId === null
    ? `connection-${connectionId}-root`
    : `connection-${connectionId}-folder-${folderId}`;

// Premium badge component for status
const StatusBadge = ({ status }: { status: IndexingStatus }) => {
  const base =
    "inline-block px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-200";
  switch (status) {
    case "queued":
      return (
        <span className={`${base} bg-blue-100 text-blue-700 border-blue-200`}>
          Queued
        </span>
      );
    case "indexing":
      return (
        <span
          className={`${base} bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1`}
        >
          <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          <span>Indexing</span>
        </span>
      );
    case "done":
      return (
        <span className={`${base} bg-gray-100 text-gray-700 border-gray-200`}>
          Indexed
        </span>
      );
    case "error":
      return (
        <span className={`${base} bg-red-100 text-red-700 border-red-200`}>
          Error
        </span>
      );
    default:
      return null;
  }
};

export function FilePicker({ connectionId }: FilePickerProps) {
  const {
    resources: allResources,
    currentFolderId,
    toggleFolderExpanded,
    addChildrenAndExpand,
    addChildrenToFolder,
    setCurrentConnectionId,
  } = useFilePickerStore();

  const [expandingFolderId, setExpandingFolderId] = useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const { isLoading: loadingRoot, error: rootError } = useFolderResources(
    currentFolderId ?? undefined
  );
  const {
    children: fetchedChildren,
    isLoading: loadingChildren,
    error: childrenError,
  } = useFolderChildren(expandingFolderId);

  const {
    indexedResourceIds,
    addIndexedResource,
    removeIndexedResource,
    setKnowledgeBaseId,
    setIndexingStatus,
    getIndexingStatus,
    queueIndexing,
    queueRemoving,
    indexQueue,
    removeQueue,
    processNextIndexing,
    processNextRemoving,
  } = useIndexingStore();

  const setIndexingStore = useIndexingStore.setState;

  // Track which folders have been prefetched to avoid duplicate fetches
  const prefetchedFolders = useRef<Set<string>>(new Set());

  useEffect(() => {
    setCurrentConnectionId(connectionId);
  }, [connectionId, setCurrentConnectionId]);

  useEffect(() => {
    if (fetchedChildren && expandingFolderId && !loadingChildren) {
      const enriched = fetchedChildren.map((child) => ({
        ...child,
        parentId: expandingFolderId,
      }));
      addChildrenAndExpand(expandingFolderId, enriched);
      setExpandingFolderId(null);
    }
  }, [
    fetchedChildren,
    expandingFolderId,
    loadingChildren,
    addChildrenAndExpand,
  ]);

  useEffect(() => {
    if (childrenError && expandingFolderId) {
      console.error("Error loading folder children", childrenError);
      setExpandingFolderId(null);
    }
  }, [childrenError, expandingFolderId]);

  // Smart prefetch function with SWR caching
  const prefetchFolder = useCallback(
    async (folder: FileResourceWithExpanded) => {
      if (
        folder.inode_type !== "directory" ||
        prefetchedFolders.current.has(folder.resource_id)
      )
        return;

      const key = folderKey(connectionId, folder.resource_id);

      // Check if we already have this data in SWR cache
      const cached = await mutate(key, undefined, false);
      if (cached) return;

      try {
        const children = await mutate(
          key,
          async () => {
            const fetched = await getConnectionResources(
              connectionId,
              folder.resource_id
            );
            return fetched;
          },
          { revalidate: false }
        );

        if (!children) return;

        const enriched = children.map((child) => ({
          ...child,
          parentId: folder.resource_id,
        }));
        // Use addChildrenToFolder to add without expanding
        addChildrenToFolder(folder.resource_id, enriched);
        prefetchedFolders.current.add(folder.resource_id);
      } catch (err) {
        console.error("Prefetch failed", err);
      }
    },
    [connectionId, addChildrenToFolder]
  );

  // Restore eager loading of top-level folders
  useEffect(() => {
    if (allResources && allResources.length > 0) {
      const topLevelFolders = allResources.filter(
        (r) => r.inode_type === "directory" && !r.parentId
      );
      topLevelFolders.forEach((folder) => prefetchFolder(folder));
    }
  }, [allResources, prefetchFolder]);

  const handleFolderClick = (folder: FileResourceWithExpanded) => {
    if (folder.isExpanded) {
      toggleFolderExpanded(folder.resource_id);
      return;
    }

    // Check if we already have the children in our store
    const alreadyLoaded = allResources.some(
      (r) => r.parentId === folder.resource_id
    );

    if (alreadyLoaded) {
      // If we have the data, just toggle expansion
      toggleFolderExpanded(folder.resource_id);
    } else if (prefetchedFolders.current.has(folder.resource_id)) {
      // If we've prefetched but haven't added to store yet, wait for the prefetch to complete
      toggleFolderExpanded(folder.resource_id);
    } else {
      // Only set expandingFolderId if we haven't prefetched and don't have the data
      setExpandingFolderId(folder.resource_id);
    }
  };

  const handleDelete = (resource: FileResourceWithExpanded) => {
    queueRemoving(resource.resource_id);
  };

  // Effect to process the remove queue
  useEffect(() => {
    if (removeQueue.length === 0) return;
    const resourceId = removeQueue[0];
    if (getIndexingStatus(resourceId) !== "removing") return;
    const doRemove = async () => {
      setDeletingFileId(resourceId);
      const kbId = useIndexingStore.getState().knowledgeBaseId;
      if (!kbId) {
        setIndexingStatus(resourceId, "error");
        processNextRemoving();
        setDeletingFileId(null);
        return;
      }
      try {
        await removeFromKB(
          kbId,
          allResources.find((r) => r.resource_id === resourceId)?.inode_path
            .path || ""
        );
        removeIndexedResource(resourceId);
        setIndexingStatus(resourceId, "idle");
      } catch (error) {
        setIndexingStatus(resourceId, "error");
        console.error("Failed to remove file:", error);
      } finally {
        setDeletingFileId(null);
        setIndexingStore((state) => ({
          removeQueue: state.removeQueue.slice(1),
        }));
        processNextRemoving();
      }
    };
    doRemove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeQueue, getIndexingStatus]);

  // Effect to process the index queue
  useEffect(() => {
    if (indexQueue.length === 0) return;
    const resourceId = indexQueue[0];
    if (getIndexingStatus(resourceId) !== "indexing") return;
    const doIndex = async () => {
      const orgId = useAuthStore.getState().organizationId;
      if (!orgId) {
        setIndexingStatus(resourceId, "error");
        processNextIndexing();
        return;
      }
      try {
        const resource = allResources.find((r) => r.resource_id === resourceId);
        if (!resource) throw new Error("Resource not found");
        const response = await createKnowledgeBase(
          connectionId,
          [resource.resource_id],
          resource.inode_path.path,
          "File indexed for search and retrieval",
          orgId,
          resource.dataloader_metadata?.content_mime ||
            "application/octet-stream"
        );
        resource.knowledge_base_id = response.knowledge_base_id;
        setKnowledgeBaseId(response.knowledge_base_id);
        addIndexedResource(resource.resource_id);
        setIndexingStatus(resource.resource_id, "done");
      } catch (error) {
        setIndexingStatus(resourceId, "error");
        console.error("Failed to index file:", error);
      } finally {
        setIndexingStore((state) => ({
          indexQueue: state.indexQueue.slice(1),
        }));
        processNextIndexing();
      }
    };
    doIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexQueue, getIndexingStatus]);

  const checkIndexStatus = useCallback(
    async (resourceId: string) => {
      if (await isFileIndexed(resourceId)) {
        addIndexedResource(resourceId);
      }
    },
    [addIndexedResource]
  );

  useEffect(() => {
    const newResources = allResources.filter(
      (resource) => !indexedResourceIds.has(resource.resource_id)
    );

    if (newResources.length > 0) {
      checkIndexStatus(newResources[0].resource_id);
    }
  }, [allResources, indexedResourceIds, checkIndexStatus]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const filteredResources = useMemo(() => {
    let result = allResources;
    if (typeFilter !== "all") {
      result = result.filter((r) => r.inode_type === typeFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r) =>
        r.inode_path.path.toLowerCase().includes(term)
      );
    }
    return result;
  }, [allResources, typeFilter, searchTerm]);

  const visibleResources = useMemo(() => {
    const map = new Map<string | null, FileResourceWithExpanded[]>();
    filteredResources.forEach((res) => {
      const parent = res.parentId ?? null;
      if (!map.has(parent)) map.set(parent, []);
      map.get(parent)!.push(res);
    });

    const sortFn = (
      a: FileResourceWithExpanded,
      b: FileResourceWithExpanded
    ) => {
      if (sortBy === "name") {
        return sortDirection === "asc"
          ? a.inode_path.path.localeCompare(b.inode_path.path)
          : b.inode_path.path.localeCompare(a.inode_path.path);
      }
      if (sortBy === "date") {
        const aTime = new Date(a.modified_time || a.created_at || "").getTime();
        const bTime = new Date(b.modified_time || b.created_at || "").getTime();
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }
      return 0;
    };

    const result: FileResourceWithExpanded[] = [];

    const walk = (parentId: string | null) => {
      const children = map.get(parentId) || [];
      children.sort(sortFn).forEach((child) => {
        result.push(child);
        if (child.inode_type === "directory" && child.isExpanded) {
          walk(child.resource_id);
        }
      });
    };

    walk(null); // start at root
    return result;
  }, [filteredResources, sortBy, sortDirection]);

  const renderSkeletonRows = (parentId: string) => {
    return [...Array(3)].map((_, i) => (
      <TableRow key={`skeleton-${parentId}-${i}`} className="animate-pulse">
        <TableCell
          className="flex items-center py-2 text-sm font-medium text-gray-900"
          style={{
            paddingLeft: `${
              20 +
              (getIndentationLevel(
                { parentId } as FileResourceWithExpanded,
                allResources
              ) +
                1) *
                16
            }px`,
          }}
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-40" />
          </div>
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-20" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-12 ml-auto" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-5 ml-auto" />
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Card className="overflow-hidden rounded-xl border shadow bg-white">
      <CardContent className="p-0">
        {/* Filter and Search */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50/80">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "pr-8 h-8 text-sm bg-white border border-gray-200 shadow-sm font-medium rounded-md",
                  "relative z-10",
                  typeFilter !== "all" && "ring-2 ring-blue-200"
                )}
              >
                <Filter className="h-5 w-5 mr-2 text-blue-500" />
                {typeOptions.find((o) => o.value === typeFilter)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-white border border-gray-200 shadow-lg rounded-lg"
            >
              {typeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTypeFilter(option.value)}
                  className={cn(
                    "hover:bg-blue-50 transition-colors",
                    typeFilter === option.value &&
                      "font-semibold bg-blue-100 text-blue-700"
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm max-w-xs border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* File Table */}
        <div className="rounded-b-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-blue-50">
              <TableRow>
                <TableHead
                  className="cursor-pointer pl-12 font-semibold text-gray-800 text-sm select-none w-auto flex-grow"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name
                    {sortBy === "name" && (
                      <ArrowUpDown className="h-4 w-4 ml-2 text-blue-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="hidden sm:table-cell cursor-pointer w-[140px] font-semibold text-gray-800 text-sm select-none text-center"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center justify-center w-full">
                    Date
                    {sortBy === "date" && (
                      <ArrowUpDown className="h-4 w-4 ml-2 text-blue-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden sm:table-cell w-[90px] font-semibold text-gray-800 text-sm select-none text-center">
                  <div className="w-full text-center">Size/Type</div>
                </TableHead>
                <TableHead className="w-[110px] min-w-[110px] font-semibold text-gray-800 text-sm select-none text-center">
                  <div className="w-full text-center">Action</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            {loadingRoot ? (
              <TableBody>
                {[...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-5 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : (
              <TableBody>
                {visibleResources.map((resource) => {
                  const indent = getIndentationLevel(resource, allResources);
                  const isLoading =
                    expandingFolderId === resource.resource_id &&
                    loadingChildren;

                  return (
                    <React.Fragment key={resource.resource_id}>
                      <TableRow
                        onClick={() => {
                          if (resource.inode_type === "directory") {
                            handleFolderClick(resource);
                          }
                        }}
                        onMouseEnter={() => {
                          if (resource.inode_type === "directory") {
                            prefetchFolder(resource);
                          }
                        }}
                        className={cn(
                          "cursor-pointer group hover:bg-blue-100/60 transition-colors duration-200"
                        )}
                        style={{ transition: "background 0.2s" }}
                      >
                        <TableCell
                          className="flex items-center py-2 text-sm font-medium text-gray-900 w-auto flex-grow"
                          style={{ paddingLeft: `${20 + indent * 16}px` }}
                        >
                          {resource.inode_type === "directory" ? (
                            resource.isExpanded ? (
                              <ChevronDown className="h-4 w-4 mr-2 text-blue-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2 text-blue-400" />
                            )
                          ) : (
                            <span className="w-5 h-5 mr-2" />
                          )}

                          {resource.inode_type === "directory"
                            ? getFileIcon(resource)
                            : getFileIcon(resource)}
                          <span
                            className="truncate overflow-hidden max-w-[140px] sm:max-w-[480px] lg:max-w-full text-gray-900 text-sm"
                            title={resource.inode_path.path}
                          >
                            {resource.inode_path.path}
                          </span>
                        </TableCell>

                        <TableCell className="hidden sm:table-cell text-sm text-gray-500 text-center align-middle">
                          {formatDate(
                            resource.modified_time || resource.created_at
                          )}
                        </TableCell>

                        <TableCell className="hidden sm:table-cell text-sm text-gray-500 text-center align-middle">
                          {resource.inode_type === "file"
                            ? formatFileSize(resource.size)
                            : "Folder"}
                        </TableCell>

                        <TableCell className="text-sm text-gray-500 text-center align-middle w-[110px] min-w-[110px]">
                          {resource.inode_type === "file" && (
                            <div className="flex items-center justify-center gap-1 mx-auto min-h-6">
                              {/* Show status badge if not idle */}
                              {(() => {
                                const status = getIndexingStatus(
                                  resource.resource_id
                                );
                                if (deletingFileId === resource.resource_id) {
                                  return (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1">
                                      <span className="inline-block w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                                      <span>Removing…</span>
                                    </span>
                                  );
                                }
                                if (status && status !== "idle") {
                                  return <StatusBadge status={status} />;
                                }
                                if (
                                  !indexedResourceIds.has(resource.resource_id)
                                ) {
                                  return (
                                    <Tooltip
                                      content="Index this file for search & retrieval"
                                      placement="right"
                                    >
                                      <button
                                        className="text-blue-500 hover:text-blue-700 rounded-full p-1 transition-colors duration-150 bg-blue-50 hover:bg-blue-100 shadow-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          queueIndexing(resource.resource_id);
                                        }}
                                        disabled={
                                          getIndexingStatus(
                                            resource.resource_id
                                          ) !== "idle"
                                        }
                                      >
                                        <PlusCircle className="h-4 w-4" />
                                      </button>
                                    </Tooltip>
                                  );
                                }
                                return null;
                              })()}
                              {/* Remove from KB button, only if indexed and not removing */}
                              {indexedResourceIds.has(resource.resource_id) &&
                                deletingFileId !== resource.resource_id && (
                                  <Tooltip
                                    content="Remove this file from the knowledge base"
                                    placement="right"
                                  >
                                    <button
                                      className="text-red-500 hover:text-red-700 rounded-full p-1 transition-colors duration-150 bg-red-50 hover:bg-red-100 shadow-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(resource);
                                      }}
                                      disabled={
                                        deletingFileId === resource.resource_id
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </Tooltip>
                                )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {isLoading && renderSkeletonRows(resource.resource_id)}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            )}
          </Table>

          {/* Empty/No Data State */}
          {!loadingRoot &&
            visibleResources.length === 0 &&
            !rootError &&
            !childrenError && (
              <div className="text-center text-gray-400 py-16 animate-fade-in">
                <FolderIcon className="h-14 w-14 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">
                  No data found.
                  <br />
                  Try a different connection.
                </p>
              </div>
            )}

          {(rootError || childrenError) && (
            <div className="text-center text-red-500 py-16 animate-fade-in">
              <p className="text-lg">Failed to load folder contents.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
