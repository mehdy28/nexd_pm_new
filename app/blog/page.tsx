import { getAllBlogPosts, getMostPopularPosts } from "@/lib/blog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock, User, TrendingUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { WaitlistForm } from "@/components/blog/waitlist-form"
import { Header } from "@/components/sections/header"
export default function BlogPage() {
  const posts = getAllBlogPosts()
  const featuredPost = posts[0]
  const sidebarPosts = posts.slice(1, 4)
  const popularPosts = getMostPopularPosts(3)

  return (
    <div className="min-h-screen bg-gray-50">
      {/*d Header*/}

      <Header />




      {/* Navigation Breadcrumb */}
      {/* <div className="bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-6xl mx-auto">
            <nav className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-teal-600">
                Home
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Blog</span>
            </nav>
          </div>
        </div>
      </div> */}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Sidebar - Featured Articles */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  Featured
                </h2>
                <div className="space-y-4">
                  {sidebarPosts.map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                      <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-0 shadow-sm">
                        <div className="aspect-[4/3] relative overflow-hidden">
                          <Image
                            src={
                              post.image ||
                              "/placeholder.svg?height=200&width=300&query=AI project management illustration" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg"
                            }
                            alt={post.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            <span>•</span>
                            <span>{post.author}</span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-teal-600 transition-colors line-clamp-3">
                            {post.title}
                          </h3>
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{post.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Waitlist Form in Sidebar */}
              <WaitlistForm variant="sidebar" />
            </div>

            {/* Main Content - Hero Article */}
            <div className="lg:col-span-6">
              {featuredPost && (
                <Link href={`/blog/${featuredPost.slug}`} className="group block">
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm">
                    <div className="aspect-[16/10] relative overflow-hidden">
                      <Image
                        src={
                          featuredPost.image ||
                          "/placeholder.svg?height=500&width=800&query=AI team collaboration with robots and humans" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg"
                        }
                        alt={featuredPost.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-8">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {featuredPost.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-sm">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-teal-600 transition-colors leading-tight">
                        {featuredPost.title}
                      </h2>
                      <p className="text-gray-600 mb-6 text-lg leading-relaxed">{featuredPost.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {featuredPost.author}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(featuredPost.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {featuredPost.readTime}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {/* Recent Articles Section */}
              <div className="mt-12">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Recent Articles</h2>
                  <Link href="/blog" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                    VIEW ALL
                  </Link>
                </div>

                <div className="space-y-6">
                  {posts.slice(1, 4).map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                      <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300 border-0 shadow-sm">
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="aspect-[4/3] md:aspect-square relative overflow-hidden">
                            <Image
                              src={
                                post.image ||
                                "/placeholder.svg?height=200&width=200&query=AI project management" ||
                                "/placeholder.svg" ||
                                "/placeholder.svg" ||
                                "/placeholder.svg"
                              }
                              alt={post.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <CardContent className="p-6">
                              <div className="flex flex-wrap gap-2 mb-3">
                                {post.tags.slice(0, 2).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {post.mostPopular && (
                                  <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                                    Most Popular
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-teal-600 transition-colors line-clamp-2">
                                {post.title}
                              </h3>
                              <p className="text-gray-600 mb-4 line-clamp-2">{post.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  {post.author}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(post.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  {post.readTime}
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Newsletter CTA */}
              <div className="mt-12">
                <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
                  <CardContent className="p-8 text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Stay Updated with NEXD.PM</h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                      Get the latest insights on AI-powered project management, visual prompt engineering, and the
                      future of work delivered to your inbox.
                    </p>
                    <WaitlistForm variant="inline" />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Sidebar - Most Popular */}
            <div className="lg:col-span-3">
              <div className="sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Most Popular</h2>
                  <Link href="/blog" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                    VIEW ALL
                  </Link>
                </div>
                <div className="space-y-4">
                  {popularPosts.map((post, index) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                      <div className="flex gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                        <div className="w-16 h-16 relative overflow-hidden rounded-lg flex-shrink-0">
                          <Image
                            src={post.image || `/placeholder.svg?height=64&width=64&query=AI illustration ${index + 1}`}
                            alt={post.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-2 mb-1">
                            {post.title}
                          </h3>
                          <div className="text-xs text-gray-500">
                            {new Date(post.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            • {post.author}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Articles Grid */}
          {posts.length > 4 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Latest Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.slice(4).map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300 border-0 shadow-sm h-full">
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <Image
                          src={post.image || "/placeholder.svg?height=200&width=300&query=AI project management"}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {post.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {post.readTime}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Newsletter Signup */}
          <div className="mt-16">
            <WaitlistForm variant="full" />
          </div>
        </div>
      </div>
    </div>
  )
}
