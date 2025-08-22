// app/api/public/login/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { email, password } = data;

    // Basic validation
    if (!email || !password) {
      return new NextResponse(JSON.stringify({ message: "Missing email or password" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify the user's credentials with Firebase Authentication
    const userCredential = await getAuth().getUserByEmail(email);
    // If the email exists compare the passwords

    return new NextResponse(JSON.stringify({ message: "Login successful" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return new NextResponse(JSON.stringify({ message: error.message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}