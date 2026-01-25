"use client"; 

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Extend the Window interface to include the Supademo property
declare global {
  interface Window {
    Supademo?: any;
  }
}

export default function DemoPage() {
  const supademoId = 'cmkqiggun2hpecydywrdi63nh'; 

  useEffect(() => {
    console.log('Attempting to manually load Supademo script...');

    // Check if the script is already added to avoid duplicates
    if (document.querySelector('script[src="https://script.supademo.com/embed.js"]')) {
      console.log('Supademo script tag already exists.');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://script.supademo.com/embed.js';
    script.async = true;

    script.onload = () => {
      console.log('MANUAL: Supademo script loaded successfully.');
      if (window.Supademo) {
        console.log('MANUAL: Supademo object is available on window.');
      } else {
        console.error('MANUAL: Supademo object is NOT available on window after script load.');
      }
    };

    script.onerror = (e) => {
      console.error('MANUAL: Failed to load Supademo script:', e);
    };

    document.body.appendChild(script);

    // Cleanup function to remove the script when the component unmounts
    return () => {
      document.body.removeChild(script);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

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

        {/* Supademo Inline Embed Container */}
        <div 
          id="supademo-embed" 
          data-supademo-id={supademoId}
          style={{
            width: '100%',
            maxWidth: '1100px',
            height: '70vh',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            overflow: 'hidden'
          }}
        >
            <p style={{textAlign: 'center', color: '#9ca3af', paddingTop: '2rem'}}>Loading interactive demo...</p>
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