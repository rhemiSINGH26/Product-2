import { create } from "zustand";
import { persist } from "zustand/middleware";
import { HARDCODED_ACCOUNTS } from "./accounts";
import type {
  User, Role, Course, Section, ContentItem, ContentType,
  Assessment, Certificate, NotificationItem, Message,
} from "./mock-data";

// ---------- Extended types ----------
export type QuestionType = "mcq" | "truefalse" | "short";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctIndex: number;
  points: number;
  imageUrl?: string;
}

export interface StoreAssessment extends Assessment {
  questions: Question[];
}

export interface SubmissionResponse {
  questionId: string;
  response: string;
  awarded: number | null;
}

export interface Submission {
  id: string;
  assessmentId: string;
  studentId: string;
  submittedAt: string;
  responses: SubmissionResponse[];
  status: "submitted" | "graded";
  feedback?: string;
}

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

// Seed users = only the 3 hardcoded login accounts (stripped of password)
const seedUsers: User[] = (HARDCODED_ACCOUNTS ?? []).map(({ password: _p, ...u }) => u);

// Seed one demo course so the student can immediately open something
const seedCourses: Course[] = [
  {
    id: "course-welcome",
    name: "Welcome to iTech Academy",
    code: "ITECH-101",
    description: "A short orientation course covering how to navigate the academy, watch lessons and take quizzes.",
    teacherId: "teacher-root",
    studentIds: ["student-root"],
    thumbnail: "📘",
    startDate: "2025-01-01",
    endDate: "2099-12-31",
    accessMode: "lifetime",
    status: "active",
    sections: [
      {
        id: "sec-welcome-1",
        title: "Getting Started",
        items: [
          {
            id: "itm-welcome-intro",
            type: "reading",
            title: "Welcome — read this first",
            body: "Welcome to iTech Academy!\n\nUse the sidebar to navigate. Click any item on the right to open it here. Mark items complete as you finish them — your progress is tracked automatically.",
          },
          {
            id: "itm-welcome-video",
            type: "video",
            title: "Platform tour (3 min)",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            duration: 3,
          },
        ],
      },
    ],
  },
];

interface DataState {
  users: User[];
  courses: Course[];
  assessments: StoreAssessment[];
  submissions: Submission[];
  certificates: Certificate[];
  notifications: NotificationItem[];
  messages: Message[];
  // progress: completed item ids per student/course; key = `${studentId}:${courseId}`
  progress: Record<string, string[]>;

  // users
  addUser: (u: Omit<User, "id">) => void;
  addUserRaw: (u: User) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // courses
  addCourse: (c: Omit<Course, "id" | "sections" | "studentIds"> & { studentIds?: string[] }) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;

  addSection: (courseId: string, title: string) => void;
  updateSection: (courseId: string, sectionId: string, title: string) => void;
  deleteSection: (courseId: string, sectionId: string) => void;
  addItem: (courseId: string, sectionId: string, item: Omit<ContentItem, "id">) => void;
  updateItem: (courseId: string, sectionId: string, itemId: string, patch: Partial<ContentItem>) => void;
  deleteItem: (courseId: string, sectionId: string, itemId: string) => void;

  // assessments
  addAssessment: (a: Omit<StoreAssessment, "id" | "questions" | "questionCount">) => string;
  updateAssessment: (id: string, patch: Partial<StoreAssessment>) => void;
  deleteAssessment: (id: string) => void;
  addQuestion: (assessmentId: string, q: Omit<Question, "id">) => void;
  updateQuestion: (assessmentId: string, questionId: string, patch: Partial<Question>) => void;
  deleteQuestion: (assessmentId: string, questionId: string) => void;

  // submissions
  submitQuiz: (assessmentId: string, studentId: string, answers: Record<string, string>) => string;
  gradeSubmission: (submissionId: string, awards: Record<string, number>, feedback?: string) => void;

  // certificates
  requestCertificate: (studentId: string, courseId: string, score: number, note?: string) => void;
  approveCertificate: (id: string) => void;
  rejectCertificate: (id: string, reason?: string) => void;

  // progress
  markItemComplete: (studentId: string, courseId: string, itemId: string) => void;
  unmarkItemComplete: (studentId: string, courseId: string, itemId: string) => void;

  // notifications
  notify: (userId: string, title: string, message: string, link?: string) => void;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: (userId: string) => void;

  // messages
  sendMessage: (fromId: string, toId: string, subject: string, body: string) => void;
  markMessageRead: (id: string) => void;

  resetData: () => void;
}

