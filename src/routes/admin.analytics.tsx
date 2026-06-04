import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, BookOpen, ClipboardCheck, Award, GraduationCap, TrendingUp } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useData, courseProgressPct } from "@/lib/data-store";

export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalytics });

function AdminAnalytics() {
  const { users, courses, assessments, submissions, certificates, progress } = useData();

  const stats = useMemo(() => {
    const students = users.filter((u) => u.role === "student");
    const teachers = users.filter((u) => u.role === "teacher");
    const activeCourses = courses.filter((c) => c.status === "active");
    const issued = certificates.filter((c) => c.status === "approved");
    const pending = certificates.filter((c) => c.status === "pending");

    // overall completion across all enrolled student-course pairs
    let pctSum = 0, pairs = 0;
    for (const c of courses) {
      for (const sid of c.studentIds) { pctSum += courseProgressPct(progress, sid, c); pairs++; }
    }
    const avgCompletion = pairs ? Math.round(pctSum / pairs) : 0;

    const submitted = submissions.length;
    const graded = submissions.filter((s) => s.status === "graded").length;
    return { students, teachers, activeCourses, issued, pending, avgCompletion, submitted, graded };
  }, [users, courses, assessments, submissions, certificates, progress]);

  // top courses by enrolment
  const topCourses = [...courses]
    .sort((a, b) => b.studentIds.length - a.studentIds.length)
    .slice(0, 6);

  const teacherLoad = stats.teachers.map((t) => ({
    teacher: t,
    courseCount: courses.filter((c) => c.teacherId === t.id).length,
    studentCount: courses.filter((c) => c.teacherId === t.id).reduce((n, c) => n + c.studentIds.length, 0),
  })).sort((a, b) => b.studentCount - a.studentCount);

  return (
    <div className="space-y-8">
      <PageHeader title="Platform Analytics" subtitle="Real-time insights across the entire academy." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={stats.students.length} icon={Users} />
        <StatCard label="Teachers" value={stats.teachers.length} icon={GraduationCap} delay={0.05} />
        <StatCard label="Active Courses" value={stats.activeCourses.length} icon={BookOpen} delay={0.1} />
        <StatCard label="Certificates Issued" value={stats.issued.length} icon={Award} delay={0.15} accent />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assessments" value={assessments.length} icon={ClipboardCheck} />
        <StatCard label="Quiz Submissions" value={stats.submitted} icon={TrendingUp} delay={0.05} />
        <StatCard label="Pending Approvals" value={stats.pending.length} icon={Award} delay={0.1} />
        <StatCard label="Avg Completion" value={`${stats.avgCompletion}%`} icon={TrendingUp} delay={0.15} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <h3 className="font-semibold mb-4">Top Courses by Enrolment</h3>
          {topCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No courses yet.</p>
          ) : (
            <div className="space-y-3">
              {topCourses.map((c) => {
                const max = Math.max(...topCourses.map((x) => x.studentIds.length), 1);
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate">{c.thumbnail} {c.name}</span>
                      <span className="text-muted-foreground">{c.studentIds.length}</span>
                    </div>
                    <Progress value={(c.studentIds.length / max) * 100} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold mb-4">Teacher Load</h3>
          {teacherLoad.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No teachers yet.</p>
          ) : (
            <div className="space-y-3">
              {teacherLoad.map(({ teacher, courseCount, studentCount }) => (
                <div key={teacher.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{teacher.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{teacher.email}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="outline" className="border-border">{courseCount} courses</Badge>
                    <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">{studentCount} students</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}