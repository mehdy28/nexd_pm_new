// app/not-found.tsx

import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F7F9FC] p-6 text-center">
      <div className="max-w-md">
        <Image
          src="/landingpage/logo.png"
          alt="Nexd.pm Logo"
          width={1584}
          height={392}
          className="mx-auto mb-10"
          priority
        />
        <h1 className="text-8xl font-bold text-[#1E293B]">404</h1>
        <h2 className="mt-4 text-3xl font-semibold text-[#334155]">
          Page Not Found
        </h2>
        <p className="mt-3 text-base text-[#64748B]">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 
          inline-flex items-center 
          justify-center rounded-lg 
          bg-teal-600 hover:bg-teal-700 text-white px-5 py-3  
           shadow-sm 
          transition-colors 
          focus:outline-none focus:ring-2 
          font-semibold
          focus:ring-[#2563EB] focus:ring-offset-2"
        >
          Go back home
        </Link>
      </div>
    </main>
  );
}

