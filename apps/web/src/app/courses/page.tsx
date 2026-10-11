"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { ETALoader } from "../../components/brand/ETALoader";
import { apiClient } from "../../lib/api-client";
import {
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  Search,
} from "lucide-react";
import { useI18n } from "../../i18n";

interface CourseItem {
  id: string;
  _id?: string;
  title: string;
  slug: string;
  code: string;
  description: string;
  level: string;
  duration?: string;
  estimatedStudyHours?: number;
}

export default function CoursesPage() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<{ data?: CourseItem[]; courses?: CourseItem[] } | CourseItem[]>("/academic/courses?visibility=PUBLIC")
      .then((res) => {
        if (!isMounted) return;
        const list: CourseItem[] = Array.isArray(res) ? res : res?.courses || res?.data || [];

        if (list.length > 0) {
          setCourses(list);
        } else {
          // Fallback initial programs if none seeded yet
          setCourses([
            {
              id: "cs-101",
              title: "Foundations of Computer Science & Algorithms",
              slug: "cs-foundations",
              code: "CS-101",
              description: "Rigorous introduction to computational thinking, discrete mathematics, and high-performance algorithmic structures.",
              level: "BEGINNER",
              duration: "12 weeks",
              estimatedStudyHours: 120,
            },
            {
              id: "cs-201",
              title: "Full-Stack Enterprise Systems & Distributed Clouds",
              slug: "full-stack-enterprise",
              code: "CS-201",
              description: "Design and implement scalable microservices, relational and document persistence engines, and secure APIs.",
              level: "INTERMEDIATE",
              duration: "16 weeks",
              estimatedStudyHours: 180,
            },
            {
              id: "ai-301",
              title: "Applied Machine Learning & Neural Architectures",
              slug: "applied-ml",
              code: "AI-301",
              description: "Supervised and unsupervised representation learning, deep neural models, transformer networks, and production inference.",
              level: "ADVANCED",
              duration: "14 weeks",
              estimatedStudyHours: 160,
            },
            {
              id: "sec-401",
              title: "Cybersecurity, Cryptography & Systems Defense",
              slug: "cybersecurity-defense",
              code: "SEC-401",
              description: "Cryptographic protocols, zero-trust network architectures, vulnerability assessment, and threat mitigation engineering.",
              level: "ADVANCED",
              duration: "12 weeks",
              estimatedStudyHours: 140,
            },
          ]);
        }
      })
      .catch(() => {
        // Fallback default curricula
        if (isMounted) {
          setCourses([
            {
              id: "cs-101",
              title: "Foundations of Computer Science & Algorithms",
              slug: "cs-foundations",
              code: "CS-101",
              description: "Rigorous introduction to computational thinking, discrete mathematics, and high-performance algorithmic structures.",
              level: "BEGINNER",
              duration: "12 weeks",
              estimatedStudyHours: 120,
            },
            {
              id: "cs-201",
              title: "Full-Stack Enterprise Systems & Distributed Clouds",
              slug: "full-stack-enterprise",
              code: "CS-201",
              description: "Design and implement scalable microservices, relational and document persistence engines, and secure APIs.",
              level: "INTERMEDIATE",
              duration: "16 weeks",
              estimatedStudyHours: 180,
            },
            {
              id: "ai-301",
              title: "Applied Machine Learning & Neural Architectures",
              slug: "applied-ml",
              code: "AI-301",
              description: "Supervised and unsupervised representation learning, deep neural models, transformer networks, and production inference.",
              level: "ADVANCED",
              duration: "14 weeks",
              estimatedStudyHours: 160,
            },
          ]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === "ALL" || c.level.toUpperCase() === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#050B14] text-white">
      <Header />

      <main className="flex-1">
        {/* Banner */}
        <section className="relative overflow-hidden pt-16 pb-12 border-b border-white/10 bg-gradient-to-b from-[#071F42]/40 to-transparent">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#16C4FF]/30 bg-[#073C84]/30 px-3.5 py-1 text-xs font-semibold text-[#16C4FF]">
              <Sparkles className="h-3.5 w-3.5 text-[#16C4FF]" />
              <span>{t('courses.curriculaBadge')}</span>
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white">
              {t('courses.title')}
            </h1>
          </div>
        </section>

        {/* Filters & Directory */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-8 border-b border-white/10">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('courses.searchPlaceholder')}
                className="w-full rounded-xl border border-white/10 bg-[#081324] pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:border-[#16C4FF] focus:outline-none"
              />
            </div>

            {/* Level Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "ALL", label: t('courses.allLevels') },
                { id: "BEGINNER", label: t('courses.beginner') },
                { id: "INTERMEDIATE", label: t('courses.intermediate') },
                { id: "ADVANCED", label: t('courses.advanced') },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setLevelFilter(lvl.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    levelFilter === lvl.id
                      ? "bg-[#0B7CEB] text-white"
                      : "border border-white/10 bg-[#081324] text-slate-400 hover:text-white"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex justify-center">
              <ETALoader size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="h-10 w-10 text-slate-500 mx-auto" />
              <h3 className="mt-4 text-base font-bold text-white">{t('courses.noMatchingCourses')}</h3>
              <p className="mt-1 text-xs text-slate-400">{t('courses.noMatchingCoursesDesc')}</p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((course) => (
                <div
                  key={course.id || course.code}
                  className="rounded-2xl border border-white/10 bg-[#081324] p-6 flex flex-col justify-between hover:border-[#16C4FF]/40 transition-all hover:shadow-xl hover:shadow-[#073C84]/20 group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#16C4FF] bg-[#073C84]/40 px-2.5 py-1 rounded-md border border-[#16C4FF]/20 bidi-ltr">
                        {course.code}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        {course.level}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-white group-hover:text-[#16C4FF] transition-colors dir-auto">
                      {course.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300 line-clamp-3 dir-auto">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-4 font-mono bidi-ltr">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#16C4FF]" />
                        {course.duration || "12 weeks"}
                      </span>
                      <span>{course.estimatedStudyHours ? `${course.estimatedStudyHours} hrs` : "120 hrs"}</span>
                    </div>

                    <Link
                      href={`/admissions/apply?courseCode=${course.code}`}
                      className="btn-brand-primary w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white shadow"
                    >
                      {t('courses.applyNow')}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
