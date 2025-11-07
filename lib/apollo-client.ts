// // ./lib/apollo-client.ts

// import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
// import { setContext } from "@apollo/client/link/context";
// import { auth } from "@/lib/firebase";
// import { NormalizedCacheObject } from "@apollo/client";

// let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;

// function createApolloClient() {
//   const httpLink = createHttpLink({
//     uri: "/api/graphql",
//   });

//   const authLink = setContext(async (_, { headers }) => { // Simplify context destructuring
//     let token = "";
    
//     // Attempt to get token from the operation's context first
//     // Apollo Client's 'headers' object when passed via `context: { headers: { Authorization: ... } }`
//     // will have the Authorization key available directly here.
//     const operationAuthHeader = (headers as any)?.authorization;
    
//     if (operationAuthHeader) {
//       token = operationAuthHeader.replace("Bearer ", "");
//       console.log("[ApolloClient] Using token from operation context. Token prefix:", token.substring(0, 10)); // Log part of token
//     } else {
//       // If no token in operation context, try to get it from Firebase current user
//       const user = auth.currentUser;
//       if (user) {
//         try {
//           token = await user.getIdToken();
//           console.log("[ApolloClient] Using token from Firebase current user. Token prefix:", token.substring(0, 10)); // Log part of token
//         } catch (error) {
//           console.error("[ApolloClient] Error getting ID token from current user:", error);
//         }
//       } else {
//         console.log("[ApolloClient] No token in context, no Firebase current user.");
//       }
//     }

//     return {
//       headers: {
//         ...headers, // Ensure any other existing headers are merged
//         authorization: token ? `Bearer ${token}` : "", // Apply the determined token
//       },
//     };
//   });
  
//   return new ApolloClient({
//     link: authLink.concat(httpLink),
//     cache: new InMemoryCache(),
//     defaultOptions: {
//       watchQuery: {
//         errorPolicy: "all",
//       },
//       query: {
//         errorPolicy: "all",
//       },
//     },
//   });
// }

// export function initializeApollo(initialState: NormalizedCacheObject | null = null) {
//   const _apolloClient = apolloClient ?? createApolloClient();

//   if (initialState) {
//     const existingCache = _apolloClient.extract();
//     _apolloClient.cache.restore({ ...existingCache, ...initialState });
//   }
//   if (typeof window === "undefined") return _apolloClient;
//   if (!apolloClient) apolloClient = _apolloClient;

//   return _apolloClient;
// }






import { ApolloClient, InMemoryCache, createHttpLink, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient, ClientOptions } from "graphql-ws";
import { auth } from "@/lib/firebase";
import type { NormalizedCacheObject } from "@apollo/client";

let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;

function createHttp() {
  return createHttpLink({
    uri: "/api/graphql",
    credentials: "same-origin",
  });
}

function createWsLink() {
  if (typeof window === "undefined") return null;

  const wsUrl =
    (window.location.protocol === "https:" ? "wss://" : "ws://") +
    window.location.host +
    "/api/graphql";

  const clientOptions: ClientOptions = {
    url: wsUrl,
    connectionParams: async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          return {
            authorization: token ? `Bearer ${token}` : "",
          };
        }
      } catch (err) {
        console.error("[WS client] Error retrieving token for connectionParams:", err);
      }
      return {};
    },
    // lazy: true is default behavior for graphql-ws client; keep default
  };

  const wsClient = createClient(clientOptions);
  return new GraphQLWsLink(wsClient);
}

function createApolloClient() {
  const httpLink = createHttp();

  const authLink = setContext(async (_, { headers }) => {
    let token = "";
    const operationAuthHeader = (headers as any)?.authorization;
    if (operationAuthHeader) {
      token = operationAuthHeader.replace("Bearer ", "");
    } else {
      const user = auth.currentUser;
      if (user) {
        try {
          token = await user.getIdToken();
        } catch (error) {
          console.error("[ApolloClient] Error getting ID token from current user:", error);
        }
      }
    }
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  });

  // create ws link only on client
  const wsLink = createWsLink();

  // If wsLink exists, use split to route subscriptions to ws
  const link = wsLink
    ? split(
        ({ query }) => {
          const def = getMainDefinition(query);
          return def.kind === "OperationDefinition" && (def as any).operation === "subscription";
        },
        wsLink,
        authLink.concat(httpLink)
      )
    : authLink.concat(httpLink);

  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { errorPolicy: "all" },
      query: { errorPolicy: "all" },
      mutate: { errorPolicy: "all" },
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