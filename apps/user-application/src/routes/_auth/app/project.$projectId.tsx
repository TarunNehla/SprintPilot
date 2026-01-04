import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Loader2, Search, Folder, FileText, ListTodo, Bot, ChevronRight, Home, Send, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { UploadDocumentDialog } from "@/components/dashboard/upload-document-dialog";
import { DocumentDetailsDialog } from "@/components/dashboard/document-details-dialog";
import { CreateIssueDialog } from "@/components/dashboard/create-issue-dialog";
import { IssueDetailsDialog } from "@/components/dashboard/issue-details-dialog";
import type { AgentResponse } from "@repo/data-ops/zod-schema/agent";



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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null); 
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  
  // Agent chat state
  const [agentQuery, setAgentQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
    sources?: AgentResponse["sources"];
  }>>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null); 

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

  // Agent query mutation
  const agentMutation = useMutation({
      mutationFn: (query: string) => api.queryAgent({ projectId, query }),
      onSuccess: (data) => {
          setChatMessages(prev => [...prev, {
              role: "assistant",
              content: data.answer,
              sources: data.sources
          }]);
      }
  });

  const handleAgentQuery = (e: React.FormEvent) => {
      e.preventDefault();
      if (!agentQuery.trim() || agentMutation.isPending) return;
      
      // Add user message
      setChatMessages(prev => [...prev, { role: "user", content: agentQuery }]);
      
      // Query agent
      agentMutation.mutate(agentQuery);
      setAgentQuery("");
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
      chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground">
            <Link to="/app" className="hover:text-foreground flex items-center gap-1 transition-colors">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="font-medium text-foreground">{project.name}</span>
        </nav>

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
             <Button onClick={() => setIsUploadOpen(true)}>
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
                <Button variant="outline" onClick={() => setIsUploadOpen(true)}>Upload First Document</Button>
             </CardContent>
          </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map(doc => (
                    <Card 
                        key={doc.id} 
                        className="cursor-pointer hover:border-primary transition-colors hover:shadow-md"
                        onClick={() => setSelectedDocId(doc.id)}
                    >
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
             <Button onClick={() => setIsCreateIssueOpen(true)}>
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
                <Button variant="outline" onClick={() => setIsCreateIssueOpen(true)}>Create First Issue</Button>
             </CardContent>
          </Card>
          ) : (
             <div className="space-y-4">
                {issues.map(issue => (
                    <Card 
                        key={issue.id} 
                        className="shadow-none border cursor-pointer hover:border-primary transition-colors hover:shadow-sm"
                        onClick={() => setSelectedIssueId(issue.id)}
                    >
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
                            <div 
                                key={result.chunkId} 
                                className="p-4 rounded-lg border bg-secondary/5 space-y-2 cursor-pointer hover:bg-secondary/10 transition-colors"
                                onClick={() => setSelectedDocId(result.docId)}
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-primary hover:underline">{result.docTitle}</h4>
                                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                        Score: {(result.score * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {result.textContent}
                                </p>
                                <p className="text-xs text-primary/70 mt-1">Click to view full document</p>
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
             <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                {chatMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="rounded-full bg-primary/10 p-6 mb-6">
                            <Bot className="h-12 w-12 text-primary" />
                        </div>
                        <h3 className="font-semibold text-2xl">How can I help you?</h3>
                        <p className="text-muted-foreground max-w-md mt-4">
                            I have access to all your project documents and issues. Ask me anything about the project status, requirements, or code structure.
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}>
                                    {msg.role === "assistant" && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Bot className="h-5 w-5 text-primary" />
                                        </div>
                                    )}
                                    <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
                                        <div className={`rounded-lg px-4 py-3 ${
                                            msg.role === "user" 
                                                ? "bg-primary text-primary-foreground" 
                                                : "bg-muted"
                                        }`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="space-y-1 w-full">
                                                <p className="text-xs font-medium text-muted-foreground">Sources:</p>
                                                {msg.sources.map((source, sIdx) => (
                                                    <button
                                                        key={sIdx}
                                                        onClick={() => {
                                                            if (source.type === "doc") {
                                                                setSelectedDocId(source.id);
                                                            } else {
                                                                setSelectedIssueId(source.id);
                                                            }
                                                        }}
                                                        className="flex items-center gap-2 text-xs text-primary hover:underline bg-background border rounded px-2 py-1"
                                                    >
                                                        {source.type === "doc" ? <FileText className="h-3 w-3" /> : <ListTodo className="h-3 w-3" />}
                                                        <span>{source.title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {msg.role === "user" && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                            <User className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {agentMutation.isPending && (
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Bot className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="bg-muted rounded-lg px-4 py-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                            <div ref={chatScrollRef} />
                        </div>
                    </ScrollArea>
                )}
             </CardContent>
             <div className="p-4 border-t bg-muted/20">
                <form onSubmit={handleAgentQuery} className="flex gap-2">
                    <input 
                        value={agentQuery}
                        onChange={(e) => setAgentQuery(e.target.value)}
                        className="flex-1 h-10 px-4 rounded-md border bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Ask a question..."
                        disabled={agentMutation.isPending}
                    />
                    <Button type="submit" disabled={agentMutation.isPending || !agentQuery.trim()}>
                        {agentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
             </div>
          </Card>
        </TabsContent>
      </Tabs>

      <UploadDocumentDialog 
        projectId={projectId} 
        open={isUploadOpen} 
        onOpenChange={setIsUploadOpen} 
      />

      <DocumentDetailsDialog 
        projectId={projectId} 
        documentId={selectedDocId} 
        open={!!selectedDocId} 
        onOpenChange={(open) => !open && setSelectedDocId(null)} 
      />

      <CreateIssueDialog 
        projectId={projectId} 
        open={isCreateIssueOpen} 
        onOpenChange={setIsCreateIssueOpen} 
      />

      <IssueDetailsDialog 
        projectId={projectId} 
        issueId={selectedIssueId} 
        open={!!selectedIssueId} 
        onOpenChange={(open) => !open && setSelectedIssueId(null)} 
      />
    </div>
  );
}
