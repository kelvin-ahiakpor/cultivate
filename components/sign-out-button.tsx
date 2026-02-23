"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  const handleSignOut = () => {
    // Use window.location.origin so redirect works on any host (localhost, network IP, production)
    signOut({ callbackUrl: `${window.location.origin}/` });
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
