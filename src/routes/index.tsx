import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/store";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!user) nav({ to: "/login" });
    else nav({ to: `/${user.role}` as any });
  }, [user, nav]);
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-muted-foreground text-sm">Loading iTech Academy…</div>
    </div>
  );
}
