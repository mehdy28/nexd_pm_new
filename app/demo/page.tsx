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
        padding: '2rem 1rem',
        fontFamily: 'sans-serif'
      }}>
        
        <div style={{
          width: '100%',
          maxWidth: '1100px',
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '2rem'
        }}>
          <Link href="/">
              <Image src="/landingpage/logo.png" alt="nexd.pm" width={1584} height={424} style={{ height: '2.5rem', width: 'auto' }} />
          </Link>
        </div>
        
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Interactive Demo
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: '#6b7280'
          }}>
            Create Tasks and Generate AI-Powered User Stories
          </p>
        </div>

        {/* Supademo Iframe Embed Container */}
        <div style={{
          position: 'relative',
          boxSizing: 'content-box',
          width: '100%',
          maxWidth: '1100px',
          aspectRatio: '2.09',
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
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          ></iframe>
        </div>
        
        <div style={{ width: '100%', maxWidth: '1100px', marginTop: '1.5rem' }}>
          <Link href="/" style={{
            color: '#4b5563',
            textDecoration: 'none',
            display: 'inline-block'
          }}>
            &larr; Back to Home
          </Link>
        </div>
      </main>
    </>
  );
}