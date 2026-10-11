"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import {
  UserRole,
  CMSContentStatus,
  type ISiteSettings,
  type IHeroSection,
  type IStatisticItem,
  type ILeadershipProfile,
  type ITestimonial,
  type IFAQItem,
} from '@eta/types';
import {
  Globe,
  Sliders,
  BarChart3,
  Users,
  MessageSquareQuote,
  HelpCircle,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  RefreshCw,
  X,
} from 'lucide-react';
import { useI18n } from '../../../i18n';

export default function AdminCMSPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'hero' | 'site' | 'statistics' | 'leadership' | 'testimonials' | 'faq'>('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [hero, setHero] = useState<IHeroSection | null>(null);
  const [siteSettings, setSiteSettings] = useState<ISiteSettings | null>(null);
  const [statistics, setStatistics] = useState<IStatisticItem[]>([]);
  const [leadership, setLeadership] = useState<ILeadershipProfile[]>([]);
  const [testimonials, setTestimonials] = useState<ITestimonial[]>([]);
  const [faqs, setFaqs] = useState<IFAQItem[]>([]);

  // Modals & Editing states
  const [statModal, setStatModal] = useState<{ open: boolean; item?: IStatisticItem | null }>({ open: false });
  const [statForm, setStatForm] = useState({
    label: '',
    value: '',
    isDynamic: false,
    dynamicSource: 'none' as 'students' | 'courses' | 'certificates' | 'attendance' | 'none',
    sortOrder: 0,
    status: CMSContentStatus.PUBLISHED,
  });

  const [leaderModal, setLeaderModal] = useState<{ open: boolean; item?: ILeadershipProfile | null }>({ open: false });
  const [leaderForm, setLeaderForm] = useState({
    name: '',
    designation: '',
    biography: '',
    photoUrl: '',
    sortOrder: 0,
    linkedin: '',
    twitter: '',
    email: '',
    status: CMSContentStatus.PUBLISHED,
  });

  const [testimonialModal, setTestimonialModal] = useState<{ open: boolean; item?: ITestimonial | null }>({ open: false });
  const [testimonialForm, setTestimonialForm] = useState({
    name: '',
    role: '',
    quote: '',
    rating: 5,
    featured: false,
    sortOrder: 0,
    status: CMSContentStatus.PUBLISHED,
  });

  const [faqModal, setFaqModal] = useState<{ open: boolean; item?: IFAQItem | null }>({ open: false });
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'Admissions',
    sortOrder: 0,
    status: CMSContentStatus.PUBLISHED,
  });

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get<IHeroSection>('/cms/hero'),
      apiClient.get<ISiteSettings>('/cms/settings'),
      apiClient.get<IStatisticItem[]>('/cms/statistics'),
      apiClient.get<ILeadershipProfile[]>('/cms/leadership'),
      apiClient.get<ITestimonial[]>('/cms/testimonials'),
      apiClient.get<IFAQItem[]>('/cms/faqs'),
    ])
      .then(([heroRes, siteRes, statsRes, leaderRes, testRes, faqRes]) => {
        setHero(heroRes);
        setSiteSettings(siteRes);
        setStatistics(statsRes || []);
        setLeadership(leaderRes || []);
        setTestimonials(testRes || []);
        setFaqs(faqRes || []);
      })
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setError(e.message || 'Failed to load CMS content');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiClient.get<IHeroSection>('/cms/hero'),
      apiClient.get<ISiteSettings>('/cms/settings'),
      apiClient.get<IStatisticItem[]>('/cms/statistics'),
      apiClient.get<ILeadershipProfile[]>('/cms/leadership'),
      apiClient.get<ITestimonial[]>('/cms/testimonials'),
      apiClient.get<IFAQItem[]>('/cms/faqs'),
    ])
      .then(([heroRes, siteRes, statsRes, leaderRes, testRes, faqRes]) => {
        if (!isMounted) return;
        setHero(heroRes);
        setSiteSettings(siteRes);
        setStatistics(statsRes || []);
        setLeadership(leaderRes || []);
        setTestimonials(testRes || []);
        setFaqs(faqRes || []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const e = err as { message?: string };
        setError(e.message || 'Failed to load CMS content');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // 1. Save Hero
  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hero) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.patch<IHeroSection>('/cms/hero', hero);
      setHero(updated);
      showNotification('Hero section saved and published successfully!');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to save hero section');
    } finally {
      setSaving(false);
    }
  };

  // 2. Save Site Settings
  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteSettings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.patch<ISiteSettings>('/cms/settings', siteSettings);
      setSiteSettings(updated);
      showNotification('Site settings and footer configuration updated successfully!');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to update site settings');
    } finally {
      setSaving(false);
    }
  };

  // 3. Statistics Handlers
  const handleSaveStatistic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const itemId = statModal.item?._id || statModal.item?.id;
      if (itemId) {
        await apiClient.patch(`/cms/statistics/${itemId}`, statForm);
      } else {
        await apiClient.post('/cms/statistics', statForm);
      }
      setStatModal({ open: false });
      showNotification('Statistic metric saved successfully!');
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to save statistic');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStatistic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this statistic?')) return;
    try {
      await apiClient.delete(`/cms/statistics/${id}`);
      showNotification('Statistic deleted');
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to delete statistic');
    }
  };

  // 4. Leadership Handlers
  const handleSaveLeadership = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: leaderForm.name,
        designation: leaderForm.designation,
        biography: leaderForm.biography,
        photoUrl: leaderForm.photoUrl || undefined,
        sortOrder: leaderForm.sortOrder,
        socialLinks: {
          linkedin: leaderForm.linkedin || undefined,
          twitter: leaderForm.twitter || undefined,
          email: leaderForm.email || undefined,
        },
        status: leaderForm.status,
      };

      const itemId = leaderModal.item?._id || leaderModal.item?.id;
      if (itemId) {
        await apiClient.patch(`/cms/leadership/${itemId}`, payload);
      } else {
        await apiClient.post('/cms/leadership', payload);
      }
      setLeaderModal({ open: false });
      showNotification('Leadership profile saved successfully!');
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to save leadership profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLeadership = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leadership profile?')) return;
    try {
      await apiClient.delete(`/cms/leadership/${id}`);
      showNotification('Leadership profile deleted');
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to delete leadership');
    }
  };

  // 5. Testimonial Handlers
  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const itemId = testimonialModal.item?._id || testimonialModal.item?.id;
      if (itemId) {
        await apiClient.patch(`/cms/testimonials/${itemId}`, testimonialForm);
      } else {
        await apiClient.post('/cms/testimonials', testimonialForm);
      }
      setTestimonialModal({ open: false });
      showNotification('Testimonial saved successfully!');
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    try {
      await apiClient.delete(`/cms/testimonials/${id}`);
      showNotification('Testimonial deleted');
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to delete testimonial');
    }
  };

  // 6. FAQ Handlers
  const handleSaveFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const itemId = faqModal.item?._id || faqModal.item?.id;
      if (itemId) {
        await apiClient.patch(`/cms/faqs/${itemId}`, faqForm);
      } else {
        await apiClient.post('/cms/faqs', faqForm);
      }
      setFaqModal({ open: false });
      showNotification('FAQ item saved successfully!');
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to save FAQ item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ item?')) return;
    try {
      await apiClient.delete(`/cms/faqs/${id}`);
      showNotification('FAQ item deleted');
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to delete FAQ item');
    }
  };


  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]}>
      <div className="min-h-screen flex flex-col bg-[#050B14] text-white">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header & Meta Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/10 gap-4">
            <div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {t('cms.title')}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <Eye className="h-4 w-4 text-[#16C4FF]" />
                {t('cms.previewPortal')}
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-white/10 bg-[#07172B] hover:bg-[#0A2242] text-slate-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {t('common.retry')}
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mt-4 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mt-6 flex overflow-x-auto space-x-2 border-b border-white/10 pb-2">
            {[
              { id: 'hero', label: t('cms.hero'), icon: Sliders },
              { id: 'site', label: t('cms.site'), icon: Globe },
              { id: 'statistics', label: t('cms.statistics'), icon: BarChart3 },
              { id: 'leadership', label: t('cms.leadership'), icon: Users },
              { id: 'testimonials', label: t('cms.testimonials'), icon: MessageSquareQuote },
              { id: 'faq', label: t('cms.faq'), icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'hero' | 'site' | 'statistics' | 'leadership' | 'testimonials' | 'faq')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${isActive
                      ? 'bg-[#0B7CEB] text-white shadow-lg shadow-[#0B7CEB]/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {saving && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
              <ETALoader size="md" label="Publishing CMS Updates..." />
            </div>
          )}

          {loading ? (
            <div className="py-24 flex justify-center items-center">
              <ETALoader size="lg" label="Loading CMS Management Console..." />
            </div>
          ) : (
            <div className="mt-6">
              {/* TAB 1: HERO SECTION */}
              {activeTab === 'hero' && hero && (
                <form onSubmit={handleSaveHero} className="bg-[#081324] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Hero Header Configuration</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hero.enabled}
                          onChange={(e) => setHero({ ...hero, enabled: e.target.checked })}
                          className="rounded border-white/20 bg-[#050B14] text-[#0B7CEB] focus:ring-0"
                        />
                        Hero Section Enabled
                      </label>
                      <select
                        value={hero.status}
                        onChange={(e) => setHero({ ...hero, status: e.target.value as CMSContentStatus })}
                        className="rounded-lg border border-white/10 bg-[#050B14] px-3 py-1.5 text-xs text-white"
                      >
                        <option value={CMSContentStatus.PUBLISHED}>PUBLISHED</option>
                        <option value={CMSContentStatus.DRAFT}>DRAFT</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Eyebrow Badge Text</label>
                      <input
                        type="text"
                        value={hero.eyebrow}
                        onChange={(e) => setHero({ ...hero, eyebrow: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Trust Badge Text</label>
                      <input
                        type="text"
                        value={hero.badgeText}
                        onChange={(e) => setHero({ ...hero, badgeText: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Main Heading Line 1</label>
                      <input
                        type="text"
                        value={hero.title}
                        onChange={(e) => setHero({ ...hero, title: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Highlighted Gradient Line 2</label>
                      <input
                        type="text"
                        value={hero.highlightedTitle}
                        onChange={(e) => setHero({ ...hero, highlightedTitle: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Hero Narrative Description</label>
                      <textarea
                        rows={3}
                        value={hero.description}
                        onChange={(e) => setHero({ ...hero, description: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Primary CTA Label</label>
                      <input
                        type="text"
                        value={hero.primaryCtaText}
                        onChange={(e) => setHero({ ...hero, primaryCtaText: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Primary CTA Link</label>
                      <input
                        type="text"
                        value={hero.primaryCtaLink}
                        onChange={(e) => setHero({ ...hero, primaryCtaLink: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Secondary CTA Label</label>
                      <input
                        type="text"
                        value={hero.secondaryCtaText}
                        onChange={(e) => setHero({ ...hero, secondaryCtaText: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Secondary CTA Link</label>
                      <input
                        type="text"
                        value={hero.secondaryCtaLink}
                        onChange={(e) => setHero({ ...hero, secondaryCtaLink: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-brand-primary flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save & Publish Hero'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: SITE & FOOTER */}
              {activeTab === 'site' && siteSettings && (
                <form onSubmit={handleSaveSiteSettings} className="bg-[#081324] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <h3 className="text-lg font-bold text-white">Academy Information & SEO Metadata</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Academy Legal Name</label>
                      <input
                        type="text"
                        value={siteSettings.academyName}
                        onChange={(e) => setSiteSettings({ ...siteSettings, academyName: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Institutional Tagline</label>
                      <input
                        type="text"
                        value={siteSettings.tagline}
                        onChange={(e) => setSiteSettings({ ...siteSettings, tagline: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">About Academy Statement</label>
                      <textarea
                        rows={3}
                        value={siteSettings.aboutText}
                        onChange={(e) => setSiteSettings({ ...siteSettings, aboutText: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Mission Statement</label>
                      <textarea
                        rows={2}
                        value={siteSettings.missionText}
                        onChange={(e) => setSiteSettings({ ...siteSettings, missionText: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Vision Statement</label>
                      <textarea
                        rows={2}
                        value={siteSettings.visionText}
                        onChange={(e) => setSiteSettings({ ...siteSettings, visionText: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Contact Email</label>
                      <input
                        type="email"
                        value={siteSettings.contactEmail}
                        onChange={(e) => setSiteSettings({ ...siteSettings, contactEmail: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Contact Phone</label>
                      <input
                        type="text"
                        value={siteSettings.contactPhone}
                        onChange={(e) => setSiteSettings({ ...siteSettings, contactPhone: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Physical Campus Address</label>
                      <input
                        type="text"
                        value={siteSettings.address}
                        onChange={(e) => setSiteSettings({ ...siteSettings, address: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">SEO Meta Title</label>
                      <input
                        type="text"
                        value={siteSettings.metaTitle}
                        onChange={(e) => setSiteSettings({ ...siteSettings, metaTitle: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">SEO Meta Description</label>
                      <input
                        type="text"
                        value={siteSettings.metaDescription}
                        onChange={(e) => setSiteSettings({ ...siteSettings, metaDescription: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Footer Copyright Text</label>
                      <input
                        type="text"
                        value={siteSettings.copyrightText}
                        onChange={(e) => setSiteSettings({ ...siteSettings, copyrightText: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-4 py-2.5 text-sm text-white focus:border-[#16C4FF] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-brand-primary flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Site Settings'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: STATISTICS */}
              {activeTab === 'statistics' && (
                <div className="bg-[#081324] border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Institutional Performance Indicators</h3>
                    </div>
                    <button
                      onClick={() => {
                        setStatForm({
                          label: '',
                          value: '',
                          isDynamic: false,
                          dynamicSource: 'none',
                          sortOrder: statistics.length + 1,
                          status: CMSContentStatus.PUBLISHED,
                        });
                        setStatModal({ open: true, item: null });
                      }}
                      className="btn-brand-primary flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Add Metric
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {statistics.map((st) => (
                      <div key={st._id || st.id} className="p-4 rounded-xl border border-white/10 bg-[#050B14] relative group">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-mono text-[#16C4FF]">#{st.sortOrder}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${st.status === CMSContentStatus.PUBLISHED ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {st.status}
                          </span>
                        </div>
                        <div className="mt-2 text-2xl font-black font-mono text-white">{st.value}</div>
                        <div className="text-xs font-medium text-slate-300 mt-1">{st.label}</div>
                        <div className="mt-2 text-[11px] text-slate-400 font-mono">
                          {st.isDynamic ? `Dynamic: ${st.dynamicSource}` : 'Curated'}
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setStatForm({
                                label: st.label,
                                value: st.value,
                                isDynamic: st.isDynamic,
                                dynamicSource: st.dynamicSource || 'none',
                                sortOrder: st.sortOrder,
                                status: st.status,
                              });
                              setStatModal({ open: true, item: st });
                            }}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStatistic((st._id || st.id)!)}
                            className="p-1 text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: LEADERSHIP */}
              {activeTab === 'leadership' && (
                <div className="bg-[#081324] border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Institutional Leadership & Deans</h3>
                    </div>
                    <button
                      onClick={() => {
                        setLeaderForm({
                          name: '',
                          designation: '',
                          biography: '',
                          photoUrl: '',
                          sortOrder: leadership.length + 1,
                          linkedin: '',
                          twitter: '',
                          email: '',
                          status: CMSContentStatus.PUBLISHED,
                        });
                        setLeaderModal({ open: true, item: null });
                      }}
                      className="btn-brand-primary flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Add Profile
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {leadership.map((lead) => (
                      <div key={lead._id || lead.id} className="p-5 rounded-xl border border-white/10 bg-[#050B14] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-mono text-[#16C4FF]">Order: {lead.sortOrder}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${lead.status === CMSContentStatus.PUBLISHED ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {lead.status}
                            </span>
                          </div>
                          <h4 className="mt-3 text-base font-bold text-white">{lead.name}</h4>
                          <p className="text-xs text-[#16C4FF] font-medium">{lead.designation}</p>
                          <p className="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed">{lead.biography}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                          <span className="truncate max-w-[150px] font-mono">{lead.socialLinks?.email || 'Public Profile'}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setLeaderForm({
                                  name: lead.name,
                                  designation: lead.designation,
                                  biography: lead.biography,
                                  photoUrl: lead.photoUrl || '',
                                  sortOrder: lead.sortOrder,
                                  linkedin: lead.socialLinks?.linkedin || '',
                                  twitter: lead.socialLinks?.twitter || '',
                                  email: lead.socialLinks?.email || '',
                                  status: lead.status,
                                });
                                setLeaderModal({ open: true, item: lead });
                              }}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLeadership((lead._id || lead.id)!)}
                              className="p-1 text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: TESTIMONIALS */}
              {activeTab === 'testimonials' && (
                <div className="bg-[#081324] border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Student & Alumni Testimonials</h3>
                    </div>
                    <button
                      onClick={() => {
                        setTestimonialForm({
                          name: '',
                          role: '',
                          quote: '',
                          rating: 5,
                          featured: true,
                          sortOrder: testimonials.length + 1,
                          status: CMSContentStatus.PUBLISHED,
                        });
                        setTestimonialModal({ open: true, item: null });
                      }}
                      className="btn-brand-primary flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Add Testimonial
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {testimonials.map((test) => (
                      <div key={test._id || test.id} className="p-5 rounded-xl border border-white/10 bg-[#050B14] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="text-amber-400">★ {test.rating}.0 / 5.0</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${test.status === CMSContentStatus.PUBLISHED ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {test.status}
                            </span>
                          </div>
                          <p className="mt-3 text-xs italic text-slate-300 leading-relaxed">&ldquo;{test.quote}&rdquo;</p>
                          <div className="mt-4">
                            <h4 className="text-xs font-bold text-white">{test.name}</h4>
                            <p className="text-[11px] text-slate-400">{test.role}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                          <span className="text-[10px] font-mono">{test.featured ? 'Featured' : 'Standard'}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setTestimonialForm({
                                  name: test.name,
                                  role: test.role,
                                  quote: test.quote,
                                  rating: test.rating,
                                  featured: test.featured,
                                  sortOrder: test.sortOrder,
                                  status: test.status,
                                });
                                setTestimonialModal({ open: true, item: test });
                              }}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTestimonial((test._id || test.id)!)}
                              className="p-1 text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: FAQ ACCORDION */}
              {activeTab === 'faq' && (
                <div className="bg-[#081324] border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Frequently Asked Questions</h3>
                    </div>
                    <button
                      onClick={() => {
                        setFaqForm({
                          question: '',
                          answer: '',
                          category: 'Admissions',
                          sortOrder: faqs.length + 1,
                          status: CMSContentStatus.PUBLISHED,
                        });
                        setFaqModal({ open: true, item: null });
                      }}
                      className="btn-brand-primary flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Add FAQ
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    {faqs.map((f) => (
                      <div key={f._id || f.id} className="p-4 rounded-xl border border-white/10 bg-[#050B14] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#073C84] text-[#16C4FF] text-[10px] font-mono uppercase font-semibold">
                              {f.category}
                            </span>
                            <span className="text-xs font-mono text-slate-400">Order: {f.sortOrder}</span>
                          </div>
                          <h4 className="mt-1.5 text-sm font-bold text-white">{f.question}</h4>
                          <p className="mt-1 text-xs text-slate-300 leading-relaxed">{f.answer}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setFaqForm({
                                question: f.question,
                                answer: f.answer,
                                category: f.category,
                                sortOrder: f.sortOrder,
                                status: f.status,
                              });
                              setFaqModal({ open: true, item: f });
                            }}
                            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFAQ((f._id || f.id)!)}
                            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATISTIC MODAL */}
          {statModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-[#081324] border border-white/10 rounded-2xl p-6 max-w-md w-full">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <h3 className="font-bold text-white text-base">
                    {statModal.item ? 'Edit Metric' : 'New Metric'}
                  </h3>
                  <button onClick={() => setStatModal({ open: false })}><X className="h-4 w-4 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSaveStatistic} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Label</label>
                    <input
                      type="text"
                      required
                      value={statForm.label}
                      onChange={(e) => setStatForm({ ...statForm, label: e.target.value })}
                      placeholder="e.g. Active Scholars"
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Display Value</label>
                    <input
                      type="text"
                      required
                      value={statForm.value}
                      onChange={(e) => setStatForm({ ...statForm, value: e.target.value })}
                      placeholder="e.g. 1,200+"
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDynamic"
                      checked={statForm.isDynamic}
                      onChange={(e) => setStatForm({ ...statForm, isDynamic: e.target.checked })}
                      className="rounded border-white/20 bg-[#050B14] text-[#0B7CEB]"
                    />
                    <label htmlFor="isDynamic" className="text-xs text-slate-300">Resolve dynamically from database</label>
                  </div>
                  {statForm.isDynamic && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Dynamic Source Collection</label>
                      <select
                        value={statForm.dynamicSource}
                        onChange={(e) => setStatForm({ ...statForm, dynamicSource: e.target.value as 'students' | 'courses' | 'certificates' | 'attendance' | 'none' })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      >
                        <option value="students">Active Students (Users collection)</option>
                        <option value="courses">Active Courses (Course collection)</option>
                        <option value="certificates">Issued Credentials (Certificate collection)</option>
                        <option value="none">None / Curated</option>
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Order</label>
                      <input
                        type="number"
                        value={statForm.sortOrder}
                        onChange={(e) => setStatForm({ ...statForm, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                      <select
                        value={statForm.status}
                        onChange={(e) => setStatForm({ ...statForm, status: e.target.value as CMSContentStatus })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      >
                        <option value={CMSContentStatus.PUBLISHED}>PUBLISHED</option>
                        <option value={CMSContentStatus.DRAFT}>DRAFT</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setStatModal({ open: false })} className="px-4 py-2 text-xs text-slate-300">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-brand-primary px-4 py-2 text-xs text-white rounded-xl">Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* LEADERSHIP MODAL */}
          {leaderModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-[#081324] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <h3 className="font-bold text-white text-base">
                    {leaderModal.item ? 'Edit Leadership Profile' : 'New Leadership Profile'}
                  </h3>
                  <button onClick={() => setLeaderModal({ open: false })}><X className="h-4 w-4 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSaveLeadership} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name & Title</label>
                    <input
                      type="text"
                      required
                      value={leaderForm.name}
                      onChange={(e) => setLeaderForm({ ...leaderForm, name: e.target.value })}
                      placeholder="e.g. Prof. Tariq Al-Mansoor, Ph.D."
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                    <input
                      type="text"
                      required
                      value={leaderForm.designation}
                      onChange={(e) => setLeaderForm({ ...leaderForm, designation: e.target.value })}
                      placeholder="e.g. Dean of Computing"
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Biography</label>
                    <textarea
                      rows={3}
                      required
                      value={leaderForm.biography}
                      onChange={(e) => setLeaderForm({ ...leaderForm, biography: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={leaderForm.email}
                        onChange={(e) => setLeaderForm({ ...leaderForm, email: e.target.value })}
                        placeholder="dean@eta.edu"
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">LinkedIn URL</label>
                      <input
                        type="text"
                        value={leaderForm.linkedin}
                        onChange={(e) => setLeaderForm({ ...leaderForm, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Sort Order</label>
                      <input
                        type="number"
                        value={leaderForm.sortOrder}
                        onChange={(e) => setLeaderForm({ ...leaderForm, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                      <select
                        value={leaderForm.status}
                        onChange={(e) => setLeaderForm({ ...leaderForm, status: e.target.value as CMSContentStatus })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      >
                        <option value={CMSContentStatus.PUBLISHED}>PUBLISHED</option>
                        <option value={CMSContentStatus.DRAFT}>DRAFT</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setLeaderModal({ open: false })} className="px-4 py-2 text-xs text-slate-300">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-brand-primary px-4 py-2 text-xs text-white rounded-xl">Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TESTIMONIAL MODAL */}
          {testimonialModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-[#081324] border border-white/10 rounded-2xl p-6 max-w-md w-full">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <h3 className="font-bold text-white text-base">
                    {testimonialModal.item ? 'Edit Testimonial' : 'New Testimonial'}
                  </h3>
                  <button onClick={() => setTestimonialModal({ open: false })}><X className="h-4 w-4 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSaveTestimonial} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Student / Alumni Name</label>
                    <input
                      type="text"
                      required
                      value={testimonialForm.name}
                      onChange={(e) => setTestimonialForm({ ...testimonialForm, name: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Role / Degree</label>
                    <input
                      type="text"
                      required
                      value={testimonialForm.role}
                      onChange={(e) => setTestimonialForm({ ...testimonialForm, role: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Endorsement Quote</label>
                    <textarea
                      rows={3}
                      required
                      value={testimonialForm.quote}
                      onChange={(e) => setTestimonialForm({ ...testimonialForm, quote: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Rating (1-5)</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={testimonialForm.rating}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, rating: parseInt(e.target.value) || 5 })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Featured</label>
                      <select
                        value={testimonialForm.featured ? 'true' : 'false'}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, featured: e.target.value === 'true' })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      >
                        <option value="true">Featured on Homepage</option>
                        <option value="false">Standard</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setTestimonialModal({ open: false })} className="px-4 py-2 text-xs text-slate-300">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-brand-primary px-4 py-2 text-xs text-white rounded-xl">Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* FAQ MODAL */}
          {faqModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-[#081324] border border-white/10 rounded-2xl p-6 max-w-md w-full">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <h3 className="font-bold text-white text-base">
                    {faqModal.item ? 'Edit FAQ' : 'New FAQ'}
                  </h3>
                  <button onClick={() => setFaqModal({ open: false })}><X className="h-4 w-4 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSaveFAQ} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <input
                      type="text"
                      required
                      value={faqForm.category}
                      onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                      placeholder="e.g. Admissions, Accreditation, Finance"
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Question</label>
                    <input
                      type="text"
                      required
                      value={faqForm.question}
                      onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Answer</label>
                    <textarea
                      rows={4}
                      required
                      value={faqForm.answer}
                      onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Sort Order</label>
                      <input
                        type="number"
                        value={faqForm.sortOrder}
                        onChange={(e) => setFaqForm({ ...faqForm, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                      <select
                        value={faqForm.status}
                        onChange={(e) => setFaqForm({ ...faqForm, status: e.target.value as CMSContentStatus })}
                        className="w-full rounded-xl border border-white/10 bg-[#050B14] px-3 py-2 text-xs text-white"
                      >
                        <option value={CMSContentStatus.PUBLISHED}>PUBLISHED</option>
                        <option value={CMSContentStatus.DRAFT}>DRAFT</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setFaqModal({ open: false })} className="px-4 py-2 text-xs text-slate-300">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-brand-primary px-4 py-2 text-xs text-white rounded-xl">Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
