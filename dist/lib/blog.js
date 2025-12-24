//lib/blog.ts
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
const blogsDirectory = path.join(process.cwd(), "blogs");
export const getAllBlogPosts = cache(async () => {
    if (typeof window !== "undefined") {
        console.warn("getAllBlogPosts should not be called from the client; returning an empty array.");
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
            };
        });
        // Sort posts by date (newest first)
        return allPostsData.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }
    catch (error) {
        console.error("Error reading blog posts:", error);
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
export async function getMostPopularPosts(limit = 3) {
    const allPosts = await getBlogMetadata();
    return allPosts.filter((post) => post.mostPopular).slice(0, limit);
}
