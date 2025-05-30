"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// API functions
import { signOut } from "@/lib/api";

// Types

// Zustand Stores
import { useAuthStore } from "@/store/auth.store";

// UI Components
import { Button } from "@/components/ui/button";
import { LogOut, User, HardDrive } from "lucide-react";
import { FilePicker } from "@/components/file-picker/FilePicker";

export default function DashboardPage() {
  const router = useRouter();

  // --- Auth Store ---
  const { setConnectionId, clearAuthInfo, user: currentUser } = useAuthStore();

  // --- Default Connection ID ---
  const DEFAULT_CONNECTION_ID = "e171b021-8c00-4c3f-8a93-396095414f57";

  // --- Effects ---
  useEffect(() => {
    if (!currentUser) {
      router.push("/");
      return;
    }
    setConnectionId(DEFAULT_CONNECTION_ID);
  }, [currentUser, router, setConnectionId]);

  const handleSignOut = async () => {
    await signOut();
    clearAuthInfo();
    router.push("/");
  };

  // --- Render Logic ---
  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b shadow-sm rounded-b-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0">
            {/* Logo (always left on desktop) */}
            <div className="flex flex-col items-center sm:flex-row sm:items-center w-full sm:w-auto">
              <Image
                src="/Logo.svg"
                alt="Stack AI"
                width={120}
                height={32}
                className="h-8 w-auto max-w-[120px] sm:max-w-none mb-2 sm:mb-0"
              />
            </div>
            {/* Mobile user info and sign out */}
            <div className="flex flex-col items-center w-full sm:hidden">
              <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg shadow-sm w-full justify-center">
                <User className="h-4 w-4 shrink-0" />
                <span
                  className="truncate max-w-[180px]"
                  title={currentUser.email}
                >
                  {currentUser.email}
                </span>
              </div>
              <div className="w-full flex justify-center my-2">
                <div className="h-px bg-gray-200 w-2/3" />
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="lg"
                className="w-full text-gray-700 border-gray-300 hover:bg-gray-100 shadow-sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
            {/* Desktop user info and sign out */}
            <div className="hidden sm:flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate max-w-xs" title={currentUser.email}>
                  {currentUser.email}
                </span>
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          {/* Source Integration Header Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50/80 rounded-t-xl">
            <span className="text-lg font-semibold text-gray-800">
              Source Integration
            </span>
            <span className="flex items-center gap-2">
              <HardDrive size={28} className="text-blue-500" />
              <span className="text-base font-bold text-gray-700">
                Google Drive
              </span>
            </span>
          </div>

          {/* File Picker */}
          <FilePicker connectionId={DEFAULT_CONNECTION_ID} />
        </div>
      </main>
    </div>
  );
}
