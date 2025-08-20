// import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client"
// import { setContext } from "@apollo/client/link/context"
// import { auth } from "@/lib/firebase"

// const httpLink = createHttpLink({
//   uri: "/api/graphql",
// })

// const authLink = setContext(async (_, { headers }) => {
//   const user = auth.currentUser
//   let token = ""
  
//   if (user) {
//     try {
//       token = await user.getIdToken()
//     } catch (error) {
//       console.error("Error getting ID token:", error)
//     }
//   }

//   return {
//     headers: {
//       ...headers,
//       authorization: token ? `Bearer ${token}` : "",
//     },
//   }
// })

// export const apolloClient = new ApolloClient({
//   link: authLink.concat(httpLink),
//   cache: new InMemoryCache(),
//   defaultOptions: {
//     watchQuery: {
//       errorPolicy: "all",
//     },
//     query: {
//       errorPolicy: "all",
//     },
//   },
// })


// ./lib/apollo-client.ts

import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { auth } from "@/lib/firebase";

let apolloClient: ApolloClient<any> | null = null;

function createApolloClient() {
  const httpLink = createHttpLink({
    uri: "/api/graphql",
  });

  const authLink = setContext(async (_, { headers }) => {
    const user = auth.currentUser;
    let token = "";

    if (user) {
      try {
        token = await user.getIdToken();
      } catch (error) {
        console.error("Error getting ID token:", error);
      }
    }

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
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

export function initializeApollo(initialState = null) {
  const _apolloClient = apolloClient ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client, the initialState
  // keys will have cache results from the initial server-side data fetching.
  if (initialState) {
    // Get existing cache, loaded during client side data fetching.
    const existingCache = _apolloClient.extract();

    // Restore the cache with the merged results from the server and the client.
    _apolloClient.cache.restore({ ...existingCache, ...initialState });
  }
  // For SSG and SSR always create a new Apollo Client.
  if (typeof window === "undefined") return _apolloClient;
  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient;

  return _apolloClient;
}