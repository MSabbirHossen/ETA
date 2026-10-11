"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { apiClient } from '../../../lib/api-client';
import {
  AdmissionDocumentType,
  type IProgram,
  type ICourse,
  type IBatch,
  type IApplicationDocument,
} from '@eta/types';
import {
  GraduationCap,
  User,
  BookOpen,
  Users,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Send,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';

export default function AdmissionApplyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Academic Structure
  const [programs, setPrograms] = useState<IProgram[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);

  // Form State
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [programId, setProgramId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [batchId, setBatchId] = useState('');

  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    nationalId: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });

  const [education, setEducation] = useState({
    highestLevel: 'HIGH_SCHOOL',
    institution: '',
    graduationYear: 2024,
    gradeOrGpa: '',
    major: '',
  });

  const [guardianInfo, setGuardianInfo] = useState({
    name: '',
    relationship: 'PARENT',
    phone: '',
    email: '',
    occupation: '',
  });

  const [documents, setDocuments] = useState<IApplicationDocument[]>([
    {
      title: 'National ID or Passport Copy',
      type: AdmissionDocumentType.ID_PROOF,
      url: 'https://docs.eta.edu/samples/id_proof.pdf',
    },
  ]);

  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<AdmissionDocumentType>(AdmissionDocumentType.CERTIFICATE);
  const [newDocUrl, setNewDocUrl] = useState('');

  // Fetch Academic Target Options
  useEffect(() => {
    let isMounted = true;
    const fetchAcademicData = async () => {
      try {
        const [progRes, courseRes, batchRes] = await Promise.all([
          apiClient.get<IProgram[]>('/programs').catch(() => []),
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IBatch[]>('/batches').catch(() => []),
        ]);

        if (isMounted) {
          setPrograms(progRes || []);
          setCourses(courseRes || []);
          setBatches(batchRes || []);

          if (progRes && progRes.length > 0) setProgramId(progRes[0]._id);
          if (courseRes && courseRes.length > 0) setCourseId(courseRes[0]._id);
          if (batchRes && batchRes.length > 0) setBatchId(batchRes[0]._id);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { message?: string };
          setErrorMessage(e.message || 'Failed to load admission targets');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAcademicData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter courses for selected program
  const filteredCourses = courses.filter(
    (c) =>
      !c.programId ||
      c.programId === programId ||
      (typeof c.programId === 'object' &&
        c.programId !== null &&
        (c.programId as unknown as { _id: string })._id === programId)
  );

  // Filter batches for selected course
  const filteredBatches = batches.filter(
    (b) =>
      b.courseId === courseId ||
      (typeof b.courseId === 'object' &&
        b.courseId !== null &&
        (b.courseId as unknown as { _id: string })._id === courseId)
  );

  const handleAddDocument = () => {
    if (!newDocTitle.trim() || !newDocUrl.trim()) return;
    setDocuments([
      ...documents,
      {
        title: newDocTitle.trim(),
        type: newDocType,
        url: newDocUrl.trim(),
      },
    ]);
    setNewDocTitle('');
    setNewDocUrl('');
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        programId,
        courseId,
        batchId,
        personalInfo,
        education,
        guardianInfo,
        documents,
      };

      if (!applicationId) {
        const created = await apiClient.post<{ _id?: string }>('/admissions/draft', payload);
        if (created?._id) setApplicationId(created._id);
      } else {
        await apiClient.patch(`/admissions/${applicationId}/draft`, payload);
      }

      setSuccessMessage('Application draft saved successfully. You can return anytime.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || 'Failed to save application draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFinal = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      let targetAppId = applicationId;
      const payload = {
        programId,
        courseId,
        batchId,
        personalInfo,
        education,
        guardianInfo,
        documents,
      };

      if (!targetAppId) {
        const created = await apiClient.post<{ _id?: string }>('/admissions/draft', payload);
        if (created?._id) {
          targetAppId = created._id;
          setApplicationId(created._id);
        }
      } else {
        await apiClient.patch(`/admissions/${targetAppId}/draft`, payload);
      }

      await apiClient.post(`/admissions/${targetAppId}/submit`, payload);
      setSuccessMessage('Application submitted successfully! Redirecting to applications dashboard...');
      setTimeout(() => {
        router.push('/admissions/my-applications');
      }, 1500);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || 'Failed to submit application. Please verify all required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Academic Target', icon: GraduationCap },
    { id: 2, title: 'Personal Details', icon: User },
    { id: 3, title: 'Prior Education', icon: BookOpen },
    { id: 4, title: 'Guardian Info', icon: Users },
    { id: 5, title: 'Documents', icon: FileText },
    { id: 6, title: 'Review & Submit', icon: CheckCircle2 },
  ];

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-[#020813] text-slate-100">
        <Header />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  Admissions Application
                </h1>
                <p className="text-sm text-slate-400">
                  Exploratory Training Academy institutional admission pipeline
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting || !programId || !courseId || !batchId}
                className="flex items-center gap-2 rounded-lg border border-[#16C4FF]/30 bg-[#073C84]/40 px-3.5 py-2 text-xs font-semibold text-[#16C4FF] transition hover:bg-[#073C84]/70 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
            </div>

            {/* Notification Messages */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-6 gap-2 rounded-xl border border-slate-800 bg-[#071328]/60 p-3">
              {steps.map((s) => {
                const Icon = s.icon;
                const isActive = currentStep === s.id;
                const isPassed = currentStep > s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStep(s.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg p-2 text-center transition ${
                      isActive
                        ? 'border border-[#16C4FF]/40 bg-[#073C84]/40 text-[#16C4FF]'
                        : isPassed
                        ? 'text-emerald-400 hover:bg-slate-800/40'
                        : 'text-slate-500 hover:bg-slate-800/20'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden text-[11px] font-medium sm:inline">{s.title}</span>
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <ETALoader size="md" label="Loading application parameters..." />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-[#061021]/80 p-6 shadow-xl backdrop-blur-md">
                {/* STEP 1: Academic Target */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-white">Select Academic Target</h2>
                    <p className="text-xs text-slate-400">
                      Choose the academic program, target course, and cohort batch you are applying for.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Academic Program *
                        </label>
                        <select
                          value={programId}
                          onChange={(e) => {
                            setProgramId(e.target.value);
                            setCourseId('');
                            setBatchId('');
                          }}
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2.5 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        >
                          <option value="">Select a Program</option>
                          {programs.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} ({p.category || 'General'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Target Course *
                        </label>
                        <select
                          value={courseId}
                          onChange={(e) => {
                            setCourseId(e.target.value);
                            setBatchId('');
                          }}
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2.5 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        >
                          <option value="">Select a Course</option>
                          {filteredCourses.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.title} ({c.code}) - Level: {c.level}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Intake / Cohort Batch *
                        </label>
                        <select
                          value={batchId}
                          onChange={(e) => setBatchId(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2.5 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        >
                          <option value="">Select a Batch</option>
                          {filteredBatches.map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.batchName} ({b.batchCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Personal Details */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-white">Personal & Contact Details</h2>
                    <p className="text-xs text-slate-400">
                      Provide verified applicant identity and communication information.
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Full Legal Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={personalInfo.fullName}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                          placeholder="e.g. Alexandra Chen"
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={personalInfo.email}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                          placeholder="alexandra@example.com"
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={personalInfo.phone}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                          placeholder="+1 (555) 019-2834"
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={personalInfo.dateOfBirth}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          National ID / Passport Number
                        </label>
                        <input
                          type="text"
                          value={personalInfo.nationalId}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, nationalId: e.target.value })}
                          placeholder="A12345678"
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Prior Education */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-white">Prior Educational Background</h2>
                    <p className="text-xs text-slate-400">
                      Record your highest attained educational level and previous credentials.
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Highest Qualification Level *
                        </label>
                        <select
                          value={education.highestLevel}
                          onChange={(e) => setEducation({ ...education, highestLevel: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2.5 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        >
                          <option value="HIGH_SCHOOL">High School Diploma / Secondary</option>
                          <option value="DIPLOMA">Vocational / Technical Diploma</option>
                          <option value="BACHELOR">Bachelor&apos;s Degree</option>
                          <option value="MASTER">Master&apos;s Degree</option>
                          <option value="OTHER">Other Professional Credential</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Institution Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={education.institution}
                          onChange={(e) => setEducation({ ...education, institution: e.target.value })}
                          placeholder="e.g. Apex International Institute"
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Graduation Year
                        </label>
                        <input
                          type="number"
                          value={education.graduationYear}
                          onChange={(e) => setEducation({ ...education, graduationYear: Number(e.target.value) })}
                          min={1960}
                          max={2030}
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Grade / GPA / Percentage
                        </label>
                        <input
                          type="text"
                          value={education.gradeOrGpa}
                          onChange={(e) => setEducation({ ...education, gradeOrGpa: e.target.value })}
                          placeholder="3.8 / 4.0 or First Class"
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Guardian Info */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-white">Guardian / Emergency Contact</h2>
                    <p className="text-xs text-slate-400">
                      Primary guardian or emergency sponsor information (PRD §43).
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Guardian Name *
                        </label>
                        <input
                          type="text"
                          value={guardianInfo.name}
                          onChange={(e) => setGuardianInfo({ ...guardianInfo, name: e.target.value })}
                          placeholder="e.g. Robert Chen"
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Relationship Type *
                        </label>
                        <select
                          value={guardianInfo.relationship}
                          onChange={(e) => setGuardianInfo({ ...guardianInfo, relationship: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2.5 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        >
                          <option value="FATHER">Father</option>
                          <option value="MOTHER">Mother</option>
                          <option value="SIBLING">Sibling</option>
                          <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                          <option value="PARENT">Parent</option>
                          <option value="OTHER">Other Sponsor</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Guardian Contact Phone *
                        </label>
                        <input
                          type="tel"
                          value={guardianInfo.phone}
                          onChange={(e) => setGuardianInfo({ ...guardianInfo, phone: e.target.value })}
                          placeholder="+1 (555) 019-3344"
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">
                          Guardian Account Email (for automated link provision)
                        </label>
                        <input
                          type="email"
                          value={guardianInfo.email}
                          onChange={(e) => setGuardianInfo({ ...guardianInfo, email: e.target.value })}
                          placeholder="guardian@example.com"
                          className="w-full rounded-lg border border-slate-700 bg-[#040C1A] px-3.5 py-2 text-sm text-slate-100 focus:border-[#16C4FF] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Required Documents */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-white">Application Documents</h2>
                    <p className="text-xs text-slate-400">
                      Submit document references (identification, academic certificates, transcripts).
                    </p>

                    {/* Current Documents List */}
                    <div className="space-y-2">
                      {documents.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#040C1A] p-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-white">{doc.title}</p>
                            <p className="font-mono text-xs text-[#16C4FF]">
                              [{doc.type}] - {doc.url}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(idx)}
                            className="rounded p-1 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Beta Data-Safety Policy Notice — PRD §103, §104 */}
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                      <p className="font-semibold text-amber-100 mb-1">Notice: Document uploads are not available during beta.</p>
                      <p className="text-amber-200/80">
                        To protect applicant personal data (Government IDs, transcripts), direct document uploads are suspended during the Controlled Beta. You may submit your application without file attachments; physical or verified credentials will be validated during formal onboarding.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 6: Review & Final Submission */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-white">Review & Submit Application</h2>
                    <p className="text-xs text-slate-400">
                      Carefully review your application before formal institutional submission. Once submitted, applicant editing is locked for evaluation.
                    </p>

                    <div className="space-y-4 rounded-lg border border-slate-800 bg-[#040C1A] p-4 text-xs">
                      <div>
                        <span className="font-semibold text-slate-400">Target Cohort:</span>
                        <p className="text-sm font-bold text-white">
                          {courses.find((c) => c._id === courseId)?.title || 'N/A'} (
                          {batches.find((b) => b._id === batchId)?.batchName || 'N/A'})
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-semibold text-slate-400">Applicant:</span>
                          <p className="text-slate-200">{personalInfo.fullName || 'Not provided'}</p>
                          <p className="text-slate-400">{personalInfo.email}</p>
                          <p className="text-slate-400">{personalInfo.phone}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-400">Prior Education:</span>
                          <p className="text-slate-200">{education.highestLevel}</p>
                          <p className="text-slate-400">{education.institution}</p>
                          <p className="text-slate-400">Year: {education.graduationYear}</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400">Guardian Contact:</span>
                        <p className="text-slate-200">
                          {guardianInfo.name || 'None'} ({guardianInfo.relationship}) - {guardianInfo.phone}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400">Attached Documents:</span>
                        <p className="text-slate-200">{documents.length} document(s) registered</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Navigation Controls */}
                <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
                  <button
                    type="button"
                    disabled={currentStep === 1 || submitting}
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#040C1A] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <div className="flex gap-2">
                    {currentStep < 6 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(currentStep + 1)}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#073C84] to-[#129BFF] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-[#073C84]/30 hover:opacity-90"
                      >
                        Next Step
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmitFinal}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:opacity-90 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        {submitting ? 'Submitting...' : 'Submit Application'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
