"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  Download,
  ExternalLink,
  Lock,
  Unlock,
  Layers,
  ChevronRight,
  FileText,
  Sparkles,
  Tag,
  LogIn,
} from "lucide-react";
import { apiClient } from "../../../lib/api-client";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import {
  ResourceType,
  ResourceAccessType,
  type IResource,
  type IResourceSummary,
} from "@eta/types";

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getEmbedUrl(url?: string): string | null {
  if (!url) return null;
  // YouTube watch link to embed link
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  return null;
}

export default function ResourceDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [resource, setResource] = useState<IResource | null>(null);
  const [relatedResources, setRelatedResources] = useState<IResourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;

    apiClient
      .get<{ resource: IResource; relatedResources: IResourceSummary[] }>(
        `/resources/${slug}`,
        { requiresAuth: false }
      )
      .then((res) => {
        if (!isMounted) return;
        setResource(res.resource);
        setRelatedResources(res.relatedResources || []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        if (
          typeof err === "object" &&
          err !== null &&
          "statusCode" in err &&
          (err as { statusCode: number }).statusCode === 401
        ) {
          setUnauthorized(true);
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-white transition-colors">
        <Header />
        <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl animate-pulse space-y-6">
            <div className="h-6 w-32 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-12 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-64 w-full rounded-2xl bg-slate-100 dark:bg-white/5" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-white transition-colors">
        <Header />
        <main className="flex-1 py-24 px-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Academy Members Only</h1>
          <p className="mt-2 text-sm max-w-md mx-auto text-slate-600 dark:text-slate-300">
            This learning material is part of the private curriculum archive. Please sign in with your active student or faculty account to access it.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0752B5]"
            >
              <LogIn className="h-4 w-4" />
              Sign In to Access
            </Link>
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Browse Public Resources
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-white transition-colors">
        <Header />
        <main className="flex-1 py-24 px-4 text-center">
          <Layers className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Resource Not Found</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The requested educational resource either does not exist or has been archived.
          </p>
          <Link
            href="/resources"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0752B5]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resource Library
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const embedVideoUrl = resource.resourceType === ResourceType.VIDEO ? getEmbedUrl(resource.externalUrl) : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-white transition-colors">
      <Header />

      <main className="flex-1 relative">
        {/* Ambient background glows */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#073C84]/15 blur-[130px]" />
          <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-[#0B7CEB]/10 blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-8">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/resources" className="hover:text-white transition-colors">
            Resources
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#16C4FF] font-medium truncate max-w-xs">{resource.title}</span>
        </nav>

        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {resource.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Featured Resource
            </span>
          )}
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-[#16C4FF] capitalize">
            {resource.resourceType.toLowerCase().replace("_", " ")}
          </span>
          {resource.category && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              {resource.category}
            </span>
          )}
          {resource.accessType === ResourceAccessType.MEMBERS_ONLY ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Lock className="h-3.5 w-3.5" />
              Members Only
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Unlock className="h-3.5 w-3.5" />
              Public Resource
            </span>
          )}
        </div>

        {/* Resource Title */}
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white mb-6">
          {resource.title}
        </h1>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-4 border-y border-white/10 py-4 text-xs text-slate-400 mb-8">
          {resource.authorName && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <User className="h-4 w-4 text-[#16C4FF]" />
              <span>Contributed by <strong>{resource.authorName}</strong></span>
            </div>
          )}

          {resource.publishedAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>
                {new Date(resource.publishedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}

          {resource.fileSize ? (
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>{formatBytes(resource.fileSize)}</span>
            </div>
          ) : null}

          {resource.downloadCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <Download className="h-4 w-4 text-[#16C4FF]" />
              <span>{resource.downloadCount} accesses</span>
            </div>
          )}
        </div>

        {/* Video Embed If Available */}
        {embedVideoUrl ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl mb-8">
            <iframe
              src={embedVideoUrl}
              title={resource.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : null}

        {/* Resource Description Card */}
        <div className="rounded-2xl border border-white/10 bg-[#081324]/80 p-6 sm:p-8 space-y-4 mb-8">
          <h2 className="text-lg font-bold text-white">About this Learning Material</h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
            {resource.description}
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-wrap gap-4">
            {resource.fileUrl && (
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0B7CEB]/30 hover:bg-[#0752B5] transition-all hover:scale-[1.02]"
              >
                <Download className="h-4 w-4" />
                Download Document ({formatBytes(resource.fileSize) || "File"})
              </a>
            )}

            {resource.externalUrl && (
              <a
                href={resource.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all hover:scale-[1.02]"
              >
                <ExternalLink className="h-4 w-4 text-[#16C4FF]" />
                Open External Resource
              </a>
            )}
          </div>
        </div>

        {/* Tags */}
        {resource.tags.length > 0 && (
          <div className="pt-2 pb-6 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-[#16C4FF]" />
              <span className="text-xs text-slate-400">Subject Tags:</span>
              {resource.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-lg border border-white/10 bg-[#081324] px-2.5 py-0.5 text-xs text-slate-300"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Resources */}
        {relatedResources.length > 0 && (
          <div className="mt-12 pt-6">
            <h3 className="text-xl font-bold text-white mb-6">Related Academic Resources</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedResources.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/resources/${rel.slug}`}
                  className="group block rounded-xl border border-white/10 bg-[#081324]/60 p-4 transition-all hover:border-[#16C4FF]/40 hover:bg-[#0A1B33]"
                >
                  <div className="text-[11px] font-semibold text-[#16C4FF] capitalize">
                    {rel.resourceType.toLowerCase().replace("_", " ")}
                  </div>
                  <h4 className="mt-1 font-bold text-sm text-white group-hover:text-[#16C4FF] transition-colors line-clamp-2">
                    {rel.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{rel.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-12 text-center">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resource Library
          </Link>
        </div>
      </div>
    </main>

    <Footer />
  </div>
);
}
