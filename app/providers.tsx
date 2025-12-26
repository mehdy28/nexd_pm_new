"use client";

import type React from "react";
import { ApolloProvider } from "@apollo/client";
import { initializeApollo } from "@/lib/apollo-client";
import { AuthContextProvider } from "@/lib/AuthContextProvider";

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apolloClient = initializeApollo();
  return (
    <ApolloProvider client={apolloClient}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </ApolloProvider>
  );
}