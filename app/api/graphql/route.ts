import apolloServer from "@/lib/apollo-server"

export async function GET(request: Request) {
  return apolloServer(request)
}

export async function POST(request: Request) {
  return apolloServer(request)
}
