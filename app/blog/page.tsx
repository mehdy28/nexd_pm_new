"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { getAllBlogPosts, getMostPopularPosts } from "@/lib/blog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User, TrendingUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { WaitlistForm } from "@/components/blog/waitlist-form"

// NOTE: Blog data fetching would typically happen server-side.
// For this example, we assume it's passed as props or fetched in a client component.
// To make this a runnable example based on your original file,
// we'll fetch data inside a useEffect hook.

type Post = {
  slug: string
  title: string
  description: string
  image: string
  date: string
  author: string
  readTime: string
  tags: string[]
  mostPopular?: boolean
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [popularPosts, setPopularPosts] = useState<Post[]>([])
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const fetchPosts = async () => {
      const allPosts = await getAllBlogPosts()
      const mostPopular = await getMostPopularPosts(3)
      setPosts(allPosts)
      setPopularPosts(mostPopular)
    }
    fetchPosts()

    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const featuredPost = posts[0]
  const sidebarPosts = posts.slice(1, 4)

  const scrollToSection = (id: string) => {
    // This is a placeholder as the blog page may not have these sections.
    // In a real app, you might scroll to a newsletter form, for instance.
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <nav className="fixed top-0 left-1/2 -translate-x-1/2 z-50 pt-4 px-4 w-full max-w-full">
        <div
          className={`rounded-full border border-teal-200/60 bg-white/95 backdrop-blur-2xl shadow-xl transition-all duration-500 mx-auto px-6 py-3 flex items-center justify-between animate-fade-down ${
            scrollY > 100 ? "max-w-md" : "max-w-4xl"
          }`}
          style={{
            boxShadow: "0 8px 32px rgba(20, 184, 166, 0.15)",
          }}
        >
          <div className="flex items-center gap-2">
            <Link href="/">
              <Image src="/landingpage/logo.png" alt="nexd.pm" width={100} height={30} className="h-6 w-auto" />
            </Link>
          </div>

          {scrollY <= 100 && (
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="/#problem"
                className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
              >
                Problem
              </Link>
              <Link
                href="/#solution"
                className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
              >
                Solution
              </Link>
              <Link
                href="/#features"
                className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
              >
                Features
              </Link>
              <Link
                href="/#views"
                className="text-sm font-medium text-slate-700 hover:text-teal-600 transition-colors"
              >
                Views
              </Link>
              <Link
                href="/blog"
                className="text-sm font-semibold text-teal-600 transition-colors"
              >
                Blog
              </Link>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => scrollToSection("waitlist")}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-6 h-9"
          >
            <span className="hidden sm:inline">Join Our Waitlist</span>
            <span className="sm:hidden">Join</span>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-40 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Sidebar - Featured Articles */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  Featured
                </h2>
                <div className="space-y-4">
                  {sidebarPosts.map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                      <Card className="overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/80 hover:shadow-xl hover:border-slate-300 transition-all duration-300 h-full">
                        <div className="aspect-[4/3] relative overflow-hidden">
                          <Image
                            src={post.image || "/placeholder.svg"}
                            alt={post.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            <span>•</span>
                            <span>{post.author}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-teal-600 transition-colors line-clamp-3">
                            {post.title}
                          </h3>
                          <p className="text-xs text-slate-600 mt-2 line-clamp-2">{post.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="sticky top-24">
                <WaitlistForm variant="sidebar" />
              </div>
            </div>

            {/* Main Content - Hero Article */}
            <div className="lg:col-span-6">
              {featuredPost && (
                <Link href={`/blog/${featuredPost.slug}`} className="group block">
                  <Card className="overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/80 hover:shadow-xl hover:border-slate-300 transition-all duration-300 shadow-lg shadow-teal-500/10">
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
                            className="text-sm bg-slate-100/80 border-slate-200 text-slate-700"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-4 group-hover:text-teal-600 transition-colors leading-tight">
                        {featuredPost.title}
                      </h2>
                      <p className="text-slate-600 mb-6 text-lg leading-relaxed">{featuredPost.description}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
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
                  <h2 className="text-2xl font-bold text-slate-900">Recent Articles</h2>
                  <Link href="/blog" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                    VIEW ALL
                  </Link>
                </div>

                <div className="space-y-6">
                  {posts.slice(1, 4).map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                      <Card className="overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/80 hover:shadow-xl hover:border-slate-300 transition-all duration-300">
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
                                    className="text-xs bg-slate-100/80 border-slate-200 text-slate-700"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {post.mostPopular && (
                                  <Badge className="text-xs bg-teal-100/80 text-teal-700 border-teal-200/90">
                                    Most Popular
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-teal-600 transition-colors line-clamp-2">
                                {post.title}
                              </h3>
                              <p className="text-slate-600 mb-4 line-clamp-2">{post.description}</p>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
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
              <div className="mt-12" id="waitlist">
                <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-300">
                  <CardContent className="p-8 text-center">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Stay Updated with nexd.pm</h3>
                    <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
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
                  <h2 className="text-lg font-bold text-slate-900">Most Popular</h2>
                  <Link href="/blog" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                    VIEW ALL
                  </Link>
                </div>
                <div className="space-y-2">
                  {popularPosts.map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                      <div className="flex gap-4 p-3 rounded-xl hover:bg-white/80 transition-colors duration-200">
                        <div className="w-16 h-16 relative overflow-hidden rounded-lg flex-shrink-0">
                          <Image
                            src={post.image || "/placeholder.svg"}
                            alt={post.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-slate-900 group-hover:text-teal-600 transition-colors line-clamp-2 mb-1">
                            {post.title}
                          </h3>
                          <div className="text-xs text-slate-500">
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
              <h2 className="text-2xl font-bold text-slate-900 mb-8">Latest Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.slice(4).map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                    <Card className="overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/80 hover:shadow-xl hover:border-slate-300 transition-all duration-300 h-full">
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
                              className="text-xs bg-slate-100/80 border-slate-200 text-slate-700"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{post.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
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