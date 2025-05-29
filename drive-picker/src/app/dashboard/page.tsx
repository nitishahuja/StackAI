"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// API functions
import {
  signOut,
  getGoogleDriveConnections,
  createKnowledgeBase,
  deleteKnowledgeBaseResource,
  getKnowledgeBases,
} from "@/lib/api";

// Types
import { GoogleDriveConnection, FileResource, KnowledgeBase } from "@/types";

// Zustand Stores
import { useAuthStore } from "@/store/auth.store";
import { useFilePickerStore } from "@/store/filePicker.store";
import { useIndexingStore } from "@/store/indexing.store";

// Custom Hooks
import { useFolderResources } from "@/hooks/useFolderResources";
import { useKnowledgeBaseIndex } from "@/hooks/useKnowledgeBaseIndex";

// UI Components (assuming these are correctly implemented and exported)
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { FolderIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePicker } from "@/components/file-picker/FilePicker";

export default function DashboardPage() {
  const router = useRouter();

  // --- Auth Store ---
  const {
    connectionId,
    setConnectionId,
    clearAuthInfo,
    organizationId,
    user: currentUser,
  } = useAuthStore();

  // --- File Picker Store ---
  const { currentFolderId, breadcrumbs, navigateToFolder } =
    useFilePickerStore();

  // --- Indexing Store ---
  const {
    knowledgeBaseId,
    setKnowledgeBaseId,
    removeIndexedResource,
    isResourceIndexed,
    clearIndexingState,
  } = useIndexingStore();

  // --- Data Fetching Hooks ---
  // useFolderResources fetches resources for the current folder and updates filePickerStore
  useFolderResources(currentFolderId ?? undefined);
  // useKnowledgeBaseIndex fetches indexed resource IDs for the current KB and updates indexingStore
  useKnowledgeBaseIndex();

  // --- Local State ---
  const [connections, setConnections] = useState<GoogleDriveConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [selectedForIndexing, setSelectedForIndexing] = useState<
    FileResource[]
  >([]);
  const [selectedForDeindexing, setSelectedForDeindexing] = useState<
    FileResource[]
  >([]);
  const [kbLoading, setKbLoading] = useState(false); // Loading state for KB actions
  const [kbError, setKbError] = useState<string | null>(null); // Error state for KB actions

  // --- Effects ---
  // Effect to fetch connections on component mount
  const fetchConnections = useCallback(async () => {
    try {
      setLoadingConnections(true);
      const conns = await getGoogleDriveConnections();
      setConnections(conns);
      // If no connection is selected and we have connections, select the first one
      if (!connectionId && conns.length > 0) {
        setConnectionId(conns[0].connection_id);
      }
    } catch (error) {
      console.error("Failed to fetch Google Drive connections:", error);
    } finally {
      setLoadingConnections(false);
    }
  }, [connectionId, setConnectionId]); // Rerun if connectionId changes locally (shouldn't happen if from store)

  useEffect(() => {
    // Check if user is authenticated
    if (!currentUser) {
      router.push("/");
      return;
    }
    // If authenticated, fetch connections
    fetchConnections();
  }, [fetchConnections, currentUser, router]);

  // Effect to fetch KB for the selected connection
  const fetchKnowledgeBaseForConnection = useCallback(async () => {
    if (!connectionId) {
      setKnowledgeBaseId(null); // Clear KB if no connection
      return;
    }
    try {
      // Fetch KBs for the current connection - API might return multiple, choose the first
      const kbsData = await getKnowledgeBases();
      // Ensure kbsData is an array before filtering
      const kbs: KnowledgeBase[] = Array.isArray(kbsData) ? kbsData : [];

      const kbsForConnection = kbs.filter(
        (kb) => kb.connection_id === connectionId
      );

      if (kbsForConnection.length > 0) {
        setKnowledgeBaseId(kbsForConnection[0].knowledge_base_id);
      } else {
        setKnowledgeBaseId(null); // No KB found for this connection
      }
    } catch (error) {
      console.error("Failed to fetch knowledge bases:", error);
      setKnowledgeBaseId(null);
    }
  }, [connectionId, setKnowledgeBaseId]); // Add dependencies

  useEffect(() => {
    fetchKnowledgeBaseForConnection();
    // Clear local selections and reset file picker state when connection changes
    setSelectedForIndexing([]);
    setSelectedForDeindexing([]);
    navigateToFolder(null, "Root"); // Reset folder to root
    clearIndexingState(); // Clear indexing state for the previous connection
  }, [
    fetchKnowledgeBaseForConnection,
    connectionId,
    navigateToFolder,
    clearIndexingState,
  ]); // Add dependencies

  // --- Handlers ---
  const handleFileSelect = (file: FileResource) => {
    const isCurrentlyIndexed = isResourceIndexed(file.resource_id);

    if (knowledgeBaseId) {
      // If a KB is active, manage indexing/deindexing selection
      if (isCurrentlyIndexed) {
        setSelectedForDeindexing((prev) => {
          const isSelected = prev.some(
            (f) => f.resource_id === file.resource_id
          );
          return isSelected
            ? prev.filter((f) => f.resource_id !== file.resource_id)
            : [...prev, file];
        });
        // If selecting for deindexing, ensure it's not in indexing selection
        setSelectedForIndexing((prev) =>
          prev.filter((f) => f.resource_id !== file.resource_id)
        );
      } else {
        setSelectedForIndexing((prev) => {
          const isSelected = prev.some(
            (f) => f.resource_id === file.resource_id
          );
          return isSelected
            ? prev.filter((f) => f.resource_id !== file.resource_id)
            : [...prev, file];
        });
        // If selecting for indexing, ensure it's not in deindexing selection
        setSelectedForDeindexing((prev) =>
          prev.filter((f) => f.resource_id !== file.resource_id)
        );
      }
    } else {
      // If no KB is active, only allow selection for creating a new KB
      setSelectedForIndexing((prev) => {
        const isSelected = prev.some((f) => f.resource_id === file.resource_id);
        return isSelected
          ? prev.filter((f) => f.resource_id !== file.resource_id)
          : [...prev, file];
      });
      // Ensure nothing is in deindexing selection if no KB is active
      setSelectedForDeindexing([]);
    }
  };

  const handleAddFiles = async () => {
    if (!knowledgeBaseId || selectedForIndexing.length === 0) return;
    setKbLoading(true);
    setKbError(null);
    try {
      // TODO: Implement API call to add files to an existing KB
      // Need to fetch current indexed resources first if not already fully available in store.
      // Then combine with selectedForIndexing and call createKnowledgeBase with the existing KB ID.
      console.log(
        "Simulating Add Files to KB",
        knowledgeBaseId,
        selectedForIndexing.map((f) => f.resource_id)
      );
      // After successful API call:
      // await refreshIndexed(); // Refresh indexed list via hook
      // setSelectedForIndexing([]); // Clear selection
    } catch (err) {
      setKbError("Failed to add files to knowledge base.");
      console.error(err);
    } finally {
      setKbLoading(false);
    }
  };

  const handleRemoveFiles = async () => {
    if (!knowledgeBaseId || selectedForDeindexing.length === 0) return;
    setKbLoading(true);
    setKbError(null);
    try {
      for (const file of selectedForDeindexing) {
        if (file.inode_type === "file") {
          // Only delete files
          await deleteKnowledgeBaseResource(
            knowledgeBaseId,
            file.inode_path.path
          );
          removeIndexedResource(file.resource_id); // Optimistically update store
        } else {
          console.warn("Skipping deletion of directory:", file.inode_path.path);
        }
      }
      console.log(
        "Removed Files from KB",
        knowledgeBaseId,
        selectedForDeindexing.map((f) => f.resource_id)
      );
      setSelectedForDeindexing([]); // Clear selection
      // await refreshIndexed(); // Optional: Refresh indexed list
    } catch (err) {
      setKbError("Failed to remove files from knowledge base.");
      console.error(err);
    } finally {
      setKbLoading(false);
    }
  };

  const handleCreateKnowledgeBase = async () => {
    if (!connectionId || selectedForIndexing.length === 0 || !organizationId)
      return;
    setKbLoading(true);
    setKbError(null);
    try {
      const response = await createKnowledgeBase(
        connectionId,
        selectedForIndexing.map((f) => f.resource_id),
        "New Knowledge Base", // TODO: Add name input
        "Created from selected files", // TODO: Add description input
        organizationId
      );
      console.log("Created KB:", response);
      setKnowledgeBaseId(response.knowledge_base_id); // Set the new KB ID in store
      setSelectedForIndexing([]); // Clear selection
      // The useKnowledgeBaseIndex hook will fetch indexed resources for the new KB
    } catch (err) {
      setKbError("Failed to create knowledge base.");
      console.error(err);
    } finally {
      setKbLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    clearAuthInfo();
    router.push("/");
  };

  const handleConnectionChange = (newConnectionId: string) => {
    setConnectionId(newConnectionId);
    // Effects will handle fetching KB and resources for the new connection
  };

  // Handlers for FilePicker component
  const handleFilePickerFileSelect = (file: FileResource) => {
    handleFileSelect(file);
  };

  // --- Render Logic ---
  if (!currentUser) {
    // Should be redirected by middleware, but handle as safeguard
    return null;
  }

  if (loadingConnections) {
    return <div>Loading connections...</div>;
  }

  if (connections.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardContent className="py-12">
            <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">No Connections Found</CardTitle>
            <CardDescription>
              Please add a Google Drive connection in the Stack AI Workflow
              builder.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If connections loaded but none selected, could happen if first connection was removed
  if (!connectionId) {
    // This should ideally be handled by the useEffect selecting the first connection
    // after fetching connections, but as a safeguard:
    return (
      <div>No connection selected. Please select one from the dropdown.</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Connection:</span>
                <Select
                  value={connectionId}
                  onValueChange={handleConnectionChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((conn) => (
                      <SelectItem
                        key={conn.connection_id}
                        value={conn.connection_id}
                      >
                        {conn.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {currentUser && (
                <span className="mr-4 text-gray-700">{currentUser.email}</span>
              )}
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="hover:bg-gray-100"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {knowledgeBaseId
                ? `Knowledge Base: ${knowledgeBaseId.substring(0, 6)}...`
                : "Select Files to Create Knowledge Base"}
            </h2>
            {kbError && <div className="text-red-500 text-sm">{kbError}</div>}
            {knowledgeBaseId ? ( // Buttons for existing KB
              <div className="flex gap-2">
                <Button
                  onClick={handleRemoveFiles}
                  disabled={kbLoading || selectedForDeindexing.length === 0}
                >
                  Remove Selected
                </Button>
                <Button
                  onClick={handleAddFiles}
                  disabled={kbLoading || selectedForIndexing.length === 0}
                  variant="primary-blue" // Use the new blue variant
                >
                  Add Selected
                </Button>
              </div>
            ) : (
              // Button to create new KB
              <Button
                onClick={handleCreateKnowledgeBase}
                disabled={kbLoading || selectedForIndexing.length === 0}
                variant="primary-blue" // Use the new blue variant
              >
                Create Knowledge Base
              </Button>
            )}
          </div>

          {/* File Picker Content */}
          <div className="space-y-2">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-1 text-sm text-gray-500 mb-2">
              <Button
                variant="link"
                size="sm"
                onClick={() => navigateToFolder(null, "Root")}
                disabled={currentFolderId === null}
                className="p-0 h-auto"
              >
                Root
              </Button>
              {breadcrumbs
                .filter((crumb) => crumb.id !== null)
                .map((crumb, index) => (
                  <span key={crumb.id}>
                    <span>/</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigateToFolder(crumb.id, crumb.name)}
                      disabled={
                        index ===
                        breadcrumbs.filter((c) => c.id !== null).length - 1
                      }
                      className="p-0 h-auto"
                    >
                      {crumb.name}
                    </Button>
                  </span>
                ))}
            </div>

            {/* Integrate the new FilePicker component */}
            {/* Pass selected files for highlighting */}
            <FilePicker
              onFileSelect={handleFilePickerFileSelect}
              selectedFiles={
                new Set(selectedForIndexing.map((f) => f.resource_id))
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
