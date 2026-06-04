import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Award, Send, Clock, CheckCircle2, XCircle, ShieldCheck, Printer, Eye, Download } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/store";
import { useData, courseProgressPct, submissionScore } from "@/lib/data-store";
import { openPrintableCertificate } from "@/lib/certificate";
import { downloadCSV } from "@/lib/exports";
import type { Certificate } from "@/lib/mock-data";

export const Route = createFileRoute("/teacher/certificates")({ component: TeacherCertificates });

function TeacherCertificates() {
  const { user } = useAuth();
  const { courses, users, certificates, assessments, submissions, progress, requestCertificate } = useData();

  const myCourses = useMemo(
    () => courses.filter((c) => !user || user.role !== "teacher" || c.teacherId === user.id),
    [courses, user],
  );
  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const myCerts = certificates.filter((c) => myCourseIds.has(c.courseId));

  // Build eligible students with no pending/approved cert yet for that course
  const eligible = useMemo(() => {
    const rows: Array<{ studentId: string; studentName: string; courseId: string; courseName: string; pct: number; avgQuiz: number | null }> = [];
    for (const c of myCourses) {
      const courseAssessments = assessments.filter((a) => a.courseId === c.id);
      for (const sid of c.studentIds) {
        const existing = certificates.find((cert) => cert.studentId === sid && cert.courseId === c.id && cert.status !== "rejected");
        if (existing) continue;
        const st = users.find((u) => u.id === sid);
        if (!st) continue;
        const pct = courseProgressPct(progress, sid, c);
        const mySubs = submissions.filter((s) => s.studentId === sid && courseAssessments.some((a) => a.id === s.assessmentId));
        let avg: number | null = null;
        if (mySubs.length > 0) {
          let total = 0;
          for (const s of mySubs) { const a = courseAssessments.find((x) => x.id === s.assessmentId)!; total += submissionScore(a, s).pct; }
          avg = Math.round(total / mySubs.length);
        }
        rows.push({ studentId: sid, studentName: st.name, courseId: c.id, courseName: c.name, pct, avgQuiz: avg });
      }
    }
    return rows;
  }, [myCourses, users, certificates, assessments, submissions, progress]);

  // request dialog
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [score, setScore] = useState(85);
  const [note, setNote] = useState("");

  const openFor = (sid: string, cid: string, suggestedScore: number) => {
    setStudentId(sid); setCourseId(cid); setScore(suggestedScore); setNote("");
    setOpen(true);
  };

  const submit = () => {
    if (!studentId || !courseId) { toast.error("Pick a student and course."); return; }
    if (score < 0 || score > 100) { toast.error("Score must be 0–100."); return; }
    requestCertificate(studentId, courseId, score, note.trim() || undefined);
    toast.success("Request submitted to admin for approval.");
    setOpen(false);
  };

  const counts = {
    pending: myCerts.filter((c) => c.status === "pending").length,
    approved: myCerts.filter((c) => c.status === "approved").length,
    rejected: myCerts.filter((c) => c.status === "rejected").length,
  };

  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";
  const studentName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Certificate Requests"
        subtitle="Recommend learners for certification — admins do the final approval."
        actions={
          <Button className="gradient-primary text-primary-foreground border-0 glow"
            onClick={() => { setStudentId(""); setCourseId(""); setScore(85); setNote(""); setOpen(true); }}>
            <Send className="mr-2 h-4 w-4" />New Request
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={counts.pending} icon={Clock} />
        <StatCard label="Approved" value={counts.approved} icon={CheckCircle2} delay={0.05} accent />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} delay={0.1} />
      </div>

      <Tabs defaultValue="eligible">
        <TabsList>
          <TabsTrigger value="eligible">Eligible students ({eligible.length})</TabsTrigger>
          <TabsTrigger value="history">My requests ({myCerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="eligible" className="mt-6">
          {eligible.length === 0 ? (
            <GlassCard className="text-center py-12 text-sm text-muted-foreground">
              No eligible students right now. Once learners enrol and progress through your courses they'll show up here.
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {eligible.map((r) => (
                <GlassCard key={`${r.studentId}-${r.courseId}`} className="flex flex-wrap items-center gap-4">
                  <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/15 text-primary text-xs font-bold">
                    {r.studentName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{r.studentName}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.courseName}</div>
                  </div>
                  <Badge variant="outline" className="border-border">{r.pct}% complete</Badge>
                  <Badge variant="outline" className="border-border">Quiz: {r.avgQuiz === null ? "—" : `${r.avgQuiz}%`}</Badge>
                  <Button size="sm" className="gradient-primary text-primary-foreground border-0"
                    onClick={() => openFor(r.studentId, r.courseId, r.avgQuiz ?? r.pct)}>
                    <Award className="h-4 w-4 mr-1.5" />Request
                  </Button>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {myCerts.length === 0 ? (
            <GlassCard className="text-center py-12 text-sm text-muted-foreground">No certificate requests yet.</GlassCard>
          ) : (
            <div className="space-y-3">
              {myCerts.map((c) => (
                <GlassCard key={c.id} className="flex flex-wrap items-center gap-4">
                  <Award className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{studentName(c.studentId)}</div>
                    <div className="text-xs text-muted-foreground truncate">{courseName(c.courseId)} · {c.id}</div>
                    {c.rejectionReason && <div className="text-xs text-destructive mt-1">Rejected: {c.rejectionReason}</div>}
                  </div>
                  <Badge variant="outline" className={
                    c.status === "approved" ? "border-success/40 text-success bg-success/10"
                    : c.status === "rejected" ? "border-destructive/40 text-destructive bg-destructive/10"
                    : "border-warning/40 text-warning bg-warning/10"
                  }>
                    {c.status}
                  </Badge>
                  <Badge variant="outline" className="border-border">{c.score}%</Badge>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recommend for certificate</DialogTitle>
            <DialogDescription>Admin approval required before the certificate is issued.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {myCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {(courses.find((c) => c.id === courseId)?.studentIds ?? []).map((sid) => {
                    const s = users.find((u) => u.id === sid);
                    return s ? <SelectItem key={sid} value={sid}>{s.name}</SelectItem> : null;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Score (%)</Label>
              <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Note for admin (optional)</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this learner ready?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="gradient-primary text-primary-foreground border-0">Submit request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}