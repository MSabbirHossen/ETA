"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Share2,
  Check,
  ChevronRight,
  Sparkles,
  Tag,
  BookOpen,
} from "lucide-react";
import { apiClient } from "../../../lib/api-client";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import type { IBlogPost, IBlogPostSummary } from "@eta/types";

// Safe, native markdown-to-React parser to prevent XSS injection
function renderSafeMarkdown(content: string) {
  if (!content) return null;
  const lines = content.split("\n");

  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  lines.forEach((line, index) => {
    // Code blocks toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="my-4 overflow-x-auto rounded-xl border border-slate-700 dark:border-white/10 bg-slate-900 p-4 font-mono text-xs text-sky-300 shadow-md"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${index}`}
          className="mt-6 mb-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl"
        >
          {line.replace("### ", "")}
        </h3>
      );
      return;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${index}`}
          className="mt-8 mb-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl border-b border-slate-200 dark:border-white/10 pb-2"
        >
          {line.replace("## ", "")}
        </h2>
      );
      return;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={`h1-${index}`}
          className="mt-8 mb-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
        >
          {line.replace("# ", "")}
        </h1>
      );
      return;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="my-4 border-l-4 border-blue-500 dark:border-[#16C4FF] bg-blue-50 dark:bg-[#073C84]/15 py-3 px-4 italic text-slate-700 dark:text-slate-200 rounded-r-xl"
        >
          {line.replace("> ", "")}
        </blockquote>
      );
      return;
    }

    // Unordered lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const cleanLine = line.trim().replace(/^[-*]\s+/, "");
      elements.push(
        <li key={`li-${index}`} className="ml-6 list-disc text-slate-700 dark:text-slate-300 my-1 text-base">
          {cleanLine}
        </li>
      );
      return;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(line.trim())) {
      const cleanLine = line.trim().replace(/^\d+\.\s+/, "");
      elements.push(
        <li key={`ol-${index}`} className="ml-6 list-decimal text-slate-700 dark:text-slate-300 my-1 text-base">
          {cleanLine}
        </li>
      );
      return;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={`sp-${index}`} className="h-3" />);
      return;
    }

    // Paragraph
    elements.push(
      <p key={`p-${index}`} className="my-2 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-300">
        {line}
      </p>
    );
  });

  return elements;
}

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [post, setPost] = useState<IBlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<IBlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;

    apiClient
      .get<{ post: IBlogPost; relatedPosts: IBlogPostSummary[] }>(`/blog/${slug}`, {
        requiresAuth: false,
      })
      .then((res) => {
        if (!isMounted) return;
        setPost(res.post);
        setRelatedPosts(res.relatedPosts || []);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-white transition-colors">
        <Header />
        <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl animate-pulse space-y-6">
            <div className="h-6 w-32 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-12 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-96 w-full rounded-2xl bg-slate-100 dark:bg-white/5" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-slate-100 dark:bg-white/5" />
              <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-white/5" />
              <div className="h-4 w-4/6 rounded bg-slate-100 dark:bg-white/5" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-white transition-colors">
        <Header />
        <main className="flex-1 py-24 px-4 text-center">
          <BookOpen className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Article Not Found</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The requested article either does not exist or has not been published yet.
          </p>
          <Link
            href="/blog"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0752B5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Blog Directory
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-white transition-colors">
      <Header />

      <main className="flex-1 relative">
        {/* Decorative ambient background */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#073C84]/15 dark:bg-[#073C84]/20 blur-[130px]" />
          <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-[#0B7CEB]/10 dark:bg-[#0B7CEB]/15 blur-[140px]" />
        </div>

        <article className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-8">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/blog" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Blog
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-blue-600 dark:text-[#16C4FF] font-medium truncate max-w-xs">{post.title}</span>
        </nav>

        {/* Categories & Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {post.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Featured Research
            </span>
          )}
          {post.categories.map((c) => (
            <span
              key={c}
              className="rounded-full border border-blue-200 dark:border-white/15 bg-blue-50 dark:bg-white/5 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-[#16C4FF]"
            >
              {c}
            </span>
          ))}
        </div>

        {/* Article Title */}
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl leading-tight text-slate-900 dark:text-white mb-6">
          {post.title}
        </h1>

        {/* Excerpt Lead */}
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed border-l-2 border-blue-500 dark:border-[#16C4FF] pl-4 italic mb-8">
          {post.excerpt}
        </p>

        {/* Author & Publication Meta Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-y border-slate-200 dark:border-white/10 py-4 mb-8">
          <div className="flex items-center gap-3">
            {post.authorAvatar ? (
              <div className="relative h-11 w-11 rounded-full overflow-hidden border border-slate-200 dark:border-white/20">
                <Image src={post.authorAvatar} alt={post.authorName} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#073C84] text-white font-bold text-sm">
                <User className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{post.authorName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{post.authorRole || "Faculty Fellow"}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            {post.publishedAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>
                  {new Date(post.publishedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-600 dark:text-[#16C4FF]" />
              <span>{post.readingTime} min read</span>
            </div>

            <button
              onClick={handleShare}
              title="Share article URL"
              className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Share"}</span>
            </button>
          </div>
        </div>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative h-72 sm:h-96 lg:h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-white/15 shadow-xl dark:shadow-2xl mb-10">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              className="object-cover"
            />
          </div>
        )}

        {/* Article Body Content */}
        <div className="prose dark:prose-invert max-w-none space-y-4">
          {renderSafeMarkdown(post.content)}
        </div>

        {/* Tags Section */}
        {post.tags.length > 0 && (
          <div className="mt-12 pt-6 border-t border-slate-200 dark:border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-blue-600 dark:text-[#16C4FF]" />
              Related Topics & Keywords
            </h4>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <Link
                  key={t}
                  href={`/blog?tag=${encodeURIComponent(t)}`}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324] px-3 py-1 text-xs text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-[#16C4FF]/50 hover:text-blue-600 dark:hover:text-[#16C4FF] transition-all shadow-xs"
                >
                  #{t}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Author Bio Card */}
        <div className="mt-12 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324]/80 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-xs">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0752B5] to-[#16C4FF] text-white font-extrabold text-lg shadow-lg">
            {post.authorName.charAt(0)}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">{post.authorName}</h4>
            <p className="text-xs text-blue-600 dark:text-[#16C4FF] font-medium">{post.authorRole || "Academic Faculty"}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
              Contributing faculty fellow at Exploratory Training Academy, conducting applied research and authoring specialized learning curriculum.
            </p>
          </div>
        </div>

        {/* Related Articles Section */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200 dark:border-white/10">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Further Reading & Related Dispatches</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/blog/${rel.slug}`}
                  className="group block rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324]/60 p-4 transition-all hover:border-blue-400 dark:hover:border-[#16C4FF]/40 hover:bg-slate-50 dark:hover:bg-[#0A1B33] shadow-xs hover:shadow-md"
                >
                  <div className="text-[11px] font-semibold text-blue-600 dark:text-[#16C4FF]">
                    {rel.categories[0] || "Academic"}
                  </div>
                  <h4 className="mt-1 font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-[#16C4FF] transition-colors line-clamp-2">
                    {rel.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{rel.excerpt}</p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <Clock className="h-3 w-3 text-blue-600 dark:text-[#16C4FF]" />
                    <span>{rel.readingTime} min read</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-12 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Articles
          </Link>
        </div>
      </article>
    </main>

    <Footer />
  </div>
);
}
