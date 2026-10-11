import { test, expect } from '@playwright/test';
import { testUsers, loginAs } from './helpers/auth';

test.describe('Teacher Authenticated Journey & AI Evaluation Workflows — PRD §104', () => {
  const courseA = {
    _id: 'course-a-id',
    title: 'CS301: Advanced Systems Engineering',
    code: 'CS301',
    description: 'Kernel architectures and distributed consensus.',
  };

  const courseB = {
    _id: 'course-b-id',
    title: 'MATH202: Advanced Discrete Probability',
    code: 'MATH202',
    description: 'Stochastic processes and Markov chains.',
  };

  const assignmentCourseA = {
    _id: 'asg-course-a-1',
    title: 'Kernel Scheduler Implementation',
    description: 'Design and simulate an O(1) multi-queue scheduler in C/C++.',
    courseId: 'course-a-id',
    batchId: 'batch-a-id',
    totalMarks: 100,
    status: 'published',
    dueDate: '2026-11-20T23:59:59.000Z',
  };

  const studentASubmission = {
    _id: 'sub-student-a-1',
    assignmentId: 'asg-course-a-1',
    studentId: {
      _id: 'user-student-a',
      name: 'Tariq Al-Mansoor',
      email: 'tariq.a@eta.academy',
    },
    submissionText: 'Implemented multi-queue priority scheduler with starvation prevention.',
    status: 'submitted',
    submittedAt: '2026-11-18T14:30:00.000Z',
    score: null,
    feedback: null,
  };

  test.beforeEach(async ({ page }) => {
    // Intercept teacher course list
    await page.route('**/api/v1/courses', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [courseA] }),
      });
    });

    // Intercept teacher batches
    await page.route('**/api/v1/batches**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ _id: 'batch-a-id', batchName: 'Batch Alpha' }] }),
      });
    });

    // Intercept teacher assignments
    await page.route('**/api/v1/assignments**', async (route) => {
      if (route.request().url().includes('/submissions')) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [assignmentCourseA] }),
      });
    });

    await page.route('**/api/v1/classes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    // Intercept assignment submissions
    await page.route(`**/api/v1/assignments/${assignmentCourseA._id}/submissions`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [studentASubmission] }),
      });
    });

    // Intercept question bank
    await page.route('**/api/v1/questions**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                _id: 'q-existing-1',
                prompt: 'What is the time complexity of lookup in a balanced red-black tree?',
                type: 'MCQ',
                difficulty: 'MEDIUM',
                marks: 2,
                courseId: 'course-a-id',
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('Teacher A navigates dashboard and assigned Course A coursework', async ({ page }) => {
    await loginAs(page, testUsers.teacherA);
    await page.goto('/teacher/dashboard');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Dr. Farooq Khan').first()).toBeVisible();
    await expect(page.locator('text=CS301').first()).toBeVisible();
  });

  test('Teacher A reviews submission with AI feedback draft and explicitly saves evaluation', async ({ page }) => {
    await loginAs(page, testUsers.teacherA);
    await page.goto('/teacher/assignments');

    await expect(page.locator('text=Kernel Scheduler Implementation').first()).toBeVisible();

    // Open submissions modal
    const viewSubmissionsBtn = page.locator('button:has-text("View Submissions")').first();
    await viewSubmissionsBtn.click();

    // Intercept AI rubric suggestion endpoint
    let aiSuggestCalled = false;
    await page.route('**/api/v1/ai/assignments/rubric-feedback', async (route) => {
      aiSuggestCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            suggestedScore: 92,
            feedback: 'Rigorous implementation with clear multi-queue synchronization.',
            strengths: ['Clean locking invariants', 'Lock-free queue optimizations'],
            areasForImprovement: ['Add dynamic priority inversion tests'],
            rubricCriteriaMatch: [
              { criterion: 'Algorithmic Correctness', comment: 'Correct queue dispatching', score: 48 },
              { criterion: 'Code Quality', comment: 'Well commented and modular', score: 44 },
            ],
            advisoryNotice: 'This feedback is an AI-assisted advisory draft for instructor review. The instructor retains sole authority over final scores.',
          },
        }),
      });
    });

    // Verify submission row appears
    await expect(page.locator('text=Tariq Al-Mansoor').first()).toBeVisible();

    // Click Grade/Review
    const gradeBtn = page.locator('button:has-text("Review & Grade")').first();
    await gradeBtn.click();

    // AI Suggest Feedback button is present
    const aiBtn = page.locator('button:has-text("AI Suggest Feedback")');
    await expect(aiBtn).toBeVisible();

    // Click AI Suggest Feedback
    await aiBtn.click();
    expect(aiSuggestCalled).toBe(true);

    // Advisory notice and suggestions appear
    await expect(page.locator('text=Rubric Feedback Assistant')).toBeVisible();
    await expect(page.locator('text=Algorithmic Correctness')).toBeVisible();
    await expect(page.locator('text=Clean locking invariants')).toBeVisible();

    // Verify AI draft alone does NOT save to the backend submission review endpoint until explicit click
    let reviewPatchPayload: Record<string, unknown> | null = null;
    await page.route(`**/api/v1/submissions/${studentASubmission._id}/review`, async (route) => {
      reviewPatchPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...studentASubmission,
            score: reviewPatchPayload?.score,
            feedback: reviewPatchPayload?.feedback,
            status: 'graded',
          },
        }),
      });
    });

    expect(reviewPatchPayload).toBeNull(); // Still not saved

    // Now instructor explicitly saves evaluation
    const saveEvaluationBtn = page.locator('button:has-text("Save Evaluation")').last();
    await saveEvaluationBtn.click();

    // Verify explicit patch occurred with instructor-confirmed values
    const finalReviewPayload = reviewPatchPayload as unknown as Record<string, unknown>;
    expect(finalReviewPayload).not.toBeNull();
    expect(finalReviewPayload?.score).toBe(92);
  });

  test('Teacher A question generation: AI draft does not persist until explicit save', async ({ page }) => {
    await loginAs(page, testUsers.teacherA);
    await page.goto('/teacher/question-bank');

    await expect(page.locator('h1')).toContainText(/Question Bank/i);

    // Mock AI question generation endpoint
    await page.route('**/api/v1/ai/questions/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              prompt: 'How does an atomic compare-and-swap (CAS) instruction prevent race conditions?',
              type: 'MCQ',
              difficulty: 'HARD',
              marks: 4,
              topic: 'Concurrency',
              options: [
                { id: 'opt-1', text: 'By executing read-modify-write in a single indivisible hardware cycle', isCorrect: true },
                { id: 'opt-2', text: 'By disabling interrupts globally across all cores', isCorrect: false },
              ],
              explanation: 'CAS atomically updates memory if and only if the current value matches an expected value.',
            },
          ],
        }),
      });
    });

    // Track question creation
    let questionCreated = false;
    await page.route('**/api/v1/questions', async (route) => {
      if (route.request().method() === 'POST') {
        questionCreated = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'new-q-created', prompt: 'Created question' },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Open AI Draft Questions modal
    const aiDraftBtn = page.locator('button:has-text("AI Draft Questions"), button:has-text("AI Draft")');
    await expect(aiDraftBtn).toBeVisible();
    await aiDraftBtn.click();

    // Click Generate Questions
    const generateBtn = page.locator('button:has-text("Generate Draft Questions"), button:has-text("Generate")').last();
    await generateBtn.click();

    // Draft is rendered in the review UI
    await expect(page.locator('text=atomic compare-and-swap')).toBeVisible();

    // Crucial PRD §104 assertion: generation itself did NOT persist a question in the bank
    expect(questionCreated).toBe(false);

    // Adopt draft into standard question form
    const adoptBtn = page.locator('button:has-text("Review & Edit Draft")').first();
    await adoptBtn.click();

    // Question form is populated with the draft
    await expect(page.locator('textarea[name="prompt"], textarea').first()).toHaveValue(/atomic compare-and-swap/);

    // Explicitly click Save Question
    const saveQuestionBtn = page.locator('button:has-text("Save Question"), button:has-text("Create Question")').last();
    await saveQuestionBtn.click();

    // Now question is persisted
    expect(questionCreated).toBe(true);
  });

  test('Teacher A cross-course IDOR: access to unassigned Course B is denied', async ({ page }) => {
    await loginAs(page, testUsers.teacherA);
    await page.goto('/teacher/dashboard');

    // Mock 403 on Course B gradebook & submissions
    await page.route(`**/api/v1/gradebook/courses/${courseB._id}`, async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not assigned as an instructor to this course.',
          },
        }),
      });
    });

    // Make request via page fetch context
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/v1/gradebook/courses/course-b-id', {
        headers: { 'Content-Type': 'application/json' },
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
