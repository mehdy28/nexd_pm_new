// app/page.tsx
import { Metadata } from 'next';
import HomeClient from '@/components/landing/home-client';


// This metadata object provides the canonical URL for the homepage
export const metadata: Metadata = {
  // You can set a more specific title for the homepage here if you wish
  title: 'Nexdpm | Where Your Project Becomes the Prompt',
  alternates: {
    // This resolves to https://nexdpm.com/
    canonical: '/', 
  },
};

export default function Page() {
  // This Server Component simply renders the Client Component
  return <HomeClient />;
}