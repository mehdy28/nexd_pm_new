// app/api/protected/[...path]/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');

  // Example: /api/protected/data
  if (path === 'data') {
    return NextResponse.json({ message: 'Protected data accessed successfully' });
  }

  return new NextResponse(JSON.stringify({ message: 'Invalid protected API endpoint' }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}