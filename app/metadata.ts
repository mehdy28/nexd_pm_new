import { Metadata } from 'next';

const applicationName = 'Nexdpm';
const description = 'Nexdpm: The next-generation project management tool to streamline your workflows, enhance collaboration, and deliver projects on time.';
const keywords = ['project management', 'saas', 'collaboration tool', 'task management', 'agile', 'productivity'];

export const metadata: Metadata = {
  applicationName: applicationName,
  title: {
    default: applicationName,
    template: `%s | ${applicationName}`,
  },
  description: description,
  keywords: keywords,
  metadataBase: new URL('https://nexdpm.com'),
  openGraph: {
    title: applicationName,
    description: description,
    url: 'https://nexdpm.com',
    siteName: applicationName,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: applicationName,
    description: description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
    }
  }
};