import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Video, FileText, BookOpen, FlaskConical, Link2, Download, CheckCircle2, Circle, Play, Image as ImageIcon, Presentation, ClipboardList, LockKeyhole, CalendarDays } from "lucide-react";
import { PageHeader, GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/store";
import { useData, courseProgressPct, isCourseExpired, type StoreAssessment } from "@/lib/data-store";
import type { ContentItem, ContentType } from "@/lib/mock-data";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/student/courses/$courseId")({ component: CourseLearning });

const typeMeta: Record<ContentType, { icon: any; label: string }> = {
  video: { icon: Video, label: "Video" },
  pdf: { icon: FileText, label: "PDF" },
  reading: { icon: BookOpen, label: "Reading" },
  lab: { icon: FlaskConical, label: "Lab" },
  link: { icon: Link2, label: "Link" },
  download: { icon: Download, label: "Download" },
  image: { icon: ImageIcon, label: "Image" },
  ppt: { icon: Presentation, label: "Slides" },
  assessment: { icon: ClipboardList, label: "Assessment" },
};

function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    return null;
  } catch { return null; }
}

function CourseLearning() {
  const { courseId } = useParams({ from: "/student/courses/$courseId" });
  const { user } = useAuth();
  const { courses, progress, markItemComplete, unmarkItemComplete, assessments } = useData();
  const course = courses.find((c) => c.id === courseId);
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!user) return null;
  if (!course) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">Course not found.</GlassCard>
      </div>
    );
  }
  if (!course.studentIds.includes(user.id)) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">You're not enrolled in this course.</GlassCard>
      </div>
    );
  }
  if (isCourseExpired(course)) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="mx-auto max-w-xl text-center py-14">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold">Course access expired</h2>
          <p className="mt-2 text-sm text-muted-foreground">Your access ended on {course.endDate || "the scheduled end date"}.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Contact your instructor to extend access.
          </div>
        </GlassCard>
      </div>
    );
  }

  const done = new Set(progress[`${user.id}:${course.id}`] ?? []);
  const allItems = course.sections.flatMap((s) => s.items);
  const active: ContentItem | null = activeId
    ? allItems.find((i) => i.id === activeId) ?? null
    : allItems[0] ?? null;
  const pct = courseProgressPct(progress, user.id, course);

  const toggle = (id: string) => {
    if (done.has(id)) { unmarkItemComplete(user.id, course.id, id); }
    else { markItemComplete(user.id, course.id, id); toast.success("Marked complete"); }
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />All courses</Link></Button>
      <PageHeader
        title={course.name}
        subtitle={`${course.code} · ${allItems.length} items · ${pct}% complete`}
      />
      <Progress value={pct} className="h-1.5" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <GlassCard className="min-h-[400px]">
          {allItems.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="mx-auto h-10 w-10 opacity-40 mb-3" />
              No content yet — your teacher is still building this course.
            </div>
          ) : active ? (
            <ContentViewer item={active} assessments={assessments.filter((a) => a.courseId === course.id)} onToggleComplete={() => toggle(active.id)} completed={done.has(active.id)} />
          ) : null}
        </GlassCard>

        <div className="space-y-3">
          {course.sections.map((sec) => (
            <GlassCard key={sec.id} className="p-3">
              <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">{sec.title}</div>
              <div className="space-y-0.5">
                {sec.items.map((it) => {
                  const M = typeMeta[it.type];
                  const Icon = M.icon;
                  const isDone = done.has(it.id);
                  const isActive = active?.id === it.id;
                  return (
                    <button
                      key={it.id}
                      onClick={() => setActiveId(it.id)}
                      className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                        isActive ? "bg-primary/15" : "hover:bg-secondary/40"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{it.title}</span>
                    </button>
                  );
                })}
                {sec.items.length === 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">No items in this section.</div>
                )}
              </div>
            </GlassCard>
          ))}
          {course.sections.length === 0 && (
            <GlassCard className="text-xs text-muted-foreground text-center py-6">No sections yet.</GlassCard>
          )}

          {(() => {
            const courseAssessments = assessments.filter((a) => a.courseId === course.id);
            if (courseAssessments.length === 0) return null;
            return (
              <GlassCard className="p-3">
                <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">Assessments</div>
                <div className="space-y-0.5">
                  {courseAssessments.map((a) => (
                    <Link key={a.id} to="/student/assessments/$assessmentId" params={{ assessmentId: a.id }}
                      className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary/40 transition">
                      <ClipboardCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="flex-1 truncate">{a.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{a.timeLimit}m</span>
                    </Link>
                  ))}
                </div>
              </GlassCard>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function ContentViewer({ item, assessments, completed, onToggleComplete }: { item: ContentItem; assessments: StoreAssessment[]; completed: boolean; onToggleComplete: () => void }) {
  const M = typeMeta[item.type];
  const linkedAssessment = item.assessmentId ? assessments.find((a) => a.id === item.assessmentId) : null;
  const officeUrl = item.url && item.type === "ppt" && !item.url.startsWith("data:")
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.url)}`
    : null;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className="border-border mb-2">{M.label}</Badge>
          <h2 className="text-xl font-semibold">{item.title}</h2>
        </div>
        <Button variant={completed ? "outline" : "default"}
          className={completed ? "" : "gradient-primary text-primary-foreground border-0"}
          onClick={onToggleComplete}>
          {completed ? "Mark incomplete" : "Mark complete"}
        </Button>
      </div>

      {item.type === "video" && item.url && (() => {
        const embed = toYouTubeEmbed(item.url);
        return embed ? (
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe src={embed} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={item.title} />
          </div>
        ) : (
          <video controls src={item.url} className="w-full rounded-xl bg-black aspect-video" />
        );
      })()}

      {item.type === "pdf" && item.url && (
        <iframe src={item.url} className="w-full h-[600px] rounded-xl border border-border bg-white" title={item.title} />
      )}

      {item.type === "image" && item.url && (
        <img src={item.url} alt={item.title} className="max-h-[640px] w-full rounded-xl border border-border object-contain bg-secondary/30" />
      )}

      {item.type === "ppt" && item.url && (
        officeUrl ? (
          <iframe src={officeUrl} className="w-full h-[600px] rounded-xl border border-border bg-white" title={item.title} />
        ) : (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm hover:border-primary/40 transition">
            <Presentation className="h-4 w-4 text-primary" />Open slides
          </a>
        )
      )}

      {item.type === "assessment" && (
        linkedAssessment ? (
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{linkedAssessment.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{linkedAssessment.questions.length} questions · {linkedAssessment.timeLimit} min · Pass {linkedAssessment.passingScore}%</div>
              </div>
              <Button asChild className="gradient-primary text-primary-foreground border-0">
                <Link to="/student/assessments/$assessmentId" params={{ assessmentId: linkedAssessment.id }}>Start assessment</Link>
              </Button>
            </div>
          </div>
        ) : <div className="text-sm text-muted-foreground">Assessment not linked.</div>
      )}

      {item.type === "reading" && (
        <div className="prose prose-invert max-w-none whitespace-pre-wrap rounded-xl bg-secondary/40 p-4 text-sm">
          {item.body || "No content."}
        </div>
      )}

      {item.type === "lab" && item.url && (
        <iframe src={item.url} className="w-full h-[600px] rounded-xl border border-border" title={item.title} />
      )}

      {(item.type === "link" || item.type === "download") && item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm hover:border-primary/40 transition">
          <Play className="h-4 w-4 text-primary" />Open {M.label.toLowerCase()}
        </a>
      )}

      {!item.url && item.type !== "reading" && (
        <div className="text-sm text-muted-foreground">No content URL provided.</div>
      )}
    </div>
  );
}
