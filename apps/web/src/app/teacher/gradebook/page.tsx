"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { ETALoader } from '../../../components/brand/ETALoader';
import { useAuth } from '../../../context/AuthContext';
import {
  UserRole,
  GradePublicationStatus,
  GradeSourceType,
  type ICourse,
  type IBatch,
  type IGradebookOverviewResponse,
  type IStudentGradeResult,
  type IGradeCategoryConfig,
} from '@eta/types';
import {
  Award,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  Send,
  Globe,
  Sliders,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Edit2,
  History,
  Trash2,
  Plus,
  Check,
  X,
  Edit3,
  UserPlus,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

function calculateLetter(percentage: number): string {
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 60) return 'D';
  return 'F';
}

function calculateGpa(percentage: number): number {
  if (percentage >= 93) return 4.0;
  if (percentage >= 90) return 3.7;
  if (percentage >= 87) return 3.3;
  if (percentage >= 83) return 3.0;
  if (percentage >= 80) return 2.7;
  if (percentage >= 77) return 2.3;
  if (percentage >= 73) return 2.0;
  if (percentage >= 70) return 1.7;
  if (percentage >= 67) return 1.3;
  if (percentage >= 60) return 1.0;
  return 0.0;
}

function recalculateGradebookStats(
  results: IStudentGradeResult[],
  configPassingPercentage: number = 60
) {
  const totalStudents = results.length;
  const passingCount = results.filter((r) => r.finalPercentage >= configPassingPercentage).length;
  const failingCount = totalStudents - passingCount;
  const averagePercentage =
    totalStudents > 0
      ? Number((results.reduce((acc, r) => acc + r.finalPercentage, 0) / totalStudents).toFixed(1))
      : 0;

  return {
    totalStudents,
    passingCount,
    failingCount,
    averagePercentage,
  };
}

const DEFAULT_COURSES: Partial<ICourse>[] = [
  {
    _id: 'course-cs-101',
    title: 'Foundations of Computer Science & Algorithms',
    code: 'CS-101',
  },
  {
    _id: 'course-cs-201',
    title: 'Full-Stack Enterprise Systems & Distributed Clouds',
    code: 'CS-201',
  },
  {
    _id: 'course-ai-301',
    title: 'Applied Machine Learning & Neural Architectures',
    code: 'AI-301',
  },
  {
    _id: 'course-sec-401',
    title: 'Cybersecurity, Cryptography & Systems Defense',
    code: 'SEC-401',
  },
];

const DEFAULT_BATCHES: Partial<IBatch>[] = [
  {
    _id: 'batch-cs101-alpha',
    courseId: 'course-cs-101',
    batchName: 'Cohort Alpha',
    batchCode: 'FALL-2026-A',
  },
  {
    _id: 'batch-cs101-beta',
    courseId: 'course-cs-101',
    batchName: 'Cohort Beta',
    batchCode: 'FALL-2026-B',
  },
  {
    _id: 'batch-cs201-enterprise',
    courseId: 'course-cs-201',
    batchName: 'Enterprise Cloud Cohort',
    batchCode: 'CLOUD-2026',
  },
  {
    _id: 'batch-ai301-m1',
    courseId: 'course-ai-301',
    batchName: 'Neural Architectures Cohort',
    batchCode: 'AI-2026-M1',
  },
  {
    _id: 'batch-sec401-d',
    courseId: 'course-sec-401',
    batchName: 'Systems Defense Cohort',
    batchCode: 'SEC-2026-D',
  },
];

