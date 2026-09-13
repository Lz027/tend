import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell, ClipboardList, FileText, Gauge, LogOut, Menu, Route as RouteIcon,
  Sparkles, Users, X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { to: "/dashboard", label: "Overview", icon: Gauge },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/forms", label: "Forms", icon: FileText },
  { to: "/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/rules", label: "Rules", icon: RouteIcon },
] as const;

function NavItems({ close }: { close?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return <nav className="space-y-1" aria-label="Main navigation">{nav.map((item) => {
    const Icon = item.icon;
    const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
    return <Link key={item.to} to={item.to} onClick={close} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
      <Icon className="size-4" />{item.label}
    </Link>;
  })}</nav>;
}

export function useWorkspace() {
  return useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Sign in required");
      const { data: memberships, error } = await supabase.from("memberships").select("workspace_id, role, workspaces(id, name, timezone, currency)").eq("user_id", userData.user.id).limit(1);
      if (error) throw error;
      const membership = memberships?.[0];
      return { user: userData.user, membership: membership ?? null, workspace: membership?.workspaces ?? null };
    },
  });
}

export function AppShell({ children, title, action }: { children: ReactNode; title: string; action?: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = (data?.user.user_metadata?.full_name as string | undefined)?.slice(0, 2).toUpperCase() || data?.user.email?.slice(0, 2).toUpperCase() || "BL";
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };

  const sidebar = <div className="flex h-full flex-col bg-sidebar p-4">
    <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2 font-semibold text-sidebar-foreground">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>
      <span className="font-display text-xl">Poppy</span>
    </Link>
    <div className="mb-5 rounded-md border border-sidebar-border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">Workspace</p>
      <p className="mt-1 truncate text-sm font-semibold">{data?.workspace?.name ?? "Set up workspace"}</p>
    </div>
    <NavItems close={() => setMobileOpen(false)} />
    <div className="mt-auto border-t border-sidebar-border pt-4">
      <div className="flex items-center gap-3 px-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{initials}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{data?.user.user_metadata?.full_name || "Account"}</p><p className="truncate text-xs text-muted-foreground">{data?.user.email}</p></div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut /></Button>
      </div>
    </div>
  </div>;

  return <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
    <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-sidebar-border md:block">{sidebar}</aside>
    <div className="md:col-start-2">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-8">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0"><SheetTitle className="sr-only">Navigation</SheetTitle>{sidebar}</SheetContent>
        </Sheet>
        <h1 className="font-display text-2xl font-normal md:text-3xl">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications" title="Notifications"><Bell /></Button>
          {action}
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] p-4 md:p-8">{children}</main>
    </div>
  </div>;
}
