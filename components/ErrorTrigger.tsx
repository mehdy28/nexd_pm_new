// app/components/ErrorTrigger.tsx
'use client'; // This component must be a client component to use hooks and throw errors

import { useState } from 'react';

export default function ErrorTrigger() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('This is a test error to show the error boundary!');
  }

  return (
    <button
      onClick={() => setShouldThrow(true)}
      className="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700"
    >
      Trigger a Client-Side Error
    </button>
  );
}