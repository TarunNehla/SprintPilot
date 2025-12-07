import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/dashboard/header";

// In a real app, we would check auth here
export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
     // Mock auth check
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-8">
        <Outlet />
      </main>
    </div>
  );
}
