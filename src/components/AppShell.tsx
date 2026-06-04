import { useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, BookOpen, BarChart3, Award, FileEdit, ClipboardCheck,
  GraduationCap, MessageSquare, Bell, Search, ChevronLeft, LogOut, Settings, FileCheck,
  Inbox,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const navByRole = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/certificates", label: "Certificates", icon: Award },
    { to: "/verify", label: "Verify Certificate", icon: ShieldCheck },
  ],
  teacher: [
    { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/teacher/content", label: "Content Builder", icon: FileEdit },
    { to: "/teacher/assessments", label: "Assessments", icon: ClipboardCheck },
    { to: "/teacher/students", label: "Student Progress", icon: Users },
    { to: "/teacher/certificates", label: "Certificate Requests", icon: FileCheck },
    { to: "/verify", label: "Verify Certificate", icon: ShieldCheck },
    { to: "/teacher/messages", label: "Messages", icon: MessageSquare },
  ],
  student: [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/student/courses", label: "My Courses", icon: BookOpen },
    { to: "/student/progress", label: "Progress", icon: BarChart3 },
    { to: "/student/certificates", label: "Certificates", icon: Award },
    { to: "/student/messages", label: "Messages", icon: MessageSquare },
  ],
} as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const { user, logout } = useAuth();
  const { notifications, messages, markAllNotifsRead, markNotifRead } = useData();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const myNotifs = useMemo(
    () => notifications.filter((n) => user && n.userId === user.id),
    [notifications, user],
  );
  const unreadNotifs = myNotifs.filter((n) => !n.read);
  const myMessages = useMemo(
    () => (user ? messages.filter((m) => m.toId === user.id) : []),
    [messages, user],
  );
  const unreadMsgs = myMessages.filter((m) => !m.read).length;

  if (!user) return <>{children}</>;
  const items = navByRole[user.role];

  const handleLogout = () => { logout(); nav({ to: "/login" }); };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    // Route search to most relevant list per role
    const q = encodeURIComponent(search.trim());
    if (user.role === "admin") nav({ to: "/admin/users", search: { q } as any });
    else if (user.role === "teacher") nav({ to: "/teacher/students", search: { q } as any });
    else nav({ to: "/student/courses", search: { q } as any });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="sticky top-0 h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col"
      >
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Logo collapsed={collapsed} />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const exact = (it as { exact?: boolean }).exact;
            const active = exact ? pathname === it.to : pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="active-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary"
                  />
                )}
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent transition"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-16 border-b border-border glass-strong flex items-center gap-4 px-6">
          <form onSubmit={onSearch} className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </form>
          <div className="flex-1 md:hidden" />

          <div className="flex items-center gap-1.5">
            {(user.role === "student" || user.role === "teacher") && (
              <Button variant="ghost" size="icon" className="relative" onClick={() => nav({ to: user.role === "teacher" ? "/teacher/messages" : "/student/messages" })}>
                <MessageSquare className="h-4 w-4" />
                {unreadMsgs > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />}
              </Button>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadNotifs.length > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground border-0">
                      {unreadNotifs.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="text-sm font-semibold">Notifications</div>
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={() => markAllNotifsRead(user.id)}
                      className="text-xs text-primary hover:underline"
                    >Mark all read</button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {myNotifs.length === 0 ? (
                    <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                      <Inbox className="mx-auto h-6 w-6 mb-2 opacity-40" />
                      No new notifications
                    </div>
                  ) : (
                    myNotifs.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markNotifRead(n.id)}
                        className={`w-full text-left px-4 py-3 border-b border-border/60 last:border-0 hover:bg-secondary/40 transition ${
                          n.read ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{n.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-2 flex items-center gap-2 rounded-lg pl-1 pr-3 py-1 hover:bg-secondary/60 transition">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/40">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                      {user.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-xs font-semibold">{user.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{user.role}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
                <DropdownMenuItem disabled><GraduationCap className="mr-2 h-4 w-4" />Help & Docs</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 p-6 lg:p-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
