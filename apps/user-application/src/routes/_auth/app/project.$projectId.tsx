import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, FileText, ListTodo, Search, Bot } from "lucide-react";

export const Route = createFileRoute("/_auth/app/project/$projectId")({
  component: ProjectDetails,
});

function ProjectDetails() {
  const { projectId } = Route.useParams();

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Details</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
             <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">ID: {projectId}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="documents" className="space-y-8">
        <TabsList className="w-full justify-start border-b h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="documents" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
          >
             <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Documents</span>
             </div>
          </TabsTrigger>
          <TabsTrigger 
            value="issues" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
          >
             <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                <span>Issues</span>
             </div>
          </TabsTrigger>
          <TabsTrigger 
            value="search" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
          >
             <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span>Search</span>
             </div>
          </TabsTrigger>
          <TabsTrigger 
            value="agent" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
          >
             <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span>Agent</span>
             </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-semibold">Documents</h2>
                <p className="text-sm text-muted-foreground">Manage your project knowledge base.</p>
             </div>
             <Button>
                <FileText className="mr-2 h-4 w-4" />
                Upload Document
             </Button>
          </div>
          <Card className="border-dashed border-2 shadow-none bg-secondary/5">
             <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <div className="rounded-full bg-secondary p-4 mb-4">
                    <Folder className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">No documents yet</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                    Upload documents to start building your project's knowledge base.
                </p>
                <Button variant="outline">Upload First Document</Button>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-semibold">Issues</h2>
                <p className="text-sm text-muted-foreground">Track and manage project tasks.</p>
             </div>
             <Button>
                <ListTodo className="mr-2 h-4 w-4" />
                Create Issue
             </Button>
          </div>
           <Card className="border-dashed border-2 shadow-none bg-secondary/5">
             <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <div className="rounded-full bg-secondary p-4 mb-4">
                    <ListTodo className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">No issues found</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                    Create issues to track tasks and bugs for this project.
                </p>
                <Button variant="outline">Create First Issue</Button>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-semibold">Hybrid Search</h2>
                <p className="text-sm text-muted-foreground">Search across all project documentation and issues.</p>
             </div>
          </div>
           <Card className="shadow-none">
             <CardContent className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="w-full max-w-lg relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input 
                        className="w-full h-12 pl-10 pr-4 rounded-md border bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Search for anything..." 
                    />
                </div>
                <p className="text-sm text-muted-foreground">
                    Try searching for "architecture", "api endpoints", or specific error codes.
                </p>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-semibold">AI Assistant</h2>
                <p className="text-sm text-muted-foreground">Chat with your project agent.</p>
             </div>
          </div>
           <Card className="shadow-none h-[600px] flex flex-col">
             <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="rounded-full bg-primary/10 p-6 mb-6">
                    <Bot className="h-12 w-12 text-primary" />
                </div>
                <h3 className="font-semibold text-2xl">How can I help you?</h3>
                <p className="text-muted-foreground max-w-md mt-4">
                    I have access to all your project documents and issues. Ask me anything about the project status, requirements, or code structure.
                </p>
             </CardContent>
             <div className="p-4 border-t bg-muted/20">
                <div className="flex gap-2">
                    <input 
                        className="flex-1 h-10 px-4 rounded-md border bg-background"
                        placeholder="Ask a question..."
                    />
                    <Button>Send</Button>
                </div>
             </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
