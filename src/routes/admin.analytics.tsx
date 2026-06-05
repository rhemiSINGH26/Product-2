import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, BookOpen, ClipboardCheck, Award, GraduationCap, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useData, courseProgressPct, isUserInactive, formatLastActive, formatIdleDuration } from "@/lib/data-store";

export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalytics });

const roleColors: Record<string, string> = {
  admin: "border-primary/40 text-primary bg-primary/10",
  teacher: "border-warning/40 text-warning bg-warning/10",
  student: "border-success/40 text-success bg-success/10",
};

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

  const idleUsers = useMemo(
    () => [...users].filter(isUserInactive).sort((a, b) => {
      const aDate = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      const bDate = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      return aDate - bDate; // longest idle first
    }),
    [users],
  );

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

      {/* Idle Users Section */}
      <GlassCard className="border-warning/20">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 grid place-items-center rounded-lg bg-warning/15 text-warning">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold">Idle Users</h3>
            <p className="text-xs text-muted-foreground">Users inactive for more than 7 days — consider sending a re-engagement message.</p>
          </div>
          <Badge variant="outline" className="ml-auto border-warning/40 text-warning bg-warning/10">
            {idleUsers.length} idle
          </Badge>
        </div>

        {idleUsers.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">All users are active. 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {idleUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-warning/5 border border-warning/15 px-4 py-3"
              >
                {/* Avatar */}
                <div className="h-9 w-9 grid place-items-center rounded-xl bg-warning/15 text-warning text-xs font-bold shrink-0">
                  {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>

                {/* Role badge */}
                <Badge variant="outline" className={`capitalize text-[10px] py-0 shrink-0 ${roleColors[u.role]}`}>
                  {u.role}
                </Badge>

                {/* Idle duration */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-warning text-xs font-semibold">
                    <Clock className="h-3 w-3" />
                    {formatIdleDuration(u)} idle
                  </div>
                  <div className="text-[10px] text-muted-foreground">{formatLastActive(u)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}