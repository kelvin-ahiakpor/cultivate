import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ChatPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "FARMER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
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
              <span className="ml-4 text-gray-500">Chat with AI Agent</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{session.user.name}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hello, {session.user.name}!
          </h1>
          <p className="text-gray-600">
            Ask questions about farming, crops, pests, and more
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="h-[500px] p-6 overflow-y-auto bg-gray-50">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">🤖</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No active conversations yet
              </h2>
              <p className="text-gray-600 max-w-md">
                Start a conversation by selecting an AI agent below, or type your first message to get started.
              </p>
            </div>
          </div>

          <div className="border-t bg-white p-4">
            <div className="mb-3">
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                <option>Select an AI agent...</option>
                <option disabled>No agents available</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your question here..."
                disabled
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                disabled
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">💬</div>
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-600">Conversations</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">📝</div>
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-600">Messages</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">⭐</div>
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-sm text-gray-600">Avg. Rating</div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Coming soon:</strong> Real-time chat with AI agents, image uploads for pest identification, and conversation history.
          </p>
        </div>
      </main>
    </div>
  );
}
