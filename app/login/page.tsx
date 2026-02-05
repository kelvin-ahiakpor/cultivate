"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sprout } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F3EF] to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-10 w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Sprout className="w-8 h-8 text-[#536d3d]" />
            <span className="text-xl font-semibold text-gray-900">Cultivate</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pb-2 border-b-2 border-gray-300 focus:border-[#536d3d] focus:outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="Email"
            />
          </div>

          <div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pb-2 border-b-2 border-gray-300 focus:border-[#536d3d] focus:outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="Password"
            />
          </div>

          <div className="text-sm text-gray-600">
            No account?{" "}
            <Link
              href="/signup"
              className="text-[#536d3d] hover:text-[#8b7355] hover:underline font-medium transition-colors"
            >
              Create one!
            </Link>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#536d3d] text-white py-1.5 px-8 rounded font-medium hover:bg-[#3d5229] focus:outline-none focus:ring-2 focus:ring-[#536d3d] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#F9F3EF] to-green-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
