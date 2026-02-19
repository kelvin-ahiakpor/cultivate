"use client";

import Link from "next/link";
import { useState } from "react";
import { Sprout, ArrowRight, Users, MessageSquare, User, Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

interface LandingNavProps {
  session: Session | null;
}

export function LandingNav({ session }: LandingNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="px-4 lg:px-12 py-4 lg:py-6 relative">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Sprout className="w-8 h-8 text-[#536d3d]" />
        </div>

        {/* Desktop nav links */}
        <div className="hidden lg:flex items-center gap-10 text-[15px]">
          <a href="/" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">Homepage</a>
          <a href="#platform" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">Platform</a>
          <a href="#about" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">About Us</a>
          <a href="#careers" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">Careers</a>
          <a href="#contact" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">Contact Us</a>
        </div>

        {/* Right: auth buttons (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-2 lg:gap-3">
          {session ? (
            <>
              <Link
                href="/chat"
                className="hidden lg:flex bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white px-8 py-3 rounded-full transition-all duration-300 font-medium shadow-md hover:shadow-lg items-center gap-2"
              >
                Chat
                <MessageSquare className="w-4 h-4" />
              </Link>
              <div className="relative group hidden lg:block">
                <button className="w-10 h-10 bg-[#536d3d] hover:bg-[#85b878] text-white rounded-full transition-all duration-300 flex items-center justify-center shadow-md">
                  <User className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href="/dashboard" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-t-lg transition-colors">Dashboard</Link>
                  <Link href="/profile" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors">Profile Settings</Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-b-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="hidden lg:flex bg-[#85b878] hover:bg-[#536d3d] text-white px-8 py-3 rounded-full transition-all duration-300 font-medium shadow-md hover:shadow-lg items-center gap-2"
              >
                Sign Up
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="hidden lg:flex bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white px-8 py-3 rounded-full transition-all duration-300 font-medium shadow-md hover:shadow-lg items-center gap-2"
              >
                Login
                <Users className="w-4 h-4" />
              </Link>
            </>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors shadow-sm"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="w-5 h-5 text-gray-800" /> : <Menu className="w-5 h-5 text-gray-800" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown — absolute so it overlays hero content */}
      <div
        className={`lg:hidden absolute top-full left-4 right-4 z-50 transition-all duration-300 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 space-y-1">
          <a href="/" onClick={() => setOpen(false)} className="flex items-center min-h-[44px] px-4 py-2 text-gray-800 hover:text-[#536d3d] hover:bg-gray-50 rounded-xl transition-colors font-medium">Homepage</a>
          <a href="#platform" onClick={() => setOpen(false)} className="flex items-center min-h-[44px] px-4 py-2 text-gray-800 hover:text-[#536d3d] hover:bg-gray-50 rounded-xl transition-colors font-medium">Platform</a>
          <a href="#about" onClick={() => setOpen(false)} className="flex items-center min-h-[44px] px-4 py-2 text-gray-800 hover:text-[#536d3d] hover:bg-gray-50 rounded-xl transition-colors font-medium">About Us</a>
          <a href="#careers" onClick={() => setOpen(false)} className="flex items-center min-h-[44px] px-4 py-2 text-gray-800 hover:text-[#536d3d] hover:bg-gray-50 rounded-xl transition-colors font-medium">Careers</a>
          <a href="#contact" onClick={() => setOpen(false)} className="flex items-center min-h-[44px] px-4 py-2 text-gray-800 hover:text-[#536d3d] hover:bg-gray-50 rounded-xl transition-colors font-medium">Contact Us</a>

          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            {session ? (
              <>
                <Link
                  href="/chat"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 rounded-xl font-medium min-h-[44px]"
                >
                  Chat <MessageSquare className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center bg-[#536d3d] text-white py-3 rounded-xl font-medium min-h-[44px]"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center justify-center bg-gray-100 text-gray-800 py-3 rounded-xl font-medium min-h-[44px]"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 bg-[#85b878] text-white py-3 rounded-xl font-medium min-h-[44px]"
                >
                  Sign Up <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 rounded-xl font-medium min-h-[44px]"
                >
                  Login <Users className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
