import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, trend, accent = false, delay = 0,
}: {
  label: string; value: string | number; icon: LucideIcon;
  trend?: string; accent?: boolean; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5 ${
        accent ? "gradient-primary text-primary-foreground border-transparent glow" : "glass border-border hover:border-primary/40"
      }`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition" style={{ background: accent ? undefined : "var(--gradient-radial)" }} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className={`text-xs uppercase tracking-wider ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          {trend && (
            <div className={`mt-1 text-xs ${accent ? "text-primary-foreground/90" : "text-success"}`}>{trend}</div>
          )}
        </div>
        <div className={`h-10 w-10 grid place-items-center rounded-xl ${accent ? "bg-white/20" : "bg-primary/15 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-6 ${className}`}>{children}</div>;
}
