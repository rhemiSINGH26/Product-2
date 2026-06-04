import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Clock, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader, GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/store";
import { useData, maxScore, submissionScore } from "@/lib/data-store";

export const Route = createFileRoute("/student/assessments/$assessmentId")({ component: QuizPage });

function QuizPage() {
  const { assessmentId } = useParams({ from: "/student/assessments/$assessmentId" });
  const { user } = useAuth();
  const nav = useNavigate();
  const { assessments, courses, submissions, submitQuiz } = useData();

  const a = assessments.find((x) => x.id === assessmentId);
  const course = a ? courses.find((c) => c.id === a.courseId) : null;

  const mySubs = useMemo(() => {
    if (!user || !a) return [];
    return submissions.filter((s) => s.studentId === user.id && s.assessmentId === a.id);
  }, [submissions, user, a]);

  const attemptsLeft = a ? Math.max(0, a.attempts - mySubs.length) : 0;
  const enrolled = !!(user && course?.studentIds.includes(user.id));

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!started || done) return;
    setRemaining(a ? a.timeLimit * 60 : 0);
  }, [started, a, done]);

  useEffect(() => {
    if (!started || done) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(t); handleSubmit(true); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, done]);

  if (!a || !course) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">Assessment not found.</GlassCard>
      </div>
    );
  }

  if (!enrolled) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">You're not enrolled in this course.</GlassCard>
      </div>
    );
  }

  function handleSubmit(auto = false) {
    if (!user || !a) return;
    const id = submitQuiz(a.id, user.id, answers);
    if (auto) toast.warning("Time's up — auto-submitted");
    else toast.success("Submitted!");
    setDone(id);
  }

  // Done view
  if (done) {
    const sub = submissions.find((s) => s.id === done) ?? mySubs[0];
    if (sub) {
      const { earned, max, pct } = submissionScore(a, sub);
      const passed = pct >= a.passingScore;
      const auto = sub.status === "graded";
      return (
        <div className="space-y-6 max-w-2xl mx-auto">
          <PageHeader title="Submission received" subtitle={a.title} />
          <GlassCard className="text-center py-12">
            <div className={`mx-auto h-16 w-16 rounded-2xl grid place-items-center mb-4 ${passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
              {passed ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
            </div>
            {auto ? (
              <>
                <div className="text-4xl font-bold gradient-text">{pct}%</div>
                <div className="mt-2 text-sm text-muted-foreground">{earned}/{max} points</div>
                <Badge variant="outline" className={`mt-4 ${passed ? "border-success/40 text-success bg-success/10" : "border-destructive/40 text-destructive bg-destructive/10"}`}>
                  {passed ? "Passed" : "Did not pass"}
                </Badge>
                {passed && <p className="mt-3 text-xs text-muted-foreground">A certificate request was sent to admin for approval.</p>}
              </>
            ) : (
              <>
                <div className="font-semibold">Awaiting teacher grading</div>
                <p className="mt-2 text-sm text-muted-foreground">Short-answer responses need manual review.</p>
              </>
            )}
            <div className="mt-6 flex gap-2 justify-center">
              <Button asChild variant="outline"><Link to="/student/progress">View progress</Link></Button>
              <Button asChild className="gradient-primary text-primary-foreground border-0">
                <Link to="/student/courses/$courseId" params={{ courseId: course.id }}>Back to course</Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      );
    }
  }

  // Intro view
  if (!started) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button asChild variant="ghost" size="sm">
          <Link to="/student/courses/$courseId" params={{ courseId: course.id }}><ArrowLeft className="mr-2 h-4 w-4" />Back to course</Link>
        </Button>
        <PageHeader title={a.title} subtitle={`${course.name} · ${a.questions.length} questions`} />
        <GlassCard className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-secondary/40 p-4">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold">{a.timeLimit}m</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Time limit</div>
            </div>
            <div className="rounded-xl bg-secondary/40 p-4">
              <div className="text-xl font-bold">{a.passingScore}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pass mark</div>
            </div>
            <div className="rounded-xl bg-secondary/40 p-4">
              <div className="text-xl font-bold">{attemptsLeft}/{a.attempts}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Attempts left</div>
            </div>
          </div>
          {a.proctored && (
            <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg p-3">
              <ShieldCheck className="h-4 w-4" />This quiz is proctored. Do not switch tabs once started.
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Worth {maxScore(a)} points across {a.questions.length} questions. Once started the timer cannot be paused.
          </div>
          {a.questions.length === 0 ? (
            <div className="text-sm text-destructive">This quiz has no questions yet — ask your instructor.</div>
          ) : attemptsLeft === 0 ? (
            <div className="text-sm text-destructive">No attempts remaining.</div>
          ) : (
            <Button onClick={() => setStarted(true)} className="w-full gradient-primary text-primary-foreground border-0 glow">
              Start quiz
            </Button>
          )}
          {mySubs.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Previous attempts: {mySubs.map((s) => `${submissionScore(a, s).pct}%`).join(", ")}
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  // Taking view
  const answered = a.questions.filter((q) => (answers[q.id] ?? "").length > 0).length;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const lowTime = remaining < 60;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur pb-3 -mt-6 pt-6">
        <GlassCard className="flex items-center gap-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{a.title}</div>
            <Progress value={(answered / Math.max(1, a.questions.length)) * 100} className="h-1 mt-1" />
            <div className="text-xs text-muted-foreground mt-1">{answered}/{a.questions.length} answered</div>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${lowTime ? "text-destructive animate-pulse" : "text-primary"}`}>
            <Clock className="h-4 w-4" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </GlassCard>
      </div>

      {a.questions.map((q, i) => (
        <GlassCard key={q.id} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs text-muted-foreground">Question {i + 1} of {a.questions.length} · {q.points} pts</div>
          </div>
          <div className="font-medium">{q.prompt}</div>

          {q.type === "mcq" && (
            <RadioGroup value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}>
              {q.options.map((o, oi) => (
                <Label key={oi} htmlFor={`${q.id}-${oi}`} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/40 transition">
                  <RadioGroupItem id={`${q.id}-${oi}`} value={String(oi)} />
                  <span className="text-sm">{o}</span>
                </Label>
              ))}
            </RadioGroup>
          )}

          {q.type === "truefalse" && (
            <RadioGroup value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}>
              {["True", "False"].map((label, oi) => (
                <Label key={oi} htmlFor={`${q.id}-${oi}`} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/40 transition">
                  <RadioGroupItem id={`${q.id}-${oi}`} value={String(oi)} />
                  <span className="text-sm">{label}</span>
                </Label>
              ))}
            </RadioGroup>
          )}

          {q.type === "short" && (
            <Textarea rows={3} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
              placeholder="Type your answer..." />
          )}
        </GlassCard>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => { if (confirm("Discard this attempt?")) nav({ to: "/student/courses/$courseId", params: { courseId: course.id } }); }}>
          Cancel
        </Button>
        <Button onClick={() => handleSubmit(false)} className="flex-1 gradient-primary text-primary-foreground border-0 glow">
          Submit quiz
        </Button>
      </div>
    </div>
  );
}