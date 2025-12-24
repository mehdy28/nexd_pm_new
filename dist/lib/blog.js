//lib/blog.ts
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
const blogsDirectory = path.join(process.cwd(), "blogs");
export const getAllBlogPosts = cache(async () => {
    if (typeof window !== "undefined") {
        return [];
    }
    const fs = await import("fs");
    // --- START RUNTIME FILE SYSTEM DEBUG ---
    console.log("--- RUNTIME FILE SYSTEM DEBUG ---");
    const rootPath = process.cwd();
    console.log(`[Vercel Runtime] Current Working Directory: ${rootPath}`);
    try {
        // Recursively list all files in the runtime environment
        const allFiles = fs.readdirSync(rootPath, { recursive: true });
        console.log("[Vercel Runtime] Files found in CWD:", allFiles);
    }
    catch (e) {
        console.error("[Vercel Runtime] Error listing files in CWD:", e.message);
    }
    console.log(`[Vercel Runtime] Checking for blogs directory at: ${blogsDirectory}`);
    try {
        const blogFiles = fs.readdirSync(blogsDirectory);
        console.log("[Vercel Runtime] SUCCESS: Found blog files:", blogFiles);
    }
    catch (e) {
        console.error("[Vercel Runtime] ERROR: Could not read blogs directory.", e.message);
    }
    console.log("--- END RUNTIME FILE SYSTEM DEBUG ---");
    // --- END RUNTIME FILE SYSTEM DEBUG ---
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
            };
        });
        return allPostsData.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }
    catch (error) {
        return [];
    }
});
export async function getBlogPost(slug) {
    const allPosts = await getAllBlogPosts();
    return allPosts.find((post) => post.slug === slug) || null;
}
export async function getBlogMetadata() {
    const posts = await getAllBlogPosts();
    return posts.map(({ content, ...metadata }) => metadata);
}
export async function getRelatedPosts(currentSlug, tags, limit = 3) {
    const allPosts = await getBlogMetadata();
    const otherPosts = allPosts.filter((post) => post.slug !== currentSlug);
    const scoredPosts = otherPosts.map((post) => {
        const commonTags = post.tags.filter((tag) => tags.includes(tag));
        return {
            ...post,
            score: commonTags.length,
        };
    });
    return scoredPosts
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ score, ...post }) => post);
}
export async function getMostPopularPosts(limit = 3) {
    const allPosts = await getBlogMetadata();
    return allPosts.filter((post) => post.mostPopular).slice(0, limit);
}
