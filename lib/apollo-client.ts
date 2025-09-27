// ./lib/apollo-client.ts

import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { auth } from "@/lib/firebase";
import { NormalizedCacheObject } from "@apollo/client";

let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;

function createApolloClient() {
  const httpLink = createHttpLink({
    uri: "/api/graphql",
  });

  const authLink = setContext(async (_, { headers }) => { // Simplify context destructuring
    let token = "";
    
    // Attempt to get token from the operation's context first
    // Apollo Client's 'headers' object when passed via `context: { headers: { Authorization: ... } }`
    // will have the Authorization key available directly here.
    const operationAuthHeader = (headers as any)?.authorization;
    
    if (operationAuthHeader) {
      token = operationAuthHeader.replace("Bearer ", "");
      console.log("[ApolloClient] Using token from operation context. Token prefix:", token.substring(0, 10)); // Log part of token
    } else {
      // If no token in operation context, try to get it from Firebase current user
      const user = auth.currentUser;
      if (user) {
        try {
          token = await user.getIdToken();
          console.log("[ApolloClient] Using token from Firebase current user. Token prefix:", token.substring(0, 10)); // Log part of token
        } catch (error) {
          console.error("[ApolloClient] Error getting ID token from current user:", error);
        }
      } else {
        console.log("[ApolloClient] No token in context, no Firebase current user.");
      }
    }

    return {
      headers: {
        ...headers, // Ensure any other existing headers are merged
        authorization: token ? `Bearer ${token}` : "", // Apply the determined token
      },
    };
  });
  
  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: "all",
      },
      query: {
        errorPolicy: "all",
      },
    },
  });
}

export function initializeApollo(initialState: NormalizedCacheObject | null = null) {
  const _apolloClient = apolloClient ?? createApolloClient();

  if (initialState) {
    const existingCache = _apolloClient.extract();
    _apolloClient.cache.restore({ ...existingCache, ...initialState });
  }
  if (typeof window === "undefined") return _apolloClient;
  if (!apolloClient) apolloClient = _apolloClient;

  return _apolloClient;
}