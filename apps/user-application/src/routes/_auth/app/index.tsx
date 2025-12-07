import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Folder, FileText, ListTodo } from "lucide-react";
import { useState } from "react";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
import { ProjectCard } from "@/components/dashboard/project-card";

export const Route = createFileRoute("/_auth/app/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();

  const handleProjectClick = (projectId: string) => {
    navigate({ to: "/app/project/$projectId", params: { projectId } });
  };
  
  // Mock projects data
  const projects = [
    { id: "1", name: "Website Redesign", docs: 12, issues: 5, updatedAt: "2h ago" },
    { id: "2", name: "Mobile App API", docs: 8, issues: 2, updatedAt: "1d ago" },
    { id: "3", name: "Internal Tools", docs: 3, issues: 0, updatedAt: "3d ago" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
           Welcome back to your workspace.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Stats Tiles */}
        <Card className="shadow-none border-border/60 bg-secondary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
            <Folder className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border-border/60 bg-secondary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Issues</CardTitle>
            <ListTodo className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">7</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border-border/60 bg-secondary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">23</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-semibold tracking-tight">Projects</h2>
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Project
            </Button>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-4">
            {projects.map((project) => (
                <ProjectCard 
                  key={project.id}
                  name={project.name}
                  onClick={() => handleProjectClick(project.id)}
                />
            ))}
        </div>
      </div>

      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
