"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ETALogo } from "../brand/ETALogo";
import { useAuth } from "../../context/AuthContext";
import { UserRole, type INotification } from "@eta/types";
import { apiClient } from "../../lib/api-client";
import { useI18n } from "../../i18n";
import { LanguageSelector } from "./LanguageSelector";
import {
  User,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  GraduationCap,
  Users,
  Award,
  FileText,
  LogIn,
  Megaphone,
  Bell,
  Check,
  ExternalLink,
  Calendar,
  MessageSquare,
  CreditCard,
  Globe,
  BookOpen,
  Layers,
  Search,
  ShieldAlert,
  TrendingUp,
  Sparkles,
  Menu,
  X,
  ArrowRight,
  CheckSquare,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

interface ExploreItem {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

interface RoleNavConfig {
  roleBadgeText: string;
  roleBadgeClass: string;
  primaryLinks: NavItem[];
  exploreTitle: string;
  exploreItems: ExploreItem[];
}

const getRoleLabel = (r: UserRole, t: (key: string) => string): string => {
  switch (r) {
    case UserRole.STUDENT:
      return t("roles.student") || "Student";
    case UserRole.TEACHER:
      return t("roles.teacher") || "Teacher";
    case UserRole.GUARDIAN:
      return t("roles.guardian") || "Guardian";
    case UserRole.STAFF:
      return t("roles.staff") || "Staff";
    case UserRole.ADMIN:
      return t("roles.admin") || "Admin";
    case UserRole.SUPER_ADMIN:
      return t("roles.superAdmin") || "Super Admin";
    default:
      return t("roles.visitor") || "Visitor";
  }
};

const getRoleNavConfig = (role: UserRole, t: (key: string) => string): RoleNavConfig => {
  switch (role) {
    case UserRole.STUDENT:
      return {
        roleBadgeText: "Student",
        roleBadgeClass: "border-cyan-400/50 bg-cyan-500/20 text-cyan-300 font-bold shadow-sm shadow-cyan-500/20",
        primaryLinks: [
          { label: "Dashboard", href: "/student/dashboard" },
          { label: "My Courses", href: "/student/courses" },
          { label: "Grades", href: "/student/grades" },
          { label: "Ask ETA", href: "/student/ask-eta" },
        ],
        exploreTitle: "Student Hub",
        exploreItems: [
          {
            title: "Class Attendance",
            description: "Session records & absence history",
            href: "/student/attendance",
            icon: CheckSquare,
            colorClass: "text-emerald-400",
          },
          {
            title: "Tuition & Invoices",
            description: "Billing statements & receipts",
            href: "/student/finance",
            icon: CreditCard,
            colorClass: "text-amber-400",
          },
          {
            title: "My Certificates",
            description: "Earned badges & credentials",
            href: "/student/certificates",
            icon: Award,
            colorClass: "text-[#16C4FF]",
          },
          {
            title: "Academic Calendar",
            description: "Term schedules, holidays & exam dates",
            href: "/calendar",
            icon: Calendar,
            colorClass: "text-blue-400",
          },
          {
            title: "Announcements",
            description: "Campus news & urgent alerts",
            href: "/announcements",
            icon: Megaphone,
            colorClass: "text-purple-400",
          },
          {
            title: "Explore Programs",
            description: "Browse academy courses & tracks",
            href: "/courses",
            icon: GraduationCap,
            colorClass: "text-cyan-400",
          },
        ],
      };

    case UserRole.TEACHER:
      return {
        roleBadgeText: "Faculty",
        roleBadgeClass: "border-purple-400/50 bg-purple-500/20 text-purple-300 font-bold shadow-sm shadow-purple-500/20",
        primaryLinks: [
          { label: "Workspace", href: "/teacher/dashboard" },
          { label: "Gradebook", href: "/teacher/gradebook" },
          { label: "Attendance", href: "/teacher/attendance" },
          { label: "Assignments", href: "/teacher/assignments" },
        ],
        exploreTitle: "Faculty Hub",
        exploreItems: [
          {
            title: "Question Bank & Quizzes",
            description: "Create tests & manage questions",
            href: "/teacher/quizzes",
            icon: BookOpen,
            colorClass: "text-purple-400",
          },
          {
            title: "Class Analytics",
            description: "Student engagement & performance KPIs",
            href: "/teacher/analytics",
            icon: TrendingUp,
            colorClass: "text-emerald-400",
          },
          {
            title: "Academic Calendar",
            description: "Term timetables & exam windows",
            href: "/calendar",
            icon: Calendar,
            colorClass: "text-cyan-400",
          },
          {
            title: "Direct Messages",
            description: "Student & guardian communications",
            href: "/messages",
            icon: MessageSquare,
            colorClass: "text-[#16C4FF]",
          },
          {
            title: "Academy Announcements",
            description: "Broadcast notices & updates",
            href: "/announcements",
            icon: Megaphone,
            colorClass: "text-amber-400",
          },
        ],
      };

    case UserRole.GUARDIAN:
      return {
        roleBadgeText: "Guardian",
        roleBadgeClass: "border-amber-400/50 bg-amber-500/20 text-amber-300 font-bold shadow-sm shadow-amber-500/20",
        primaryLinks: [
          { label: "Wards Overview", href: "/guardian/dashboard" },
          { label: "Tuition & Fees", href: "/guardian/finance" },
          { label: "Calendar", href: "/calendar" },
          { label: "Messages", href: "/messages" },
        ],
        exploreTitle: "Family Portal",
        exploreItems: [
          {
            title: "Academy Announcements",
            description: "Important school notices & updates",
            href: "/announcements",
            icon: Megaphone,
            colorClass: "text-amber-400",
          },
          {
            title: "Explore Programs",
            description: "Browse academy courses & upcoming batches",
            href: "/courses",
            icon: GraduationCap,
            colorClass: "text-[#16C4FF]",
          },
          {
            title: "Verify Credentials",
            description: "Instant certificate & credential checks",
            href: "/certificate/verify",
            icon: Award,
            colorClass: "text-emerald-400",
          },
          {
            title: "Learning Resources",
            description: "Study guides & educational toolkits",
            href: "/resources",
            icon: Layers,
            colorClass: "text-cyan-400",
          },
        ],
      };

    case UserRole.STAFF:
      return {
        roleBadgeText: "Staff",
        roleBadgeClass: "border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold shadow-sm shadow-blue-500/20",
        primaryLinks: [
          { label: "Operations", href: "/admin/dashboard" },
          { label: "Admissions", href: "/admin/admissions" },
          { label: "Attendance", href: "/admin/attendance" },
          { label: "Finance", href: "/admin/finance" },
        ],
        exploreTitle: "Staff Operations",
        exploreItems: [
          {
            title: "Guardians Directory",
            description: "Parent records & family associations",
            href: "/admin/guardians",
            icon: Users,
            colorClass: "text-purple-400",
          },
          {
            title: "Certificates Ops",
            description: "Issuance & management of certificates",
            href: "/admin/certificates",
            icon: Award,
            colorClass: "text-amber-400",
          },
          {
            title: "Classes & Timetables",
            description: "Classrooms & schedule planning",
            href: "/admin/classes",
            icon: BookOpen,
            colorClass: "text-emerald-400",
          },
          {
            title: "Announcements",
            description: "Publish academy notices",
            href: "/admin/announcements",
            icon: Megaphone,
            colorClass: "text-[#16C4FF]",
          },
          {
            title: "Academic Calendar",
            description: "Event scheduling & holiday terms",
            href: "/calendar",
            icon: Calendar,
            colorClass: "text-blue-400",
          },
        ],
      };

    case UserRole.ADMIN:
      return {
        roleBadgeText: "Admin",
        roleBadgeClass: "border-indigo-400/50 bg-indigo-500/20 text-indigo-300 font-bold shadow-sm shadow-indigo-500/20",
        primaryLinks: [
          { label: "Command Center", href: "/admin/dashboard" },
          { label: "Academic Ops", href: "/admin/academic" },
          { label: "Admissions", href: "/admin/admissions" },
          { label: "Finance", href: "/admin/finance" },
        ],
        exploreTitle: "Administration",
        exploreItems: [
          {
            title: "CMS & Website",
            description: "Manage portal pages, blog & media",
            href: "/admin/cms",
            icon: Globe,
            colorClass: "text-cyan-400",
          },
          {
            title: "Classes & Scheduling",
            description: "Batch schedules & classroom allocation",
            href: "/admin/classes",
            icon: GraduationCap,
            colorClass: "text-blue-400",
          },
          {
            title: "Gradebook Oversight",
            description: "Audit grades & evaluation records",
            href: "/admin/gradebook",
            icon: Award,
            colorClass: "text-amber-400",
          },
          {
            title: "Guardians & Students",
            description: "Family directory & contacts",
            href: "/admin/guardians",
            icon: Users,
            colorClass: "text-purple-400",
          },
          {
            title: "Certificates Manager",
            description: "Issuance, batches & verification",
            href: "/admin/certificates",
            icon: Award,
            colorClass: "text-emerald-400",
          },
          {
            title: "Analytics & Reports",
            description: "Enrollment, retention & KPIs",
            href: "/admin/analytics",
            icon: TrendingUp,
            colorClass: "text-emerald-400",
          },
          {
            title: "Audit Log Engine",
            description: "System events & compliance logs",
            href: "/admin/audit",
            icon: ShieldAlert,
            colorClass: "text-rose-400",
          },
        ],
      };

    case UserRole.SUPER_ADMIN:
      return {
        roleBadgeText: "Super Admin",
        roleBadgeClass: "border-rose-400/50 bg-rose-500/20 text-rose-300 font-bold shadow-sm shadow-rose-500/20",
        primaryLinks: [
          { label: "Command Center", href: "/admin/dashboard" },
          { label: "Academic Ops", href: "/admin/academic" },
          { label: "Admissions", href: "/admin/admissions" },
          { label: "Audit Logs", href: "/admin/audit" },
        ],
        exploreTitle: "System & Governance",
        exploreItems: [
          {
            title: "Finance Oversight",
            description: "Institutional revenue & invoicing rules",
            href: "/admin/finance",
            icon: CreditCard,
            colorClass: "text-emerald-400",
          },
          {
            title: "CMS & Portal Management",
            description: "Public pages, blog & content oversight",
            href: "/admin/cms",
            icon: Globe,
            colorClass: "text-cyan-400",
          },
          {
            title: "Classes & Batches",
            description: "Curriculum terms & class schedules",
            href: "/admin/classes",
            icon: GraduationCap,
            colorClass: "text-blue-400",
          },
          {
            title: "Gradebook Oversight",
            description: "Academy-wide grade auditing",
            href: "/admin/gradebook",
            icon: Award,
            colorClass: "text-amber-400",
          },
          {
            title: "Certificates Manager",
            description: "Blockchain credential engine",
            href: "/admin/certificates",
            icon: Award,
            colorClass: "text-emerald-400",
          },
          {
            title: "Analytics & KPIs",
            description: "Enterprise operational intelligence",
            href: "/admin/analytics",
            icon: TrendingUp,
            colorClass: "text-purple-400",
          },
        ],
      };

    case UserRole.VISITOR:
    default:
      return {
        roleBadgeText: "Visitor",
        roleBadgeClass: "border-slate-400/30 bg-slate-500/10 text-slate-400",
        primaryLinks: [
          { label: t("nav.programs") || "Programs", href: "/courses" },
          { label: t("nav.admissions") || "Admissions", href: "/admissions/apply" },
          { label: t("nav.calendar") || "Academic Calendar", href: "/calendar" },
        ],
        exploreTitle: t("nav.explore") || "Explore",
        exploreItems: [
          {
            title: t("nav.announcements") || "Announcements",
            description: "Official announcements & academy updates",
            href: "/announcements",
            icon: Megaphone,
            colorClass: "text-[#16C4FF]",
          },
          {
            title: t("nav.blog") || "Blog",
            description: "Articles, student stories & academic insights",
            href: "/blog",
            icon: BookOpen,
            colorClass: "text-[#16C4FF]",
          },
          {
            title: t("nav.resources") || "Resources",
            description: "Learning guides, toolkits & public docs",
            href: "/resources",
            icon: Layers,
            colorClass: "text-emerald-400",
          },
          {
            title: t("nav.verifyCredential") || "Verify Credential",
            description: "Instant credential & certificate verification",
            href: "/certificate/verify",
            icon: Award,
            colorClass: "text-amber-400",
          },
        ],
      };
  }
};

export const Header: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, activeRole, status, logout, switchRole } = useAuth();
  const { t } = useI18n();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<INotification[]>([]);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const exploreRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Dynamic Navigation Config for current RBAC Persona
  const roleConfig = useMemo(
    () => getRoleNavConfig(status === "authenticated" ? activeRole : UserRole.VISITOR, t),
    [status, activeRole, t]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (exploreRef.current && !exploreRef.current.contains(target)) {
        setExploreOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setExploreOpen(false);
    setDropdownOpen(false);
    setNotifDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let isMounted = true;

    const loadNotifications = () => {
      Promise.all([
        apiClient.get<{ unreadCount: number }>("/notifications/unread-count"),
        apiClient.get<{ notifications: INotification[] }>("/notifications?limit=5"),
        apiClient.get<{ unreadCount: number }>("/messages/unread-count"),
      ])
        .then(([countRes, inboxRes, msgRes]) => {
          if (isMounted) {
            setUnreadCount(countRes?.unreadCount || 0);
            setRecentNotifs(inboxRes?.notifications || []);
            setUnreadMessages(msgRes?.unreadCount || 0);
          }
        })
        .catch(() => {
          // Quietly ignore network failures in header poller
        });
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [status, user]);

  const handleQuickMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setRecentNotifs((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const getDashboardPath = () => {
    switch (activeRole) {
      case UserRole.TEACHER:
        return "/teacher/dashboard";
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
      case UserRole.STAFF:
        return "/admin/dashboard";
      case UserRole.GUARDIAN:
        return "/guardian/dashboard";
      case UserRole.STUDENT:
      default:
        return "/student/dashboard";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#16C4FF]/15 bg-[#060E1A]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <ETALogo variant="full" theme="dark" height={34} priority />
          </Link>
        </div>

        {/* Desktop Navigation - Dynamic per Active Role */}
        <nav className="hidden items-center gap-1 md:flex lg:gap-1.5">
          {roleConfig.primaryLinks.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Explore / Workspace Hub Flyout */}
          <div className="relative" ref={exploreRef}>
            <button
              onClick={() => {
                setExploreOpen(!exploreOpen);
                setDropdownOpen(false);
                setNotifDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${exploreOpen || roleConfig.exploreItems.some((i) => pathname.startsWith(i.href))
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
            >
              <span>{roleConfig.exploreTitle}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${exploreOpen ? "rotate-180 text-[#16C4FF]" : ""
                  }`}
              />
            </button>

            {exploreOpen && (
              <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-[#16C4FF]/35 bg-[#060F1E] p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.98)] ring-1 ring-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#16C4FF] font-mono flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#16C4FF] animate-pulse" />
                    {roleConfig.exploreTitle}
                  </span>
                  <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono font-medium text-slate-300">
                    {roleConfig.exploreItems.length} shortcuts
                  </span>
                </div>
                <div className="space-y-1">
                  {roleConfig.exploreItems.map((sub) => {
                    const IconComp = sub.icon;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setExploreOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-white/10 hover:border hover:border-[#16C4FF]/25 hover:shadow-sm"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] border border-white/15 ${sub.colorClass} shadow-sm group-hover:scale-105 group-hover:border-[#16C4FF]/40 group-hover:bg-[#16C4FF]/15 transition-all`}
                        >
                          <IconComp className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-slate-100 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                          {sub.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Auth Action Buttons, Language Selector & User Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Language Selector */}
          <LanguageSelector variant="header" />

          {/* Global Search Button */}
          <Link
            href="/search"
            title={t("nav.searchPlaceholder")}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#081324] px-2.5 py-1.5 text-xs text-slate-300 transition-all hover:border-[#16C4FF]/40 hover:bg-[#0A1B33] hover:text-white"
          >
            <Search className="h-4 w-4 text-[#16C4FF]" />
            <span className="hidden xl:inline text-slate-400">{t("common.search")}</span>
            <kbd className="hidden 2xl:inline-block rounded border border-white/10 bg-white/5 px-1 py-0.2 text-[10px] font-mono text-slate-400">
              ⌘K
            </kbd>
          </Link>

          {status === "authenticated" && user ? (
            <>
              {/* Messaging Center Link */}
              <Link
                href="/messages"
                title="Academic Messages"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#081324] text-slate-300 transition-all hover:border-[#16C4FF]/40 hover:bg-[#0A1B33] hover:text-white"
              >
                <MessageSquare className="h-4 w-4" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#16C4FF] px-1 text-[10px] font-bold text-[#050B14] shadow-md animate-pulse">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </Link>

              {/* Notification Center Icon & Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setNotifDropdownOpen(!notifDropdownOpen);
                    setDropdownOpen(false);
                    setExploreOpen(false);
                  }}
                  title="Notifications"
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#081324] text-slate-300 transition-all hover:border-[#16C4FF]/40 hover:bg-[#0A1B33] hover:text-white"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-md animate-pulse">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-84 rounded-2xl p-3 shadow-[0_24px_60px_rgba(0,0,0,0.95)] z-50 animate-in fade-in slide-in-from-top-2 duration-150 border border-[#16C4FF]/30 bg-[#061122] ring-1 ring-white/10">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-[#16C4FF]" />
                        <span className="text-xs font-bold text-white">
                          {t("notifications.title")}
                        </span>
                        {unreadCount > 0 && (
                          <span className="rounded bg-[#16C4FF]/20 px-1.5 py-0.2 font-mono text-[10px] text-[#16C4FF]">
                            {unreadCount} {t("notifications.newAlerts")}
                          </span>
                        )}
                      </div>
                      <Link
                        href="/notifications"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-[11px] font-semibold text-[#16C4FF] hover:underline"
                      >
                        {t("common.viewAll")}
                      </Link>
                    </div>

                    <div className="mt-2 space-y-1.5 max-h-72 overflow-y-auto">
                      {recentNotifs.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          {t("notifications.empty")}
                        </div>
                      ) : (
                        recentNotifs.map((n) => {
                          const isUnread = !n.readAt;
                          return (
                            <div
                              key={n._id}
                              className={`rounded-lg p-2.5 text-xs transition-colors ${isUnread
                                  ? "bg-[#091B33] border border-[#16C4FF]/20"
                                  : "hover:bg-white/5"
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-white truncate max-w-[190px]">
                                  {n.title}
                                </span>
                                {isUnread && (
                                  <button
                                    onClick={(e) => handleQuickMarkRead(n._id, e)}
                                    title="Mark read"
                                    className="text-slate-400 hover:text-white"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                                {n.body}
                              </p>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                                {n.actionUrl && (
                                  <Link
                                    href={n.actionUrl}
                                    onClick={() => setNotifDropdownOpen(false)}
                                    className="text-[#16C4FF] hover:underline flex items-center gap-0.5"
                                  >
                                    Open <ExternalLink className="h-2.5 w-2.5" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu Trigger */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    setNotifDropdownOpen(false);
                    setExploreOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#081324] px-3 py-1.5 transition-all hover:border-[#16C4FF]/40 hover:bg-[#0A1B33]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#073C84] to-[#16C4FF] text-xs font-bold text-white shadow">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <span className="block text-xs font-semibold text-white max-w-[120px] truncate">
                      {user.name}
                    </span>
                    <span className="block font-mono text-[10px] text-[#16C4FF] uppercase">
                      {roleConfig.roleBadgeText}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.95)] z-50 animate-in fade-in slide-in-from-top-2 duration-150 border border-[#16C4FF]/30 bg-[#061122] ring-1 ring-white/10">
                    {/* User Identity Header Card */}
                    <div className="rounded-xl bg-gradient-to-br from-[#0c1e3d] to-[#07162c] border border-[#16C4FF]/25 p-3 mb-2 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#073C84] via-[#0B7CEB] to-[#16C4FF] text-sm font-bold text-white shadow-md shadow-blue-500/25 ring-1 ring-white/20">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white tracking-tight truncate">{user.name}</p>
                          <p className="text-xs text-slate-300 font-mono truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Active Persona
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold shadow-sm ${roleConfig.roleBadgeClass}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                          {roleConfig.roleBadgeText}
                        </span>
                      </div>
                    </div>

                    {/* RBAC Persona Switcher (PRD §7 Multi-Role Support) */}
                    {user.roles && user.roles.length > 1 && (
                      <div className="border-b border-white/10 p-2.5 text-left bg-white/[0.02] rounded-xl mb-1">
                        <div className="flex items-center justify-between mb-1.5 px-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                            {t("nav.switchActiveRole")}
                          </span>
                          <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-mono text-[#16C4FF]">
                            {user.roles.length} Personas
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {user.roles.map((r) => {
                            const isCurrent = r === activeRole;
                            return (
                              <button
                                key={r}
                                onClick={async () => {
                                  if (isCurrent) return;
                                  setIsSwitchingRole(true);
                                  try {
                                    await switchRole(r);
                                    setDropdownOpen(false);
                                  } finally {
                                    setIsSwitchingRole(false);
                                  }
                                }}
                                disabled={isSwitchingRole}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${isCurrent
                                    ? "bg-[#16C4FF]/15 border border-[#16C4FF]/40 text-[#16C4FF] font-semibold shadow-sm"
                                    : "border border-transparent bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                                  }`}
                              >
                                <span className="capitalize">{getRoleLabel(r, t)}</span>
                                {isCurrent && <Check className="h-3 w-3 text-[#16C4FF]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Role Shortcuts */}
                    <div className="space-y-0.5 py-1">
                      <Link
                        href={getDashboardPath()}
                        onClick={() => setDropdownOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#16C4FF]/15 border border-[#16C4FF]/30 text-[#16C4FF] group-hover:scale-105 group-hover:bg-[#16C4FF]/25 transition-all">
                          <LayoutDashboard className="h-3.5 w-3.5" />
                        </div>
                        <span className="group-hover:translate-x-0.5 transition-transform">{t("nav.roleWorkspace")}</span>
                      </Link>

                      {/* Student Specific Shortcuts */}
                      {activeRole === UserRole.STUDENT && (
                        <>
                          <Link
                            href="/student/courses"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 group-hover:scale-105 group-hover:bg-cyan-500/25 transition-all">
                              <GraduationCap className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">My Enrolled Courses</span>
                          </Link>
                          <Link
                            href="/student/grades"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 group-hover:scale-105 group-hover:bg-amber-500/25 transition-all">
                              <Award className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">My Grades & Transcript</span>
                          </Link>
                          <Link
                            href="/student/ask-eta"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 group-hover:scale-105 group-hover:bg-blue-500/25 transition-all">
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Ask ETA (AI Assistant)</span>
                          </Link>
                          <Link
                            href="/student/finance"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
                              <CreditCard className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Tuition & Invoices</span>
                          </Link>
                        </>
                      )}

                      {/* Teacher Specific Shortcuts */}
                      {activeRole === UserRole.TEACHER && (
                        <>
                          <Link
                            href="/teacher/gradebook"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 group-hover:scale-105 group-hover:bg-amber-500/25 transition-all">
                              <Award className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Gradebook Workspace</span>
                          </Link>
                          <Link
                            href="/teacher/attendance"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
                              <CheckSquare className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Attendance Roster</span>
                          </Link>
                          <Link
                            href="/teacher/assignments"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 group-hover:scale-105 group-hover:bg-cyan-500/25 transition-all">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Assignments & Evaluations</span>
                          </Link>
                          <Link
                            href="/teacher/quizzes"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 group-hover:scale-105 group-hover:bg-purple-500/25 transition-all">
                              <BookOpen className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Quizzes & Question Bank</span>
                          </Link>
                        </>
                      )}

                      {/* Guardian Specific Shortcuts */}
                      {activeRole === UserRole.GUARDIAN && (
                        <>
                          <Link
                            href="/guardian/finance"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
                              <CreditCard className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Child Tuition & Finance</span>
                          </Link>
                          <Link
                            href="/calendar"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 group-hover:scale-105 group-hover:bg-blue-500/25 transition-all">
                              <Calendar className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Academic Calendar</span>
                          </Link>
                        </>
                      )}

                      {/* Staff & Admin Shortcuts */}
                      {(activeRole === UserRole.ADMIN ||
                        activeRole === UserRole.SUPER_ADMIN ||
                        activeRole === UserRole.STAFF) && (
                          <>
                            <Link
                              href="/admin/admissions"
                              onClick={() => setDropdownOpen(false)}
                              className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#16C4FF]/15 border border-[#16C4FF]/30 text-[#16C4FF] group-hover:scale-105 group-hover:bg-[#16C4FF]/25 transition-all">
                                <GraduationCap className="h-3.5 w-3.5" />
                              </div>
                              <span className="group-hover:translate-x-0.5 transition-transform">Admissions Oversight</span>
                            </Link>
                            <Link
                              href="/admin/attendance"
                              onClick={() => setDropdownOpen(false)}
                              className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
                                <CheckSquare className="h-3.5 w-3.5" />
                              </div>
                              <span className="group-hover:translate-x-0.5 transition-transform">Attendance Operations</span>
                            </Link>
                            <Link
                              href="/admin/finance"
                              onClick={() => setDropdownOpen(false)}
                              className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
                                <CreditCard className="h-3.5 w-3.5" />
                              </div>
                              <span className="group-hover:translate-x-0.5 transition-transform">Finance & Invoicing</span>
                            </Link>
                            <Link
                              href="/admin/guardians"
                              onClick={() => setDropdownOpen(false)}
                              className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 group-hover:scale-105 group-hover:bg-purple-500/25 transition-all">
                                <Users className="h-3.5 w-3.5" />
                              </div>
                              <span className="group-hover:translate-x-0.5 transition-transform">Guardian Links</span>
                            </Link>
                            <Link
                              href="/admin/certificates"
                              onClick={() => setDropdownOpen(false)}
                              className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 group-hover:scale-105 group-hover:bg-amber-500/25 transition-all">
                                <Award className="h-3.5 w-3.5" />
                              </div>
                              <span className="group-hover:translate-x-0.5 transition-transform">Certificates Management</span>
                            </Link>
                          </>
                        )}

                      {/* Admin/Super Admin Exclusive */}
                      {(activeRole === UserRole.ADMIN || activeRole === UserRole.SUPER_ADMIN) && (
                        <>
                          <Link
                            href="/admin/cms"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 group-hover:scale-105 group-hover:bg-cyan-500/25 transition-all">
                              <Globe className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">CMS & Portal</span>
                          </Link>
                          <Link
                            href="/admin/analytics"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
                              <TrendingUp className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Analytics & Reports</span>
                          </Link>
                          <Link
                            href="/admin/audit"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 group-hover:scale-105 group-hover:bg-rose-500/25 transition-all">
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform">Audit Log Engine</span>
                          </Link>
                        </>
                      )}

                      <div className="border-t border-white/10 my-1.5 pt-1.5 space-y-0.5">
                        <Link
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 transition-all hover:bg-white/10 hover:text-white"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#129BFF]/15 border border-[#129BFF]/30 text-[#129BFF] group-hover:scale-105 group-hover:bg-[#129BFF]/25 transition-all">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <span className="group-hover:translate-x-0.5 transition-transform">{t("nav.profileSettings")}</span>
                        </Link>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                          }}
                          className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/15 hover:text-rose-100"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 group-hover:scale-105 group-hover:bg-rose-500/25 transition-all">
                            <LogOut className="h-3.5 w-3.5" />
                          </div>
                          <span className="group-hover:translate-x-0.5 transition-transform">{t("nav.signOut")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
              >
                {t("nav.signIn")}
              </Link>
              <Link
                href="/register"
                className="btn-brand-primary inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:shadow-md transition-all"
              >
                {t("nav.register")}
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#081324] text-slate-300 transition-colors hover:border-white/20 hover:text-white md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Dynamic Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="border-b border-[#16C4FF]/15 bg-[#060E1A]/95 px-4 py-4 backdrop-blur-xl md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Persona on Mobile */}
          {status === "authenticated" && user && (
            <div className="mb-4 rounded-xl border border-white/10 bg-[#081324] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{user.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">{user.email}</div>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-mono uppercase font-semibold ${roleConfig.roleBadgeClass}`}
                >
                  {roleConfig.roleBadgeText}
                </span>
              </div>

              {/* Mobile Role Switcher */}
              {user.roles && user.roles.length > 1 && (
                <div className="mt-3 border-t border-white/10 pt-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    {t("nav.switchActiveRole")}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {user.roles.map((r) => {
                      const isCurrent = r === activeRole;
                      return (
                        <button
                          key={r}
                          onClick={async () => {
                            if (isCurrent) return;
                            await switchRole(r);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all ${isCurrent
                              ? "bg-[#16C4FF]/15 border border-[#16C4FF]/40 text-[#16C4FF] font-semibold"
                              : "border border-transparent bg-white/5 text-slate-300"
                            }`}
                        >
                          <span className="capitalize">{getRoleLabel(r, t)}</span>
                          {isCurrent && <Check className="h-3 w-3 text-[#16C4FF]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Primary Role Links */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {status === "authenticated" ? `${roleConfig.roleBadgeText} Navigation` : "Menu"}
            </div>
            {roleConfig.primaryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/5 hover:text-white"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </Link>
            ))}

            {/* Explore / Secondary Items */}
            <div className="my-2 border-t border-white/10 pt-2">
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {roleConfig.exploreTitle}
              </span>
              <div className="mt-1 space-y-1">
                {roleConfig.exploreItems.map((sub) => {
                  const IconComp = sub.icon;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                    >
                      <IconComp className={`h-4 w-4 ${sub.colorClass}`} />
                      <span>{sub.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Account / Auth Links */}
            {status === "authenticated" ? (
              <div className="my-2 border-t border-white/10 pt-2 flex flex-col gap-1">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <User className="h-4 w-4 text-[#16C4FF]" />
                  <span>{t("nav.profileSettings")}</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t("nav.signOut")}</span>
                </button>
              </div>
            ) : (
              <div className="my-2 border-t border-white/10 pt-3 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-brand-primary w-full text-center rounded-lg py-2 text-xs font-semibold uppercase tracking-wider text-white"
                >
                  {t("nav.register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
