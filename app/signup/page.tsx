"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Sprout } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    role: "FARMER",
    organizationId: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch organizations
    fetch("/api/organizations")
      .then((res) => res.json())
      .then((data) => {
        setOrganizations(data.organizations || []);
        if (data.organizations?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            organizationId: data.organizations[0].id,
          }));
        }
      })
      .catch((err) => console.error("Error fetching organizations:", err));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!formData.organizationId) {
      setError("Please select an organization");
      return;
    }

    setIsLoading(true);

    try {
      // Create user
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone || null,
          role: formData.role,
          organizationId: formData.organizationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred during signup");
        setIsLoading(false);
        return;
      }

      // Auto sign in after successful signup
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but login failed. Please try logging in.");
        setIsLoading(false);
      } else {
        // Redirect based on role
        if (formData.role === "AGRONOMIST" || formData.role === "ADMIN") {
          router.push("/dashboard");
        } else {
          router.push("/chat");
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError("An error occurred during signup");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F3EF] to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-10 w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Sprout className="w-8 h-8 text-[#536d3d]" />
            <span className="text-xl font-semibold text-gray-900">Cultivate</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full pb-2 border-b-2 border-gray-300 focus:border-[#536d3d] focus:outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="Full Name"
            />
          </div>

          <div>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full pb-2 border-b-2 border-gray-300 focus:border-[#536d3d] focus:outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="Email"
            />
          </div>

          <div>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full pb-2 border-b-2 border-gray-300 focus:border-[#536d3d] focus:outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="Phone (Optional)"
            />
          </div>

          <div>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full pb-2 border-b-2 border-gray-300 focus:border-[#536d3d] focus:outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="Password"
            />
          </div>

          <div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full pb-2 border-b-2 border-gray-300 focus:border-[#536d3d] focus:outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="Confirm Password"
            />
          </div>

          <div>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full pb-2 border-b-2 border-gray-300 focus:border-[#536d3d] focus:outline-none transition-colors text-gray-900"
            >
              <option value="FARMER">Farmer</option>
              <option value="AGRONOMIST">Agronomist</option>
            </select>
          </div>

          <div>
            <select
              id="organizationId"
              name="organizationId"
              value={formData.organizationId}
              onChange={handleChange}
              required
              className="w-full pb-2 border-b-2 border-gray-300 focus:border-[#536d3d] focus:outline-none transition-colors text-gray-900"
            >
              {organizations.length === 0 && (
                <option value="">Loading organizations...</option>
              )}
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600 pt-2">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#536d3d] hover:text-[#8b7355] hover:underline font-medium transition-colors"
            >
              Sign in!
            </Link>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#536d3d] text-white py-2.5 px-8 min-h-[44px] rounded font-medium hover:bg-[#3d5229] focus:outline-none focus:ring-2 focus:ring-[#536d3d] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
