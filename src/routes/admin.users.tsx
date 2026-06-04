import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Users as UsersIcon, GraduationCap, Shield } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useData, type User, type Role } from "@/lib/data-store";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/users")({ component: UserManagement });

const roleColors: Record<Role, string> = {
  admin: "border-primary/40 text-primary bg-primary/10",
  teacher: "border-warning/40 text-warning bg-warning/10",
  student: "border-success/40 text-success bg-success/10",
};

type Draft = { name: string; email: string; password: string; role: Role; status: "active" | "inactive" };
const emptyDraft: Draft = { name: "", email: "", password: "", role: "student", status: "active" };

function UserManagement() {
  const { users, addUser, updateUser, deleteUser } = useData();
  const [query, setQuery] = useState("");
  const [roleTab, setRoleTab] = useState<"all" | Role>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [revealedRow, setRevealedRow] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleTab === "all" || u.role === roleTab;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [users, roleTab, query]);

  const counts = useMemo(
    () => ({
      admin: users.filter((u) => u.role === "admin").length,
      teacher: users.filter((u) => u.role === "teacher").length,
      student: users.filter((u) => u.role === "student").length,
    }),
    [users],
  );

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setDraft({ name: u.name, email: u.email, password: u.password ?? "", role: u.role, status: u.status });
    setDialogOpen(true);
  };

  const save = () => {
    if (!draft.name.trim() || !draft.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!editing && draft.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (editing) {
      const patch: Partial<User> = { name: draft.name, email: draft.email, role: draft.role, status: draft.status };
      if (draft.password) patch.password = draft.password;
      updateUser(editing.id, patch);
      toast.success(`Updated ${draft.name}.`);
    } else {
      addUser({ ...draft, joinedAt: new Date().toISOString().slice(0, 10), courseIds: [] });
      toast.success(`Added ${draft.name}.`);
    }
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteUser(toDelete.id);
    toast.success(`Removed ${toDelete.name}.`);
    setToDelete(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Management"
        subtitle="Create, edit and assign learners and staff."
        actions={
          <Button onClick={openCreate} className="gradient-primary text-primary-foreground border-0 glow">
            <Plus className="mr-2 h-4 w-4" />Add User
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students" value={counts.student} icon={UsersIcon} />
        <StatCard label="Teachers" value={counts.teacher} icon={GraduationCap} delay={0.05} />
        <StatCard label="Admins" value={counts.admin} icon={Shield} delay={0.1} />
      </div>

      <GlassCard className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={roleTab} onValueChange={(v) => setRoleTab(v as typeof roleTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="student">Students</TabsTrigger>
              <TabsTrigger value="teacher">Teachers</TabsTrigger>
              <TabsTrigger value="admin">Admins</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {u.password ? (
                      <button
                        type="button"
                        onClick={() => setRevealedRow(revealedRow === u.id ? null : u.id)}
                        className="inline-flex items-center gap-1.5 hover:text-foreground"
                      >
                        {revealedRow === u.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {revealedRow === u.id ? u.password : "••••••••"}
                      </button>
                    ) : <span className="opacity-40">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${roleColors[u.role]}`}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs ${u.status === "active" ? "text-success" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.status === "active" ? "bg-success" : "bg-muted-foreground"}`} />
                      {u.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.joinedAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setToDelete(u)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    No users match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the user's details below." : "Create a new learner or staff member."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">{editing ? "Password (leave blank to keep current)" : "Password"}</Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  value={draft.password}
                  onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                  placeholder={editing ? "••••••••" : "At least 6 characters"}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    checked={draft.status === "active"}
                    onCheckedChange={(c) => setDraft({ ...draft, status: c ? "active" : "inactive" })}
                  />
                  <span className="text-sm text-muted-foreground">{draft.status === "active" ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="gradient-primary text-primary-foreground border-0">
              {editing ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {toDelete?.name} and unenroll them from all courses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
