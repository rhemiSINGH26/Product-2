import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, Users as UsersIcon, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useData, type Course } from "@/lib/data-store";
import { EmojiPicker } from "@/components/EmojiPicker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/admin/courses")({ component: CourseManagement });

const statusColors: Record<Course["status"], string> = {
  active: "border-success/40 text-success bg-success/10",
  draft: "border-warning/40 text-warning bg-warning/10",
  archived: "border-border text-muted-foreground bg-secondary/40",
};

type StudentAccessDraft = { accessMode: "lifetime" | "limited"; endDate?: string };
type Draft = {
  name: string; code: string; description: string; thumbnail: string;
  teacherId: string; status: Course["status"];
  studentIds: string[];
  studentAccess: Record<string, StudentAccessDraft>;
};
const emptyDraft: Draft = {
  name: "", code: "", description: "", thumbnail: "📘",
  teacherId: "", status: "draft", studentIds: [], studentAccess: {},
};

function CourseManagement() {
  const { courses, users, addCourse, updateCourse, deleteCourse } = useData();
  const teachers = useMemo(() => users.filter((u) => u.role === "teacher"), [users]);
  const students = useMemo(() => users.filter((u) => u.role === "student"), [users]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [toDelete, setToDelete] = useState<Course | null>(null);

  const teacherName = (id: string) => users.find((u) => u.id === id)?.name ?? "Unassigned";

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, teacherId: teachers[0]?.id ?? "" });
    setDialogOpen(true);
  };
  const openEdit = (c: Course) => {
    setEditing(c);
    setDraft({
      name: c.name, code: c.code, description: c.description, thumbnail: c.thumbnail,
      teacherId: c.teacherId, status: c.status,
      studentIds: [...c.studentIds],
      studentAccess: { ...(c.studentAccess ?? {}) },
    });
    setDialogOpen(true);
  };

  const toggleStudent = (id: string) =>
    setDraft((d) => {
      const has = d.studentIds.includes(id);
      const studentIds = has ? d.studentIds.filter((s) => s !== id) : [...d.studentIds, id];
      const studentAccess = { ...d.studentAccess };
      if (has) delete studentAccess[id];
      else if (!studentAccess[id]) studentAccess[id] = { accessMode: "lifetime" };
      return { ...d, studentIds, studentAccess };
    });

  const setStudentAccess = (id: string, patch: Partial<StudentAccessDraft>) =>
    setDraft((d) => ({
      ...d,
      studentAccess: {
        ...d.studentAccess,
        [id]: { accessMode: "lifetime", ...(d.studentAccess[id] ?? {}), ...patch },
      },
    }));

  const save = () => {
    if (!draft.name.trim() || !draft.code.trim()) {
      toast.error("Course name and code are required.");
      return;
    }
    for (const sid of draft.studentIds) {
      const a = draft.studentAccess[sid];
      if (a?.accessMode === "limited" && !a.endDate) {
        toast.error(`Set an end date for ${users.find((u) => u.id === sid)?.name ?? "student"}.`);
        return;
      }
    }
    const payload = {
      ...draft,
      // legacy fields kept for backward compat
      startDate: "",
      endDate: "",
      accessMode: "lifetime" as const,
    };
    if (editing) {
      updateCourse(editing.id, payload);
      toast.success(`Updated ${draft.name}.`);
    } else {
      addCourse(payload);
      toast.success(`Created ${draft.name}.`);
    }
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteCourse(toDelete.id);
    toast.success(`Deleted ${toDelete.name}.`);
    setToDelete(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Course Management"
        subtitle="Create courses, assign teachers and enroll students."
        actions={
          <Button onClick={openCreate} className="gradient-primary text-primary-foreground border-0 glow">
            <Plus className="mr-2 h-4 w-4" />Create Course
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Courses" value={courses.length} icon={BookOpen} />
        <StatCard label="Active" value={courses.filter((c) => c.status === "active").length} icon={GraduationCap} delay={0.05} />
        <StatCard label="Enrollments" value={courses.reduce((n, c) => n + c.studentIds.length, 0)} icon={UsersIcon} delay={0.1} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
          >
            <GlassCard className="h-full flex flex-col hover:border-primary/40 transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 grid place-items-center rounded-xl bg-primary/10 text-2xl">{c.thumbnail}</div>
                  <div>
                    <div className="font-semibold leading-tight">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.code}</div>
                  </div>
                </div>
                <Badge variant="outline" className={`capitalize ${statusColors[c.status]}`}>{c.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2 flex-1">{c.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />{teacherName(c.teacherId)}</span>
                <span className="inline-flex items-center gap-1.5"><UsersIcon className="h-3.5 w-3.5" />{c.studentIds.length} students</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(c)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setToDelete(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit course" : "Create course"}</DialogTitle>
            <DialogDescription>Set up course details, assign a teacher and enroll students.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cname">Course name</Label>
              <Input id="cname" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Full Stack MERN Development" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccode">Course code</Label>
              <Input id="ccode" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="e.g. ITA-101" />
            </div>
            <div className="space-y-2">
              <Label>Emoji icon</Label>
              <EmojiPicker value={draft.thumbnail} onChange={(v) => setDraft({ ...draft, thumbnail: v })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cdesc">Description</Label>
              <Textarea id="cdesc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} placeholder="What learners will achieve" />
            </div>
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={draft.teacherId} onValueChange={(v) => setDraft({ ...draft, teacherId: v })}>
                <SelectTrigger><SelectValue placeholder="Assign a teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as Course["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cstart">Start date</Label>
              <Input id="cstart" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cend">End date {draft.accessMode === "limited" && <span className="text-destructive">*</span>}</Label>
              <Input id="cend" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} disabled={draft.accessMode === "lifetime"} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Student access</Label>
              <RadioGroup
                value={draft.accessMode}
                onValueChange={(v) => setDraft({ ...draft, accessMode: v as Course["accessMode"] })}
                className="flex gap-3"
              >
                <Label className="flex-1 flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="lifetime" id="am-life" />
                  <div><div className="text-sm font-medium">Lifetime</div><div className="text-xs text-muted-foreground">Never expires</div></div>
                </Label>
                <Label className="flex-1 flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="limited" id="am-lim" />
                  <div><div className="text-sm font-medium">Limited</div><div className="text-xs text-muted-foreground">Locks after end date</div></div>
                </Label>
              </RadioGroup>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Enrolled students ({draft.studentIds.length})</Label>
              <ScrollArea className="h-44 rounded-xl border border-border p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/50 cursor-pointer">
                      <Checkbox checked={draft.studentIds.includes(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                      <span className="truncate">{s.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="gradient-primary text-primary-foreground border-0">
              {editing ? "Save changes" : "Create course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {toDelete?.name} along with its content and assessments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
