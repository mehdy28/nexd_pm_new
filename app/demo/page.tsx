//app/demo/page.tsx
"use client";

import Link from 'next/link';
import Image from 'next/image';

export default function DemoPage() {
  return (
    <>
      <main style={{
        backgroundColor: '#f9fafb',
        height: '100vh', // Set height to 100% of viewport height
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
        overflow: 'hidden' // Prevent scrollbars
      }}>
        
        {/* Header: Back button, Title, and Logo */}
        <header style={{
          width: '100%',
          maxWidth: '1100px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0, // Prevent header from shrinking
          marginBottom: '1rem' // Reduced space between header and iframe container
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" aria-label="Back to Home" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4b5563',
              textDecoration: 'none',
              fontSize: '1.5rem',
              lineHeight: 1,
              width: '2.5rem',
              height: '2.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
              transition: 'background-color 0.2s',
            }}>
              &larr;
            </Link>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Interactive Demo
            </h1>
          </div>
          <Link href="/">
              <Image 
                src="/landingpage/logo.png" 
                alt="nexd.pm" 
                width={1584} 
                height={424} 
                style={{ height: '2.5rem', width: 'auto' }} 
              />
          </Link>
        </header>
        
        {/* Supademo Iframe Embed Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1100px',
          flex: 1, // Make this container grow to fill remaining vertical space
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          overflow: 'hidden'
        }}>
          <iframe 
            src="https://app.supademo.com/embed/cmkqiggun2hpecydywrdi63nh?embed_v=2&utm_source=embed" 
            loading="lazy" 
            title="Create Tasks and Generate AI-Powered User Stories" 
            allow="clipboard-write" 
            frameBorder="0" 
            webkitallowfullscreen="true" 
            mozallowfullscreen="true" 
            allowFullScreen 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%' 
            }}
          ></iframe>
        </div>
        
      </main>
    </>
  );
}