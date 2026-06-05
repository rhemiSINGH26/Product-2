import { getDb } from "../../db/client";
import {
  courses,
  sections,
  contentItems,
  certificates,
  users,
  enrollments,
  assessments,
  questions,
  submissions,
  submissionResponses,
  progress,
  notifications,
  messages,
} from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "../../auth";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function contentRoute(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const db = getDb();

    // ==========================================
    // USERS API
    // ==========================================

    // GET /api/users -> list users
    if (request.method === "GET" && path === "/api/users") {
      const allUsers = await db.select().from(users);
      const allEnrollments = await db.select().from(enrollments);
      const mapped = allUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        joinedAt: u.joinedAt.toISOString().slice(0, 10),
        lastActive: u.lastActive ? u.lastActive.toISOString() : null,
        avatar: u.avatar,
        courseIds: allEnrollments.filter((e) => e.studentId === u.id).map((e) => e.courseId),
      }));
      return new Response(JSON.stringify({ users: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/users -> create user
    if (request.method === "POST" && path === "/api/users") {
      const body = await request.json();
      const id = body.id || makeId();
      const passwordHash = await hashPassword(body.password || "default123");
      const now = new Date();
      await db.insert(users).values({
        id,
        name: body.name || "Untitled",
        email: body.email,
        passwordHash,
        role: body.role || "student",
        status: body.status || "active",
        joinedAt: body.joinedAt ? new Date(body.joinedAt) : now,
        lastActive: null,
      });
      const created = await db.query.users.findFirst({ where: eq(users.id, id) });
      return new Response(JSON.stringify({ user: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/users/:id -> update user
    if (request.method === "PUT" && path.startsWith("/api/users/")) {
      const id = path.slice("/api/users/".length);
      const body = await request.json();
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.role !== undefined) updateData.role = body.role;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.avatar !== undefined) updateData.avatar = body.avatar;
      if (body.password !== undefined && body.password !== "") {
        updateData.passwordHash = await hashPassword(body.password);
      }
      await db.update(users).set(updateData).where(eq(users.id, id));
      const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
      return new Response(JSON.stringify({ user: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/users/:id -> delete user
    if (request.method === "DELETE" && path.startsWith("/api/users/")) {
      const id = path.slice("/api/users/".length);
      await db.delete(users).where(eq(users.id, id));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // COURSES API
    // ==========================================

    // GET /api/courses -> list courses with sections, items, and enrollments
    if (request.method === "GET" && path === "/api/courses") {
      const allCourses = await db.select().from(courses);
      const allSections = await db.select().from(sections);
      const allItems = await db.select().from(contentItems);
      const allEnrollments = await db.select().from(enrollments);

      const coursesWith = allCourses.map((c) => {
        const courseEnrollments = allEnrollments.filter((e) => e.courseId === c.id);
        const studentAccess: Record<string, any> = {};
        for (const e of courseEnrollments) {
          studentAccess[e.studentId] = {
            accessMode: e.accessMode,
            endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : undefined,
          };
        }

        return {
          ...c,
          startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : "",
          endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : "",
          studentIds: courseEnrollments.map((e) => e.studentId),
          studentAccess,
          sections: allSections
            .filter((s) => s.courseId === c.id)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((s) => ({
              ...s,
              items: allItems
                .filter((it) => it.sectionId === s.id)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
            })),
        };
      });

      return new Response(JSON.stringify({ courses: coursesWith }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/courses -> create course
    if (request.method === "POST" && path === "/api/courses") {
      const body = await request.json();
      const id = body.id || makeId();
      const now = new Date();
      await db.insert(courses).values({
        id,
        name: body.name || "Untitled",
        code: body.code || "",
        description: body.description || null,
        teacherId: body.teacherId || "",
        thumbnail: body.thumbnail || null,
        startDate: body.startDate ? new Date(body.startDate) : now,
        endDate: body.endDate ? new Date(body.endDate) : now,
        accessMode: body.accessMode || "lifetime",
        status: body.status || "draft",
      });

      if (body.studentIds && Array.isArray(body.studentIds)) {
        for (const studentId of body.studentIds) {
          const access = body.studentAccess?.[studentId] || {};
          await db.insert(enrollments).values({
            id: makeId(),
            studentId,
            courseId: id,
            accessMode: access.accessMode || "lifetime",
            endDate: access.endDate ? new Date(access.endDate) : null,
          });
        }
      }

      const created = await db.query.courses.findFirst({ where: eq(courses.id, id) });
      const createdEnrollments = await db.select().from(enrollments).where(eq(enrollments.courseId, id));
      const studentAccess: Record<string, any> = {};
      for (const e of createdEnrollments) {
        studentAccess[e.studentId] = {
          accessMode: e.accessMode,
          endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : undefined,
        };
      }

      return new Response(
        JSON.stringify({
          course: {
            ...created,
            startDate: created?.startDate ? created.startDate.toISOString().slice(0, 10) : "",
            endDate: created?.endDate ? created.endDate.toISOString().slice(0, 10) : "",
            studentIds: createdEnrollments.map((e) => e.studentId),
            studentAccess,
            sections: [],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/courses/:id -> update course and its enrollments
    if (request.method === "PUT" && path.startsWith("/api/courses/")) {
      const id = path.slice("/api/courses/".length);
      const body = await request.json();

      const { studentIds, studentAccess: bodyStudentAccess, sections: _sec, ...courseFields } = body;

      // Update course fields
      const updateData: any = {};
      if (courseFields.name !== undefined) updateData.name = courseFields.name;
      if (courseFields.code !== undefined) updateData.code = courseFields.code;
      if (courseFields.description !== undefined) updateData.description = courseFields.description;
      if (courseFields.teacherId !== undefined) updateData.teacherId = courseFields.teacherId;
      if (courseFields.thumbnail !== undefined) updateData.thumbnail = courseFields.thumbnail;
      if (courseFields.startDate !== undefined) updateData.startDate = new Date(courseFields.startDate);
      if (courseFields.endDate !== undefined) updateData.endDate = new Date(courseFields.endDate);
      if (courseFields.accessMode !== undefined) updateData.accessMode = courseFields.accessMode;
      if (courseFields.status !== undefined) updateData.status = courseFields.status;

      if (Object.keys(updateData).length > 0) {
        await db.update(courses).set(updateData).where(eq(courses.id, id));
      }

      // Update enrollments if studentIds is provided
      if (studentIds && Array.isArray(studentIds)) {
        const existingEnrollments = await db.select().from(enrollments).where(eq(enrollments.courseId, id));
        const existingStudentIds = existingEnrollments.map((e) => e.studentId);

        // Delete enrollments no longer in list
        const toDelete = existingStudentIds.filter((sid) => !studentIds.includes(sid));
        for (const sid of toDelete) {
          await db.delete(enrollments).where(and(eq(enrollments.courseId, id), eq(enrollments.studentId, sid)));
        }

        // Insert or update enrollments
        for (const studentId of studentIds) {
          const access = bodyStudentAccess?.[studentId] || {};
          const isExisting = existingStudentIds.includes(studentId);

          if (isExisting) {
            await db
              .update(enrollments)
              .set({
                accessMode: access.accessMode || "lifetime",
                endDate: access.endDate ? new Date(access.endDate) : null,
              })
              .where(and(eq(enrollments.courseId, id), eq(enrollments.studentId, studentId)));
          } else {
            await db.insert(enrollments).values({
              id: makeId(),
              studentId,
              courseId: id,
              accessMode: access.accessMode || "lifetime",
              endDate: access.endDate ? new Date(access.endDate) : null,
            });
          }
        }
      }

      const updated = await db.query.courses.findFirst({ where: eq(courses.id, id) });
      const updatedEnrollments = await db.select().from(enrollments).where(eq(enrollments.courseId, id));
      const studentAccess: Record<string, any> = {};
      for (const e of updatedEnrollments) {
        studentAccess[e.studentId] = {
          accessMode: e.accessMode,
          endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : undefined,
        };
      }

      const allSections = await db.select().from(sections).where(eq(sections.courseId, id));
      const allItems = await db.select().from(contentItems);

      return new Response(
        JSON.stringify({
          course: {
            ...updated,
            startDate: updated?.startDate ? updated.startDate.toISOString().slice(0, 10) : "",
            endDate: updated?.endDate ? updated.endDate.toISOString().slice(0, 10) : "",
            studentIds: updatedEnrollments.map((e) => e.studentId),
            studentAccess,
            sections: allSections
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((s) => ({
                ...s,
                items: allItems
                  .filter((it) => it.sectionId === s.id)
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
              })),
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/courses/:id -> delete course
    if (request.method === "DELETE" && path.startsWith("/api/courses/")) {
      const id = path.slice("/api/courses/".length);
      await db.delete(courses).where(eq(courses.id, id));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // SECTIONS API
    // ==========================================

    // POST /api/sections -> create section
    if (request.method === "POST" && path === "/api/sections") {
      const body = await request.json();
      const id = makeId();
      await db.insert(sections).values({
        id,
        courseId: body.courseId,
        title: body.title || "Untitled",
        order: body.order ?? 0,
      });
      const created = await db.query.sections.findFirst({ where: eq(sections.id, id) });
      return new Response(JSON.stringify({ section: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/sections/:id -> update section
    if (request.method === "PUT" && path.startsWith("/api/sections/")) {
      const id = path.slice("/api/sections/".length);
      const body = await request.json();
      await db.update(sections).set({ title: body.title, order: body.order }).where(eq(sections.id, id));
      const updated = await db.query.sections.findFirst({ where: eq(sections.id, id) });
      return new Response(JSON.stringify({ section: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/sections/:id -> delete section
    if (request.method === "DELETE" && path.startsWith("/api/sections/")) {
      const id = path.slice("/api/sections/".length);
      await db.delete(sections).where(eq(sections.id, id));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // CONTENT ITEMS API
    // ==========================================

    // POST /api/content-items -> create item
    if (request.method === "POST" && path === "/api/content-items") {
      const body = await request.json();
      const id = makeId();
      await db.insert(contentItems).values({
        id,
        sectionId: body.sectionId,
        type: body.type,
        title: body.title || "",
        body: body.body || null,
        url: body.url || null,
        fileName: body.fileName || null,
        duration: body.duration ?? null,
        fileSize: body.fileSize || null,
        assessmentId: body.assessmentId || null,
        order: body.order ?? 0,
      });
      const created = await db.query.contentItems.findFirst({ where: eq(contentItems.id, id) });
      return new Response(JSON.stringify({ item: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/content-items/:id -> update item
    if (request.method === "PUT" && path.startsWith("/api/content-items/")) {
      const id = path.slice("/api/content-items/".length);
      const body = await request.json();
      await db
        .update(contentItems)
        .set({
          title: body.title,
          body: body.body,
          url: body.url,
          fileName: body.fileName,
          duration: body.duration ?? null,
          fileSize: body.fileSize,
          assessmentId: body.assessmentId ?? null,
          order: body.order ?? 0,
        })
        .where(eq(contentItems.id, id));
      const updated = await db.query.contentItems.findFirst({ where: eq(contentItems.id, id) });
      return new Response(JSON.stringify({ item: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/content-items/:id -> delete item
    if (request.method === "DELETE" && path.startsWith("/api/content-items/")) {
      const id = path.slice("/api/content-items/".length);
      await db.delete(contentItems).where(eq(contentItems.id, id));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // CERTIFICATES API
    // ==========================================

    // GET /api/certificates
    if (request.method === "GET" && path === "/api/certificates") {
      const status = url.searchParams.get("status");
      const rows = status
        ? await db.query.certificates.findMany({ where: eq(certificates.status, status) })
        : await db.select().from(certificates);

      const mapped = rows.map((c) => ({
        ...c,
        requestedAt: c.requestedAt.toISOString().slice(0, 10),
        issuedAt: c.issuedAt ? c.issuedAt.toISOString().slice(0, 10) : undefined,
        proctorLog: (c.proctorLog as any[]) ?? undefined,
      }));

      return new Response(JSON.stringify({ certificates: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/certificates
    if (request.method === "POST" && path === "/api/certificates") {
      const body = await request.json();
      const id = body.id || makeId();
      const requestedAt = body.requestedAt ? new Date(body.requestedAt) : new Date();
      await db.insert(certificates).values({
        id,
        studentId: body.studentId,
        courseId: body.courseId,
        score: body.score,
        status: body.status || "pending",
        requestedAt,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
        teacherNote: body.teacherNote || null,
        rejectionReason: body.rejectionReason || null,
        proctorLog: body.proctorLog || null,
      });
      const created = await db.query.certificates.findFirst({ where: eq(certificates.id, id) });
      return new Response(
        JSON.stringify({
          certificate: created
            ? {
                ...created,
                requestedAt: created.requestedAt.toISOString().slice(0, 10),
                issuedAt: created.issuedAt ? created.issuedAt.toISOString().slice(0, 10) : undefined,
                proctorLog: (created.proctorLog as any[]) ?? undefined,
              }
            : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/certificates/:id/approve
    if (request.method === "PUT" && path.startsWith("/api/certificates/") && path.endsWith("/approve")) {
      const id = path.slice("/api/certificates/".length, -"/approve".length);
      await db.update(certificates).set({ status: "approved", issuedAt: new Date() }).where(eq(certificates.id, id));
      const updated = await db.query.certificates.findFirst({ where: eq(certificates.id, id) });
      return new Response(
        JSON.stringify({
          certificate: updated
            ? {
                ...updated,
                requestedAt: updated.requestedAt.toISOString().slice(0, 10),
                issuedAt: updated.issuedAt ? updated.issuedAt.toISOString().slice(0, 10) : undefined,
                proctorLog: (updated.proctorLog as any[]) ?? undefined,
              }
            : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/certificates/:id/reject
    if (request.method === "PUT" && path.startsWith("/api/certificates/") && path.endsWith("/reject")) {
      const id = path.slice("/api/certificates/".length, -"/reject".length);
      const body = await request.json();
      await db
        .update(certificates)
        .set({ status: "rejected", rejectionReason: body.reason || null })
        .where(eq(certificates.id, id));
      const updated = await db.query.certificates.findFirst({ where: eq(certificates.id, id) });
      return new Response(
        JSON.stringify({
          certificate: updated
            ? {
                ...updated,
                requestedAt: updated.requestedAt.toISOString().slice(0, 10),
                issuedAt: updated.issuedAt ? updated.issuedAt.toISOString().slice(0, 10) : undefined,
                proctorLog: (updated.proctorLog as any[]) ?? undefined,
              }
            : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // ==========================================
    // ASSESSMENTS API
    // ==========================================

    // GET /api/assessments -> list all assessments and nested questions
    if (request.method === "GET" && path === "/api/assessments") {
      const allAssessments = await db.select().from(assessments);
      const allQuestions = await db.select().from(questions);

      const mapped = allAssessments.map((a) => ({
        ...a,
        questions: allQuestions
          .filter((q) => q.assessmentId === a.id)
          .sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
          .map((q) => ({
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            options: (q.options as string[]) ?? [],
            correctIndex: q.correctIndex ?? 0,
            points: q.points,
            imageUrl: q.imageUrl ?? undefined,
          })),
      }));

      return new Response(JSON.stringify({ assessments: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/assessments -> create assessment
    if (request.method === "POST" && path === "/api/assessments") {
      const body = await request.json();
      const id = body.id || makeId();
      await db.insert(assessments).values({
        id,
        courseId: body.courseId,
        title: body.title || "Quiz",
        timeLimit: body.timeLimit ?? 10,
        passingScore: body.passingScore ?? 70,
        attempts: body.attempts ?? 1,
        questionCount: 0,
        proctored: body.proctored ?? false,
        isFinal: body.isFinal ?? false,
      });

      const created = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
      return new Response(JSON.stringify({ assessment: { ...created, questions: [], questionCount: 0 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/assessments/:id -> update assessment
    if (request.method === "PUT" && path.startsWith("/api/assessments/")) {
      const id = path.slice("/api/assessments/".length);
      const body = await request.json();

      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.timeLimit !== undefined) updateData.timeLimit = body.timeLimit;
      if (body.passingScore !== undefined) updateData.passingScore = body.passingScore;
      if (body.attempts !== undefined) updateData.attempts = body.attempts;
      if (body.proctored !== undefined) updateData.proctored = body.proctored;
      if (body.isFinal !== undefined) updateData.isFinal = body.isFinal;
      if (body.questionCount !== undefined) updateData.questionCount = body.questionCount;

      await db.update(assessments).set(updateData).where(eq(assessments.id, id));
      const updated = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
      return new Response(JSON.stringify({ assessment: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/assessments/:id -> delete assessment
    if (request.method === "DELETE" && path.startsWith("/api/assessments/")) {
      const id = path.slice("/api/assessments/".length);
      await db.delete(assessments).where(eq(assessments.id, id));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // QUESTIONS API
    // ==========================================

    // POST /api/questions -> create question
    if (request.method === "POST" && path === "/api/questions") {
      const body = await request.json();
      const id = body.id || makeId();
      await db.insert(questions).values({
        id,
        assessmentId: body.assessmentId,
        type: body.type,
        prompt: body.prompt || "",
        options: body.options ?? null,
        correctIndex: body.correctIndex ?? null,
        points: body.points ?? 1,
        imageUrl: body.imageUrl ?? null,
        order: body.order ?? 0,
      });

      // Update question count on assessment
      const assId = body.assessmentId;
      const countResult = await db.select().from(questions).where(eq(questions.assessmentId, assId));
      await db
        .update(assessments)
        .set({ questionCount: countResult.length })
        .where(eq(assessments.id, assId));

      const created = await db.query.questions.findFirst({ where: eq(questions.id, id) });
      return new Response(JSON.stringify({ question: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/questions/:id -> update question
    if (request.method === "PUT" && path.startsWith("/api/questions/")) {
      const id = path.slice("/api/questions/".length);
      const body = await request.json();

      const updateData: any = {};
      if (body.type !== undefined) updateData.type = body.type;
      if (body.prompt !== undefined) updateData.prompt = body.prompt;
      if (body.options !== undefined) updateData.options = body.options;
      if (body.correctIndex !== undefined) updateData.correctIndex = body.correctIndex;
      if (body.points !== undefined) updateData.points = body.points;
      if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
      if (body.order !== undefined) updateData.order = body.order;

      await db.update(questions).set(updateData).where(eq(questions.id, id));
      const updated = await db.query.questions.findFirst({ where: eq(questions.id, id) });
      return new Response(JSON.stringify({ question: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/questions/:id -> delete question
    if (request.method === "DELETE" && path.startsWith("/api/questions/")) {
      const id = path.slice("/api/questions/".length);
      const qRow = await db.query.questions.findFirst({ where: eq(questions.id, id) });

      await db.delete(questions).where(eq(questions.id, id));

      if (qRow) {
        const countResult = await db
          .select()
          .from(questions)
          .where(eq(questions.assessmentId, qRow.assessmentId));
        await db
          .update(assessments)
          .set({ questionCount: countResult.length })
          .where(eq(assessments.id, qRow.assessmentId));
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // SUBMISSIONS API
    // ==========================================

    // GET /api/submissions -> list submissions and their question responses
    if (request.method === "GET" && path === "/api/submissions") {
      const allSubmissions = await db.select().from(submissions);
      const allResponses = await db.select().from(submissionResponses);

      const mapped = allSubmissions.map((s) => ({
        id: s.id,
        assessmentId: s.assessmentId,
        studentId: s.studentId,
        submittedAt: s.submittedAt.toISOString().slice(0, 10),
        status: s.status as "submitted" | "graded",
        feedback: s.feedback ?? undefined,
        proctorEvents: (s.proctorEvents as any[]) ?? undefined,
        responses: allResponses
          .filter((r) => r.submissionId === s.id)
          .map((r) => ({
            questionId: r.questionId,
            response: r.response,
            awarded: r.awarded,
          })),
      }));

      return new Response(JSON.stringify({ submissions: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/submissions -> create a student submission and responses
    if (request.method === "POST" && path === "/api/submissions") {
      const body = await request.json();
      const id = body.id || makeId();

      await db.insert(submissions).values({
        id,
        assessmentId: body.assessmentId,
        studentId: body.studentId,
        submittedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
        status: body.status || "submitted",
        feedback: body.feedback || null,
        proctorEvents: body.proctorEvents || null,
      });

      if (body.responses && Array.isArray(body.responses)) {
        for (const resp of body.responses) {
          await db.insert(submissionResponses).values({
            id: makeId(),
            submissionId: id,
            questionId: resp.questionId,
            response: resp.response,
            awarded: resp.awarded,
          });
        }
      }

      const created = await db.query.submissions.findFirst({ where: eq(submissions.id, id) });
      const createdResponses = await db
        .select()
        .from(submissionResponses)
        .where(eq(submissionResponses.submissionId, id));

      return new Response(
        JSON.stringify({
          submission: {
            ...created,
            submittedAt: created?.submittedAt.toISOString().slice(0, 10),
            responses: createdResponses.map((r) => ({
              questionId: r.questionId,
              response: r.response,
              awarded: r.awarded,
            })),
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/submissions/:id/grade -> grade a submission (update awarded points per response)
    if (request.method === "PUT" && path.startsWith("/api/submissions/") && path.endsWith("/grade")) {
      const id = path.slice("/api/submissions/".length, -"/grade".length);
      const body = await request.json(); // { awards: Record<string, number>, feedback?: string }

      await db
        .update(submissions)
        .set({
          status: "graded",
          feedback: body.feedback || null,
        })
        .where(eq(submissions.id, id));

      if (body.awards) {
        for (const qId of Object.keys(body.awards)) {
          const points = body.awards[qId];
          await db
            .update(submissionResponses)
            .set({ awarded: points })
            .where(
              and(
                eq(submissionResponses.submissionId, id),
                eq(submissionResponses.questionId, qId)
              )
            );
        }
      }

      const updated = await db.query.submissions.findFirst({ where: eq(submissions.id, id) });
      const updatedResponses = await db
        .select()
        .from(submissionResponses)
        .where(eq(submissionResponses.submissionId, id));

      return new Response(
        JSON.stringify({
          submission: {
            ...updated,
            submittedAt: updated?.submittedAt.toISOString().slice(0, 10),
            responses: updatedResponses.map((r) => ({
              questionId: r.questionId,
              response: r.response,
              awarded: r.awarded,
            })),
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // ==========================================
    // PROGRESS API
    // ==========================================

    // GET /api/progress -> list all progress entries
    if (request.method === "GET" && path === "/api/progress") {
      const allProgress = await db.select().from(progress);

      const progressRecord: Record<string, string[]> = {};
      for (const p of allProgress) {
        const key = `${p.studentId}:${p.courseId}`;
        if (!progressRecord[key]) progressRecord[key] = [];
        if (!progressRecord[key].includes(p.contentItemId)) {
          progressRecord[key].push(p.contentItemId);
        }
      }

      return new Response(JSON.stringify({ progress: progressRecord }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/progress -> mark progress complete
    if (request.method === "POST" && path === "/api/progress") {
      const body = await request.json(); // { studentId, courseId, contentItemId }
      const id = makeId();

      // Check if it already exists
      const existing = await db
        .select()
        .from(progress)
        .where(
          and(
            eq(progress.studentId, body.studentId),
            eq(progress.courseId, body.courseId),
            eq(progress.contentItemId, body.contentItemId)
          )
        );

      if (existing.length === 0) {
        await db.insert(progress).values({
          id,
          studentId: body.studentId,
          courseId: body.courseId,
          contentItemId: body.contentItemId,
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/progress -> unmark progress complete
    if (request.method === "DELETE" && path === "/api/progress") {
      const studentId = url.searchParams.get("studentId");
      const courseId = url.searchParams.get("courseId");
      const contentItemId = url.searchParams.get("contentItemId");

      if (studentId && courseId && contentItemId) {
        await db
          .delete(progress)
          .where(
            and(
              eq(progress.studentId, studentId),
              eq(progress.courseId, courseId),
              eq(progress.contentItemId, contentItemId)
            )
          );
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // NOTIFICATIONS API
    // ==========================================

    // GET /api/notifications -> list all notifications
    if (request.method === "GET" && path === "/api/notifications") {
      const allNotifs = await db.select().from(notifications);
      const mapped = allNotifs.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        read: n.read,
        link: n.link ?? undefined,
        createdAt: n.createdAt.toISOString(),
      }));

      return new Response(JSON.stringify({ notifications: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/notifications -> create notification
    if (request.method === "POST" && path === "/api/notifications") {
      const body = await request.json();
      const id = body.id || makeId();

      await db.insert(notifications).values({
        id,
        userId: body.userId,
        title: body.title || "",
        message: body.message || "",
        read: body.read ?? false,
        link: body.link || null,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      });

      const created = await db.query.notifications.findFirst({ where: eq(notifications.id, id) });
      return new Response(
        JSON.stringify({
          notification: created
            ? {
                ...created,
                createdAt: created.createdAt.toISOString(),
                link: created.link ?? undefined,
              }
            : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/notifications/read-all -> mark all notifications read for a user
    if (request.method === "PUT" && path === "/api/notifications/read-all") {
      const body = await request.json();
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, body.userId));

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/notifications/:id/read -> mark single notification read
    if (request.method === "PUT" && path.startsWith("/api/notifications/") && path.endsWith("/read")) {
      const id = path.slice("/api/notifications/".length, -"/read".length);
      await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // MESSAGES API
    // ==========================================

    // GET /api/messages -> list all messages
    if (request.method === "GET" && path === "/api/messages") {
      const allMsgs = await db.select().from(messages);
      const mapped = allMsgs.map((m) => ({
        id: m.id,
        fromId: m.fromId,
        toId: m.toId,
        subject: m.subject,
        body: m.body,
        read: m.read,
        createdAt: m.createdAt.toISOString(),
      }));

      return new Response(JSON.stringify({ messages: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/messages -> create message
    if (request.method === "POST" && path === "/api/messages") {
      const body = await request.json();
      const id = body.id || makeId();

      await db.insert(messages).values({
        id,
        fromId: body.fromId,
        toId: body.toId,
        subject: body.subject || "",
        body: body.body || "",
        read: body.read ?? false,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      });

      const created = await db.query.messages.findFirst({ where: eq(messages.id, id) });
      return new Response(
        JSON.stringify({
          message: created
            ? {
                ...created,
                createdAt: created.createdAt.toISOString(),
              }
            : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/messages/:id/read -> mark single message read
    if (request.method === "PUT" && path.startsWith("/api/messages/") && path.endsWith("/read")) {
      const id = path.slice("/api/messages/".length, -"/read".length);
      await db.update(messages).set({ read: true }).where(eq(messages.id, id));

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Content route error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