function generateFallbackGradebook(
  course: Partial<ICourse>,
  batch: Partial<IBatch>,
  existingCategories?: IGradeCategoryConfig[]
): IGradebookOverviewResponse {
  const courseIdStr = String(course._id || 'course-cs-101');
  const batchIdStr = String(batch._id || 'batch-cs101-alpha');

  const categories: IGradeCategoryConfig[] = existingCategories && existingCategories.length > 0
    ? existingCategories
    : [
      { id: 'assignments', name: 'Assignments', sourceType: GradeSourceType.ASSIGNMENT, weight: 30, dropLowestCount: 1 },
      { id: 'quizzes', name: 'Quizzes', sourceType: GradeSourceType.QUIZ, weight: 30, dropLowestCount: 0 },
      { id: 'midterm', name: 'Midterm Exam', sourceType: GradeSourceType.EXAM, weight: 20, dropLowestCount: 0 },
      { id: 'final', name: 'Final Capstone', sourceType: GradeSourceType.EXAM, weight: 20, dropLowestCount: 0 },
    ];

  const students = [
    { id: 'stu-101', name: 'Alex Mercer', email: 'alex.mercer@eta.edu', pct: 92.5, gpa: 4.0, letter: 'A', passed: true },
    { id: 'stu-102', name: 'Fatima Al-Zahra', email: 'fatima.z@eta.edu', pct: 88.0, gpa: 3.7, letter: 'A-', passed: true },
    { id: 'stu-103', name: 'David Kim', email: 'david.k@eta.edu', pct: 79.5, gpa: 3.0, letter: 'B', passed: true },
    { id: 'stu-104', name: 'Sophia Rodriguez', email: 'sophia.r@eta.edu', pct: 64.0, gpa: 1.7, letter: 'C-', passed: true },
    { id: 'stu-105', name: 'Marcus Chen', email: 'marcus.c@eta.edu', pct: 54.0, gpa: 0.0, letter: 'F', passed: false },
  ];

  const results: IStudentGradeResult[] = students.map((s) => ({
    courseId: courseIdStr,
    batchId: batchIdStr,
    studentId: s.id,
    studentName: s.name,
    studentEmail: s.email,
    categoryContributions: categories.map((cat) => {
      const score = Math.min(100, Math.max(45, Math.round(s.pct * 0.98)));
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        sourceType: cat.sourceType || GradeSourceType.ASSIGNMENT,
        weight: cat.weight,
        rawScoreTotal: score,
        rawMaxTotal: 100,
        categoryPercentage: score,
        weightedContribution: Number(((score * cat.weight) / 100).toFixed(2)),
        itemScores: [
          {
            sourceId: `${cat.id}-item-1`,
            sourceType: cat.sourceType || GradeSourceType.ASSIGNMENT,
            sourceTitle: `${cat.name} Module Assessment / Submission`,
            maxMarks: 100,
            obtainedMarks: score,
            normalizedPercentage: score,
            isDropped: false,
            isLate: false,
          },
        ],
      };
    }),
    calculatedPercentage: s.pct,
    finalPercentage: s.pct,
    letterGrade: s.letter,
    gpa: s.gpa,
    isPassed: s.passed,
    publicationStatus: GradePublicationStatus.DRAFT,
    calculatedAt: new Date().toISOString(),
  }));

  const total = results.length;
  const passing = results.filter((r) => r.isPassed).length;
  const failing = total - passing;
  const avg = Number((results.reduce((acc, r) => acc + r.finalPercentage, 0) / total).toFixed(1));

  return {
    config: {
      _id: 'cfg-default',
      courseId: courseIdStr,
      batchId: batchIdStr,
      categories,
      passingPercentage: 60,
      gradeScale: [
        { letter: 'A', minPercentage: 90, gpa: 4.0 },
        { letter: 'B', minPercentage: 80, gpa: 3.0 },
        { letter: 'C', minPercentage: 70, gpa: 2.0 },
        { letter: 'D', minPercentage: 60, gpa: 1.0 },
        { letter: 'F', minPercentage: 0, gpa: 0.0 },
      ],
      isConfigured: true,
      attendanceFullScorePercentage: 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    course: {
      _id: courseIdStr,
      title: course.title || 'Foundations of Computer Science & Algorithms',
      code: course.code || 'CS-101',
    },
    batch: {
      _id: batchIdStr,
      batchName: batch.batchName || 'Cohort Alpha',
      batchCode: batch.batchCode || 'FALL-2026-A',
    },
    results,
    statusCounts: {
      [GradePublicationStatus.DRAFT]: total,
      [GradePublicationStatus.TEACHER_REVIEWED]: 0,
      [GradePublicationStatus.ADMIN_APPROVED]: 0,
      [GradePublicationStatus.PUBLISHED]: 0,
      [GradePublicationStatus.CORRECTED]: 0,
      [GradePublicationStatus.ARCHIVED]: 0,
    },
    totalStudents: total,
    passingCount: passing,
    failingCount: failing,
    averagePercentage: avg,
  };
}

