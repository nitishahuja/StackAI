"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileResource } from "@/types";
import {
  useFilePickerStore,
  FileResourceWithExpanded,
} from "@/store/filePicker.store";
import { useFolderResources } from "@/hooks/useFolderResources";
import { useFolderChildren } from "@/hooks/useFolderChildren";
import { useIndexingStore } from "@/store/indexing.store";
import { isFileIndexed } from "@/lib/apis";

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
  FileIcon,
  ArrowUpDown,
  Loader2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilePickerProps {
  onFileSelect?: (file: FileResource) => void;
  selectedFiles?: Set<string>;
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

export function FilePicker({
  onFileSelect,
  selectedFiles = new Set(),
}: FilePickerProps) {
  const {
    resources: allResources,
    breadcrumbs,
    currentFolderId,
    navigateToFolder,
    toggleFolderExpanded,
    addChildrenAndExpand,
  } = useFilePickerStore();

  const [expandingFolderId, setExpandingFolderId] = useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { isLoading: loadingRoot, error: rootError } = useFolderResources(
    currentFolderId ?? undefined
  );
  const {
    children: fetchedChildren,
    isLoading: loadingChildren,
    error: childrenError,
  } = useFolderChildren(expandingFolderId);

  const { indexedResourceIds, addIndexedResource } = useIndexingStore();

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

  useEffect(() => {
    const checkIndexStatus = async () => {
      for (const resource of allResources) {
        if (await isFileIndexed(resource.resource_id)) {
          addIndexedResource(resource.resource_id);
        }
      }
    };
    checkIndexStatus();
  }, [allResources, addIndexedResource]);

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

  return (
    <Card className="overflow-hidden rounded-lg border shadow-sm bg-white">
      <CardContent className="p-0">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 px-4 py-3 border-b bg-gray-50/50 overflow-x-auto">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id || "root"} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              )}
              <Button
                variant="ghost"
                className="text-sm px-2 py-1 rounded-md hover:bg-gray-100 text-gray-600"
                disabled={index === breadcrumbs.length - 1}
                onClick={() => navigateToFolder(crumb.id, crumb.name)}
              >
                {crumb.name}
              </Button>
            </div>
          ))}
        </div>

        {/* Filter and Search */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="pr-8 h-8 text-sm">
                <Filter className="h-4 w-4 mr-2" />
                {typeOptions.find((o) => o.value === typeFilter)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {typeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTypeFilter(option.value)}
                  className={
                    typeFilter === option.value
                      ? "font-semibold bg-gray-100"
                      : ""
                  }
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
            className="h-8 text-sm max-w-xs border-gray-200"
          />
        </div>

        {/* File Table */}
        <div className="rounded-b-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-blue-100">
              <TableRow>
                <TableHead
                  className="cursor-pointer pl-4 font-semibold text-gray-700"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name
                    {sortBy === "name" && (
                      <ArrowUpDown className="h-4 w-4 ml-2 text-gray-500" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer w-[150px] font-semibold text-gray-700"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">
                    Date
                    {sortBy === "date" && (
                      <ArrowUpDown className="h-4 w-4 ml-2 text-gray-500" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right w-[100px] font-semibold text-gray-700">
                  Size/Type
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleResources.map((resource) => {
                const indent = getIndentationLevel(resource, allResources);
                const isSelected = selectedFiles.has(resource.resource_id);
                const isLoading =
                  expandingFolderId === resource.resource_id && loadingChildren;

                return (
                  <TableRow
                    key={resource.resource_id}
                    onClick={() =>
                      resource.inode_type === "directory"
                        ? handleFolderClick(resource)
                        : onFileSelect?.(resource)
                    }
                    className={cn(
                      "cursor-pointer hover:bg-blue-50 transition-colors",
                      isSelected &&
                        resource.inode_type !== "directory" &&
                        "bg-blue-100",
                      isLoading && "bg-gray-50/50",
                      indexedResourceIds.has(resource.resource_id) &&
                        "bg-green-100"
                    )}
                  >
                    <TableCell
                      className="flex items-center py-2 text-sm"
                      style={{ paddingLeft: `${24 + indent * 20}px` }}
                    >
                      {resource.inode_type === "directory" ? (
                        isLoading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin text-blue-500" />
                        ) : resource.isExpanded ? (
                          <ChevronDown className="h-4 w-4 mr-1 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-1 text-gray-500" />
                        )
                      ) : (
                        <span className="w-5 h-5 mr-1" />
                      )}

                      {resource.inode_type === "directory" ? (
                        <FolderIcon className="h-5 w-5 mr-2 text-blue-500/90" />
                      ) : (
                        <FileIcon className="h-5 w-5 mr-2 text-gray-400" />
                      )}
                      <span className="truncate text-gray-700">
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
                        ? resource.size
                          ? `${(resource.size / 1024).toFixed(1)} KB`
                          : "---"
                        : "Folder"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {loadingRoot && (
            <div className="text-center text-gray-400 py-12">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
              <p className="text-sm">Loading folder contents...</p>
            </div>
          )}

          {!loadingRoot &&
            visibleResources.length === 0 &&
            !rootError &&
            !childrenError && (
              <div className="text-center text-gray-400 py-12">
                <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm">No files or folders found here.</p>
              </div>
            )}

          {(rootError || childrenError) && (
            <div className="text-center text-red-500 py-12">
              <p className="text-sm">Failed to load folder contents.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
