import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — iTech Academy" },
      { name: "description", content: "Access your iTech Academy learning portal." },
    ],
  }),
  component: LoginPage,
});


function LoginPage() {
  const { user, login, register, initializeSession } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (user) nav({ to: `/${user.role}` as any });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "signup") {
      if (pwd !== confirm) { setError("Passwords do not match."); return; }
      const res = await register({ name, email, password: pwd });
      if (!res.ok) { setError(res.error); toast.error(res.error); return; }
      toast.success("Account created — welcome!");
      nav({ to: "/student" });
      return;
    }
    if (!email.trim() || !pwd) {
      setError("Email and password are required.");
      return;
    }
    const res = await login(email, pwd);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    toast.success("Welcome back!");
    nav({ to: `/${res.role}` as any });
  };

  return (
    <div className="min-h-screen relative grid lg:grid-cols-2 overflow-hidden">
      <div className="relative hidden lg:flex flex-col justify-between p-12 border-r border-border bg-sidebar overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
        <div className="absolute top-1/4 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative"><Logo /></div>

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Private learning platform
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Learn fast.<br/>
            <span className="gradient-text">Build the future.</span>
          </h1>
          <p className="text-muted-foreground max-w-md">
            iTech Academy is an invite-only learning environment. Three roles, one mission: mastery.
          </p>
        </div>

        <div className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} iTech Academy</div>
      </div>

      <div className="relative flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "Sign in to access your learning dashboard." : "Join iTech Academy as a student."}
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-xl bg-secondary/40 p-1">
            <button type="button" onClick={() => { setMode("login"); setError(null); }}
              className={`h-9 rounded-lg text-sm font-medium transition ${mode === "login" ? "bg-background shadow" : "text-muted-foreground"}`}>
              Sign in
            </button>
            <button type="button" onClick={() => { setMode("signup"); setError(null); }}
              className={`h-9 rounded-lg text-sm font-medium transition ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}>
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11 bg-secondary/60" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9 h-11 bg-secondary/60" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="pwd" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 h-11 bg-secondary/60" />
              </div>
            </div>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirm" type="password" value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-11 bg-secondary/60" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground border-0 hover:opacity-90 glow group">
              {mode === "login" ? "Sign in" : "Create account"}
              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
            </Button>
          </form>

          {mode === "login" && (
            <p className="text-sm text-muted-foreground">
              Use your registered account credentials to sign in.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
