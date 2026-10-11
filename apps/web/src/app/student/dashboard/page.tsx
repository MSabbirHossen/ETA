"use client";

import React from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n';
import { GraduationCap, BookOpen, Video, ArrowRight, ExternalLink, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

import { apiClient } from '../../../lib/api-client';
import { StudentPortalNav } from '../../../components/student/StudentPortalNav';
import { UserRole, type IEnrollment, type ICourse, type IClassSession } from '@eta/types';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { t, formatDate } = useI18n();
  const [enrollments, setEnrollments] = React.useState<IEnrollment[]>([]);
  const [courses, setCourses] = React.useState<ICourse[]>([]);
  const [classes, setClasses] = React.useState<IClassSession[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [myEnrolls, allCourses, myClasses] = await Promise.all([
          apiClient.get<IEnrollment[]>('/enrollments/my-enrollments').catch(() => []),
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IClassSession[]>('/classes').catch(() => []),
        ]);
        setEnrollments(myEnrolls || []);
        setCourses(allCourses || []);
        setClasses(myClasses || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060E1A] text-slate-900 dark:text-slate-100 transition-colors">
        <Header />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <GraduationCap className="h-4 w-4" />
                <span>{t('portals.student.title')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {t('portals.student.academicOverview')}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {t('portals.student.welcomeBack')}, <span className="bidi-auto text-slate-900 dark:text-white font-medium">{user?.name}</span>.
              </p>
            </div>

            <StudentPortalNav />
          </div>


          {/* Upcoming Live Classes Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-600 dark:text-[#16C4FF]" />
                {t('portals.student.upcomingClasses')} ({classes.length})
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-8 bg-white dark:bg-[#08152B] border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                {t('common.loading')}
              </div>
            ) : classes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls) => {
                  const course = courses.find((c) => c._id === cls.courseId);
                  return (
                    <div key={cls._id} className="bg-white dark:bg-[#08152B] rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-white/10 shadow-sm hover:border-blue-400 dark:hover:border-[#16C4FF]/30 transition">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-blue-50 dark:bg-[#16C4FF]/10 text-blue-700 dark:text-[#16C4FF] border border-blue-200 dark:border-[#16C4FF]/20 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                          {cls.platform}
                        </span>
                        <span className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 text-[10px] uppercase font-bold">
                          {cls.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white bidi-auto">{cls.title}</h3>
                        {course && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 bidi-auto">{course.title}</p>
                        )}
                        {cls.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 bidi-auto">{cls.description}</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span className="bidi-ltr">{formatDate(cls.scheduledStart, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="bidi-ltr">
                            {new Date(cls.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cls.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {cls.meetingUrl && (
                        <a
                          href={cls.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#16C4FF] to-[#0072FF] px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 transition shadow-lg shadow-blue-500/20"
                        >
                          <Video className="h-4 w-4" />
                          {t('common.open')}
                          <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-white dark:bg-[#08152B] rounded-2xl space-y-2 border border-dashed border-slate-200 dark:border-white/10 shadow-sm p-6">
                <Video className="h-7 w-7 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('common.empty')}</p>
              </div>
            )}
          </div>

          {/* Enrolled Courses List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {t('portals.student.myCourses')} ({enrollments.length})
            </h2>

            {loading ? (
              <div className="text-center py-10 bg-white dark:bg-[#08152B] border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                {t('common.loading')}
              </div>
            ) : enrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((e) => {
                  const course = courses.find((c) => c._id === e.courseId);
                  return (
                    <div key={e._id} className="bg-white dark:bg-[#08152B] rounded-2xl p-6 space-y-4 flex flex-col justify-between border border-slate-200 dark:border-white/10 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500/30 transition">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                            {e.status}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bidi-ltr">
                            {t('status.enrolled')}: {formatDate(e.enrollmentDate)}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white bidi-auto">
                          {course ? course.title : `Course: ${e.courseId}`}
                        </h3>
                        {course && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 bidi-auto">{course.description}</p>
                        )}
                      </div>

                      <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-white/10">
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>{t('analytics.passingRate')}: {e.progress?.completionPercentage ?? 0}%</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{t('status.active')}</span>
                        </div>

                        <Link
                          href={`/student/courses/${e.courseId}`}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white transition hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          <BookOpen className="h-4 w-4" />
                          {t('common.view')}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-[#08152B] rounded-2xl space-y-3 border border-dashed border-slate-200 dark:border-white/10 shadow-sm p-6">
                <BookOpen className="h-8 w-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('common.empty')}</h3>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}

