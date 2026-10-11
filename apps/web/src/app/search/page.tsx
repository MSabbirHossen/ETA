"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  FileText,
  BookOpen,
  GraduationCap,
  Users,
  Award,
  Megaphone,
  CreditCard,
  Layers,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Compass,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { useI18n } from "../../i18n";
import {
  SearchResultType,
  type ISearchResult,
  type ISearchResponse,
} from "@eta/types";

function SafeHighlight({ text, query }: { text: string; query: string }) {
  if (!text || !query.trim()) return <>{text}</>;

  const tokens = query
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  if (tokens.length === 0) return <>{text}</>;

  const escaped = tokens
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  let regex: RegExp | null = null;
  try {
    regex = new RegExp(`(${escaped})`, "gi");
  } catch {
    regex = null;
  }

  if (!regex) return <>{text}</>;

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex!.test(part) ? (
          <mark
            key={i}
            className="rounded bg-[#16C4FF]/25 px-1 py-0.5 font-medium text-[#16C4FF]"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function getTypeBadge(type: SearchResultType) {
  switch (type) {
    case SearchResultType.COURSE:
      return {
        label: "Course",
        icon: <GraduationCap className="h-4 w-4 text-[#16C4FF]" />,
        colorClass: "bg-[#16C4FF]/10 text-[#16C4FF] border-[#16C4FF]/30",
      };
    case SearchResultType.LESSON:
      return {
        label: "Lesson",
        icon: <BookOpen className="h-4 w-4 text-[#129BFF]" />,
        colorClass: "bg-[#129BFF]/10 text-[#129BFF] border-[#129BFF]/30",
      };
    case SearchResultType.MATERIAL:
      return {
        label: "Material",
        icon: <FileText className="h-4 w-4 text-sky-400" />,
        colorClass: "bg-sky-400/10 text-sky-400 border-sky-400/30",
      };
    case SearchResultType.ASSIGNMENT:
      return {
        label: "Assignment",
        icon: <FileText className="h-4 w-4 text-amber-400" />,
        colorClass: "bg-amber-400/10 text-amber-400 border-amber-400/30",
      };
    case SearchResultType.QUESTION:
      return {
        label: "Question",
        icon: <HelpCircle className="h-4 w-4 text-purple-400" />,
        colorClass: "bg-purple-400/10 text-purple-400 border-purple-400/30",
      };
    case SearchResultType.ANNOUNCEMENT:
      return {
        label: "Announcement",
        icon: <Megaphone className="h-4 w-4 text-rose-400" />,
        colorClass: "bg-rose-400/10 text-rose-400 border-rose-400/30",
      };
    case SearchResultType.USER:
    case SearchResultType.STUDENT:
    case SearchResultType.TEACHER:
      return {
        label: type === SearchResultType.STUDENT ? "Student" : type === SearchResultType.TEACHER ? "Teacher" : "User",
        icon: <Users className="h-4 w-4 text-emerald-400" />,
        colorClass: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
      };
    case SearchResultType.BATCH:
      return {
        label: "Batch",
        icon: <Layers className="h-4 w-4 text-cyan-400" />,
        colorClass: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
      };
    case SearchResultType.PAYMENT:
      return {
        label: "Payment",
        icon: <CreditCard className="h-4 w-4 text-emerald-400" />,
        colorClass: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
      };
    case SearchResultType.CERTIFICATE:
      return {
        label: "Certificate",
        icon: <Award className="h-4 w-4 text-amber-400" />,
        colorClass: "bg-amber-400/10 text-amber-400 border-amber-400/30",
      };
    case SearchResultType.APPLICATION:
      return {
        label: "Application",
        icon: <FileText className="h-4 w-4 text-blue-400" />,
        colorClass: "bg-blue-400/10 text-blue-400 border-blue-400/30",
      };
    case SearchResultType.BLOG_POST:
      return {
        label: "Blog Post",
        icon: <BookOpen className="h-4 w-4 text-[#16C4FF]" />,
        colorClass: "bg-[#16C4FF]/10 text-[#16C4FF] border-[#16C4FF]/30",
      };
    case SearchResultType.RESOURCE:
      return {
        label: "Resource",
        icon: <Layers className="h-4 w-4 text-emerald-400" />,
        colorClass: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
      };
    default:
      return {
        label: "Item",
        icon: <Layers className="h-4 w-4 text-slate-400" />,
        colorClass: "bg-white/5 text-slate-300 border-white/10",
      };
  }
}

interface FilterTab {
  id: string;
  label: string;
  types?: SearchResultType[];
}

const FILTER_TABS: FilterTab[] = [
  { id: "ALL", label: "All Results" },
  { id: "COURSES", label: "Courses", types: [SearchResultType.COURSE] },
  { id: "LESSONS", label: "Lessons", types: [SearchResultType.LESSON] },
  { id: "MATERIALS", label: "Materials", types: [SearchResultType.MATERIAL] },
  { id: "ANNOUNCEMENTS", label: "Announcements", types: [SearchResultType.ANNOUNCEMENT] },
  { id: "ASSIGNMENTS", label: "Assignments", types: [SearchResultType.ASSIGNMENT] },
  { id: "QUESTIONS", label: "Questions", types: [SearchResultType.QUESTION] },
  { id: "DIRECTORY", label: "Directory", types: [SearchResultType.USER, SearchResultType.STUDENT, SearchResultType.TEACHER] },
  { id: "BATCHES", label: "Batches", types: [SearchResultType.BATCH] },
  { id: "BLOG_RESOURCES", label: "Blog & Resources", types: [SearchResultType.BLOG_POST, SearchResultType.RESOURCE] },
  { id: "ADMIN_FINANCE", label: "Finance & Admin", types: [SearchResultType.PAYMENT, SearchResultType.CERTIFICATE, SearchResultType.APPLICATION] },
];

function SearchContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryParam = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "ALL";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [query, setQuery] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<ISearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(async () => {
      if (!isMounted) return;

      if (!queryParam.trim() || queryParam.trim().length < 2) {
        setSearchResponse(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("q", queryParam.trim());
      params.set("page", String(pageParam));
      params.set("limit", "15");

      const selectedTab = FILTER_TABS.find((t) => t.id === categoryParam);
      if (selectedTab && selectedTab.types && selectedTab.types.length > 0) {
        params.set("types", selectedTab.types.join(","));
      }

      try {
        const res = await apiClient.get<ISearchResponse>(`/search?${params.toString()}`);
        if (isMounted) {
          setSearchResponse(res);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const errorMsg =
            err instanceof Error
              ? err.message
              : "An unexpected error occurred while searching.";
          setError(errorMsg);
          setSearchResponse(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [queryParam, categoryParam, pageParam]);

  const updateUrlAndSearch = (newQuery: string, newCategory: string, newPage: number) => {
    const params = new URLSearchParams();
    if (newQuery.trim()) params.set("q", newQuery.trim());
    if (newCategory !== "ALL") params.set("category", newCategory);
    if (newPage > 1) params.set("page", String(newPage));

    router.replace(`/search${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlAndSearch(query, categoryParam, 1);
  };

  const handleCategorySelect = (categoryId: string) => {
    updateUrlAndSearch(query, categoryId, 1);
  };

  const handleClear = () => {
    setQuery("");
    setSearchResponse(null);
    updateUrlAndSearch("", categoryParam, 1);
  };

  const handlePageChange = (newPage: number) => {
    updateUrlAndSearch(query, categoryParam, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getFacetCountForTab = (tab: FilterTab): number | null => {
    if (!searchResponse || !searchResponse.facets) return null;
    if (tab.id === "ALL") return searchResponse.total;
    if (!tab.types) return null;

    let sum = 0;
    for (const t of tab.types) {
      sum += (searchResponse.facets[t] as number) || 0;
    }
    return sum;
  };

  return (
    <div className="min-h-screen bg-[#050B14] text-white">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#073C84]/20 blur-[130px]" />
        <div className="absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full bg-[#0B7CEB]/15 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Title Header */}
        <div className="text-center md:text-left mb-8">
          <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold uppercase tracking-wider text-[#16C4FF]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>ETA Global Discovery</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            {t('search.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Discover courses, lessons, materials, announcements, assignments, blog posts, and resources across the platform.
          </p>
        </div>

        {/* Search Bar Input */}
        <form onSubmit={handleSearchSubmit} className="relative mb-6">
          <div className="relative flex items-center rounded-2xl border border-white/10 bg-[#081324] px-4 py-3 shadow-2xl transition-all focus-within:border-[#16C4FF]/60 focus-within:ring-2 focus-within:ring-[#16C4FF]/20">
            <Search className="h-5 w-5 text-[#16C4FF] shrink-0 mr-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full bg-transparent text-base text-white placeholder-slate-400 focus:outline-none"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 mr-2 transition-colors"
                title="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={!query.trim() || query.trim().length < 2 || loading}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#073C84] via-[#0B7CEB] to-[#16C4FF] px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <span>{t('common.search')}</span>
            </button>
          </div>
        </form>

        {/* Filter Tabs */}
        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <SlidersHorizontal className="h-4 w-4 text-slate-400 shrink-0 mr-1" />
          {FILTER_TABS.map((tab) => {
            const count = getFacetCountForTab(tab);
            const isSelected = categoryParam === tab.id;
            const tabLabel =
              tab.id === "ALL"
                ? t('search.allResults')
                : tab.id === "COURSES"
                ? t('search.courses')
                : tab.id === "LESSONS"
                ? t('search.lessons')
                : tab.id === "MATERIALS"
                ? t('search.materials')
                : tab.id === "ANNOUNCEMENTS"
                ? t('search.announcements')
                : tab.label;
            return (
              <button
                key={tab.id}
                onClick={() => handleCategorySelect(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#16C4FF] text-[#050B14] shadow-md shadow-[#16C4FF]/20"
                    : "border border-white/10 bg-[#081324] text-slate-300 hover:border-white/20 hover:text-white"
                }`}
              >
                <span>{tabLabel}</span>
                {count !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono bidi-ltr ${
                      isSelected
                        ? "bg-[#050B14]/20 text-[#050B14]"
                        : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            <p className="font-semibold">Search Request Failed</p>
            <p className="mt-1 text-xs opacity-90">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-xl border border-white/5 bg-[#081324] p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-16 rounded-md bg-white/10" />
                  <div className="h-5 w-48 rounded-md bg-white/10" />
                </div>
                <div className="mt-3 h-4 w-3/4 rounded-md bg-white/5" />
                <div className="mt-2 h-3 w-1/2 rounded-md bg-white/5" />
              </div>
            ))}
          </div>
        )}

        {/* Initial Empty State / Suggestions */}
        {!loading && !searchResponse && !error && (
          <div className="rounded-2xl border border-white/10 bg-[#081324]/60 p-10 text-center backdrop-blur-sm">
            <Compass className="mx-auto h-12 w-12 text-[#16C4FF]/60" />
            <h2 className="mt-4 text-lg font-bold text-white">
              Discover Content Across ETA
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
              Type at least 2 characters to search through enrolled courses, lessons,
              announcements, blog insights, and open learning resources.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-400">Try searching:</span>
              {["Computer Science", "Artificial Intelligence", "Python", "Mathematics", "Orientation", "Cybersecurity"].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setQuery(term);
                      updateUrlAndSearch(term, categoryParam, 1);
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:border-[#16C4FF]/40 hover:text-white transition-colors"
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* No Results Empty State */}
        {!loading && searchResponse && searchResponse.results.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#081324]/60 p-10 text-center backdrop-blur-sm">
            <Search className="mx-auto h-12 w-12 text-slate-500" />
            <h2 className="mt-4 text-lg font-bold text-white">{t('search.noResultsFound')}</h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
              We couldn&apos;t find any authorized matches for &ldquo;{searchResponse.query}&rdquo;.
              Try checking spelling, using more general keywords, or switching categories.
            </p>
            {categoryParam !== "ALL" && (
              <button
                onClick={() => handleCategorySelect("ALL")}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-[#16C4FF]/30 bg-[#16C4FF]/10 px-4 py-2 text-xs font-semibold text-[#16C4FF] hover:bg-[#16C4FF]/20 transition-colors"
              >
                Clear category filters
              </button>
            )}
          </div>
        )}

        {/* Results List */}
        {!loading && searchResponse && searchResponse.results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/10">
              <span>
                Found <span className="font-bold text-white">{searchResponse.total}</span> result
                {searchResponse.total === 1 ? "" : "s"} for &ldquo;{searchResponse.query}&rdquo;
              </span>
              <span>
                Page {searchResponse.page} of {searchResponse.pages}
              </span>
            </div>

            <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-[#081324] overflow-hidden shadow-xl">
              {searchResponse.results.map((item: ISearchResult) => {
                const badge = getTypeBadge(item.type);
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="group relative p-5 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Type & Subtitle */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${badge.colorClass}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                          {item.subtitle && (
                            <span className="text-xs text-slate-400 truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-white group-hover:text-[#16C4FF] transition-colors">
                          <Link
                            href={item.actionUrl}
                            className="focus:outline-none focus:underline"
                          >
                            <SafeHighlight text={item.title} query={searchResponse.query} />
                          </Link>
                        </h3>

                        {/* Snippet */}
                        {item.snippet && (
                          <p className="mt-1.5 text-xs text-slate-300 leading-relaxed line-clamp-2">
                            <SafeHighlight text={item.snippet} query={searchResponse.query} />
                          </p>
                        )}

                        {/* Metadata Tags */}
                        {item.metadata && Object.keys(item.metadata).length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            {Object.entries(item.metadata).map(([key, value]) => {
                              if (value === null || value === undefined || value === "") return null;
                              return (
                                <span
                                  key={key}
                                  className="rounded bg-white/5 px-2 py-0.5 font-mono text-slate-400 border border-white/5"
                                >
                                  {key}: {String(value)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Action Link Button */}
                      <Link
                        href={item.actionUrl}
                        className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-[#16C4FF]/40 hover:bg-[#073C84]/40 hover:text-white"
                      >
                        <span>View</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {searchResponse.pages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                <button
                  onClick={() => handlePageChange(searchResponse.page - 1)}
                  disabled={searchResponse.page <= 1}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#081324] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:hover:border-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
                <span className="text-xs text-slate-400 font-mono">
                  Page {searchResponse.page} of {searchResponse.pages}
                </span>
                <button
                  onClick={() => handlePageChange(searchResponse.page + 1)}
                  disabled={searchResponse.page >= searchResponse.pages}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#081324] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:hover:border-white/10"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050B14] p-10 text-center text-slate-400">
          Loading search...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
