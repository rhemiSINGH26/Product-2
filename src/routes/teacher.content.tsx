import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, GripVertical, Video, FileText, BookOpen, FlaskConical,
  Link2, Download, ChevronDown, Image as ImageIcon, Presentation, ClipboardList,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard } from "@/components/ui-kit";
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
import { useData, type ContentType, type ContentItem } from "@/lib/data-store";
import { useAuth } from "@/lib/store";
import { FileUploadButton } from "@/components/FileUploadButton";
import { RichTextEditor } from "@/components/RichTextEditor";

export const Route = createFileRoute("/teacher/content")({ component: ContentBuilder });

const typeMeta: Record<ContentType, { icon: typeof Video; label: string; color: string }> = {
  video: { icon: Video, label: "Video", color: "text-primary" },
  pdf: { icon: FileText, label: "PDF", color: "text-warning" },
  reading: { icon: BookOpen, label: "Reading", color: "text-success" },
  lab: { icon: FlaskConical, label: "Lab", color: "text-primary" },
  link: { icon: Link2, label: "Link", color: "text-muted-foreground" },
  download: { icon: Download, label: "Download", color: "text-muted-foreground" },
  image: { icon: ImageIcon, label: "Image", color: "text-primary" },
  ppt: { icon: Presentation, label: "Slides", color: "text-warning" },
  assessment: { icon: ClipboardList, label: "Assessment", color: "text-primary" },
};

type ItemDraft = { type: ContentType; title: string; url: string; duration: string; fileSize: string; body: string; assessmentId: string };
const emptyItem: ItemDraft = { type: "video", title: "", url: "", duration: "", fileSize: "", body: "", assessmentId: "" };

const fileSizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 ? 1 : 2)} MB`;

function ContentBuilder() {
  const { user } = useAuth();
  const {
    courses, assessments, addSection, updateSection, deleteSection, addItem, updateItem, deleteItem, updateAssessment,
  } = useData();

  const myCourses = useMemo(
    () => courses.filter((c) => !user || user.role !== "teacher" || c.teacherId === user.id),
    [courses, user],
  );
  const myCourseIds = useMemo(() => new Set(myCourses.map((c) => c.id)), [myCourses]);
  const [courseId, setCourseId] = useState<string>("");
  useEffect(() => {
    if (!courseId && myCourses[0]) setCourseId(myCourses[0].id);
  }, [myCourses, courseId]);

  const course = courses.find((c) => c.id === courseId);
  // Show ALL of the teacher's assessments so they can attach any of them; saving will rebind courseId if needed.
  const pickableAssessments = useMemo(
    () => assessments.filter((a) => myCourseIds.has(a.courseId)),
    [assessments, myCourseIds],
  );
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // section dialog
  const [sectionDialog, setSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");

  // item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [itemSectionId, setItemSectionId] = useState<string>("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyItem);

  const [del, setDel] = useState<{ kind: "section" | "item"; sectionId: string; itemId?: string; label: string } | null>(null);

  const openAddSection = () => { setEditingSection(null); setSectionTitle(""); setSectionDialog(true); };
  const openEditSection = (id: string, title: string) => { setEditingSection(id); setSectionTitle(title); setSectionDialog(true); };
  const saveSection = () => {
    if (!sectionTitle.trim()) { toast.error("Section title is required."); return; }
    if (!course) return;
    if (editingSection) { updateSection(course.id, editingSection, sectionTitle.trim()); toast.success("Section updated."); }
    else { addSection(course.id, sectionTitle.trim()); toast.success("Section added."); }
    setSectionDialog(false);
  };

  const openAddItem = (sectionId: string) => {
    setItemSectionId(sectionId); setEditingItemId(null); setItemDraft(emptyItem); setItemDialog(true);
  };
  const openEditItem = (sectionId: string, item: ContentItem) => {
    setItemSectionId(sectionId); setEditingItemId(item.id);
    setItemDraft({
      type: item.type, title: item.title, url: item.url ?? "",
      duration: item.duration ? String(item.duration) : "", fileSize: item.fileSize ?? "", body: item.body ?? "", assessmentId: item.assessmentId ?? "",
    });
    setItemDialog(true);
  };
  const saveItem = () => {
    if (!itemDraft.title.trim()) { toast.error("Title is required."); return; }
    if (!course) return;
    if (itemDraft.type === "assessment" && !itemDraft.assessmentId) { toast.error("Choose an assessment."); return; }
    const payload: Omit<ContentItem, "id"> = {
      type: itemDraft.type,
      title: itemDraft.title.trim(),
      url: itemDraft.url.trim() || undefined,
      duration: itemDraft.duration ? Number(itemDraft.duration) : undefined,
      fileSize: itemDraft.fileSize.trim() || undefined,
      body: itemDraft.body.trim() || undefined,
      assessmentId: itemDraft.type === "assessment" ? itemDraft.assessmentId || undefined : undefined,
    };
    if (editingItemId) { updateItem(course.id, itemSectionId, editingItemId, payload); toast.success("Content updated."); }
    else { addItem(course.id, itemSectionId, payload); toast.success("Content added."); }
    // Rebind the assessment to this course so it lives in the right place.
    if (itemDraft.type === "assessment" && itemDraft.assessmentId) {
      const linked = assessments.find((a) => a.id === itemDraft.assessmentId);
      if (linked && linked.courseId !== course.id) updateAssessment(linked.id, { courseId: course.id });
    }
    setItemDialog(false);
  };

  const confirmDelete = () => {
    if (!del || !course) return;
    if (del.kind === "section") deleteSection(course.id, del.sectionId);
    else if (del.itemId) deleteItem(course.id, del.sectionId, del.itemId);
    toast.success("Removed.");
    setDel(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Content Builder"
        subtitle="Build sections with video, PDF, reading, labs, links & files."
        actions={
          course && (
            <Button onClick={openAddSection} className="gradient-primary text-primary-foreground border-0 glow">
              <Plus className="mr-2 h-4 w-4" />Add Section
            </Button>
          )
        }
      />

      <GlassCard className="flex flex-wrap items-center gap-4">
        <Label className="text-sm">Editing course</Label>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select a course" /></SelectTrigger>
          <SelectContent>
            {myCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.thumbnail} {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {course && (
          <Badge variant="outline" className="ml-auto border-border">
            {course.sections.length} sections · {course.sections.reduce((n, s) => n + s.items.length, 0)} items
          </Badge>
        )}
      </GlassCard>

      {myCourses.length === 0 && (
        <GlassCard className="text-center py-12 text-sm text-muted-foreground">
          No courses assigned to you yet.
        </GlassCard>
      )}

      {course && course.sections.length === 0 && (
        <GlassCard className="text-center py-12">
          <p className="text-sm text-muted-foreground">No sections yet. Add your first section to start building.</p>
          <Button onClick={openAddSection} className="mt-4 gradient-primary text-primary-foreground border-0">
            <Plus className="mr-2 h-4 w-4" />Add Section
          </Button>
        </GlassCard>
      )}

      <div className="space-y-4">
        {course?.sections.map((sec, i) => {
          const isOpen = open[sec.id] ?? true;
          return (
            <motion.div key={sec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard className="p-0 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-border">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                  <button
                    className="flex items-center gap-2 flex-1 text-left"
                    onClick={() => setOpen((o) => ({ ...o, [sec.id]: !isOpen }))}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                    <span className="font-semibold">{sec.title}</span>
                    <Badge variant="outline" className="border-border text-xs">{sec.items.length}</Badge>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => openAddItem(sec.id)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />Content
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEditSection(sec.id, sec.title)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                    onClick={() => setDel({ kind: "section", sectionId: sec.id, label: sec.title })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <div className="divide-y divide-border">
                        {sec.items.map((it) => {
                          const m = typeMeta[it.type];
                          const Icon = m.icon;
                          return (
                            <div key={it.id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition">
                              <div className={`h-8 w-8 grid place-items-center rounded-lg bg-secondary/60 ${m.color}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{it.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {m.label}
                                  {it.duration ? ` · ${it.duration} min` : ""}
                                  {it.fileSize ? ` · ${it.fileSize}` : ""}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => openEditItem(sec.id, it)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                                onClick={() => setDel({ kind: "item", sectionId: sec.id, itemId: it.id, label: it.title })}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                        {sec.items.length === 0 && (
                          <div className="px-5 py-6 text-center text-xs text-muted-foreground">No content yet — add a video, reading or lab.</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Section dialog */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? "Rename section" : "Add section"}</DialogTitle>
            <DialogDescription>Sections group your content into modules.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="sectitle">Section title</Label>
            <Input id="sectitle" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="e.g. Getting Started" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(false)}>Cancel</Button>
            <Button onClick={saveSection} className="gradient-primary text-primary-foreground border-0">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Edit content" : "Add content"}</DialogTitle>
            <DialogDescription>Choose a content type and fill in the details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={itemDraft.type} onValueChange={(v) => setItemDraft({ ...itemDraft, type: v as ContentType, url: "", body: "", assessmentId: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(typeMeta) as ContentType[]).map((t) => (
                    <SelectItem key={t} value={t}>{typeMeta[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ititle">Title</Label>
              <Input id="ititle" value={itemDraft.title} onChange={(e) => setItemDraft({ ...itemDraft, title: e.target.value })} placeholder="e.g. Welcome & Overview" />
            </div>
            {(itemDraft.type === "reading" || itemDraft.type === "lab") ? (
              <div className="space-y-2">
                <Label htmlFor="ibody">
                  {itemDraft.type === "reading" ? "Reading content" : "Lab instructions"}
                </Label>
                <RichTextEditor
                  value={itemDraft.body}
                  onChange={(html) => setItemDraft({ ...itemDraft, body: html })}
                  placeholder={itemDraft.type === "reading"
                    ? "Write the reading material here — use bold, headings, lists, colours…"
                    : "Write the lab instructions, steps, and notes here…"}
                  minHeight={260}
                />
              </div>
            ) : itemDraft.type === "assessment" ? (
              <div className="space-y-2">
                <Label>Assessment</Label>
                <Select value={itemDraft.assessmentId} onValueChange={(v) => setItemDraft({ ...itemDraft, assessmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose an assessment" /></SelectTrigger>
                  <SelectContent>
                    {pickableAssessments.map((a) => {
                      const c = courses.find((x) => x.id === a.courseId);
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {a.title}{a.isFinal ? " · Final" : ""}{c && c.id !== courseId ? ` (from ${c.name})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {pickableAssessments.length === 0 && <p className="text-xs text-muted-foreground">Create an assessment first from the Assessments page.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="iurl">URL</Label>
                <Input id="iurl" value={itemDraft.url} onChange={(e) => setItemDraft({ ...itemDraft, url: e.target.value })} placeholder="https://..." />
                {(["video", "pdf", "image", "ppt"] as ContentType[]).includes(itemDraft.type) && (
                  <FileUploadButton
                    accept={itemDraft.type === "image" ? "image/*" : itemDraft.type === "ppt" ? ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" : itemDraft.type === "pdf" ? "application/pdf" : "video/*"}
                    label={`Upload ${typeMeta[itemDraft.type].label}`}
                    onUpload={(dataUrl, file) => setItemDraft((d) => ({ ...d, url: dataUrl, fileSize: fileSizeLabel(file.size), title: d.title || file.name }))}
                  />
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {(itemDraft.type === "video" || itemDraft.type === "lab") && (
                <div className="space-y-2">
                  <Label htmlFor="idur">Duration (min)</Label>
                  <Input id="idur" type="number" value={itemDraft.duration} onChange={(e) => setItemDraft({ ...itemDraft, duration: e.target.value })} placeholder="12" />
                </div>
              )}
              {(["pdf", "download", "image", "ppt"] as ContentType[]).includes(itemDraft.type) && (
                <div className="space-y-2">
                  <Label htmlFor="isize">File size</Label>
                  <Input id="isize" value={itemDraft.fileSize} onChange={(e) => setItemDraft({ ...itemDraft, fileSize: e.target.value })} placeholder="2.4 MB" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem} className="gradient-primary text-primary-foreground border-0">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {del?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              "{del?.label}" will be permanently removed{del?.kind === "section" ? " along with its content" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
