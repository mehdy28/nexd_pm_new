// app/page.tsx (or any other page you want to test from)
import ErrorTrigger from '@/components/ErrorTrigger'; // Adjust the import path if needed

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-4xl">Welcome to my Application</h1>
      <p className="mb-8">Click the button below to test the custom error page.</p>
      
      {/* --- Add the test component here --- */}
      <ErrorTrigger />
      {/* ---------------------------------- */}

    </main>
  );
}