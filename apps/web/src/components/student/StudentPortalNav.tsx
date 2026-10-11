"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../../i18n';
import {
  FileText,
  FileCheck,
  CheckSquare,
  User,
  Sun,
  Moon,
} from 'lucide-react';

export interface StudentPortalNavProps {
  className?: string;
}

export const StudentPortalNav: React.FC<StudentPortalNavProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    const saved = localStorage.getItem('eta_theme');
    if (saved) {
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        setIsDark(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDark(false);
      }
    } else {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleTheme = () => {
    const willBeDark = !isDark;
    setIsDark(willBeDark);
    if (willBeDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('eta_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('eta_theme', 'light');
    }
  };

  const navLinks = [
    {
      href: '/student/assignments',
      label: t('portals.student.activeAssignments') || 'Assignments',
      icon: FileText,
    },
    {
      href: '/student/quizzes',
      label: t('portals.student.recentQuizzes') || 'Quizzes',
      icon: FileCheck,
    },
    {
      href: '/student/attendance',
      label: t('portals.student.attendanceRate') || 'Attendance',
      icon: CheckSquare,
    },
  ];

  return (
    <div className={`flex items-center flex-wrap gap-2 sm:gap-2.5 ${className}`}>
      {navLinks.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href));
        const IconComp = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              isActive
                ? 'border border-[#16C4FF]/50 bg-[#073C84] text-white dark:bg-[#073C84]/60 dark:text-[#16C4FF] dark:border-[#16C4FF]/40 shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white shadow-xs'
            }`}
          >
            <IconComp
              className={`h-3.5 w-3.5 ${
                isActive
                  ? 'text-[#16C4FF]'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}



      {/* Profile Settings CTA */}
      <Link
        href="/profile"
        className="btn-brand-primary text-xs py-2 px-3.5 rounded-xl font-semibold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 shadow-sm"
      >
        <User className="h-3.5 w-3.5" />
        <span>{t('nav.profileSettings') || 'Profile Settings'}</span>
      </Link>

      {/* Theme Switcher */}
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle theme"
        className="rounded-xl p-2 text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shadow-xs flex items-center justify-center cursor-pointer"
      >
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
        ) : (
          <Moon className="h-4 w-4 text-indigo-600 hover:-rotate-12 transition-transform" />
        )}
      </button>
    </div>
  );
};
