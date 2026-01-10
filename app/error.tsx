// app/error.tsx
'use client'; // This is essential! Error components must be Client Components.

import { useEffect } from 'react';
import Image from 'next/image';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service like Sentry, LogRocket, etc.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F7F9FC] p-6 text-center">
      <div className="max-w-md">
        <Image
          src="/landingpage/logo.png"
          alt="Nexd.pm Logo"
          width={1584}
          height={392}
          className="mx-auto mb-10 w-48" // Adjusted width for display
          priority
        />
        <h1 className="text-6xl font-bold text-[#b91c1c]">Oops!</h1> {/* Red color for error */}
        <h2 className="mt-4 text-3xl font-semibold text-[#334155]">
          Something went wrong
        </h2>
        <p className="mt-3 text-base text-[#64748B]">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={
            // Attempt to recover by trying to re-render the page
            () => reset()
          }
          className="mt-8 
          inline-flex items-center 
          justify-center rounded-lg 
          bg-teal-600 hover:bg-teal-700 text-white px-5 py-3  
           shadow-sm 
          transition-colors 
          focus:outline-none focus:ring-2 
          font-semibold
          focus:ring-[#2563EB] focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </main>
  );
}