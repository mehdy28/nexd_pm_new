"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WaitlistForm } from "@/components/blog/waitlist-form"

export default function DemoPage() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleModalSubmit = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {isModalOpen && (
        <WaitlistForm variant="modal" onSubmitted={handleModalSubmit} />
      )}
      <main style={{
        backgroundColor: '#f9fafb',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
        overflow: 'hidden',
        filter: isModalOpen ? 'blur(4px)' : 'none',
        transition: 'filter 0.3s ease-out',
      }}>
        
        {/* Header: Back button, Title, and Logo */}
        <header style={{
          width: '100%',
          maxWidth: '1100px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          marginBottom: '1rem'
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
          flex: 1,
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