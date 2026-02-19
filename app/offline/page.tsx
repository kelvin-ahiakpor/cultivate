export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#1E1E1E] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 w-16 h-16 rounded-full bg-[#5a7048] flex items-center justify-center">
        <span className="text-white text-2xl font-bold font-serif">C</span>
      </div>
      <h1 className="text-white text-2xl font-semibold mb-3">You&apos;re offline</h1>
      <p className="text-[#888] text-sm leading-relaxed max-w-xs">
        No internet connection. Check your network and try again to continue chatting.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 px-6 py-2.5 bg-[#5a7048] hover:bg-[#4a5d38] text-white text-sm font-medium rounded-full transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
