"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  useFilePickerStore,
  FileResourceWithExpanded,
} from "@/store/filePicker.store";
import { useFolderResources } from "@/hooks/useFolderResources";
import { useFolderChildren } from "@/hooks/useFolderChildren";
import { useIndexingStore } from "@/store/indexing.store";
import { isFileIndexed, createKnowledgeBase, removeFromKB } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

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
  Loader2,
  Filter,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { getFileIcon } from "@/lib/fileIcons";

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

export function FilePicker({ connectionId }: FilePickerProps) {
  const {
    resources: allResources,
    currentFolderId,
    toggleFolderExpanded,
    addChildrenAndExpand,
    setCurrentConnectionId,
  } = useFilePickerStore();

  const [expandingFolderId, setExpandingFolderId] = useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [indexingFileId, setIndexingFileId] = useState<string | null>(null);
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
  } = useIndexingStore();

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

  const handleFolderClick = (folder: FileResourceWithExpanded) => {
    if (folder.isExpanded) {
      toggleFolderExpanded(folder.resource_id);
      return;
    }

    const alreadyLoaded = allResources.some(
      (r) => r.parentId === folder.resource_id
    );
    if (alreadyLoaded) {
      toggleFolderExpanded(folder.resource_id);
    } else {
      setExpandingFolderId(folder.resource_id);
    }
  };

  const handleDelete = async (resource: FileResourceWithExpanded) => {
    const kbId = useIndexingStore.getState().knowledgeBaseId;
    if (!kbId) {
      console.error("Knowledge Base ID is not available");
      return;
    }

    setDeletingFileId(resource.resource_id);
    try {
      await removeFromKB(kbId, resource.inode_path.path);
      removeIndexedResource(resource.resource_id);
    } catch (error) {
      console.error("Failed to remove file:", error);
    } finally {
      setDeletingFileId(null);
    }
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
                  className="cursor-pointer pl-4 font-semibold text-gray-800 text-sm select-none"
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
                  className="cursor-pointer w-[140px] font-semibold text-gray-800 text-sm select-none"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">
                    Date
                    {sortBy === "date" && (
                      <ArrowUpDown className="h-4 w-4 ml-2 text-blue-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right w-[90px] font-semibold text-gray-800 text-sm select-none">
                  Size/Type
                </TableHead>
                <TableHead className="text-right w-[90px] font-semibold text-gray-800 text-sm select-none">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleResources.map((resource) => {
                const indent = getIndentationLevel(resource, allResources);
                const isLoading =
                  expandingFolderId === resource.resource_id && loadingChildren;
                const isIndexing = indexingFileId === resource.resource_id;
                const isDeleting = deletingFileId === resource.resource_id;

                return (
                  <TableRow
                    key={resource.resource_id}
                    onClick={() => {
                      if (resource.inode_type === "directory") {
                        handleFolderClick(resource);
                      }
                    }}
                    className={cn(
                      "cursor-pointer group hover:bg-blue-100/60 transition-colors duration-200",
                      isLoading && "bg-gray-50/70",
                      indexedResourceIds.has(resource.resource_id) &&
                        "bg-green-50"
                    )}
                    style={{ transition: "background 0.2s" }}
                  >
                    <TableCell
                      className="flex items-center py-2 text-sm font-medium text-gray-900"
                      style={{ paddingLeft: `${20 + indent * 16}px` }}
                    >
                      {resource.inode_type === "directory" ? (
                        isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />
                        ) : resource.isExpanded ? (
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
                      <span className="truncate text-gray-900 text-sm">
                        {resource.inode_path.path}
                      </span>
                    </TableCell>

                    <TableCell className="text-sm text-gray-500">
                      {new Date(
                        resource.modified_time || resource.created_at || ""
                      ).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-sm text-gray-500 text-right">
                      {resource.inode_type === "file"
                        ? formatFileSize(resource.size)
                        : "Folder"}
                    </TableCell>

                    <TableCell className="text-sm text-gray-500 text-right">
                      {resource.inode_type === "file" && (
                        <div className="flex items-center justify-end gap-1">
                          {!indexedResourceIds.has(resource.resource_id) ? (
                            <Tooltip
                              content="Index this file for search & retrieval"
                              placement="right"
                            >
                              <button
                                className="text-blue-500 hover:text-blue-700 rounded-full p-1 transition-colors duration-150 bg-blue-50 hover:bg-blue-100 shadow-sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const orgId =
                                    useAuthStore.getState().organizationId;
                                  if (!orgId) {
                                    console.error(
                                      "Organization ID is not available"
                                    );
                                    return;
                                  }
                                  setIndexingFileId(resource.resource_id);
                                  try {
                                    const response = await createKnowledgeBase(
                                      connectionId,
                                      [resource.resource_id],
                                      resource.inode_path.path,
                                      "File indexed for search and retrieval",
                                      orgId,
                                      resource.dataloader_metadata
                                        ?.content_mime ||
                                        "application/octet-stream"
                                    );
                                    // Store the knowledge base ID in both the resource and the store
                                    resource.knowledge_base_id =
                                      response.knowledge_base_id;
                                    setKnowledgeBaseId(
                                      response.knowledge_base_id
                                    );
                                    addIndexedResource(resource.resource_id);
                                  } catch (error) {
                                    console.error(
                                      "Failed to index file:",
                                      error
                                    );
                                  } finally {
                                    setIndexingFileId(null);
                                  }
                                }}
                                disabled={isIndexing}
                              >
                                {isIndexing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <PlusCircle className="h-4 w-4" />
                                )}
                              </button>
                            </Tooltip>
                          ) : (
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
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {loadingRoot && (
            <div className="text-center text-gray-400 py-16 animate-fade-in">
              <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-blue-500" />
              <p className="text-lg">Loading folder contents...</p>
            </div>
          )}

          {!loadingRoot &&
            visibleResources.length === 0 &&
            !rootError &&
            !childrenError && (
              <div className="text-center text-gray-400 py-16 animate-fade-in">
                <FolderIcon className="h-14 w-14 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No files or folders found here.</p>
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
