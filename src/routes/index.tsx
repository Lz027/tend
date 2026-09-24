import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tend" },
      { name: "description", content: "A lead workspace that turns enquiries into customers." },
      { property: "og:title", content: "Tend" },
      {
        property: "og:description",
        content: "A lead workspace that turns enquiries into customers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        void navigate({ to: "/dashboard", replace: true });
      } else {
        void navigate({ to: "/auth", replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-label="Loading"
      />
    </div>
  );
}
