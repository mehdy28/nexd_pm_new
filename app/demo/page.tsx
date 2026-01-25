//app/demo/page.tsx
"use client";

import Link from 'next/link';
import Image from 'next/image';

export default function DemoPage() {
  return (
    <>
      <main style={{
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem', // Adjusted padding for better fit on all screens
        fontFamily: 'sans-serif',
        boxSizing: 'border-box'
      }}>
        
        {/* New Header: Title on the left, Logo on the right */}
        <header style={{
          width: '100%',
          maxWidth: '1100px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '600', // semi-bold
            color: '#111827'
          }}>
            Interactive Demo
          </h1>
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
        
        {/* Supademo Iframe Embed Container - Made more responsive */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1100px',
          aspectRatio: '16 / 9', // Common aspect ratio for embeds
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