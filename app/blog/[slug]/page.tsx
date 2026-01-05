//app/blog/[slug]/page.tsx
import {
  getBlogPost,
  getRelatedPosts,
  getAllBlogPosts,
} from "@/lib/blog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { WaitlistForm } from "@/components/blog/waitlist-form";
import { Header } from "@/components/sections/header"

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}


export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }


  const relatedPosts = await getRelatedPosts(post.slug, post.tags);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <Header />

      <main className="container mx-auto px-4 pt-40 pb-24">
        <article className="max-w-4xl mx-auto">
          {/* Back to Blog Link */}
          <div className="mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to all articles
            </Link>
          </div>

          {/* Article Header */}
          <header className="mb-12">
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-sm bg-slate-100/80 border-slate-200 text-slate-700"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight text-balance">
              {post.title}
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed text-balance">{post.description}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-slate-500 border-t border-b border-slate-200 py-4 mb-12">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span className="font-medium">{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{post.readTime}</span>
              </div>
            </div>
            {/* Featured Image */}
            <div className="aspect-video relative overflow-hidden rounded-xl shadow-2xl shadow-teal-500/10 border border-slate-200/80">
              <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
            </div>
          </header>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none prose-slate">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-4xl font-bold text-slate-900 mt-12 mb-6">{children}</h1>,
                h2: ({ children }) => <h2 className="text-3xl font-bold text-slate-900 mt-10 mb-4">{children}</h2>,
                h3: ({ children }) => <h3 className="text-2xl font-bold text-slate-900 mt-8 mb-3">{children}</h3>,
                p: ({ children }) => <p className="text-slate-700 leading-relaxed mb-6 text-lg">{children}</p>,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-slate-700 mb-6 space-y-2 text-lg">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-slate-700 mb-6 space-y-2 text-lg">{children}</ol>
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-teal-600 hover:text-teal-700 font-medium underline underline-offset-4 transition-colors"
                    {...props}
                  />
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-teal-500 pl-6 italic text-slate-600 my-8 text-lg">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-slate-100 text-teal-700 px-2 py-1 rounded-md text-base font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-slate-900 text-slate-100 p-6 rounded-lg overflow-x-auto my-8">{children}</pre>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Waitlist CTA */}
          <div className="mt-16" id="waitlist-form">
            <WaitlistForm variant="full" />
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16 border-t border-slate-200 pt-12">
              <h3 className="text-3xl font-bold text-slate-900 mb-8">Related Articles</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.slug} href={`/blog/${relatedPost.slug}`} className="group">
                    <Card className="overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/80 hover:shadow-xl hover:border-slate-300 transition-all duration-300 h-full">
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <Image
                          src={relatedPost.image || "/placeholder.svg"}
                          alt={relatedPost.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {relatedPost.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs bg-slate-100/80 border-slate-200 text-slate-700"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors line-clamp-2">
                          {relatedPost.title}
                        </h4>
                        <p className="text-sm text-slate-600 line-clamp-2">{relatedPost.description}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {relatedPost.readTime}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </div>
  )
}