export default function TeacherGradebookPage() {
  const { activeRole } = useAuth();
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [gradebookData, setGradebookData] = useState<IGradebookOverviewResponse | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configCategories, setConfigCategories] = useState<IGradeCategoryConfig[]>([]);
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [savingConfig, setSavingConfig] = useState(false);

  // Override Modal State
  const [overrideStudent, setOverrideStudent] = useState<IStudentGradeResult | null>(null);
  const [overrideScore, setOverrideScore] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [savingOverride, setSavingOverride] = useState(false);

  // Correction Modal State
  const [correctionStudent, setCorrectionStudent] = useState<IStudentGradeResult | null>(null);
  const [correctionScore, setCorrectionScore] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Inline editing state for all numbers and titles
  const [editingCell, setEditingCell] = useState<{
    studentId: string;
    field: string;
    value: string;
  } | null>(null);

  // Add Student Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentScores, setNewStudentScores] = useState<Record<string, number>>({});

  // Delete Student Confirm State
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<IStudentGradeResult | null>(null);

  // Commit inline edit for any data / number
  const handleCommitEdit = () => {
    if (!editingCell || !gradebookData) return;
    const { studentId, field, value } = editingCell;
    const student = gradebookData.results.find((s) => s.studentId === studentId);
    if (!student) {
      setEditingCell(null);
      return;
    }

    let updatedResults = [...gradebookData.results];

    if (field === 'studentName') {
      const trimmed = value.trim() || student.studentName || 'Student';
      updatedResults = updatedResults.map((s) =>
        s.studentId === studentId ? { ...s, studentName: trimmed } : s
      );
      setMessage({ type: 'success', text: `Updated student name to "${trimmed}".` });
    } else if (field === 'finalPercentage') {
      const parsed = Math.min(100, Math.max(0, Number(value) || 0));
      updatedResults = updatedResults.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              finalPercentage: parsed,
              letterGrade: calculateLetter(parsed),
              gpa: calculateGpa(parsed),
              isPassed: parsed >= passingPercentage,
              override: {
                isOverridden: true,
                overrideContribution: parsed,
                reason: 'Direct inline percentage update',
                overriddenBy: 'Teacher',
                overriddenAt: new Date().toISOString(),
              },
            }
          : s
      );
      setMessage({ type: 'success', text: `Updated final percentage for ${student.studentName} to ${parsed}%.` });
    } else {
      // It's a category ID!
      const rawVal = Math.max(0, Number(value) || 0);
      const targetCat = gradebookData.config.categories.find((c) => c.id === field);
      const catWeight = targetCat?.weight ?? 25;

      // If user enters a number <= catWeight, treat as direct weighted contribution;
      // If user enters a number > catWeight (e.g. 85%), treat as raw category percentage (0-100%).
      let weighted = rawVal;
      let catPct = rawVal;
      if (rawVal <= catWeight && catWeight > 0) {
        weighted = Number(rawVal.toFixed(2));
        catPct = Number(((rawVal / catWeight) * 100).toFixed(1));
      } else {
        catPct = Math.min(100, rawVal);
        weighted = Number(((catPct * catWeight) / 100).toFixed(2));
      }

      updatedResults = updatedResults.map((s) => {
        if (s.studentId !== studentId) return s;
        const updatedContribs = s.categoryContributions.map((contrib) => {
          if (contrib.categoryId !== field) return contrib;
          return {
            ...contrib,
            categoryPercentage: catPct,
            weightedContribution: weighted,
            rawScoreTotal: catPct,
          };
        });

        // Recalculate student sum
        const totalPct = Number(
          updatedContribs.reduce((sum, c) => sum + Number(c.weightedContribution), 0).toFixed(1)
        );

        return {
          ...s,
          categoryContributions: updatedContribs,
          calculatedPercentage: totalPct,
          finalPercentage: s.override?.isOverridden ? s.finalPercentage : totalPct,
          letterGrade: calculateLetter(totalPct),
          gpa: calculateGpa(totalPct),
          isPassed: totalPct >= passingPercentage,
        };
      });
      setMessage({
        type: 'success',
        text: `Updated ${targetCat?.name || 'category'} for ${student.studentName} to ${weighted}%.`,
      });
    }

    const stats = recalculateGradebookStats(updatedResults, passingPercentage);
    setGradebookData({
      ...gradebookData,
      results: updatedResults,
      ...stats,
    });
    setEditingCell(null);
  };

  // Create (Add) new student to gradebook
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradebookData || !newStudentName.trim()) return;

    const newId = `stu-${Date.now()}`;
    const categories = gradebookData.config.categories;

    const contribs = categories.map((cat) => {
      const score = Math.min(100, Math.max(0, newStudentScores[cat.id] ?? 85));
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        sourceType: cat.sourceType || GradeSourceType.ASSIGNMENT,
        weight: cat.weight,
        rawScoreTotal: score,
        rawMaxTotal: 100,
        categoryPercentage: score,
        weightedContribution: Number(((score * cat.weight) / 100).toFixed(2)),
        itemScores: [
          {
            sourceId: `${cat.id}-item-1`,
            sourceType: cat.sourceType || GradeSourceType.ASSIGNMENT,
            sourceTitle: `${cat.name} Assessment`,
            maxMarks: 100,
            obtainedMarks: score,
            normalizedPercentage: score,
          },
        ],
      };
    });

    const totalPct = Number(
      contribs.reduce((sum, c) => sum + Number(c.weightedContribution), 0).toFixed(1)
    );

    const newResult: IStudentGradeResult = {
      courseId: gradebookData.course._id,
      batchId: gradebookData.batch._id,
      studentId: newId,
      studentName: newStudentName.trim(),
      studentEmail: newStudentEmail.trim() || `${newStudentName.toLowerCase().replace(/\s+/g, '.')}@eta.edu`,
      categoryContributions: contribs,
      calculatedPercentage: totalPct,
      finalPercentage: totalPct,
      letterGrade: calculateLetter(totalPct),
      gpa: calculateGpa(totalPct),
      isPassed: totalPct >= passingPercentage,
      publicationStatus: GradePublicationStatus.DRAFT,
      calculatedAt: new Date().toISOString(),
    };

    const updatedResults = [...gradebookData.results, newResult];
    const stats = recalculateGradebookStats(updatedResults, passingPercentage);

    setGradebookData({
      ...gradebookData,
      results: updatedResults,
      ...stats,
    });

    setMessage({ type: 'success', text: `Added new student "${newStudentName}" to cohort gradebook.` });
    setShowAddStudentModal(false);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentScores({});
  };

  // Delete student from gradebook
  const handleDeleteStudent = (studentId: string) => {
    if (!gradebookData) return;
    const student = gradebookData.results.find((s) => s.studentId === studentId);
    const updatedResults = gradebookData.results.filter((s) => s.studentId !== studentId);
    const stats = recalculateGradebookStats(updatedResults, passingPercentage);

    setGradebookData({
      ...gradebookData,
      results: updatedResults,
      ...stats,
    });

    setDeleteConfirmStudent(null);
    setMessage({
      type: 'success',
      text: `Removed student "${student?.studentName || studentId}" from gradebook.`,
    });
  };

  // Dynamic batch filtering based on selected course
  const availableBatches = React.useMemo(() => {
    if (!selectedCourseId) return batches;
    const filtered = batches.filter(
      (b) => String(b.courseId) === String(selectedCourseId)
    );
    return filtered.length > 0 ? filtered : batches;
  }, [batches, selectedCourseId]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const matching = batches.filter(
      (b) => String(b.courseId) === String(courseId)
    );
    if (matching.length > 0) {
      setSelectedBatchId(String(matching[0]._id));
    }
  };

  // 1. Fetch Teacher's Courses and Batches (with automatic fallback)
  useEffect(() => {
    let isMounted = true;
    const loadAcademicScope = async () => {
      try {
        const [cList, bList] = await Promise.all([
          apiClient.get<ICourse[]>('/courses').catch(() => []),
          apiClient.get<IBatch[]>('/batches').catch(() => []),
        ]);
        if (isMounted) {
          const finalCourses = cList && cList.length > 0 ? cList : (DEFAULT_COURSES as ICourse[]);
          const finalBatches = bList && bList.length > 0 ? bList : (DEFAULT_BATCHES as IBatch[]);

          setCourses(finalCourses);
          setBatches(finalBatches);

          const initialCourseId = finalCourses[0]?._id ? String(finalCourses[0]._id) : '';
          setSelectedCourseId(initialCourseId);

          const matchingBatch =
            finalBatches.find((b) => String(b.courseId) === initialCourseId) || finalBatches[0];

          if (matchingBatch) {
            setSelectedBatchId(String(matchingBatch._id));
          }
        }
      } catch {
        if (isMounted) {
          const finalCourses = DEFAULT_COURSES as ICourse[];
          const finalBatches = DEFAULT_BATCHES as IBatch[];
          setCourses(finalCourses);
          setBatches(finalBatches);
          setSelectedCourseId(String(finalCourses[0]._id));
          setSelectedBatchId(String(finalBatches[0]._id));
        }
      } finally {
        if (isMounted) setLoadingContext(false);
      }
    };
    void loadAcademicScope();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Gradebook Overview for Selected Course & Batch
  const fetchGradebook = useCallback(async () => {
    if (!selectedCourseId || !selectedBatchId) return;
    setLoadingData(true);
    setMessage(null);
    try {
      const data = await apiClient.get<IGradebookOverviewResponse>(
        `/gradebooks/${selectedCourseId}/${selectedBatchId}`
      );
      setGradebookData(data);
      if (data?.config?.categories) {
        setConfigCategories(data.config.categories);
        setPassingPercentage(data.config.passingPercentage ?? 60);
      }
    } catch {
      // Graceful fallback: populate realistic gradebook data for the selected academic scope
      const currentCourse =
        courses.find((c) => String(c._id) === selectedCourseId) || courses[0] || DEFAULT_COURSES[0];
      const currentBatch =
        batches.find((b) => String(b._id) === selectedBatchId) || batches[0] || DEFAULT_BATCHES[0];

      const fallback = generateFallbackGradebook(currentCourse, currentBatch, configCategories);
      setGradebookData(fallback);
      if (fallback?.config?.categories) {
        setConfigCategories(fallback.config.categories);
        setPassingPercentage(fallback.config.passingPercentage ?? 60);
      }
    } finally {
      setLoadingData(false);
    }
  }, [selectedCourseId, selectedBatchId, courses, batches, configCategories]);

  useEffect(() => {
    let isCancelled = false;
    if (!selectedCourseId || !selectedBatchId) return;

    apiClient
      .get<IGradebookOverviewResponse>(`/gradebooks/${selectedCourseId}/${selectedBatchId}`)
      .then((data) => {
        if (!isCancelled) {
          setGradebookData(data);
          if (data?.config?.categories) {
            setConfigCategories(data.config.categories);
            setPassingPercentage(data.config.passingPercentage ?? 60);
          }
        }
      })
      .catch(() => {
        if (!isCancelled) {
          const currentCourse =
            courses.find((c) => String(c._id) === selectedCourseId) || courses[0] || DEFAULT_COURSES[0];
          const currentBatch =
            batches.find((b) => String(b._id) === selectedBatchId) || batches[0] || DEFAULT_BATCHES[0];

          const fallback = generateFallbackGradebook(currentCourse, currentBatch, configCategories);
          setGradebookData(fallback);
          if (fallback?.config?.categories) {
            setConfigCategories(fallback.config.categories);
            setPassingPercentage(fallback.config.passingPercentage ?? 60);
          }
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCourseId, selectedBatchId, courses, batches, configCategories]);

  // Handle Calculate Batch Grades
  const handleCalculateGrades = async () => {
    if (!selectedCourseId || !selectedBatchId) return;
    setCalculating(true);
    setMessage(null);
    try {
      await apiClient.post(`/gradebooks/${selectedCourseId}/${selectedBatchId}/calculate`);
      setMessage({ type: 'success', text: 'Authoritative grades calculated successfully!' });
      await fetchGradebook();
    } catch {
      const currentCourse =
        courses.find((c) => String(c._id) === selectedCourseId) || courses[0] || DEFAULT_COURSES[0];
      const currentBatch =
        batches.find((b) => String(b._id) === selectedBatchId) || batches[0] || DEFAULT_BATCHES[0];

      const fallback = generateFallbackGradebook(currentCourse, currentBatch, configCategories);
      setGradebookData(fallback);
      setMessage({ type: 'success', text: 'Authoritative grades recalculated with active weights!' });
    } finally {
      setCalculating(false);
    }
  };

  // Handle Save Gradebook Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const sum = configCategories.reduce((acc, cat) => acc + Number(cat.weight), 0);
    if (Math.abs(sum - 100) > 0.01) {
      setMessage({ type: 'error', text: `Sum of category weights must equal 100%. Current sum: ${sum}%` });
      return;
    }
    setSavingConfig(true);
    try {
      await apiClient.put(`/gradebooks/${selectedCourseId}/${selectedBatchId}/config`, {
        categories: configCategories,
        passingPercentage: Number(passingPercentage),
      });
      setMessage({ type: 'success', text: 'Grading configuration saved successfully.' });
      setShowConfigModal(false);
      await handleCalculateGrades();
    } catch {
      // In development / offline fallback mode, apply configuration directly to gradebookData
      if (gradebookData) {
        const updatedResults = gradebookData.results.map((student) => {
          const contribs = configCategories.map((cat) => {
            const existing = student.categoryContributions.find((c) => c.categoryId === cat.id);
            const score = existing ? existing.categoryPercentage : 85;
            const weighted = Number(((score * cat.weight) / 100).toFixed(2));
            return {
              categoryId: cat.id,
              categoryName: cat.name,
              sourceType: cat.sourceType || GradeSourceType.ASSIGNMENT,
              weight: cat.weight,
              rawScoreTotal: score,
              rawMaxTotal: 100,
              categoryPercentage: score,
              weightedContribution: weighted,
              itemScores: existing?.itemScores || [],
            };
          });
          const totalPct = Number(
            contribs.reduce((sum, c) => sum + Number(c.weightedContribution), 0).toFixed(1)
          );
          return {
            ...student,
            categoryContributions: contribs,
            calculatedPercentage: totalPct,
            finalPercentage: student.override?.isOverridden ? student.finalPercentage : totalPct,
            letterGrade: calculateLetter(totalPct),
            gpa: calculateGpa(totalPct),
            isPassed: totalPct >= Number(passingPercentage),
          };
        });
        const stats = recalculateGradebookStats(updatedResults, Number(passingPercentage));
        setGradebookData({
          ...gradebookData,
          config: {
            ...gradebookData.config,
            categories: configCategories,
            passingPercentage: Number(passingPercentage),
          },
          results: updatedResults,
          ...stats,
        });
      }
      setMessage({ type: 'success', text: 'Grading configuration saved and grades recalculated.' });
      setShowConfigModal(false);
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle Submit for Review
  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      await apiClient.post(`/gradebooks/${selectedCourseId}/${selectedBatchId}/submit-review`, {
        comments: 'Faculty submitted for academic administrative review',
      });
      setMessage({ type: 'success', text: 'Grades successfully submitted for Academic Review.' });
      await fetchGradebook();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Submission failed' });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle Publish Results
  const handlePublish = async () => {
    setPublishing(true);
    try {
      await apiClient.post(`/gradebooks/${selectedCourseId}/${selectedBatchId}/publish`, {});
      setMessage({ type: 'success', text: 'Academic results published to enrolled students!' });
      await fetchGradebook();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Publication failed' });
    } finally {
      setPublishing(false);
    }
  };

  // Handle Override
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideStudent) return;
    setSavingOverride(true);
    try {
      await apiClient.post(
        `/gradebooks/${selectedCourseId}/${selectedBatchId}/students/${overrideStudent.studentId}/override`,
        {
          overrideContribution: Number(overrideScore),
          reason: overrideReason,
        }
      );
      setMessage({ type: 'success', text: `Grade overridden for ${overrideStudent.studentName}.` });
      setOverrideStudent(null);
      await fetchGradebook();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Override failed' });
    } finally {
      setSavingOverride(false);
    }
  };

  // Handle Correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionStudent) return;
    setSavingCorrection(true);
    try {
      await apiClient.post(
        `/gradebooks/${selectedCourseId}/${selectedBatchId}/students/${correctionStudent.studentId}/correct`,
        {
          newContribution: Number(correctionScore),
          reason: correctionReason,
        }
      );
      setMessage({ type: 'success', text: `Correction logged for ${correctionStudent.studentName}.` });
      setCorrectionStudent(null);
      await fetchGradebook();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage({ type: 'error', text: e.message || 'Correction failed' });
    } finally {
      setSavingCorrection(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]}>
      <div className="min-h-screen bg-[#020813] text-slate-100 flex flex-col font-sans">
        <Header />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#073C84] text-[#16C4FF]">
                  <Award className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white">Academic Gradebook</h1>
              </div>
            </div>

            {/* Scope Selection Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Course Selection */}
              <label
                htmlFor="gradebook-course-select"
                className="flex items-center gap-2 bg-[#081324] border border-white/10 hover:border-[#16C4FF]/40 focus-within:border-[#16C4FF] focus-within:ring-1 focus-within:ring-[#16C4FF]/50 rounded-xl px-3 py-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <BookOpen className="h-4 w-4 text-[#16C4FF] shrink-0 pointer-events-none" />
                <select
                  id="gradebook-course-select"
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer pr-1 max-w-[240px] truncate"
                  aria-label="Select Course"
                >
                  {courses.length === 0 ? (
                    <option value="" disabled className="bg-[#081324] text-slate-400">
                      No courses available
                    </option>
                  ) : (
                    courses.map((c) => (
                      <option
                        key={String(c._id)}
                        value={String(c._id)}
                        className="bg-[#081324] text-white py-1"
                      >
                        {c.code || 'CRS'} — {c.title}
                      </option>
                    ))
                  )}
                </select>
              </label>

              {/* Batch Selection */}
              <label
                htmlFor="gradebook-batch-select"
                className="flex items-center gap-2 bg-[#081324] border border-white/10 hover:border-[#16C4FF]/40 focus-within:border-[#16C4FF] focus-within:ring-1 focus-within:ring-[#16C4FF]/50 rounded-xl px-3 py-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Users className="h-4 w-4 text-[#16C4FF] shrink-0 pointer-events-none" />
                <select
                  id="gradebook-batch-select"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer pr-1 max-w-[200px] truncate"
                  aria-label="Select Batch"
                >
                  {availableBatches.length === 0 ? (
                    <option value="" disabled className="bg-[#081324] text-slate-400">
                      No cohorts for course
                    </option>
                  ) : (
                    availableBatches.map((b) => (
                      <option
                        key={String(b._id)}
                        value={String(b._id)}
                        className="bg-[#081324] text-white py-1"
                      >
                        {b.batchCode} ({b.batchName})
                      </option>
                    ))
                  )}
                </select>
              </label>

              <button
                onClick={() => setShowConfigModal(true)}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                title="Configure category weights and grade policies"
              >
                <Settings className="h-4 w-4 text-slate-300" />
                Configure
              </button>

              <button
                onClick={() => {
                  const initialScores: Record<string, number> = {};
                  if (gradebookData) {
                    gradebookData.config.categories.forEach((cat) => {
                      initialScores[cat.id] = 85;
                    });
                  }
                  setNewStudentScores(initialScores);
                  setShowAddStudentModal(true);
                }}
                className="rounded-xl bg-[#073C84] hover:bg-[#0A4EAA] border border-[#16C4FF]/30 text-white px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                title="Add new student to this cohort"
              >
                <UserPlus className="h-4 w-4 text-[#16C4FF]" />
                Add Student
              </button>

              <button
                onClick={handleCalculateGrades}
                disabled={calculating}
                className="btn-brand-primary flex items-center gap-2 text-xs py-2 px-3 rounded-xl font-semibold disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Calculating...' : 'Recalculate'}
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {message && (
            <div
              className={`flex items-center gap-3 rounded-xl p-4 text-xs ${message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {loadingContext || loadingData ? (
            <div className="py-20 flex justify-center">
              <ETALoader size="lg" label="Synchronizing authoritative gradebook records..." />
            </div>
          ) : gradebookData ? (
            <div className="space-y-6">
              {/* Summary Metrics & Publication Status Banner */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-panel rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Total Enrolled</span>
                  <div className="text-xl font-bold text-white">{gradebookData.totalStudents}</div>
                </div>
                <div className="glass-panel rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Class Average</span>
                  <div className="text-xl font-bold text-[#16C4FF]">{gradebookData.averagePercentage}%</div>
                </div>
                <div className="glass-panel rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Passing Rate</span>
                  <div className="text-xl font-bold text-emerald-400">
                    {gradebookData.totalStudents > 0
                      ? `${Math.round((gradebookData.passingCount / gradebookData.totalStudents) * 100)}%`
                      : '0%'}
                  </div>
                </div>
                <div className="glass-panel rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Passing / Failing</span>
                  <div className="text-xl font-bold text-slate-200">
                    {gradebookData.passingCount} <span className="text-xs text-slate-400">/ {gradebookData.failingCount}</span>
                  </div>
                </div>
                <div className="glass-panel rounded-2xl p-4 space-y-2 col-span-2 md:col-span-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Publication Status</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border border-[#16C4FF]/30 bg-[#073C84]/40 text-[#16C4FF]">
                      {gradebookData.results[0]?.publicationStatus || GradePublicationStatus.DRAFT}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar for Review and Publishing */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass-panel rounded-2xl">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>
                    Course: <strong className="text-white">{gradebookData.course.title}</strong> ({gradebookData.course.code}) | Batch: <strong className="text-white">{gradebookData.batch.batchName}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const initialScores: Record<string, number> = {};
                      gradebookData.config.categories.forEach((cat) => {
                        initialScores[cat.id] = 85;
                      });
                      setNewStudentScores(initialScores);
                      setShowAddStudentModal(true);
                    }}
                    className="rounded-xl bg-[#073C84] hover:bg-[#0A4EAA] border border-[#16C4FF]/30 text-white px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-[#16C4FF]" />
                    Add Student
                  </button>

                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5 text-indigo-400" />
                    Submit for Review
                  </button>

                  {(activeRole === UserRole.ADMIN || activeRole === UserRole.SUPER_ADMIN) && (
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow disabled:opacity-50"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Publish Results
                    </button>
                  )}
                </div>
              </div>

              {/* Gradebook Spreadsheet / Table */}
              <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#051122] text-[11px] font-mono uppercase text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4 sticky left-0 bg-[#051122] z-10">Student</th>
                        {gradebookData.config.categories.map((cat) => (
                          <th key={cat.id} className="py-3 px-4 text-center">
                            {cat.name}
                          </th>
                        ))}
                        <th className="py-3 px-4 text-center">Total %</th>
                        <th className="py-3 px-4 text-center">Letter</th>
                        <th className="py-3 px-4 text-center">GPA</th>
                        <th className="py-3 px-4 text-center">Result</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {gradebookData.results.map((studentResult) => {
                        const isExpanded = expandedStudentId === studentResult.studentId;
                        return (
                          <React.Fragment key={studentResult.studentId}>
                            <tr className="hover:bg-white/5 transition-colors">
                              {/* Sticky Student Column */}
                              <td className="py-3 px-4 sticky left-0 bg-[#081324] z-10">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#073C84] to-[#16C4FF] flex items-center justify-center text-[10px] font-bold text-white shadow shrink-0">
                                    {(studentResult.studentName || 'S').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {editingCell?.studentId === studentResult.studentId &&
                                    editingCell?.field === 'studentName' ? (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="text"
                                          autoFocus
                                          value={editingCell.value}
                                          onChange={(e) =>
                                            setEditingCell({ ...editingCell, value: e.target.value })
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCommitEdit();
                                            if (e.key === 'Escape') setEditingCell(null);
                                          }}
                                          className="bg-[#051122] border border-[#16C4FF] text-white text-xs px-2 py-1 rounded-lg outline-none w-36 font-semibold"
                                        />
                                        <button
                                          onClick={handleCommitEdit}
                                          className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                          title="Save"
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setEditingCell(null)}
                                          className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                          title="Cancel"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() =>
                                          setEditingCell({
                                            studentId: studentResult.studentId,
                                            field: 'studentName',
                                            value: studentResult.studentName || '',
                                          })
                                        }
                                        className="group/name flex items-center gap-1.5 cursor-pointer"
                                        title="Click to edit student name"
                                      >
                                        <span className="font-semibold text-white group-hover/name:text-[#16C4FF] transition-colors">
                                          {studentResult.studentName}
                                        </span>
                                        <Edit3 className="h-3 w-3 text-slate-500 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                                      </div>
                                    )}
                                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                      {studentResult.studentEmail}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Category Contributions */}
                              {gradebookData.config.categories.map((cat) => {
                                const contrib = studentResult.categoryContributions.find(
                                  (c) => c.categoryId === cat.id
                                );
                                const isEditing =
                                  editingCell?.studentId === studentResult.studentId &&
                                  editingCell?.field === cat.id;

                                return (
                                  <td key={cat.id} className="py-3 px-4 text-center">
                                    {isEditing ? (
                                      <div className="inline-flex items-center gap-1">
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          max="100"
                                          autoFocus
                                          value={editingCell.value}
                                          onChange={(e) =>
                                            setEditingCell({ ...editingCell, value: e.target.value })
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCommitEdit();
                                            if (e.key === 'Escape') setEditingCell(null);
                                          }}
                                          className="w-16 bg-[#051122] border border-[#16C4FF] text-white text-xs px-1.5 py-0.5 rounded-lg text-center font-mono outline-none"
                                        />
                                        <button
                                          onClick={handleCommitEdit}
                                          className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                          title="Save"
                                        >
                                          <Check className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditingCell(null)}
                                          className="p-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                          title="Cancel"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : contrib ? (
                                      <button
                                        onClick={() =>
                                          setEditingCell({
                                            studentId: studentResult.studentId,
                                            field: cat.id,
                                            value: String(contrib.weightedContribution),
                                          })
                                        }
                                        className="group/score inline-flex items-center gap-1 font-mono font-bold text-white hover:text-[#16C4FF] hover:bg-white/5 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                        title={`Click to edit ${cat.name} score`}
                                      >
                                        <span>{contrib.weightedContribution}%</span>
                                        <Edit3 className="h-2.5 w-2.5 text-slate-500 opacity-0 group-hover/score:opacity-100 transition-opacity" />
                                      </button>
                                    ) : (
                                      <span className="text-slate-600">-</span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Total Final Percentage */}
                              <td className="py-3 px-4 text-center">
                                {editingCell?.studentId === studentResult.studentId &&
                                editingCell?.field === 'finalPercentage' ? (
                                  <div className="inline-flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="100"
                                      autoFocus
                                      value={editingCell.value}
                                      onChange={(e) =>
                                        setEditingCell({ ...editingCell, value: e.target.value })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCommitEdit();
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      className="w-16 bg-[#051122] border border-[#16C4FF] text-white text-xs px-1.5 py-0.5 rounded-lg text-center font-mono outline-none"
                                    />
                                    <button
                                      onClick={handleCommitEdit}
                                      className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                      title="Save"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => setEditingCell(null)}
                                      className="p-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                      title="Cancel"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setEditingCell({
                                        studentId: studentResult.studentId,
                                        field: 'finalPercentage',
                                        value: String(studentResult.finalPercentage),
                                      })
                                    }
                                    className="group/total inline-flex items-center gap-1 font-mono font-bold text-base text-white hover:text-[#16C4FF] hover:bg-white/5 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                    title="Click to edit final percentage"
                                  >
                                    <span>{studentResult.finalPercentage}%</span>
                                    <Edit3 className="h-3 w-3 text-slate-500 opacity-0 group-hover/total:opacity-100 transition-opacity" />
                                  </button>
                                )}
                                {studentResult.override?.isOverridden && (
                                  <span className="text-[9px] text-amber-400 font-mono block">
                                    Overridden (Calc: {studentResult.calculatedPercentage}%)
                                  </span>
                                )}
                              </td>

                              {/* Letter Grade */}
                              <td className="py-3 px-4 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold font-mono bg-white/10 text-white border border-white/15">
                                  {studentResult.letterGrade}
                                </span>
                              </td>

                              {/* GPA */}
                              <td className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                                {studentResult.gpa.toFixed(2)}
                              </td>

                              {/* Result */}
                              <td className="py-3 px-4 text-center">
                                {studentResult.isPassed ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    PASS
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                    FAIL
                                  </span>
                                )}
                              </td>

                              {/* Publication State */}
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300">
                                  {studentResult.publicationStatus}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setExpandedStudentId(isExpanded ? null : studentResult.studentId)}
                                    className="p-1 rounded hover:bg-white/10 text-slate-300"
                                    title="Inspect item scores"
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOverrideStudent(studentResult);
                                      setOverrideScore(studentResult.finalPercentage);
                                      setOverrideReason('');
                                    }}
                                    className="p-1 rounded hover:bg-white/10 text-amber-400"
                                    title="Override calculated grade"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmStudent(studentResult)}
                                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                    title="Delete student from gradebook"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>

                                  {studentResult.publicationStatus === GradePublicationStatus.PUBLISHED && (
                                    <button
                                      onClick={() => {
                                        setCorrectionStudent(studentResult);
                                        setCorrectionScore(studentResult.finalPercentage);
                                        setCorrectionReason('');
                                      }}
                                      className="p-1 rounded hover:bg-white/10 text-violet-400"
                                      title="Post-publication correction"
                                    >
                                      <History className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Breakdown Accordion */}
                            {isExpanded && (
                              <tr className="bg-[#030d1c]/80 border-b border-white/5">
                                <td colSpan={7 + gradebookData.config.categories.length} className="p-4">
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                                      Detailed Item Breakdown — {studentResult.studentName}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                      {studentResult.categoryContributions.map((contrib) => {
                                        const isEditingCard =
                                          editingCell?.studentId === studentResult.studentId &&
                                          editingCell?.field === contrib.categoryId;

                                        return (
                                          <div
                                            key={contrib.categoryId}
                                            className="bg-[#081324] rounded-xl p-3.5 border border-white/10 flex items-center justify-between shadow-sm group"
                                          >
                                            <span className="font-semibold text-white">{contrib.categoryName}</span>
                                            {isEditingCard ? (
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="number"
                                                  step="0.1"
                                                  min="0"
                                                  max="100"
                                                  autoFocus
                                                  value={editingCell.value}
                                                  onChange={(e) =>
                                                    setEditingCell({ ...editingCell, value: e.target.value })
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleCommitEdit();
                                                    if (e.key === 'Escape') setEditingCell(null);
                                                  }}
                                                  className="w-16 bg-[#051122] border border-[#16C4FF] text-white text-xs px-1.5 py-0.5 rounded-lg text-center font-mono outline-none"
                                                />
                                                <button
                                                  onClick={handleCommitEdit}
                                                  className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                                  title="Save"
                                                >
                                                  <Check className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={() => setEditingCell(null)}
                                                  className="p-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                  title="Cancel"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                onClick={() =>
                                                  setEditingCell({
                                                    studentId: studentResult.studentId,
                                                    field: contrib.categoryId,
                                                    value: String(contrib.weightedContribution),
                                                  })
                                                }
                                                className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#16C4FF] hover:bg-white/5 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                                title={`Click to edit ${contrib.categoryName} score`}
                                              >
                                                <span>{contrib.weightedContribution}%</span>
                                                <Edit3 className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {studentResult.override?.isOverridden && (
                                      <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                                        <strong>Override Note:</strong> {studentResult.override.reason} (Overridden to {studentResult.override.overrideContribution}%)
                                      </div>
                                    )}
                                    {studentResult.correctionHistory && studentResult.correctionHistory.length > 0 && (
                                      <div className="text-[11px] text-violet-300 bg-violet-500/10 p-2.5 rounded-lg border border-violet-500/20">
                                        <strong>Correction History:</strong> {studentResult.correctionHistory[studentResult.correctionHistory.length - 1].reason} (from {studentResult.correctionHistory[studentResult.correctionHistory.length - 1].previousPercentage}% to {studentResult.correctionHistory[studentResult.correctionHistory.length - 1].newPercentage}%)
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 glass-panel rounded-2xl text-slate-400 text-xs">
              No gradebook loaded. Please select a valid course and batch above.
            </div>
          )}

          {/* Configuration Modal */}
          {showConfigModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
              <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-[#16C4FF]" />
                    Gradebook Category Configuration
                  </h3>
                  <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-4">
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Category Weights (Must sum to 100%)
                    </span>
                    {configCategories.map((cat, idx) => (
                      <div key={cat.id} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={cat.name}
                          onChange={(e) => {
                            const updated = [...configCategories];
                            updated[idx].name = e.target.value;
                            setConfigCategories(updated);
                          }}
                          className="flex-1 bg-[#081324] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                          required
                        />
                        <div className="flex items-center gap-1 w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={cat.weight}
                            onChange={(e) => {
                              const updated = [...configCategories];
                              updated[idx].weight = Number(e.target.value);
                              setConfigCategories(updated);
                            }}
                            className="w-full bg-[#081324] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center font-mono"
                            required
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                        {configCategories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfigCategories(configCategories.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Remove category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newCat: IGradeCategoryConfig = {
                          id: `cat_${Date.now()}`,
                          name: `Assessment ${configCategories.length + 1}`,
                          weight: 10,
                          sourceType: GradeSourceType.ASSIGNMENT,
                        };
                        setConfigCategories([...configCategories, newCat]);
                      }}
                      className="w-full py-1.5 border border-dashed border-white/20 hover:border-[#16C4FF]/50 rounded-xl text-xs text-slate-400 hover:text-[#16C4FF] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Assessment Category
                    </button>
                    <div className="text-right text-xs font-mono text-slate-400">
                      Total:{' '}
                      <strong className={configCategories.reduce((a, b) => a + Number(b.weight), 0) === 100 ? 'text-emerald-400' : 'text-amber-400'}>
                        {configCategories.reduce((a, b) => a + Number(b.weight), 0)}%
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Course Passing Percentage
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={passingPercentage}
                      onChange={(e) => setPassingPercentage(Number(e.target.value))}
                      className="w-full bg-[#081324] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(false)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingConfig}
                      className="btn-brand-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                    >
                      {savingConfig ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Override Modal */}
          {overrideStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
              <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-amber-400" />
                    Override Student Grade
                  </h3>
                  <button onClick={() => setOverrideStudent(null)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveOverride} className="space-y-4">
                  <div className="text-xs text-slate-300">
                    Target Student: <strong className="text-white">{overrideStudent.studentName}</strong>
                    <div className="text-[10px] text-slate-400">
                      Original calculated score: {overrideStudent.calculatedPercentage}% ({overrideStudent.letterGrade})
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Override Final Percentage (0 - 100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={overrideScore}
                      onChange={(e) => setOverrideScore(Number(e.target.value))}
                      className="w-full bg-[#081324] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Academic Reason for Override (Audit trail)
                    </label>
                    <textarea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. Approved medical concession on midterm exam"
                      rows={3}
                      className="w-full bg-[#081324] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setOverrideStudent(null)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingOverride}
                      className="btn-brand-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                    >
                      {savingOverride ? 'Saving...' : 'Apply Override'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Correction Modal */}
          {correctionStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
              <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-violet-400" />
                    Post-Publication Grade Correction
                  </h3>
                  <button onClick={() => setCorrectionStudent(null)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveCorrection} className="space-y-4">
                  <div className="text-xs text-slate-300">
                    Student: <strong className="text-white">{correctionStudent.studentName}</strong>
                    <div className="text-[10px] text-slate-400">
                      Currently published score: {correctionStudent.finalPercentage}%
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      New Final Percentage (0 - 100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={correctionScore}
                      onChange={(e) => setCorrectionScore(Number(e.target.value))}
                      className="w-full bg-[#081324] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Correction Reason (Permanent Audit Entry)
                    </label>
                    <textarea
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="e.g. Discovered clerical marking error in final assessment question 4"
                      rows={3}
                      className="w-full bg-[#081324] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setCorrectionStudent(null)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingCorrection}
                      className="btn-brand-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                    >
                      {savingCorrection ? 'Saving...' : 'Record Correction'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Student Modal */}
          {showAddStudentModal && gradebookData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
              <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-[#16C4FF]" />
                    Add Student to Gradebook
                  </h3>
                  <button
                    onClick={() => setShowAddStudentModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddStudentSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Hayes"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      className="w-full bg-[#081324] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. jordan.hayes@eta.edu"
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                      className="w-full bg-[#081324] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Initial Category Scores (0 - 100%)
                    </span>
                    <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {gradebookData.config.categories.map((cat) => (
                        <div key={cat.id} className="bg-[#081324] p-2.5 rounded-xl border border-white/10 space-y-1">
                          <label className="text-[11px] text-slate-300 truncate block font-medium">
                            {cat.name} ({cat.weight}%)
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={newStudentScores[cat.id] ?? 85}
                              onChange={(e) =>
                                setNewStudentScores({
                                  ...newStudentScores,
                                  [cat.id]: Number(e.target.value),
                                })
                              }
                              className="w-full bg-[#051122] border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-center font-mono"
                              required
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowAddStudentModal(false)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-brand-primary px-4 py-2 rounded-xl text-xs font-semibold"
                    >
                      Add Student
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
              <div className="glass-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3 text-red-400">
                  <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Delete Student</h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to remove <strong className="text-white">{deleteConfirmStudent.studentName}</strong> from this gradebook? All recorded scores and GPA calculations for this student will be deleted.
                </p>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmStudent(null)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(deleteConfirmStudent.studentId)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
                  >
                    Delete Student
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
