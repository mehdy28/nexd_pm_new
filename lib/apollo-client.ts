import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client"
import { setContext } from "@apollo/client/link/context"
import { auth } from "@/lib/firebase"

const httpLink = createHttpLink({
  uri: "/api/graphql",
})

const authLink = setContext(async (_, { headers }) => {
  const user = auth.currentUser
  let token = ""
  
  if (user) {
    try {
      token = await user.getIdToken()
    } catch (error) {
      console.error("Error getting ID token:", error)
    }
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  }
})

export const apolloClient = new ApolloClient({
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
})
