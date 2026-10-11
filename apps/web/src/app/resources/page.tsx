"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  Video,
  BookOpen,
  Code2,
  Download,
  ExternalLink,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  Filter,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import {
  ResourceType,
  ResourceAccessType,
  type IResourceSummary,
} from "@eta/types";

function getResourceTypeIcon(type: ResourceType) {
  switch (type) {
    case ResourceType.VIDEO:
      return <Video className="h-5 w-5 text-rose-400" />;
    case ResourceType.DOCUMENT:
    case ResourceType.PDF:
      return <FileText className="h-5 w-5 text-[#16C4FF]" />;
    case ResourceType.LEARNING_GUIDE:
    case ResourceType.PUBLIC_LESSON:
      return <BookOpen className="h-5 w-5 text-amber-400" />;
    case ResourceType.TEMPLATE:
      return <Code2 className="h-5 w-5 text-emerald-400" />;
    default:
      return <Layers className="h-5 w-5 text-indigo-400" />;
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ResourceLibraryPage() {
  const [resources, setResources] = useState<IResourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    let isMounted = true;

    const queryParams = new URLSearchParams();
    if (selectedType !== "ALL") queryParams.append("type", selectedType);
    if (selectedCategory !== "ALL") queryParams.append("category", selectedCategory);
    if (search.trim()) queryParams.append("search", search.trim());

    apiClient
      .get<{ resources: IResourceSummary[] } | IResourceSummary[]>(
        `/resources${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
        { requiresAuth: false }
      )
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res)
          ? res
          : res && "resources" in res && Array.isArray(res.resources)
            ? res.resources
            : [];
        setResources(list);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedType, selectedCategory, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050B14] text-slate-900 dark:text-white transition-colors">
      <Header />

      <main className="flex-1 relative">
        {/* Ambient background glows */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#073C84]/15 blur-[130px]" />
          <div className="absolute top-1/2 -left-40 h-[500px] w-[500px] rounded-full bg-[#0B7CEB]/10 blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <div className="text-center md:text-left md:flex md:items-end md:justify-between pb-10 border-b border-slate-200 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-[#16C4FF]/30 bg-blue-50 dark:bg-[#0752B5]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-[#16C4FF]">
                <Layers className="h-3.5 w-3.5" />
                Open Academy Library
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-slate-900 dark:text-white">
                Academic Resources & Public Materials
              </h1>
            </div>

            <div className="mt-6 md:mt-0 flex items-center gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white shadow-xs"
              >
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-[#16C4FF]" />
                Visit Blog Journal
              </Link>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="mt-8 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Input */}
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search resources by title, topic, or format..."
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#081324] py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all focus:border-blue-500 dark:focus:border-[#16C4FF] focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#16C4FF]"
                />
              </div>

              {/* Category Select */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#081324] py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 dark:focus:border-[#16C4FF]"
                >
                  <option value="ALL">All Disciplines</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Software Engineering">Software Engineering</option>
                </select>
              </div>
            </div>

            {/* Resource Type Filter Tabs */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                { id: "ALL", label: "All Formats" },
                { id: ResourceType.DOCUMENT, label: "Documents & Handouts" },
                { id: ResourceType.LEARNING_GUIDE, label: "Learning Guides" },
                { id: ResourceType.VIDEO, label: "Video Lectures" },
                { id: ResourceType.TEMPLATE, label: "Lab Templates" },
                { id: ResourceType.PUBLIC_LESSON, label: "Public Lessons" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedType(tab.id)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${selectedType === tab.id
                    ? "bg-[#0B7CEB] text-white shadow-md shadow-[#0B7CEB]/25"
                    : "border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resource Cards Grid */}
          {loading ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-white/10 bg-[#081324]/50 p-6"
                >
                  <div className="h-8 w-8 rounded-lg bg-white/10 mb-4" />
                  <div className="h-5 w-3/4 rounded bg-white/10 mb-2" />
                  <div className="h-4 w-full rounded bg-white/5 mb-4" />
                  <div className="h-8 w-1/3 rounded bg-white/5" />
                </div>
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="mt-16 rounded-2xl border border-white/10 bg-[#081324]/60 p-12 text-center">
              <Layers className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-bold text-white">No resources found</h3>

              <button
                onClick={() => {
                  setSearch("");
                  setSelectedType("ALL");
                  setSelectedCategory("ALL");
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0752B5]"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#081324]/75 p-6 transition-all hover:border-blue-400 dark:hover:border-[#16C4FF]/40 hover:bg-slate-50/70 dark:hover:bg-[#0A1B33]/80 hover:shadow-xl shadow-xs"
                >
                  <div>
                    {/* Top Bar: Icon & Access Badge */}
                    <div className="flex items-center justify-between pb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:border-blue-300 dark:group-hover:border-[#16C4FF]/30 transition-colors">
                        {getResourceTypeIcon(resource.resourceType)}
                      </div>

                      <div className="flex items-center gap-2">
                        {resource.featured && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-400/15 border border-amber-200 dark:border-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            <Sparkles className="h-2.5 w-2.5" />
                            Featured
                          </span>
                        )}
                        {resource.accessType === ResourceAccessType.MEMBERS_ONLY ? (
                          <span
                            title="Members Only"
                            className="flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            Members
                          </span>
                        ) : (
                          <span
                            title="Public Resource"
                            className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                          >
                            <Unlock className="h-2.5 w-2.5" />
                            Public
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Category & Title */}
                    {resource.category && (
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-[#16C4FF]">
                        {resource.category}
                      </div>
                    )}

                    <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-[#16C4FF] transition-colors line-clamp-2">
                      <Link href={`/resources/${resource.slug}`}>{resource.title}</Link>
                    </h3>

                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {resource.description}
                    </p>
                  </div>

                  {/* Footer Meta & Action */}
                  <div className="mt-6 border-t border-slate-100 dark:border-white/10 pt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="capitalize">{resource.resourceType.toLowerCase().replace("_", " ")}</span>
                        {resource.fileSize ? (
                          <>
                            <span>•</span>
                            <span>{formatBytes(resource.fileSize)}</span>
                          </>
                        ) : null}
                      </div>

                      {resource.authorName && (
                        <span className="truncate max-w-[120px] text-slate-700 dark:text-slate-300">
                          {resource.authorName}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/resources/${resource.slug}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all hover:border-blue-400 dark:hover:border-[#16C4FF]/50 hover:bg-[#0B7CEB] hover:text-white"
                    >
                      {resource.resourceType === ResourceType.VIDEO ? (
                        <>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Watch Lecture
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          Access Resource
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
