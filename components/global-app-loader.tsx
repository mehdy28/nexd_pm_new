// components/global-app-loader.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

const GlobalAppLoader = ({ message = "Loading data..." }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white overlay
        backdropFilter: 'blur(3px)', // Optional blur effect
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999, // Ensure it's on top
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-slate-700">{message}</p>
      <p className="mt-2 text-sm text-slate-500">Please wait while we fetch the latest information.</p>
    </div>
  );
};

export default GlobalAppLoader;