"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { apiClient } from "../lib/api-client";
import {
  type IPublicHomeData,
  CMSContentStatus,
  type IBlogPostSummary,
  type IResourceSummary,
} from "@eta/types";
import {
  Sparkles,
  ArrowRight,
  Shield,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Users,
  Award,
  Calendar,
  Megaphone,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Layers,
  Star,
} from "lucide-react";

export default function HomePage() {
  const [data, setData] = useState<IPublicHomeData | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [recentPosts, setRecentPosts] = useState<IBlogPostSummary[]>([]);
  const [recentResources, setRecentResources] = useState<IResourceSummary[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<IPublicHomeData>("/cms/public/home")
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch(() => {
        // Fallback initial data in case backend has not completed seeding
        if (isMounted) {
          setData({
            siteSettings: {
              academyName: "Exploratory Training Academy",
              tagline: "Empowering future leaders through world-class technical education",
              aboutText:
                "Exploratory Training Academy (ETA) is a premier academic institution dedicated to cultivating engineering excellence, cutting-edge research, and leadership in emerging technologies.",
              missionText: "To empower learners worldwide with rigorous technical knowledge.",
              visionText: "To be globally recognized as the benchmark institution for technical education.",
              contactEmail: "admissions@eta.edu",
              contactPhone: "+1 (555) 382-2026",
              address: "100 Innovation Boulevard, Tech Campus, Academic City",
              workingHours: "Monday – Friday: 8:00 AM – 6:00 PM UTC",
              socialLinks: {
                linkedin: "https://linkedin.com",
                twitter: "https://twitter.com",
                github: "https://github.com",
              },
              primaryCtaText: "Apply for Admission",
              primaryCtaLink: "/admissions/apply",
              secondaryCtaText: "Verify Credential",
              secondaryCtaLink: "/certificate/verify",
              copyrightText: "© 2026 Exploratory Training Academy (ETA). All rights reserved.",
              footerQuickLinks: [],
              metaTitle: "Exploratory Training Academy",
              metaDescription: "Premier technical academy",
              keywords: [],
              status: CMSContentStatus.PUBLISHED,
            },
            hero: {
              eyebrow: "ADMISSIONS OPEN FOR ACADEMIC YEAR 2026",
              title: "Pioneering Excellence in",
              highlightedTitle: "Applied Engineering & Computing",
              description:
                "Join an elite community of scholars and practitioners. Experience immersive curriculum, world-class faculty mentorship, and verifiable digital credentials.",
              primaryCtaText: "Apply Now",
              primaryCtaLink: "/admissions/apply",
              secondaryCtaText: "Explore Programs",
              secondaryCtaLink: "/courses",
              badgeText: "Top-Ranked Technical Academy 2026",
              enabled: true,
              status: CMSContentStatus.PUBLISHED,
            },
            statistics: [
              { label: "Active Scholars", value: "1,250+", isDynamic: false, sortOrder: 1, status: CMSContentStatus.PUBLISHED },
              { label: "Specialized Programs", value: "45+", isDynamic: false, sortOrder: 2, status: CMSContentStatus.PUBLISHED },
              { label: "Verified Credentials", value: "3,800+", isDynamic: false, sortOrder: 3, status: CMSContentStatus.PUBLISHED },
              { label: "Academic Satisfaction", value: "4.9 / 5.0", isDynamic: false, sortOrder: 4, status: CMSContentStatus.PUBLISHED },
            ],
            leadership: [],
            testimonials: [],
            faqs: [],
            featuredCourses: [],
            publicNotices: [],
            upcomingEvents: [],
          });
        }
      });

    apiClient
      .get<{ posts: IBlogPostSummary[] } | IBlogPostSummary[]>("/blog?limit=3", { requiresAuth: false })
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res)) {
          setRecentPosts(res);
        } else if (res && "posts" in res && Array.isArray(res.posts)) {
          setRecentPosts(res.posts);
        }
      })
      .catch(() => {});

    apiClient
      .get<{ resources: IResourceSummary[] } | IResourceSummary[]>("/resources?limit=3", { requiresAuth: false })
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res)) {
          setRecentResources(res);
        } else if (res && "resources" in res && Array.isArray(res.resources)) {
          setRecentResources(res.resources);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const hero = data?.hero;
  const stats = data?.statistics || [];
  const courses = data?.featuredCourses || [];
  const notices = data?.publicNotices || [];
  const events = data?.upcomingEvents || [];
  const leadership = data?.leadership || [];
  const testimonials = data?.testimonials || [];
  const faqs = data?.faqs || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#050B14] text-white">
      <Header />

      <main className="flex-1">
        {/* 1. HERO SECTION */}
        {hero?.enabled && (
          <section className="relative overflow-hidden pt-12 pb-20 lg:pt-24 lg:pb-28">
            {/* Ambient Radial Glow */}
            <div className="pointer-events-none absolute inset-0 -top-40 flex items-center justify-center">
              <div className="h-[550px] w-[800px] rounded-full bg-gradient-to-tr from-[#073C84]/35 via-[#0B7CEB]/20 to-[#16C4FF]/10 blur-[130px]" />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
                <div className="space-y-6 lg:col-span-7">
                  {/* Eyebrow Badge */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#16C4FF]/30 bg-[#073C84]/30 px-3.5 py-1 text-xs font-semibold text-[#16C4FF] backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#16C4FF]" />
                    <span>{hero.eyebrow}</span>
                  </div>

                  {/* Title */}
                  <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
                    {hero.title}{" "}
                    <span className="bg-gradient-to-r from-[#16C4FF] via-[#129BFF] to-[#0B7CEB] bg-clip-text text-transparent">
                      {hero.highlightedTitle}
                    </span>
                  </h1>



                  {/* Action CTAs */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <Link
                      href={hero.primaryCtaLink || "/admissions/apply"}
                      className="btn-brand-primary flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-[#0B7CEB]/25 transition-transform active:scale-95"
                    >
                      {hero.primaryCtaText || "Apply for Admission"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <Link
                      href={hero.secondaryCtaLink || "/courses"}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20"
                    >
                      <BookOpen className="h-4 w-4 text-[#16C4FF]" />
                      {hero.secondaryCtaText || "Explore Programs"}
                    </Link>
                  </div>

                  {/* Trust Badge */}
                  <div className="pt-4 flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-slate-300">{hero.badgeText}</span>
                    <span className="text-slate-600">•</span>
                    <span>Accredited Academic Authority</span>
                  </div>
                </div>

                {/* Right Hero Card: Quick Admissions & Portal Entrance */}
                <div className="lg:col-span-5">
                  <div className="rounded-3xl border border-white/10 bg-[#081324]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-[#16C4FF]/10 rounded-full blur-2xl" />

                    <div className="flex items-center justify-between pb-6 border-b border-white/10">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-widest text-[#16C4FF]">
                          Academic Portal
                        </span>
                        <h3 className="mt-1 text-lg font-bold text-white">Admissions & Verification</h3>
                      </div>
                      <Award className="h-7 w-7 text-amber-400" />
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="rounded-xl border border-white/5 bg-[#050B14] p-4 flex items-start gap-3.5">
                        <GraduationCap className="h-5 w-5 text-[#16C4FF] flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-white">Enrollment Cohorts</h4>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Now accepting applications for Spring & Fall engineering intakes.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/5 bg-[#050B14] p-4 flex items-start gap-3.5">
                        <Shield className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-white">Cryptographic Credentials</h4>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Verify student completion certificates publicly with unique codes.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                      <Link
                        href="/admissions/apply"
                        className="btn-brand-primary flex-1 text-center py-2.5 rounded-xl text-xs font-semibold text-white"
                      >
                        Start Application
                      </Link>
                      <Link
                        href="/certificate/verify"
                        className="flex-1 text-center py-2.5 rounded-xl text-xs font-semibold text-slate-200 border border-white/10 hover:bg-white/5"
                      >
                        Verify Credential
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2. INSTITUTIONAL METRICS / STATISTICS */}
        {stats.length > 0 && (
          <section id="statistics" className="border-y border-white/10 bg-[#081324]/60 py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((item, idx) => (
                  <div key={item.id || idx} className="text-center sm:text-left">
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                      <span className="bg-gradient-to-r from-white via-slate-100 to-[#16C4FF] bg-clip-text text-transparent">
                        {item.value}
                      </span>
                    </div>
                    <div className="mt-1 text-xs sm:text-sm font-medium text-slate-400">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 3. SPECIALIZED PROGRAMS & CURRICULA */}
        <section id="programs" className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between pb-12 gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[#16C4FF]">
                  Academic Curricula
                </div>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Featured Academic Programs
                </h2>

              </div>

              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16C4FF] hover:underline"
              >
                Browse All Programs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {courses.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    code: "CS-101",
                    title: "Foundations of Computer Science & Algorithms",
                    description: "Algorithmic complexity, discrete math, data structures, and computer organization.",
                    level: "BEGINNER",
                    duration: "12 weeks",
                  },
                  {
                    code: "CS-201",
                    title: "Full-Stack Distributed Systems Engineering",
                    description: "High-concurrency microservices, database transactions, cloud clustering, and reactive systems.",
                    level: "INTERMEDIATE",
                    duration: "16 weeks",
                  },
                  {
                    code: "AI-301",
                    title: "Applied Machine Learning & Neural Networks",
                    description: "Supervised and unsupervised learning, deep neural architectures, and transformer pipelines.",
                    level: "ADVANCED",
                    duration: "14 weeks",
                  },
                ].map((c) => (
                  <div
                    key={c.code}
                    className="rounded-2xl border border-white/10 bg-[#081324] p-6 flex flex-col justify-between hover:border-[#16C4FF]/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-[#16C4FF]">{c.code}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{c.level}</span>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-white">{c.title}</h3>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">{c.description}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono">{c.duration}</span>
                      <Link href="/admissions/apply" className="text-[#16C4FF] font-semibold hover:underline">
                        Apply Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {courses.map((c) => (
                  <div
                    key={c.id || c.slug}
                    className="rounded-2xl border border-white/10 bg-[#081324] p-6 flex flex-col justify-between hover:border-[#16C4FF]/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-[#16C4FF]">{c.code}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{c.level}</span>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-white">{c.title}</h3>
                      <p className="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed">{c.description}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono">{c.duration || "12 weeks"}</span>
                      <Link href="/admissions/apply" className="text-[#16C4FF] font-semibold hover:underline">
                        Apply Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. WHY ETA: ACADEMY PILLARS */}
        <section className="border-t border-white/10 bg-[#060E1A] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto pb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-[#16C4FF]">
                Institutional Standards
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                The Exploratory Training Advantage
              </h2>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Layers,
                  title: "Modular Academic Core",
                  desc: "Progression paths through structured semesters, lesson milestones, and synchronized cohorts.",
                },
                {
                  icon: Shield,
                  title: "Tamper-Evident Credentials",
                  desc: "Every certificate issued contains a cryptographically verified snapshot accessible publicly.",
                },
                {
                  icon: Users,
                  title: "Direct Faculty Mentorship",
                  desc: "Regular 1-on-1 office hours, active code reviews, and transparent gradebook feedback.",
                },
                {
                  icon: Award,
                  title: "Enterprise Readiness",
                  desc: "Hands-on engineering sandboxes reflecting modern production infrastructure and testing standards.",
                },
              ].map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-[#081324] p-6 hover:border-[#16C4FF]/40 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#073C84] text-[#16C4FF]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-white">{p.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. CAMPUS NOTICES & UPCOMING EVENTS (Projected Domains) */}
        <section className="py-20 border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left: Public Notices */}
              <div className="lg:col-span-7">
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#16C4FF]">
                      Institutional Bulletins
                    </span>
                    <h2 className="mt-1 text-2xl font-bold text-white">Campus Notices</h2>
                  </div>
                  <Link href="/announcements" className="text-xs text-[#16C4FF] hover:underline flex items-center gap-1">
                    All Notices <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="mt-6 space-y-4">
                  {notices.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-white/10 bg-[#081324]">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#16C4FF]">
                        <Megaphone className="h-4 w-4" />
                        <span>Admissions Announcement — Academic Year 2026</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        Online registrations for the upcoming semester cohorts are now underway. Prospective scholars are encouraged to review prerequisite requirements and submit admission portfolios before the priority deadline.
                      </p>
                      <div className="mt-4 text-[10px] font-mono text-slate-400">Published by Admissions Directorate</div>
                    </div>
                  ) : (
                    notices.map((n) => (
                      <div key={n.id} className="p-5 rounded-2xl border border-white/10 bg-[#081324] hover:border-[#16C4FF]/30 transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">{n.title}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(n.publishAt).toLocaleDateString()}
                          </span>
                        </div>
                        {n.summary && <p className="mt-2 text-xs text-slate-300 line-clamp-2">{n.summary}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Upcoming Events */}
              <div className="lg:col-span-5">
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#16C4FF]">
                      Academic Schedule
                    </span>
                    <h2 className="mt-1 text-2xl font-bold text-white">Upcoming Events</h2>
                  </div>
                  <Link href="/calendar" className="text-xs text-[#16C4FF] hover:underline flex items-center gap-1">
                    Calendar <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="mt-6 space-y-4">
                  {events.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-white/10 bg-[#081324]">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <Calendar className="h-4 w-4" />
                        <span>Semester Orientation & Welcome Convocation</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        Live introductory session for admitted scholars and faculty advisor introductions.
                      </p>
                      <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Scheduled Weekly</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Virtual Auditorium</span>
                      </div>
                    </div>
                  ) : (
                    events.map((e) => (
                      <div key={e.id} className="p-5 rounded-2xl border border-white/10 bg-[#081324]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">{e.title}</span>
                          <span className="px-2 py-0.5 rounded bg-[#073C84] text-[#16C4FF] font-mono text-[10px]">
                            {e.eventType}
                          </span>
                        </div>
                        {e.description && <p className="mt-1.5 text-xs text-slate-300 line-clamp-2">{e.description}</p>}
                        <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{new Date(e.startAt).toLocaleDateString()}</span>
                          <span>{e.location || "Online"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. LEADERSHIP & FACULTY */}
        {leadership.length > 0 && (
          <section id="leadership" className="py-20 border-t border-white/10 bg-[#060E1A]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto pb-14">
                <span className="text-xs font-bold uppercase tracking-widest text-[#16C4FF]">
                  Academic Governance
                </span>
                <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                  Leadership & Faculty
                </h2>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {leadership.map((leader) => (
                  <div key={leader.id} className="rounded-2xl border border-white/10 bg-[#081324] p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-[#073C84] to-[#16C4FF] text-white font-bold text-base shadow">
                          {leader.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{leader.name}</h3>
                          <p className="text-xs text-[#16C4FF] font-medium">{leader.designation}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs leading-relaxed text-slate-300">{leader.biography}</p>
                    </div>

                    {leader.socialLinks && (
                      <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-3 text-xs text-slate-400">
                        {leader.socialLinks.email && (
                          <span className="font-mono text-[11px] truncate">{leader.socialLinks.email}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 7. ALUMNI & STUDENT TESTIMONIALS */}
        {testimonials.length > 0 && (
          <section id="testimonials" className="py-20 border-t border-white/10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto pb-14">
                <span className="text-xs font-bold uppercase tracking-widest text-[#16C4FF]">
                  Verified Endorsements
                </span>
                <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                  Voices of Our Scholars
                </h2>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {testimonials.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-white/10 bg-[#081324] p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-amber-400 mb-3">
                        {Array.from({ length: t.rating || 5 }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs italic leading-relaxed text-slate-300">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <h4 className="text-xs font-bold text-white">{t.name}</h4>
                      <p className="text-[11px] text-slate-400">{t.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 7B. ACADEMIC DISPATCHES & OPEN LEARNING RESOURCES (PRD §11 item 13, §52) */}
        {(recentPosts.length > 0 || recentResources.length > 0) && (
          <section id="dispatches" className="py-20 border-t border-white/10 bg-gradient-to-b from-[#050B14] to-[#060E1A]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between pb-12 gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#16C4FF]">
                    Knowledge & Publications (PRD §52)
                  </span>
                  <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                    Academic Dispatches & Learning Resources
                  </h2>

                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16C4FF] hover:underline"
                  >
                    View All Articles <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <span className="text-slate-600">•</span>
                  <Link
                    href="/resources"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline"
                  >
                    Resource Library <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {recentPosts.map((post) => (
                  <article
                    key={post.id}
                    className="group rounded-2xl border border-white/10 bg-[#081324] p-6 flex flex-col justify-between hover:border-[#16C4FF]/40 hover:bg-[#0A1B33] transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#16C4FF] font-semibold mb-2">
                        <span>{post.categories[0] || "Academic Dispatch"}</span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime} min
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#16C4FF] transition-colors line-clamp-2">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>
                      <p className="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium text-slate-300">{post.authorName}</span>
                      <Link href={`/blog/${post.slug}`} className="text-[#16C4FF] font-semibold flex items-center gap-1">
                        Read <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 8. FREQUENTLY ASKED QUESTIONS (ACCORDION) */}
        {faqs.length > 0 && (
          <section id="faq" className="py-20 border-t border-white/10 bg-[#060E1A]">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <div className="text-center pb-12">
                <span className="text-xs font-bold uppercase tracking-widest text-[#16C4FF]">
                  Admissions & Enrollment
                </span>
                <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                  Frequently Asked Questions
                </h2>

              </div>

              <div className="space-y-4">
                {faqs.map((f) => {
                  const isExpanded = expandedFaq === f.id;
                  return (
                    <div
                      key={f.id}
                      className="rounded-2xl border border-white/10 bg-[#081324] overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() => setExpandedFaq(isExpanded ? null : (f.id as string))}
                        className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-white hover:text-[#16C4FF] transition-colors"
                        aria-expanded={isExpanded}
                      >
                        <span className="flex items-center gap-3">
                          <span className="rounded bg-[#073C84]/60 px-2.5 py-0.5 text-[10px] font-mono text-[#16C4FF] uppercase">
                            {f.category}
                          </span>
                          <span>{f.question}</span>
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-300 border-t border-white/5">
                          {f.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 9. ADMISSIONS ACTION CALLOUT */}
        <section className="py-20 border-t border-white/10 bg-gradient-to-b from-[#071F42]/30 to-[#050B14]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Take the Next Step in Your Technical Journey
            </h2>


            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/admissions/apply"
                className="btn-brand-primary flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-xl"
              >
                Start Your Application
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/certificate/verify"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                <Award className="h-4 w-4 text-amber-400" />
                Verify an ETA Credential
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer siteSettings={data?.siteSettings} />
    </div>
  );
}
