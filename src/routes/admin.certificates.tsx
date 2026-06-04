import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Award, CheckCircle2, XCircle, Clock, Search, ShieldCheck, Printer, Download, Eye } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/lib/data-store";
import { openPrintableCertificate } from "@/lib/certificate";
import { downloadCSV } from "@/lib/exports";
import type { Certificate } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/certificates")({ component: AdminCertificates });

function AdminCertificates() {
  const { certificates, users, courses, approveCertificate, rejectCertificate } = useData();
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState<Certificate | null>(null);
  const [reason, setReason] = useState("");
  const [viewingLog, setViewingLog] = useState<Certificate | null>(null);
  const [verifyId, setVerifyId] = useState("");
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; cert?: Certificate }>(null);

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const userEmail = (id: string) => users.find((u) => u.id === id)?.email ?? "—";
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return certificates.filter((c) => {
      if (c.status !== tab) return false;
      if (!query) return true;
      return (
        userName(c.studentId).toLowerCase().includes(query) ||
        courseName(c.courseId).toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query)
      );
    });
  }, [certificates, tab, q, users, courses]);

  const counts = {
    pending: certificates.filter((c) => c.status === "pending").length,
    approved: certificates.filter((c) => c.status === "approved").length,
    rejected: certificates.filter((c) => c.status === "rejected").length,
  };

  const handleReject = () => {
    if (!rejecting) return;
    rejectCertificate(rejecting.id, reason.trim() || undefined);
    toast.success("Request rejected");
    setRejecting(null); setReason("");
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Certificate Approvals" subtitle="Review teacher recommendations and issue certificates." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={counts.pending} icon={Clock} />
        <StatCard label="Approved" value={counts.approved} icon={CheckCircle2} delay={0.05} accent />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} delay={0.1} />
      </div>

      <div className="flex flex-wrap gap-3 justify-between items-center">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-9" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value={tab} className="mt-0">
          {filtered.length === 0 ? (
            <GlassCard className="text-center py-16">
              <Award className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <div className="text-sm text-muted-foreground">No {tab} requests.</div>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => (
                <GlassCard key={c.id} className="flex flex-wrap items-center gap-4">
                  <div className="h-10 w-10 grid place-items-center rounded-xl gradient-primary text-primary-foreground">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{userName(c.studentId)}</div>
                    <div className="text-xs text-muted-foreground truncate">{userEmail(c.studentId)} · {courseName(c.courseId)}</div>
                    {c.teacherNote && <div className="text-xs text-muted-foreground mt-1 italic">"{c.teacherNote}"</div>}
                    {c.rejectionReason && <div className="text-xs text-destructive mt-1">Reason: {c.rejectionReason}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">Score {c.score}%</Badge>
                    <div className="text-[10px] text-muted-foreground mt-1">Requested {c.requestedAt}</div>
                    {c.issuedAt && <div className="text-[10px] text-muted-foreground">Issued {c.issuedAt}</div>}
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{c.id}</div>
                  </div>
                  {c.status === "pending" && (
                    <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setRejecting(c); setReason(""); }}>
                        <XCircle className="h-4 w-4 mr-1.5" />Reject
                      </Button>
                      <Button size="sm" className="gradient-primary text-primary-foreground border-0"
                        onClick={() => { approveCertificate(c.id); toast.success("Certificate issued"); }}>
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />Approve
                      </Button>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject certificate request</DialogTitle>
            <DialogDescription>Optionally include a reason — the student will see it in their notifications.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}