// import type React from "react"
// import type { Metadata } from "next"
// import { Geist, Manrope } from "next/font/google"
// import { ApolloProvider } from "@apollo/client"
// import { apolloClient } from "@/lib/apollo-client"
// import "./globals.css"

// const geist = Geist({
//   subsets: ["latin"],
//   display: "swap",
//   variable: "--font-geist",
// })

// const manrope = Manrope({
//   subsets: ["latin"],
//   display: "swap",
//   variable: "--font-manrope",
// })

// export const metadata: Metadata = {
//   title: "NEXD.PM - Project Management",
//   description: "Modern project management platform",
//   generator: "v0.dev",
// }

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode
// }>) {
//   return (
//     <html lang="en" className={`${geist.variable} ${manrope.variable} antialiased`}>
//       <body className="font-sans">
//         <ApolloProvider client={apolloClient}>
//           {children}
//         </ApolloProvider>
//       </body>
//     </html>
//   )
// }


"use client";

import type React from "react";
import { Geist, Manrope } from "next/font/google";
import { ApolloProvider } from "@apollo/client";
import { initializeApollo } from "@/lib/apollo-client";
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

// Metadata is no longer defined here

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
        <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
      </body>
    </html>
  );
}