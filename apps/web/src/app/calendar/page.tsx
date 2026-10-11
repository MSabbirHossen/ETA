"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { ETALoader } from "../../components/brand/ETALoader";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../context/AuthContext";
import {
  CalendarEventType,
  CalendarEventStatus,
  type ICalendarEvent,
  type CalendarRangeResponse,
  UserRole,
} from "@eta/types";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Award,
  Megaphone,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Filter,
  AlertTriangle,
  X,
  Users,
} from "lucide-react";
import { useI18n } from "../../i18n";

type ViewMode = "month" | "week" | "day" | "agenda";

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const { user, activeRole } = useAuth();

  // Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEventType, setSelectedEventType] = useState<string>("ALL");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Data State
  const [events, setEvents] = useState<ICalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ICalendarEvent | null>(null);

  // Guardian linked students state
  const [linkedStudents, setLinkedStudents] = useState<
    Array<{ _id: string; name: string; email: string }>
  >([]);

  // Compute active range based on viewMode and currentDate
  const range = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "month") {
      // Fetch entire month plus padding days
      const firstDayOfMonth = new Date(year, month, 1);
      const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
      const startDate = new Date(year, month, 1 - startDayOfWeek);
      startDate.setHours(0, 0, 0, 0);

      const lastDayOfMonth = new Date(year, month + 1, 0);
      const endDayOfWeek = lastDayOfMonth.getDay();
      const endDate = new Date(year, month + 1, 6 - endDayOfWeek);
      endDate.setHours(23, 59, 59, 999);

      return {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      };
    } else if (viewMode === "week") {
      const dayOfWeek = currentDate.getDay();
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      return {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      };
    } else if (viewMode === "day") {
      const startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(currentDate);
      endDate.setHours(23, 59, 59, 999);

      return {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      };
    } else {
      // Agenda: 30 days starting from current date
      const startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + 30);
      endDate.setHours(23, 59, 59, 999);

      return {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      };
    }
  }, [currentDate, viewMode]);

  // If guardian, load linked students
  useEffect(() => {
    if (activeRole === UserRole.GUARDIAN && user) {
      apiClient
        .get<{ students: Array<{ _id: string; name: string; email: string }> }>(
          "/guardians/my-students"
        )
        .then((res) => {
          if (res?.students && res.students.length > 0) {
            setLinkedStudents(res.students);
            if (!selectedStudentId) {
              setSelectedStudentId(res.students[0]._id);
            }
          }
        })
        .catch(() => {});
    }
  }, [activeRole, user, selectedStudentId]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          from: range.from,
          to: range.to,
        });

        if (selectedEventType !== "ALL") {
          params.append("eventType", selectedEventType);
        }
        if (activeRole === UserRole.GUARDIAN && selectedStudentId) {
          params.append("studentId", selectedStudentId);
        }

        const res = await apiClient.get<CalendarRangeResponse>(
          `/calendar?${params.toString()}`,
          { requiresAuth: !!user }
        );

        if (isMounted) {
          setEvents(res?.events || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setError(e.message || "Failed to load academic calendar events.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [range, selectedEventType, activeRole, selectedStudentId, user]);

  // Navigation Handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") next.setMonth(prev.getMonth() - 1);
      else if (viewMode === "week") next.setDate(prev.getDate() - 7);
      else if (viewMode === "day") next.setDate(prev.getDate() - 1);
      else next.setDate(prev.getDate() - 30);
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") next.setMonth(prev.getMonth() + 1);
      else if (viewMode === "week") next.setDate(prev.getDate() + 7);
      else if (viewMode === "day") next.setDate(prev.getDate() + 1);
      else next.setDate(prev.getDate() + 30);
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Visual Event Chip Style Mapping
  const getEventStyle = (eventType: CalendarEventType) => {
    switch (eventType) {
      case CalendarEventType.CLASS:
        return {
          bg: "bg-[#073C84]/60 border-l-[#16C4FF] text-white",
          badge: "bg-[#16C4FF]/20 text-[#16C4FF]",
          icon: <BookOpen className="h-3 w-3" />,
          label: "Class Session",
        };
      case CalendarEventType.ASSIGNMENT_DUE:
        return {
          bg: "bg-amber-950/40 border-l-amber-500 text-amber-200",
          badge: "bg-amber-500/20 text-amber-400",
          icon: <Clock className="h-3 w-3" />,
          label: "Assignment Due",
        };
      case CalendarEventType.QUIZ:
      case CalendarEventType.EXAM:
        return {
          bg: "bg-purple-950/40 border-l-purple-500 text-purple-200",
          badge: "bg-purple-500/20 text-purple-400",
          icon: <Award className="h-3 w-3" />,
          label: eventType === CalendarEventType.EXAM ? "Exam" : "Quiz",
        };
      case CalendarEventType.ANNOUNCEMENT:
        return {
          bg: "bg-rose-950/40 border-l-rose-500 text-rose-200",
          badge: "bg-rose-500/20 text-rose-400",
          icon: <Megaphone className="h-3 w-3" />,
          label: "Institutional Notice",
        };
      case CalendarEventType.ACADEMIC_DEADLINE:
        return {
          bg: "bg-emerald-950/40 border-l-emerald-500 text-emerald-200",
          badge: "bg-emerald-500/20 text-emerald-400",
          icon: <GraduationCap className="h-3 w-3" />,
          label: "Academic Milestone",
        };
      default:
        return {
          bg: "bg-blue-950/40 border-l-blue-500 text-blue-200",
          badge: "bg-blue-500/20 text-blue-400",
          icon: <Sparkles className="h-3 w-3" />,
          label: "Academy Event",
        };
    }
  };

  // Month Grid Computation
  const monthDays = useMemo(() => {
    if (viewMode !== "month") return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayIndex = firstDay.getDay(); // 0 is Sun

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayEvents: ICalendarEvent[];
    }> = [];

    // Preceding month padding
    const startDate = new Date(year, month, 1 - startDayIndex);
    const todayStr = new Date().toDateString();

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const isCurrentMonth = d.getMonth() === month;
      const isToday = d.toDateString() === todayStr;

      // Filter events occurring on this day
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter((ev) => {
        const evStart = new Date(ev.startAt);
        return evStart >= dayStart && evStart <= dayEnd;
      });

      days.push({
        date: d,
        isCurrentMonth,
        isToday,
        dayEvents,
      });
    }

    return days;
  }, [currentDate, viewMode, events]);

  return (
    <div className="flex min-h-screen flex-col bg-[#050B14] text-slate-100">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Page Title & Navigation Bar */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#16C4FF]/30 bg-[#073C84]/40 text-[#16C4FF]">
                <CalendarIcon className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {t('calendar.title')}
                </h1>
              </div>
            </div>
          </div>

          {/* Range Controls & View Mode Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleToday}
              className="rounded-lg border border-white/10 bg-[#081324] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-[#16C4FF]/40 hover:bg-[#0A1B33] hover:text-white"
            >
              {t('calendar.today')}
            </button>
            <div className="flex items-center rounded-lg border border-white/10 bg-[#081324] p-0.5">
              <button
                onClick={handlePrev}
                title={t('common.previous')}
                className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                title={t('common.next')}
                className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className="text-sm font-bold text-white min-w-[140px] text-center font-mono">
              {currentDate.toLocaleDateString(locale === 'ar' ? 'ar-EG' : locale === 'bn' ? 'bn-BD' : 'en-US', {
                month: "long",
                year: "numeric",
              })}
            </span>

            {/* View Selectors */}
            <div className="flex items-center rounded-lg border border-white/10 bg-[#081324] p-0.5">
              {[
                { id: "month" as ViewMode, label: t('calendar.month') },
                { id: "week" as ViewMode, label: t('calendar.week') },
                { id: "day" as ViewMode, label: t('calendar.day') },
                { id: "agenda" as ViewMode, label: t('calendar.agenda') },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setViewMode(m.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    viewMode === m.id
                      ? "bg-[#073C84] text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toolbar: Event Type Filter & Guardian Student Selector */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#081324] p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-slate-400 text-[11px]">
              <Filter className="h-3.5 w-3.5 text-[#16C4FF]" />
              {t('calendar.eventTypes')}:
            </span>
            {[
              { id: "ALL", label: t('calendar.allEvents') },
              { id: CalendarEventType.CLASS, label: "Classes" },
              { id: CalendarEventType.ASSIGNMENT_DUE, label: "Assignments" },
              { id: CalendarEventType.QUIZ, label: "Quizzes & Exams" },
              { id: CalendarEventType.ACADEMIC_DEADLINE, label: "Milestones" },
              { id: CalendarEventType.ANNOUNCEMENT, label: "Notices" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedEventType(f.id)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  selectedEventType === f.id
                    ? "bg-[#073C84] text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Guardian linked student switcher */}
          {activeRole === UserRole.GUARDIAN && linkedStudents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-purple-400" />
                Child:
              </span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#050B14] px-2.5 py-1 text-xs text-white focus:border-[#16C4FF] focus:outline-none"
              >
                {linkedStudents.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <ETALoader label="Aggregating academic schedules..." />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-400">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
            <p className="font-semibold text-sm">{error}</p>
          </div>
        ) : (
          <>
            {/* MONTH VIEW */}
            {viewMode === "month" && (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#081324] shadow-2xl">
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-white/10 bg-[#0A182E] text-center text-xs font-bold uppercase tracking-wider text-slate-400 py-2.5">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                {/* 6-Week Calendar Grid */}
                <div className="grid grid-cols-7 divide-x divide-y divide-white/5">
                  {monthDays.map((dayItem, idx) => {
                    return (
                      <div
                        key={idx}
                        className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                          dayItem.isCurrentMonth
                            ? "bg-[#081324]"
                            : "bg-[#050B14]/70 text-slate-600"
                        } ${dayItem.isToday ? "ring-1 ring-inset ring-[#16C4FF]/40" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-mono font-bold ${
                              dayItem.isToday
                                ? "flex h-5 w-5 items-center justify-center rounded-full bg-[#16C4FF] text-[#050B14]"
                                : dayItem.isCurrentMonth
                                ? "text-slate-300"
                                : "text-slate-600"
                            }`}
                          >
                            {dayItem.date.getDate()}
                          </span>
                          {dayItem.dayEvents.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {dayItem.dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Events list inside cell */}
                        <div className="mt-1.5 space-y-1 flex-1 overflow-y-auto max-h-24">
                          {dayItem.dayEvents.slice(0, 3).map((ev) => {
                            const style = getEventStyle(ev.eventType);
                            return (
                              <div
                                key={ev.id}
                                onClick={() => setSelectedEvent(ev)}
                                className={`cursor-pointer truncate rounded-md border-l-2 px-1.5 py-0.5 text-[10px] font-semibold transition-all hover:brightness-125 ${style.bg}`}
                              >
                                {ev.title}
                              </div>
                            );
                          })}
                          {dayItem.dayEvents.length > 3 && (
                            <div
                              onClick={() => {
                                setCurrentDate(dayItem.date);
                                setViewMode("day");
                              }}
                              className="cursor-pointer text-[10px] font-semibold text-[#16C4FF] hover:underline"
                            >
                              +{dayItem.dayEvents.length - 3} more...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AGENDA VIEW / DAY VIEW / WEEK VIEW */}
            {viewMode !== "month" && (
              <div className="rounded-xl border border-white/10 bg-[#081324] p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-[#16C4FF]" />
                    {viewMode === "day"
                      ? `Schedule for ${currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`
                      : viewMode === "week"
                      ? `Weekly Schedule Overview`
                      : `Upcoming Agenda Schedule`}
                  </h2>
                  <span className="font-mono text-xs text-slate-400">
                    {events.length} event{events.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {events.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                    <p className="text-xs">No calendar events scheduled in this period.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {events.map((ev) => {
                      const style = getEventStyle(ev.eventType);
                      const startTime = new Date(ev.startAt);
                      const endTime = ev.endAt ? new Date(ev.endAt) : null;

                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="flex cursor-pointer flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                              {style.icon}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-white">
                                  {ev.title}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
                                >
                                  {style.label}
                                </span>
                                {ev.status === CalendarEventStatus.CANCELLED && (
                                  <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold uppercase text-rose-400">
                                    Cancelled
                                  </span>
                                )}
                              </div>
                              {ev.description && (
                                <p className="mt-1 text-xs text-slate-400 line-clamp-1">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 sm:text-right">
                            <div>
                              <div>{startTime.toLocaleDateString()}</div>
                              {!ev.allDay && (
                                <div className="text-[11px] text-slate-500">
                                  {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  {endTime && ` - ${endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                                </div>
                              )}
                            </div>
                            {ev.actionUrl && (
                              <Link
                                href={ev.actionUrl}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded p-1 text-[#16C4FF] hover:bg-[#16C4FF]/10"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#081324] p-6 shadow-2xl">
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        getEventStyle(selectedEvent.eventType).badge
                      }`}
                    >
                      {getEventStyle(selectedEvent.eventType).label}
                    </span>
                    {selectedEvent.status === CalendarEventStatus.CANCELLED && (
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-400">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {selectedEvent.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-mono">
                  <Clock className="h-3.5 w-3.5 text-[#16C4FF]" />
                  <span>
                    {new Date(selectedEvent.startAt).toLocaleString()}
                    {selectedEvent.endAt &&
                      ` to ${new Date(selectedEvent.endAt).toLocaleString()}`}
                  </span>
                </div>

                {selectedEvent.description && (
                  <div className="rounded-lg border border-white/5 bg-[#050B14] p-3 leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.description}
                  </div>
                )}

                {selectedEvent.metadata && (
                  <div className="space-y-1 border-t border-white/5 pt-2 text-[11px] text-slate-400">
                    {Boolean(selectedEvent.metadata.platform) && (
                      <div>
                        Platform: <strong className="text-white">{String(selectedEvent.metadata.platform)}</strong>
                      </div>
                    )}
                    {Boolean(selectedEvent.metadata.durationMinutes) && (
                      <div>
                        Duration: <strong className="text-white">{String(selectedEvent.metadata.durationMinutes)} mins</strong>
                      </div>
                    )}
                    {Boolean(selectedEvent.metadata.totalMarks) && (
                      <div>
                        Total Marks: <strong className="text-white">{String(selectedEvent.metadata.totalMarks)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  Close
                </button>
                {selectedEvent.actionUrl && (
                  <Link
                    href={selectedEvent.actionUrl}
                    className="btn-brand-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow"
                  >
                    <span>Go to Activity</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
