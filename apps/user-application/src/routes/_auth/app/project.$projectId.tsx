import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Loader2, Search, Folder, FileText, ListTodo, Bot } from "lucide-react";
import { useState } from "react";
// ... (other imports)



export const Route = createFileRoute("/_auth/app/project/$projectId")({
  component: ProjectDetails,
});

function ProjectDetails() {
  const { projectId } = Route.useParams();

  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId),
  });

  const { data: docs = [], isLoading: isDocsLoading } = useQuery({
    queryKey: ["project", projectId, "docs"],
    queryFn: () => api.getProjectDocs(projectId),
  });

  const { data: issues = [], isLoading: isIssuesLoading } = useQuery({
    queryKey: ["project", projectId, "issues"],
    queryFn: () => api.getProjectIssues(projectId),
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]); 

  const searchMutation = useMutation({
      mutationFn: (query: string) => api.search({
          projectId,
          query,
          config: { limit: 5, hybridWeight: 0.5, offset: 0, topK: 5 }
      }),
      onSuccess: (data) => {
          setSearchResults(data.results);
      }
  });

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      searchMutation.mutate(searchQuery);
  }

  if (isProjectLoading) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  if (!project) {
      return <div className="p-8 text-center text-muted-foreground">Project not found</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
             <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">ID: {projectId}</span>
          </div>
          {project.description && <p className="mt-2 text-muted-foreground">{project.description}</p>}
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
          
          {isDocsLoading ? (
               <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : docs.length === 0 ? (
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
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map(doc => (
                    <Card key={doc.id} className="cursor-pointer hover:border-primary transition-colors">
                        <CardContent className="p-6 space-y-2">
                             <div className="flex items-start justify-between">
                                <FileText className="h-5 w-5 text-primary" />
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    doc.docType === 'design' ? 'bg-blue-100 text-blue-700' :
                                    doc.docType === 'note' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {doc.docType}
                                </span>
                             </div>
                             <div>
                                <h3 className="font-semibold truncate" title={doc.title}>{doc.title}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Last updated: {new Date(doc.updatedAt).toLocaleDateString()}
                                </p>
                             </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
          )}
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
          
          {isIssuesLoading ? (
               <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : issues.length === 0 ? (
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
          ) : (
             <div className="space-y-4">
                {issues.map(issue => (
                    <Card key={issue.id} className="shadow-none border cursor-pointer hover:border-primary transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{issue.title}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                                        issue.status === 'open' ? 'bg-green-100 text-green-700' :
                                        issue.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {issue.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>Priority: <span className={`capitalize ${
                                        issue.priority === 'high' ? 'text-red-500 font-medium' :
                                        issue.priority === 'medium' ? 'text-yellow-600' :
                                        'text-green-600'
                                    }`}>{issue.priority}</span></span>
                                    <span>Created: {new Date(issue.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
          )}
        </TabsContent>




        <TabsContent value="search" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-semibold">Hybrid Search</h2>
                <p className="text-sm text-muted-foreground">Search across all project documentation and issues.</p>
             </div>
          </div>
           <Card className="shadow-none">
             <CardContent className="p-6 space-y-6">
                <form onSubmit={handleSearch} className="w-full relative">
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 pl-10 pr-24 rounded-md border bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Search for anything..." 
                    />
                    <Button 
                        type="submit" 
                        size="sm" 
                        className="absolute right-2 top-2"
                        disabled={searchMutation.isPending}
                    >
                        {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                    </Button>
                </form>

                {searchResults.length > 0 ? (
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-medium text-muted-foreground">Results</h3>
                        {searchResults.map((result) => (
                            <div key={result.chunkId} className="p-4 rounded-lg border bg-secondary/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-primary">{result.docTitle}</h4>
                                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                        Score: {(result.score * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {result.textContent}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Try searching for "architecture", "api endpoints", or specific error codes.
                    </p>
                )}
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
