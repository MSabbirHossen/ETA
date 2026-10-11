import React from "react";
import Link from "next/link";
import { ETALogo } from "../brand/ETALogo";
import { useI18n } from "../../i18n";
import type { ISiteSettings } from "@eta/types";
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
  Award,
} from "lucide-react";

interface FooterProps {
  siteSettings?: ISiteSettings | null;
}

export const Footer: React.FC<FooterProps> = ({ siteSettings }) => {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  const academyName = siteSettings?.academyName || t('nav.brand');
  const tagline = siteSettings?.tagline || t('nav.tagline');
  const aboutText =
    siteSettings?.aboutText ||
    "Exploratory Training Academy (ETA) is a premier academic institution dedicated to cultivating engineering excellence, cutting-edge research, and leadership in emerging technologies.";
  const address = siteSettings?.address || "100 Innovation Boulevard, Tech Campus, Academic City";
  const contactEmail = siteSettings?.contactEmail || "admissions@eta.edu";
  const contactPhone = siteSettings?.contactPhone || "+1 (555) 382-2026";
  const workingHours = siteSettings?.workingHours || "Mon – Fri: 8:00 AM – 6:00 PM UTC";
  const copyright = siteSettings?.copyrightText || `© ${currentYear} ${academyName}. All rights reserved.`;

  return (
    <footer className="w-full border-t border-[#16C4FF]/10 bg-[#040A13] pt-16 pb-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & About Column */}
          <div className="space-y-4 lg:col-span-2">
            <ETALogo variant="full" theme="dark" height={32} />
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16C4FF]">
              {tagline}
            </p>
            <p className="max-w-md text-xs leading-relaxed text-slate-400">
              {aboutText}
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-slate-300">
              {siteSettings?.socialLinks?.linkedin && (
                <a
                  href={siteSettings.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 p-2 hover:border-[#16C4FF]/40 hover:text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <span className="font-mono text-[11px] font-bold">in</span>
                </a>
              )}
              {siteSettings?.socialLinks?.twitter && (
                <a
                  href={siteSettings.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 p-2 hover:border-[#16C4FF]/40 hover:text-white transition-colors"
                  aria-label="Twitter"
                >
                  <span className="font-mono text-[11px] font-bold">𝕏</span>
                </a>
              )}
              {siteSettings?.socialLinks?.github && (
                <a
                  href={siteSettings.socialLinks.github}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 p-2 hover:border-[#16C4FF]/40 hover:text-white transition-colors"
                  aria-label="GitHub"
                >
                  <span className="font-mono text-[11px] font-bold">git</span>
                </a>
              )}
              {siteSettings?.socialLinks?.youtube && (
                <a
                  href={siteSettings.socialLinks.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 p-2 hover:border-[#16C4FF]/40 hover:text-white transition-colors"
                  aria-label="YouTube"
                >
                  <span className="font-mono text-[11px] font-bold">yt</span>
                </a>
              )}
            </div>
          </div>

          {/* Academic Portals Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Academics & Study
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/courses" className="hover:text-white transition-colors">
                  Programs & Curricula
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog & Dispatches
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-white transition-colors">
                  Resource Library
                </Link>
              </li>
              <li>
                <Link href="/announcements" className="hover:text-white transition-colors">
                  Academy Bulletins
                </Link>
              </li>
              <li>
                <Link href="/calendar" className="hover:text-white transition-colors">
                  Unified Academic Calendar
                </Link>
              </li>
              <li>
                <Link href="/admissions/apply" className="hover:text-white transition-colors">
                  Admissions Portal
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Student & Faculty Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Credential Verification Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Trust & Credentials
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li>
                <Link
                  href="/certificate/verify"
                  className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors"
                >
                  <Award className="h-3.5 w-3.5" />
                  Verify Credential
                </Link>
              </li>
              <li>
                <Link href="/#leadership" className="hover:text-white transition-colors">
                  Leadership & Faculty
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  Admissions FAQ
                </Link>
              </li>
              <li>
                <Link href="/#statistics" className="hover:text-white transition-colors">
                  Institutional Metrics
                </Link>
              </li>
            </ul>
          </div>

          {/* Campus & Contact Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Campus & Inquiries
            </h4>
            <ul className="mt-4 space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#16C4FF] flex-shrink-0 mt-0.5" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#16C4FF] flex-shrink-0" />
                <a href={`mailto:${contactEmail}`} className="hover:text-white">
                  {contactEmail}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#16C4FF] flex-shrink-0" />
                <span>{contactPhone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#16C4FF] flex-shrink-0" />
                <span>{workingHours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>{copyright}</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Accredited Technical Academy
            </span>
            <span className="text-slate-600">•</span>
            <Link href="/certificate/verify" className="hover:text-slate-300">
              Verification Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
