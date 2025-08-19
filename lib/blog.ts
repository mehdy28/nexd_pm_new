// import fs from "fs"
// import path from "path"
// import matter from "gray-matter"

// export interface BlogPost {
//   slug: string
//   title: string
//   description: string
//   author: string
//   date: string
//   readTime: string
//   tags: string[]
//   image: string
//   content: string
//   mostPopular: boolean
// }

// export interface BlogMetadata {
//   slug: string
//   title: string
//   description: string
//   author: string
//   date: string
//   readTime: string
//   tags: string[]
//   image: string
//   mostPopular: boolean
// }

// const blogsDirectory = path.join(process.cwd(), "public/blogs")

// export function getAllBlogPosts(): BlogPost[] {
//   try {
//     const fileNames = fs.readdirSync(blogsDirectory)
//     const allPostsData = fileNames
//       .filter((name) => name.endsWith(".md"))
//       .map((name) => {
//         const slug = name.replace(/\.md$/, "")
//         const fullPath = path.join(blogsDirectory, name)
//         const fileContents = fs.readFileSync(fullPath, "utf8")
//         const { data, content } = matter(fileContents)

//         return {
//           slug,
//           title: data.title || "",
//           description: data.description || "",
//           author: data.author || "",
//           date: data.date || "",
//           readTime: data.readTime || "",
//           tags: data.tags || [],
//           image: data.image || "",
//           content,
//           mostPopular: data.mostPopular || false,
//         } as BlogPost
//       })

//     // Sort posts by date (newest first)
//     return allPostsData.sort((a, b) => {
//       return new Date(b.date).getTime() - new Date(a.date).getTime()
//     })
//   } catch (error) {
//     console.error("Error reading blog posts:", error)
//     return []
//   }
// }

// export function getBlogPost(slug: string): BlogPost | null {
//   try {
//     const fullPath = path.join(blogsDirectory, `${slug}.md`)
//     const fileContents = fs.readFileSync(fullPath, "utf8")
//     const { data, content } = matter(fileContents)

//     return {
//       slug,
//       title: data.title || "",
//       description: data.description || "",
//       author: data.author || "",
//       date: data.date || "",
//       readTime: data.readTime || "",
//       tags: data.tags || [],
//       image: data.image || "",
//       content,
//       mostPopular: data.mostPopular || false,
//     } as BlogPost
//   } catch (error) {
//     console.error(`Error reading blog post ${slug}:`, error)
//     return null
//   }
// }

// export function getBlogMetadata(): BlogMetadata[] {
//   const posts = getAllBlogPosts()
//   return posts.map(({ content, ...metadata }) => metadata)
// }

// export function getRelatedPosts(currentSlug: string, tags: string[], limit = 3): BlogMetadata[] {
//   const allPosts = getBlogMetadata()
//   const otherPosts = allPosts.filter((post) => post.slug !== currentSlug)

//   // Score posts based on tag overlap
//   const scoredPosts = otherPosts.map((post) => {
//     const commonTags = post.tags.filter((tag) => tags.includes(tag))
//     return {
//       ...post,
//       score: commonTags.length,
//     }
//   })

//   // Sort by score (most relevant first) and take the limit
//   return scoredPosts
//     .sort((a, b) => b.score - a.score)
//     .slice(0, limit)
//     .map(({ score, ...post }) => post)
// }

// export function getMostPopularPosts(limit = 3): BlogMetadata[] {
//   const allPosts = getBlogMetadata()
//   return allPosts.filter((post) => post.mostPopular).slice(0, limit)
// }









import path from "path";
import matter from "gray-matter";
import { cache } from "react";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  readTime: string;
  tags: string[];
  image: string;
  content: string;
  mostPopular: boolean;
}

export interface BlogMetadata {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  readTime: string;
  tags: string[];
  image: string;
  mostPopular: boolean;
}

const blogsDirectory = path.join(process.cwd(), "public/blogs");

const getAllBlogPosts = cache(async (): Promise<BlogPost[]> => {
  if (typeof window !== "undefined") {
    console.warn(
      "getAllBlogPosts should not be called from the client; returning an empty array."
    );
    return [];
  }

  const fs = await import("fs"); // Dynamic import

  try {
    const fileNames = fs.readdirSync(blogsDirectory);
    const allPostsData = fileNames
      .filter((name) => name.endsWith(".md"))
      .map((name) => {
        const slug = name.replace(/\.md$/, "");
        const fullPath = path.join(blogsDirectory, name);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        return {
          slug,
          title: data.title || "",
          description: data.description || "",
          author: data.author || "",
          date: data.date || "",
          readTime: data.readTime || "",
          tags: data.tags || [],
          image: data.image || "",
          content,
          mostPopular: data.mostPopular || false,
        } as BlogPost;
      });

    // Sort posts by date (newest first)
    return allPostsData.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  } catch (error) {
    console.error("Error reading blog posts:", error);
    return [];
  }
});

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const allPosts = await getAllBlogPosts();
  return allPosts.find((post) => post.slug === slug) || null;
}

export async function getBlogMetadata(): Promise<BlogMetadata[]> {
  const posts = await getAllBlogPosts();
  return posts.map(({ content, ...metadata }) => metadata);
}

export async function getRelatedPosts(
  currentSlug: string,
  tags: string[],
  limit = 3
): Promise<BlogMetadata[]> {
  const allPosts = await getBlogMetadata();
  const otherPosts = allPosts.filter((post) => post.slug !== currentSlug);

  // Score posts based on tag overlap
  const scoredPosts = otherPosts.map((post) => {
    const commonTags = post.tags.filter((tag) => tags.includes(tag));
    return {
      ...post,
      score: commonTags.length,
    };
  });

  // Sort by score (most relevant first) and take the limit
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...post }) => post);
}

export async function getMostPopularPosts(
  limit = 3
): Promise<BlogMetadata[]> {
  const allPosts = await getBlogMetadata();
  return allPosts.filter((post) => post.mostPopular).slice(0, limit);
}
