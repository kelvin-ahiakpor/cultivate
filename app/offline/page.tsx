"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-cultivate-bg-main flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 w-16 h-16 rounded-full bg-cultivate-button-primary flex items-center justify-center">
        <span className="text-white text-2xl font-bold font-serif">C</span>
      </div>
      <h1 className="text-white text-2xl font-semibold mb-3">You&apos;re offline</h1>
      <p className="text-[#888] text-sm leading-relaxed max-w-xs">
        No internet connection. Check your network and try again to continue chatting.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 px-6 py-2.5 bg-cultivate-button-primary hover:bg-cultivate-button-primary-hover text-white text-sm font-medium rounded-full transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
