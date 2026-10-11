"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  User,
  Sparkles,
  Layers,
  Tag,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import type { IBlogPostSummary, IBlogCategory } from "@eta/types";

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<IBlogPostSummary[]>([]);
  const [categories, setCategories] = useState<IBlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const queryParams = new URLSearchParams();
    if (selectedCategory !== "ALL") queryParams.append("category", selectedCategory);
    if (selectedTag) queryParams.append("tag", selectedTag);
    if (search.trim()) queryParams.append("search", search.trim());

    Promise.all([
      apiClient.get<{ posts: IBlogPostSummary[] } | IBlogPostSummary[]>(
        `/blog${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
        { requiresAuth: false }
      ),
      apiClient.get<IBlogCategory[]>("/blog/categories", { requiresAuth: false }),
    ])
      .then(([postsRes, catsRes]) => {
        if (!isMounted) return;
        const postList = Array.isArray(postsRes)
          ? postsRes
          : postsRes && "posts" in postsRes && Array.isArray(postsRes.posts)
            ? postsRes.posts
            : [];
        setPosts(postList);
        if (Array.isArray(catsRes)) {
          setCategories(catsRes);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, selectedTag, search]);

  const featuredPost = posts.find((p) => p.featured) || posts[0];
  const regularPosts = featuredPost ? posts.filter((p) => p.id !== featuredPost.id) : posts;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-white transition-colors">
      <Header />

      <main className="flex-1 relative">
        {/* Decorative ambient background */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#073C84]/15 dark:bg-[#073C84]/20 blur-[130px]" />
          <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-[#0B7CEB]/10 dark:bg-[#0B7CEB]/15 blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center md:text-left md:flex md:items-end md:justify-between pb-10 border-b border-slate-200 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-[#16C4FF]/30 bg-blue-50 dark:bg-[#0752B5]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-[#16C4FF]">
                <BookOpen className="h-3.5 w-3.5" />
                Academic Dispatches & Journal
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-slate-900 dark:text-white">
                Research & Engineering Insights
              </h1>
            </div>

            <div className="mt-6 md:mt-0 flex items-center gap-3">
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white shadow-xs"
              >
                <Layers className="h-4 w-4 text-blue-600 dark:text-[#16C4FF]" />
                Resource Library
              </Link>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="mt-8 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Input */}
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles by title, keywords or concepts..."
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324] py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all focus:border-blue-500 dark:focus:border-[#16C4FF] focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#16C4FF] shadow-xs"
                />
              </div>

              {/* Tag Reset */}
              {selectedTag && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Filtering by tag: <strong className="text-blue-600 dark:text-[#16C4FF]">#{selectedTag}</strong></span>
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="rounded-md bg-slate-200 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20"
                  >
                    Clear Tag
                  </button>
                </div>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedCategory("ALL");
                  setSelectedTag(null);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${selectedCategory === "ALL"
                    ? "bg-[#0B7CEB] text-white shadow-md shadow-[#0B7CEB]/25"
                    : "border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white shadow-xs"
                  }`}
              >
                All Topics
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setSelectedTag(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${selectedCategory === cat.name
                      ? "bg-[#0B7CEB] text-white shadow-md shadow-[#0B7CEB]/25"
                      : "border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white shadow-xs"
                    }`}
                >
                  {cat.name}
                  {cat.postCount !== undefined && cat.postCount > 0 && (
                    <span className="rounded-full bg-slate-100 dark:bg-white/15 px-1.5 py-0.2 text-[10px] text-slate-700 dark:text-white">
                      {cat.postCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content Listing */}
          {loading ? (
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324]/50 p-6 shadow-xs"
                >
                  <div className="h-44 w-full rounded-xl bg-slate-100 dark:bg-white/5" />
                  <div className="mt-4 h-5 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-slate-100 dark:bg-white/5" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="mt-16 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324]/60 p-12 text-center shadow-xs">
              <BookOpen className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No articles found</h3>

              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("ALL");
                  setSelectedTag(null);
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0752B5] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="mt-10 space-y-12">
              {/* Featured Post Card */}
              {featuredPost && selectedCategory === "ALL" && !selectedTag && !search && (
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/15 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-[#081324] dark:via-[#0A1B33] dark:to-[#073C84]/40 p-6 sm:p-8 lg:p-10 shadow-lg dark:shadow-2xl">
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                          <Sparkles className="h-3 w-3" />
                          Featured Dispatch
                        </span>
                        {featuredPost.categories.map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                          >
                            {c}
                          </span>
                        ))}
                      </div>

                      <h2 className="text-2xl font-extrabold sm:text-3xl lg:text-4xl text-slate-900 dark:text-white leading-tight">
                        <Link
                          href={`/blog/${featuredPost.slug}`}
                          className="transition-colors hover:text-blue-600 dark:hover:text-[#16C4FF]"
                        >
                          {featuredPost.title}
                        </Link>
                      </h2>

                      <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base line-clamp-3 leading-relaxed">
                        {featuredPost.excerpt}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          {featuredPost.authorAvatar ? (
                            <div className="relative h-7 w-7 rounded-full overflow-hidden border border-slate-200 dark:border-white/20">
                              <Image
                                src={featuredPost.authorAvatar}
                                alt={featuredPost.authorName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white font-bold text-xs">
                              <User className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {featuredPost.authorName}
                          </span>
                          {featuredPost.authorRole && (
                            <span className="text-slate-500 dark:text-slate-400">({featuredPost.authorRole})</span>
                          )}
                        </div>

                        {featuredPost.publishedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {new Date(featuredPost.publishedAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-[#16C4FF]" />
                          <span>{featuredPost.readingTime} min read</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link
                          href={`/blog/${featuredPost.slug}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0B7CEB]/30 transition-all hover:bg-[#0752B5] hover:scale-[1.02]"
                        >
                          Read Full Article
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="lg:col-span-5">
                      {featuredPost.coverImage ? (
                        <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-white/15 shadow-xl">
                          <Image
                            src={featuredPost.coverImage}
                            alt={featuredPost.title}
                            fill
                            className="object-cover transition-transform duration-500 hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="flex h-64 sm:h-80 w-full items-center justify-center rounded-2xl border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-[#081324]">
                          <BookOpen className="h-16 w-16 text-blue-600/40 dark:text-[#16C4FF]/40" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Articles Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(selectedCategory !== "ALL" || selectedTag || search ? posts : regularPosts).map(
                  (post) => (
                    <article
                      key={post.id}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324]/70 transition-all hover:border-blue-400 dark:hover:border-[#16C4FF]/40 hover:bg-slate-50/80 dark:hover:bg-[#0A1B33]/80 hover:shadow-xl hover:shadow-[#073C84]/10 dark:hover:shadow-[#073C84]/20 shadow-xs"
                    >
                      <div>
                        {/* Thumbnail */}
                        <Link href={`/blog/${post.slug}`}>
                          <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                            {post.coverImage ? (
                              <Image
                                src={post.coverImage}
                                alt={post.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 dark:from-[#073C84]/40 to-slate-100 dark:to-[#0A1B33]">
                                <BookOpen className="h-10 w-10 text-blue-600/40 dark:text-[#16C4FF]/40" />
                              </div>
                            )}
                            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-white">
                              <Clock className="h-3 w-3 text-[#16C4FF]" />
                              {post.readingTime} min
                            </div>
                          </div>
                        </Link>

                        {/* Content */}
                        <div className="p-5 space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {post.categories.slice(0, 2).map((c) => (
                              <span
                                key={c}
                                className="rounded-md bg-blue-50 dark:bg-white/5 border border-blue-200 dark:border-white/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-[#16C4FF]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-[#16C4FF] transition-colors line-clamp-2">
                            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                          </h3>

                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>

                      {/* Footer / Author info */}
                      <div className="border-t border-slate-100 dark:border-white/10 p-5 pt-3">
                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pb-3">
                            {post.tags.slice(0, 3).map((t) => (
                              <button
                                key={t}
                                onClick={() => setSelectedTag(t)}
                                className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-[#16C4FF] transition-colors"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                #{t}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            {post.authorAvatar ? (
                              <div className="relative h-6 w-6 rounded-full overflow-hidden border border-slate-200 dark:border-white/20">
                                <Image
                                  src={post.authorAvatar}
                                  alt={post.authorName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-bold text-[10px]">
                                <User className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <span className="font-medium text-slate-700 dark:text-slate-300">{post.authorName}</span>
                          </div>

                          <Link
                            href={`/blog/${post.slug}`}
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-[#16C4FF] hover:underline"
                          >
                            Read <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
