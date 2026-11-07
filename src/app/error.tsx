"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[80svh] flex-col items-center justify-center px-4 text-center">
      <p className="hud-label text-volt">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-semibold">This view failed to render</h1>
      <p className="mt-3 max-w-md text-sm text-mist">{error.message}</p>
      <button type="button" onClick={reset} className="mt-8 rounded-full bg-volt px-5 py-2.5 text-sm font-medium text-white">
        Try again
      </button>
    </div>
  );
}
