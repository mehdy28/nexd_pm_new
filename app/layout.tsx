// app/layout.tsx

import type { Metadata } from "next";
import type React from "react";
import { Geist, Manrope } from "next/font/google";
import { ApolloProvider } from "@apollo/client";
import { initializeApollo } from "@/lib/apollo-client";
import { AuthContextProvider } from "@/lib/AuthContextProvider";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});


export const metadata: Metadata = {
  title: "nexdpm",
  description: "The First Ai-Powered Project Management Solution"
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apolloClient = initializeApollo();
  return (
    <html
      lang="en"
      className={`${geist.variable} ${manrope.variable} antialiased`}
    >
      <body className="font-sans">
        <ApolloProvider client={apolloClient}>
          <AuthContextProvider> {/* Wrap children with AuthContextProvider */}
            {children}
          </AuthContextProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}