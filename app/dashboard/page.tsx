import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "AGRONOMIST" && session.user.role !== "ADMIN") {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-green-600">
                🌱 Cultivate
              </Link>
              <span className="ml-4 text-gray-500">Agronomist Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{session.user.name}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {session.user.name}!
          </h1>
          <p className="text-gray-600">
            Manage your AI agents and knowledge bases
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Agents</h3>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
            <p className="text-sm text-gray-600">Active agents</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Knowledge Bases</h3>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
            <p className="text-sm text-gray-600">Documents uploaded</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Flagged Queries</h3>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🚩</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
            <p className="text-sm text-gray-600">Pending review</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left">
              <div className="font-semibold text-gray-900 mb-1">Create New Agent</div>
              <div className="text-sm text-gray-600">Set up a new AI agent with custom knowledge</div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <div className="font-semibold text-gray-900 mb-1">Upload Knowledge Base</div>
              <div className="text-sm text-gray-600">Add PDFs or documents to train your agents</div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors text-left">
              <div className="font-semibold text-gray-900 mb-1">Review Flagged Queries</div>
              <div className="text-sm text-gray-600">Check low-confidence farmer questions</div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left">
              <div className="font-semibold text-gray-900 mb-1">View Analytics</div>
              <div className="text-sm text-gray-600">See usage stats and API costs</div>
            </button>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Coming soon:</strong> Agent management, knowledge base uploads, and analytics features.
          </p>
        </div>
      </main>
    </div>
  );
}
