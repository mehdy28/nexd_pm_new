import { Metadata } from 'next';
import { getAllBlogPosts, getMostPopularPosts } from "@/lib/blog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock, User, TrendingUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { WaitlistForm } from "@/components/blog/waitlist-form"
import { Header } from "@/components/sections/header"

// Add this metadata object for the blog index page
export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read the latest articles, insights, and updates on project management from the Nexdpm team.',
  alternates: {
    // This resolves to https://nexdpm.com/blog
    canonical: '/blog',
  },
};

export default async function BlogPage() {
  const posts = await getAllBlogPosts()
  const popularPosts = await getMostPopularPosts(3)

  const featuredPost = posts[0]
  const sidebarPosts = posts.slice(1, 4)
  const recentPosts = posts.slice(1, 4)
  const additionalPosts = posts.slice(4)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-black dark:via-black dark:to-teal-950/20 transition-colors duration-300">
      <Header />

      <div className="container mx-auto px-4 pt-40 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Sidebar - Featured Articles */}
            <aside className="lg:col-span-3 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Featured
                </h2>
                <div className="space-y-4">
                  {sidebarPosts.map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                      <Card className="overflow-hidden bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-neutral-800 hover:shadow-xl hover:border-slate-300 dark:hover:border-neutral-700 transition-all duration-300 h-full">
                        <div className="aspect-[4/3] relative overflow-hidden">
                          <Image
                            src={post.image || "/placeholder.svg"}
                            alt={post.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 dark:text-neutral-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            <span>•</span>
                            <span>{post.author}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-neutral-200 text-sm leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-3">
                            {post.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-neutral-500 mt-2 line-clamp-2">{post.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="sticky top-28">
                <WaitlistForm variant="sidebar" />
              </div>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-6">
              {featuredPost && (
                <Link href={`/blog/${featuredPost.slug}`} className="group block">
                  <Card className="overflow-hidden bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-neutral-800 hover:shadow-2xl hover:border-teal-300 dark:hover:border-teal-900 transition-all duration-300 shadow-lg shadow-teal-500/10 dark:shadow-teal-900/10">
                    <div className="aspect-[16/10] relative overflow-hidden">
                      <Image
                        src={featuredPost.image || "/placeholder.svg"}
                        alt={featuredPost.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-8">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {featuredPost.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-sm bg-slate-100/80 dark:bg-neutral-800/80 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-tight">
                        {featuredPost.title}
                      </h2>
                      <p className="text-slate-600 dark:text-neutral-400 mb-6 text-lg leading-relaxed">{featuredPost.description}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-neutral-500">
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
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Articles</h2>
                  <Link href="/blog" className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium">
                    VIEW ALL
                  </Link>
                </div>

                <div className="space-y-6">
                  {recentPosts.map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                      <Card className="overflow-hidden bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-neutral-800 hover:shadow-xl hover:border-slate-300 dark:hover:border-neutral-700 transition-all duration-300">
                        <div className="grid md:grid-cols-3">
                          <div className="md:col-span-1 aspect-[4/3] md:aspect-auto relative overflow-hidden">
                            <Image
                              src={post.image || "/placeholder.svg"}
                              alt={post.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <CardContent className="p-6">
                              <div className="flex flex-wrap gap-2 mb-3">
                                {post.tags.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-xs bg-slate-100/80 dark:bg-neutral-800/80 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {post.mostPopular && (
                                  <Badge className="text-xs bg-teal-100/80 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200/90 dark:border-teal-800/50">
                                    Most Popular
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                                {post.title}
                              </h3>
                              <p className="text-slate-600 dark:text-neutral-400 mb-4 line-clamp-2">{post.description}</p>
                              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-neutral-500">
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

              <div className="mt-12">
                <WaitlistForm variant="full" />
              </div>
            </main>

            {/* Right Sidebar - Most Popular */}
            <aside className="lg:col-span-3">
              <div className="sticky top-28">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Most Popular</h2>
                  <Link href="/blog" className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium">
                    VIEW ALL
                  </Link>
                </div>
                <div className="space-y-2">
                  {popularPosts.map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                      <div className="flex gap-4 p-3 rounded-xl hover:bg-white/80 dark:hover:bg-neutral-900/80 transition-colors duration-200">
                        <div className="w-16 h-16 relative overflow-hidden rounded-lg flex-shrink-0">
                          <Image
                            src={post.image || "/placeholder.svg"}
                            alt={post.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-neutral-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 mb-1">
                            {post.title}
                          </h3>
                          <div className="text-xs text-slate-500 dark:text-neutral-500">
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
            </aside>
          </div>

          {/* Additional Articles Grid */}
          {additionalPosts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-t border-slate-200 dark:border-neutral-800 pt-12">
                Latest Articles
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {additionalPosts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                    <Card className="overflow-hidden bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-neutral-800 hover:shadow-xl hover:border-slate-300 dark:hover:border-neutral-700 transition-all duration-300 h-full">
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <Image
                          src={post.image || "/placeholder.svg"}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {post.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs bg-slate-100/80 dark:bg-neutral-800/80 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-neutral-400 line-clamp-2 mb-3">{post.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-500">
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
        </div>
      </div>
    </div>
  )
}