"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// API functions
import { signOut, getGoogleDriveConnections } from "@/lib/api";

// Types
import { GoogleDriveConnection } from "@/types";

// Zustand Stores
import { useAuthStore } from "@/store/auth.store";
import { useFilePickerStore } from "@/store/filePicker.store";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { FolderIcon, LogOut, User } from "lucide-react";
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
    user: currentUser,
  } = useAuthStore();

  // --- File Picker Store ---
  const { currentFolderId, breadcrumbs, navigateToFolder } =
    useFilePickerStore();

  // --- Local State ---
  const [connections, setConnections] = useState<GoogleDriveConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);

  // --- Effects ---
  const fetchConnections = useCallback(async () => {
    try {
      setLoadingConnections(true);
      const conns = await getGoogleDriveConnections();
      setConnections(conns);
      if (!connectionId && conns.length > 0) {
        setConnectionId(conns[0].connection_id);
      }
    } catch (error) {
      console.error("Failed to fetch Google Drive connections:", error);
    } finally {
      setLoadingConnections(false);
    }
  }, [connectionId, setConnectionId]);

  useEffect(() => {
    if (!currentUser) {
      router.push("/");
      return;
    }
    fetchConnections();
  }, [fetchConnections, currentUser, router]);

  const handleSignOut = async () => {
    await signOut();
    clearAuthInfo();
    router.push("/");
  };

  const handleConnectionChange = (newConnectionId: string) => {
    setConnectionId(newConnectionId);
  };

  // --- Render Logic ---
  if (!currentUser) {
    return null;
  }

  if (loadingConnections) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading connections...</p>
        </div>
      </div>
    );
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

  if (!connectionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardContent className="py-12">
            <p className="text-gray-600">
              No connection selected. Please select one from the dropdown.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Image
                src="/Logo.svg"
                alt="Stack AI"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Connection:</span>
                <Select
                  value={connectionId}
                  onValueChange={handleConnectionChange}
                >
                  <SelectTrigger className="w-[200px] bg-gray-50">
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-md">
                    {connections.map((conn) => (
                      <SelectItem
                        key={conn.connection_id}
                        value={conn.connection_id}
                        className="hover:bg-gray-50"
                      >
                        {conn.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{currentUser.email}</span>
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Breadcrumbs */}
          <div className="px-6 py-3 border-b bg-gray-50/50">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Button
                variant="link"
                size="sm"
                onClick={() => navigateToFolder(null, "Root")}
                disabled={currentFolderId === null}
                className="p-0 h-auto hover:text-gray-900"
              >
                Root
              </Button>
              {breadcrumbs
                .filter((crumb) => crumb.id !== null)
                .map((crumb, index) => (
                  <span key={crumb.id} className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigateToFolder(crumb.id, crumb.name)}
                      disabled={
                        index ===
                        breadcrumbs.filter((c) => c.id !== null).length - 1
                      }
                      className="p-0 h-auto hover:text-gray-900"
                    >
                      {crumb.name}
                    </Button>
                  </span>
                ))}
            </div>
          </div>

          {/* File Picker */}
          <FilePicker connectionId={connectionId} />
        </div>
      </main>
    </div>
  );
}
