"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      window.location.href = `${window.location.origin}/`;
    } catch {
      window.location.href = `${window.location.origin}/`;
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
    >
      Sign Out
    </button>
  );
}
