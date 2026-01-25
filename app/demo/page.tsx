import Link from 'next/link';
import Script from 'next/script';
import Image from 'next/image';

export default function DemoPage() {
  const supademoId = 'cmkqiggun2hpecydywrdi63nh'; // Your specific Supademo ID

  const handleScriptLoad = () => {
    console.log('Supademo script loaded successfully.');
    // Check if the Supademo object is available on the window
    if (window.Supademo) {
      console.log('Supademo object is available on window.');
    } else {
      console.error('Supademo object is NOT available on window after script load.');
    }
  };

  const handleScriptError = (e: any) => {
    console.error('Failed to load Supademo script:', e);
  };

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
Where Your Project
Becomes the Prompt          </h1>
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

      {/* This Script finds the div with the matching data-supademo-id and loads the embed */}
      <Script 
        src="https://script.supademo.com/embed.js" 
        strategy="afterInteractive" 
        onLoad={handleScriptLoad}
        onError={handleScriptError}
        async 
      />
    </>
  );
}