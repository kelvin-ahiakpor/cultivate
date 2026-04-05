"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App router error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cultivate-bg-main text-cultivate-text-primary">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl border border-cultivate-border-element bg-cultivate-bg-elevated/90 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-cultivate-green-light">
            Server Error
          </p>
          <h1 className="mt-4 font-serif text-3xl text-cultivate-cream">
            Cultivate hit a temporary problem.
          </h1>
          <p className="mt-4 text-sm leading-6 text-cultivate-text-secondary">
            Something went wrong. Try again in a few seconds.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              className="rounded-full bg-cultivate-button-primary px-5 py-3 text-sm font-medium text-cultivate-cream transition hover:bg-cultivate-button-primary-hover"
              onClick={() => reset()}
            >
              Try Again
            </button>
            <a
              className="rounded-full border border-cultivate-border-element px-5 py-3 text-sm font-medium text-cultivate-text-primary transition hover:bg-cultivate-bg-hover"
              href="/"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