const initial = {
  users: seedUsers,
  courses: seedCourses,
  assessments: [] as StoreAssessment[],
  submissions: [] as Submission[],
  certificates: [] as Certificate[],
  notifications: [] as NotificationItem[],
  messages: [] as Message[],
  progress: {} as Record<string, string[]>,
};

function ensureSeedCourses(courses: unknown): Course[] {
  const list = Array.isArray(courses) ? (courses as Course[]) : [];
  return seedCourses.reduce<Course[]>((acc, seed) => {
    const existing = acc.find((c) => c.id === seed.id);
    if (!existing) return [seed, ...acc];
    return acc.map((c) => {
      if (c.id !== seed.id) return c;
      return {
        ...seed,
        ...c,
        studentIds: Array.from(new Set([...(seed.studentIds ?? []), ...((c.studentIds ?? []) as string[])])),
        sections: Array.isArray(c.sections) && c.sections.length > 0 ? c.sections : seed.sections,
        accessMode: c.accessMode ?? seed.accessMode,
        status: c.status ?? seed.status,
      };
    });
  }, list);
}

const syncQuestionCount = (a: StoreAssessment): StoreAssessment => ({ ...a, questionCount: a.questions.length });

// Auto-issue a certificate request if the student passed and doesn't already have one
function maybeRequestCert(get: () => DataState, studentId: string, courseId: string, score: number) {
  const existing = get().certificates.find(
    (c) => c.studentId === studentId && c.courseId === courseId && c.status !== "rejected",
  );
  if (existing) return;
  get().requestCertificate(studentId, courseId, score, "Auto-generated from passing quiz score.");
}

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...initial,

      addUser: (u) => set((s) => ({ users: [{ ...u, id: uid("u") }, ...s.users] })),
      addUserRaw: (u) => set((s) => ({ users: [u, ...s.users.filter((x) => x.id !== u.id)] })),
      updateUser: (id, patch) =>
        set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteUser: (id) =>
        set((s) => ({
          users: s.users.filter((x) => x.id !== id),
          courses: s.courses.map((c) => ({
            ...c,
            studentIds: c.studentIds.filter((sid) => sid !== id),
            teacherId: c.teacherId === id ? "" : c.teacherId,
          })),
        })),

      addCourse: (c) =>
        set((s) => ({
          courses: [{ ...c, id: uid("c"), sections: [], studentIds: c.studentIds ?? [] }, ...s.courses],
        })),
      updateCourse: (id, patch) =>
        set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCourse: (id) =>
        set((s) => ({
          courses: s.courses.filter((c) => c.id !== id),
          assessments: s.assessments.filter((a) => a.courseId !== id),
          certificates: s.certificates.filter((cert) => cert.courseId !== id),
        })),

      addSection: (courseId, title) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId ? { ...c, sections: [...c.sections, { id: uid("sec"), title, items: [] }] } : c,
          ),
        })),
      updateSection: (courseId, sectionId, title) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? { ...c, sections: c.sections.map((sec) => (sec.id === sectionId ? { ...sec, title } : sec)) }
              : c,
          ),
        })),
      deleteSection: (courseId, sectionId) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId ? { ...c, sections: c.sections.filter((sec) => sec.id !== sectionId) } : c,
          ),
        })),
      addItem: (courseId, sectionId, item) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  sections: c.sections.map((sec) =>
                    sec.id === sectionId ? { ...sec, items: [...sec.items, { ...item, id: uid("itm") }] } : sec,
                  ),
                }
              : c,
          ),
        })),
      updateItem: (courseId, sectionId, itemId, patch) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  sections: c.sections.map((sec) =>
                    sec.id === sectionId
                      ? { ...sec, items: sec.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
                      : sec,
                  ),
                }
              : c,
          ),
        })),
      deleteItem: (courseId, sectionId, itemId) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  sections: c.sections.map((sec) =>
                    sec.id === sectionId ? { ...sec, items: sec.items.filter((it) => it.id !== itemId) } : sec,
                  ),
                }
              : c,
          ),
        })),

      addAssessment: (a) => {
        const id = uid("a");
        set((s) => ({ assessments: [{ ...a, id, questions: [], questionCount: 0 }, ...s.assessments] }));
        return id;
      },
      updateAssessment: (id, patch) =>
        set((s) => ({ assessments: s.assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAssessment: (id) =>
        set((s) => ({
          assessments: s.assessments.filter((a) => a.id !== id),
          submissions: s.submissions.filter((sub) => sub.assessmentId !== id),
        })),
      addQuestion: (assessmentId, q) =>
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === assessmentId ? syncQuestionCount({ ...a, questions: [...a.questions, { ...q, id: uid("q") }] }) : a,
          ),
        })),
      updateQuestion: (assessmentId, questionId, patch) =>
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === assessmentId
              ? { ...a, questions: a.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)) }
              : a,
          ),
        })),
      deleteQuestion: (assessmentId, questionId) =>
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === assessmentId
              ? syncQuestionCount({ ...a, questions: a.questions.filter((q) => q.id !== questionId) })
              : a,
          ),
        })),

      submitQuiz: (assessmentId, studentId, answers) => {
        const a = get().assessments.find((x) => x.id === assessmentId);
        if (!a) return "";
        const responses: SubmissionResponse[] = a.questions.map((q) => {
          const response = answers[q.id] ?? "";
          if (q.type === "mcq" || q.type === "truefalse") {
            const correct = String(q.correctIndex) === response;
            return { questionId: q.id, response, awarded: correct ? q.points : 0 };
          }
          // short answer: needs teacher grading
          return { questionId: q.id, response, awarded: null };
        });
        const needsGrading = responses.some((r) => r.awarded === null);
        const id = uid("sub");
        const sub: Submission = {
          id,
          assessmentId,
          studentId,
          submittedAt: new Date().toISOString().slice(0, 10),
          responses,
          status: needsGrading ? "submitted" : "graded",
        };
        set((s) => ({ submissions: [sub, ...s.submissions] }));

        // notify teacher of the course
        const course = get().courses.find((c) => c.id === a.courseId);
        if (course?.teacherId) {
          get().notify(course.teacherId, "New quiz submission", `A student submitted "${a.title}".`);
        }
        // notify the student of their auto-graded score
        if (!needsGrading) {
          const earned = responses.reduce((sum, r) => sum + (r.awarded ?? 0), 0);
          const max = a.questions.reduce((sum, q) => sum + q.points, 0);
          const pct = max ? Math.round((earned / max) * 100) : 0;
          get().notify(studentId, "Quiz auto-graded", `${a.title}: ${pct}% (${earned}/${max}).`);
          // Final exam: auto-request a certificate for admin verification
          if (pct >= a.passingScore && a.isFinal) maybeRequestCert(get, studentId, a.courseId, pct);
        }
        return id;
      },

      gradeSubmission: (submissionId, awards, feedback) =>
        set((s) => {
          const updated = s.submissions.map((sub) =>
            sub.id === submissionId
              ? {
                  ...sub,
                  status: "graded" as const,
                  feedback,
                  responses: sub.responses.map((r) =>
                    r.questionId in awards ? { ...r, awarded: awards[r.questionId] } : r,
                  ),
                }
              : sub,
          );
          const sub = updated.find((x) => x.id === submissionId);
          if (sub) {
            const a = s.assessments.find((x) => x.id === sub.assessmentId);
            const earned = sub.responses.reduce((acc, r) =>
              acc + (r.questionId in awards ? awards[r.questionId] : (r.awarded ?? 0)), 0);
            const max = a ? a.questions.reduce((sum, q) => sum + q.points, 0) : 0;
            const pct = max ? Math.round((earned / max) * 100) : 0;
            const note: NotificationItem = {
              id: uid("n"),
              userId: sub.studentId,
              title: "Quiz graded",
              message: `Your submission scored ${pct}% (${earned}/${max}).`,
              createdAt: new Date().toISOString(),
              read: false,
            };
            // auto-request certificate after grading if passed
            if (a && a.isFinal && pct >= a.passingScore) {
              setTimeout(() => maybeRequestCert(get, sub.studentId, a.courseId, pct), 0);
            }
            return { submissions: updated, notifications: [note, ...s.notifications] };
          }
          return { submissions: updated };
        }),

      requestCertificate: (studentId, courseId, score, note) => {
        const id = uid("cert");
        const cert: Certificate = {
          id, studentId, courseId, score,
          status: "pending",
          requestedAt: new Date().toISOString().slice(0, 10),
          teacherNote: note,
        };
        set((s) => ({ certificates: [cert, ...s.certificates] }));
        // notify admins
        get().users.filter((u) => u.role === "admin").forEach((a) =>
          get().notify(a.id, "Certificate request", "A teacher has requested a certificate for review."),
        );
      },
      approveCertificate: (id) =>
        set((s) => {
          const updated = s.certificates.map((c) =>
            c.id === id ? { ...c, status: "approved" as const, issuedAt: new Date().toISOString().slice(0, 10) } : c,
          );
          const cert = updated.find((c) => c.id === id);
          const notes = cert
            ? [
                {
                  id: uid("n"),
                  userId: cert.studentId,
                  title: "Certificate approved",
                  message: "Your certificate has been approved — download it now.",
                  createdAt: new Date().toISOString(),
                  read: false,
                  link: "/student/certificates",
                } as NotificationItem,
                ...s.notifications,
              ]
            : s.notifications;
          return { certificates: updated, notifications: notes };
        }),
      rejectCertificate: (id, reason) =>
        set((s) => {
          const updated = s.certificates.map((c) =>
            c.id === id ? { ...c, status: "rejected" as const, rejectionReason: reason } : c,
          );
          const cert = updated.find((c) => c.id === id);
          const notes = cert
            ? [
                {
                  id: uid("n"),
                  userId: cert.studentId,
                  title: "Certificate request declined",
                  message: reason || "Your certificate request was declined.",
                  createdAt: new Date().toISOString(),
                  read: false,
                } as NotificationItem,
                ...s.notifications,
              ]
            : s.notifications;
          return { certificates: updated, notifications: notes };
        }),

      markItemComplete: (studentId, courseId, itemId) =>
        set((s) => {
          const key = `${studentId}:${courseId}`;
          const existing = s.progress[key] ?? [];
          if (existing.includes(itemId)) return s;
          return { progress: { ...s.progress, [key]: [...existing, itemId] } };
        }),
      unmarkItemComplete: (studentId, courseId, itemId) =>
        set((s) => {
          const key = `${studentId}:${courseId}`;
          const existing = s.progress[key] ?? [];
          return { progress: { ...s.progress, [key]: existing.filter((x) => x !== itemId) } };
        }),

      notify: (userId, title, message, link) =>
        set((s) => ({
          notifications: [
            { id: uid("n"), userId, title, message, link, createdAt: new Date().toISOString(), read: false },
            ...s.notifications,
          ],
        })),
      markNotifRead: (id) =>
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllNotifsRead: (userId) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
        })),

      sendMessage: (fromId, toId, subject, body) => {
        const msg: Message = {
          id: uid("m"), fromId, toId, subject, body,
          createdAt: new Date().toISOString(), read: false,
        };
        set((s) => ({ messages: [msg, ...s.messages] }));
        get().notify(toId, `New message: ${subject}`, body.slice(0, 80));
      },
      markMessageRead: (id) =>
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)) })),

      resetData: () => set({ ...initial }),
    }),
    {
      name: "itech-data-v2",
      version: 4,
      migrate: (persisted: any, version: number) => {
        if (!persisted) return persisted;
        if (version < 3) {
          persisted.courses = (persisted.courses ?? []).map((c: any) => ({
            ...c,
            accessMode: c.accessMode ?? "lifetime",
          }));
          persisted.assessments = (persisted.assessments ?? []).map((a: any) => ({
            ...a,
            isFinal: a.isFinal ?? false,
          }));
        }
        if (version < 4) {
          // Inject seed course if user has none, so opening a course works out of the box
          if (!Array.isArray(persisted.courses) || persisted.courses.length === 0) {
            persisted.courses = seedCourses;
          }
        }
        return persisted;
      },
      // Ensure the 3 hardcoded accounts always exist in users list
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const have = new Set(state.users.map((u) => u.id));
        const missing = seedUsers.filter((u) => !have.has(u.id));
        if (missing.length > 0) state.users = [...missing, ...state.users];
      },
    },
  ),
);

export function maxScore(a: StoreAssessment): number {
  return a.questions.reduce((sum, q) => sum + q.points, 0);
}

export function submissionScore(a: StoreAssessment, sub: Submission): { earned: number; max: number; pct: number } {
  const max = maxScore(a);
  const earned = sub.responses.reduce((sum, r) => sum + (r.awarded ?? 0), 0);
  return { earned, max, pct: max ? Math.round((earned / max) * 100) : 0 };
}

export function courseProgressPct(progress: Record<string, string[]>, studentId: string, course: Course): number {
  const total = course.sections.reduce((n, s) => n + s.items.length, 0);
  if (total === 0) return 0;
  const done = (progress[`${studentId}:${course.id}`] ?? []).length;
  return Math.min(100, Math.round((done / total) * 100));
}

export function isCourseExpired(course: Course): boolean {
  if (!course || course.accessMode === "lifetime") return false;
  if (!course.endDate) return false;
  const end = new Date(course.endDate);
  if (isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today > end;
}

export type { User, Role, Course, Section, ContentItem, ContentType, Certificate, NotificationItem, Message };
