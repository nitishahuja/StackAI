"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { handleLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const cleanPassword = password.trim().replace(/^-+/, "");
      const user = await handleLogin({ email, password: cleanPassword });
      if (user) {
        // Login was successful, handleLogin will handle the navigation
        console.log("Login successful");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trimStart().replace(/^-+/, "");
    setPassword(value);
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/Logo.svg"
              alt="Stack AI Logo"
              width={215}
              height={50}
              priority
            />
          </div>
          <p className="mt-2 text-gray-600">Please sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 text-white bg-black rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
