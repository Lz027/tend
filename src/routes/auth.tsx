import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in | Poppy" },
    { name: "description", content: "Sign in to your Poppy lead workspace." },
    { property: "og:title", content: "Sign in | Poppy" },
    { property: "og:description", content: "Sign in to your Poppy lead workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { if (data.user) void navigate({ to: "/dashboard", replace: true }); }); }, [navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();
    if (mode === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
      if (resetError) setError(resetError.message); else setMessage("Check your email for a password reset link.");
    } else if (mode === "signup") {
      const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth` } });
      if (authError) setError(authError.message); else if (data.session) await navigate({ to: "/dashboard" }); else setMessage("Check your email to confirm your account.");
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message); else await navigate({ to: "/dashboard" });
    }
    setBusy(false);
  };

  const google = async () => {
    setBusy(true); setError("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) { setError(result.error.message); setBusy(false); }
    else if (!result.redirected) await navigate({ to: "/dashboard" });
  };

  return <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
    <section className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col">
      <div className="flex items-center gap-3 font-semibold"><span className="flex size-9 items-center justify-center rounded-md bg-primary-foreground/15"><Flower2 /></span><span className="font-display text-2xl">Poppy</span></div>
      <div className="my-auto max-w-xl"><p className="mb-5 text-sm font-semibold uppercase tracking-wider text-primary-foreground/70">A clearer path from enquiry to customer</p><h1 className="font-display text-6xl leading-[1.05]">Every lead, qualified and moving forward.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-primary-foreground/75">Capture enquiries, score intent, route ownership, and keep every follow-up visible.</p></div>
      <p className="text-sm text-primary-foreground/60">Built for teams that value momentum.</p>
    </section>
    <section className="flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-2 lg:hidden"><span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Flower2 className="size-4" /></span><span className="font-display text-2xl">Poppy</span></div>
        <p className="text-sm font-semibold text-primary">{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Welcome back"}</p>
        <h2 className="mt-2 font-display text-4xl">{mode === "signup" ? "Start your workspace" : mode === "reset" ? "Get a reset link" : "Sign in to continue"}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === "signup" ? "Turn new enquiries into timely conversations." : "Your leads and follow-ups are waiting."}</p>
        {mode !== "reset" && <Button variant="outline" className="mt-8 h-11 w-full" onClick={google} disabled={busy}><span className="text-base font-bold">G</span> Continue with Google</Button>}
        {mode !== "reset" && <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" /></div>}
        <form onSubmit={submit} className={mode === "reset" ? "mt-8 space-y-5" : "space-y-5"}>
          {mode === "signup" && <div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" autoComplete="name" required /></div>}
          <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
          {mode !== "reset" && <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label>{mode === "signin" && <button type="button" className="text-xs font-medium text-primary" onClick={() => setMode("reset")}>Forgot password?</button>}</div><div className="relative"><Input id="password" name="password" type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required className="pr-11"/><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></div>}
          {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {message && <p className="rounded-md bg-accent p-3 text-sm text-accent-foreground">{message}</p>}
          <Button className="h-11 w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}<ArrowRight /></Button>
        </form>
        <p className="mt-7 text-center text-sm text-muted-foreground">{mode === "signup" ? "Already have an account?" : "New to Poppy?"} <button className="font-semibold text-primary" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Sign in" : "Create an account"}</button></p>
      </div>
    </section>
  </main>;
}
