import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Play, Search, CalendarDays, Infinity as InfinityIcon } from "lucide-react";
import { PageHeader, GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/store";
import { useData, courseProgressPct, isCourseExpired } from "@/lib/data-store";

export const Route = createFileRoute("/student/courses")({ component: StudentCourses });

function StudentCourses() {
  const { user } = useAuth();
  const { courses, progress, users } = useData();
  const [q, setQ] = useState("");

  const my = useMemo(() => {
    if (!user) return [];
    const query = q.trim().toLowerCase();
    return courses
      .filter((c) => c.studentIds.includes(user.id))
      .filter((c) => !query || c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query));
  }, [courses, user, q]);

  return (
    <div className="space-y-8">
      <PageHeader title="My Courses" subtitle="Everything you're enrolled in." />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or code" className="pl-9" />
      </div>

      {my.length === 0 ? (
        <GlassCard className="text-center py-12">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <div className="font-semibold">No courses yet</div>
          <p className="text-sm text-muted-foreground mt-1">Once an admin enrolls you, courses appear here.</p>
        </GlassCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {my.map((c) => {
            const p = user ? courseProgressPct(progress, user.id, c) : 0;
            const teacher = users.find((u) => u.id === c.teacherId);
            const expired = isCourseExpired(c);
            return (
              <GlassCard key={c.id} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="text-4xl">{c.thumbnail}</div>
                  <Badge variant="outline" className="border-border text-[10px]">{c.code}</Badge>
                </div>
                <Badge variant="outline" className={expired ? "mt-3 w-fit border-destructive/40 text-destructive bg-destructive/10" : "mt-3 w-fit border-border text-muted-foreground bg-secondary/30"}>
                  {c.accessMode === "lifetime" ? <InfinityIcon className="mr-1 h-3 w-3" /> : <CalendarDays className="mr-1 h-3 w-3" />}
                  {c.accessMode === "lifetime" ? "Lifetime" : expired ? "Expired" : `Expires ${c.endDate || "soon"}`}
                </Badge>
                <h3 className="mt-3 font-semibold leading-tight">{c.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 flex-1">{c.description}</p>
                <div className="mt-3 text-xs text-muted-foreground">by {teacher?.name ?? "Unassigned"}</div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Progress</span><span>{p}%</span></div>
                  <Progress value={p} className="h-1.5" />
                </div>
                <Button asChild size="sm" className="mt-4 gradient-primary text-primary-foreground border-0">
                  <Link to="/student/courses/$courseId" params={{ courseId: c.id }}>
                    <Play className="h-3 w-3 mr-1.5 fill-current" />Open course
                  </Link>
                </Button>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
