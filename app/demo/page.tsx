import Link from 'next/link';
import Script from 'next/script';

export default function DemoPage() {
  const supademoId = 'cmkqiggun2hpecydywrdi63nh'; // Your specific Supademo ID

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
        <div style={{ width: '100%', maxWidth: '1100px' }}>
          <Link href="/" style={{
            color: '#4b5563',
            textDecoration: 'none',
            marginBottom: '1.5rem',
            display: 'inline-block'
          }}>
            &larr; Back to Home
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
            height: '70vh', // Adjust height as needed
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            overflow: 'hidden'
          }}
        >
        </div>
      </main>

      {/* This Script finds the div with the matching data-supademo-id and loads the embed */}
      <Script 
        src="https://script.supademo.com/embed.js" 
        strategy="afterInteractive" 
        async 
      />
    </>
  );
}