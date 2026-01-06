import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Loader2, Search, Folder, FileText, ListTodo, Bot, ChevronRight, Home, Send, User, Trash2, Sparkles, Wand2, Copy, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { UploadDocumentDialog } from "@/components/dashboard/upload-document-dialog";
import { DocumentDetailsDialog } from "@/components/dashboard/document-details-dialog";
import { CreateIssueDialog } from "@/components/dashboard/create-issue-dialog";
import { IssueDetailsDialog } from "@/components/dashboard/issue-details-dialog";
import type { AgentResponse } from "@repo/data-ops/zod-schema/agent";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";



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

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const clearChat = () => {
    setChatMessages([]);
  };

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
              content: data.answer || data.response || "",
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

        <TabsContent value="agent" className="mt-0 h-[calc(100vh-280px)] min-h-[650px] animate-in fade-in-50 slide-in-from-bottom-2">
            <div className="flex flex-col h-full bg-background border rounded-3xl overflow-hidden shadow-2xl shadow-primary/5 transition-all duration-300 relative">
                {/* Decorative background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                    <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                </div>

                {/* Chat Header */}
                <div className="px-8 py-5 border-b bg-background/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 ring-4 ring-primary/10">
                            <Bot className="h-7 w-7 text-primary-foreground" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight">Project Intelligence</h2>
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none">
                                    Live
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">Always learning from your project docs</p>
                        </div>
                    </div>
                    {chatMessages.length > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={clearChat}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear chat
                        </Button>
                    )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 relative overflow-hidden">
                    <ScrollArea className="h-full" ref={chatScrollRef as any}>
                        <div className="max-w-4xl mx-auto space-y-12 px-6 py-10">
                            {chatMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-12 px-6 animate-in fade-in zoom-in duration-700">
                                    <div className="relative mb-10">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                                        <div className="relative w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl rotate-6 group hover:rotate-0 transition-transform duration-500">
                                            <Sparkles className="h-12 w-12 text-primary-foreground" />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-3xl font-black tracking-tighter mb-4">
                                        How can I help you <span className="text-primary italic">today?</span>
                                    </h3>
                                    <p className="text-base text-muted-foreground max-w-md leading-relaxed font-medium mb-12">
                                        I've indexed all your project documents and issues. Ask me anything about the codebase or requirements.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                                        {[
                                            { label: "Architecture Overview", icon: <Bot className="h-4 w-4" />, query: "Summarize architectural decisions" },
                                            { label: "Pending Issues", icon: <ListTodo className="h-4 w-4" />, query: "Analyze pending critical issues" },
                                            { label: "API Requirements", icon: <Wand2 className="h-4 w-4" />, query: "Extract API requirements" },
                                            { label: "Design Context", icon: <FileText className="h-4 w-4" />, query: "Find relevant design docs" }
                                        ].map((item) => (
                                            <button 
                                                key={item.label}
                                                onClick={() => {
                                                    setAgentQuery(item.query);
                                                    // Optional: auto-submit
                                                }}
                                                className="group flex flex-col items-start p-5 text-left bg-card border border-border/50 rounded-3xl hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                                            >
                                                <div className="p-2 rounded-xl bg-secondary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-4">
                                                    {item.icon}
                                                </div>
                                                <span className="text-sm font-bold block mb-1">{item.label}</span>
                                                <span className="text-xs text-muted-foreground line-clamp-1">{item.query}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {chatMessages.map((msg, idx) => (
                                        <div 
                                            key={idx} 
                                            className={cn(
                                                "flex gap-6 animate-in slide-in-from-bottom-6 duration-500",
                                                msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-2 overflow-hidden transition-transform hover:scale-105",
                                                msg.role === "assistant" 
                                                    ? "bg-primary text-primary-foreground border-primary/10 rotate-3" 
                                                    : "bg-background text-foreground border-border -rotate-3"
                                            )}>
                                                {msg.role === "assistant" ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
                                            </div>

                                            <div className={cn(
                                                "flex flex-col gap-4 max-w-[85%] group",
                                                msg.role === "user" ? "items-end" : "items-start"
                                            )}>
                                                <div className="relative group/bubble">
                                                    <div className={cn(
                                                        "rounded-[2.5rem] px-8 py-6 shadow-sm border transition-all duration-300",
                                                        msg.role === "user" 
                                                            ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-none hover:shadow-primary/20 hover:scale-[1.01]" 
                                                            : "bg-background/95 backdrop-blur-md text-foreground border-border/60 rounded-tl-none hover:shadow-xl hover:border-primary/30 hover:scale-[1.01]"
                                                    )}>
                                                        {msg.role === "assistant" ? (
                                                            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:text-zinc-300 prose-pre:border prose-pre:border-white/10 prose-headings:font-black prose-headings:tracking-tighter prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-lg prose-code:before:content-none prose-code:after:content-none prose-code:font-bold">
                                                                <ReactMarkdown 
                                                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                                                >
                                                                    {msg.content}
                                                                </ReactMarkdown>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[0.95rem] font-semibold leading-relaxed tracking-tight">{msg.content}</p>
                                                        )}
                                                    </div>

                                                    {msg.role === "assistant" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute -right-12 top-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity h-8 w-8 rounded-xl bg-background border shadow-sm"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(msg.content);
                                                                setCopiedIndex(idx);
                                                                setTimeout(() => setCopiedIndex(null), 2000);
                                                            }}
                                                        >
                                                            {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                                        </Button>
                                                    )}
                                                </div>

                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="w-full">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-3 px-2">Sources Found</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {msg.sources.map((source, sIdx) => (
                                                                <button
                                                                    key={sIdx}
                                                                    onClick={() => {
                                                                        if (source.type === "doc") setSelectedDocId(source.id);
                                                                        else setSelectedIssueId(source.id);
                                                                    }}
                                                                    className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-secondary/50 hover:bg-primary/10 border border-border/50 hover:border-primary/30 text-[11px] font-bold transition-all group/source"
                                                                >
                                                                    {source.type === 'doc' ? <FileText className="h-3.5 w-3.5 text-primary" /> : <ListTodo className="h-3.5 w-3.5 text-primary" />}
                                                                    <span className="text-muted-foreground group-hover/source:text-primary truncate max-w-[150px]">{source.title}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {agentMutation.isPending && (
                                        <div className="flex gap-6 animate-pulse">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/10 flex items-center justify-center rotate-3">
                                                <Bot className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="bg-card border border-border/60 rounded-[2.5rem] rounded-tl-none px-8 py-6 shadow-sm flex items-center gap-3">
                                                <div className="flex gap-1.5">
                                                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                                </div>
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-2">Thinking</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            <div ref={chatScrollRef} className="h-4" />
                        </div>
                    </ScrollArea>
                </div>

                {/* Input Area */}
                <div className="p-8 border-t bg-background/80 backdrop-blur-xl sticky bottom-0 z-10">
                    <form 
                        onSubmit={handleAgentQuery} 
                        className="max-w-4xl mx-auto"
                    >
                        <div className="relative group p-1 rounded-[2rem] bg-gradient-to-br from-border/50 to-border/20 focus-within:from-primary/20 focus-within:to-primary/5 transition-all duration-500">
                            <div className="relative flex items-end gap-3 bg-background rounded-[1.85rem] p-2 pr-3 border border-border/50 shadow-inner group-focus-within:border-primary/50 group-focus-within:shadow-2xl group-focus-within:shadow-primary/10 transition-all duration-500">
                                <textarea 
                                    value={agentQuery}
                                    onChange={(e) => setAgentQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAgentQuery(e as any);
                                        }
                                    }}
                                    className="flex-1 min-h-[56px] max-h-48 p-4 bg-transparent resize-none font-medium text-sm leading-relaxed focus:outline-none placeholder:text-muted-foreground/60 scrollbar-hide"
                                    placeholder="Ask anything about the project..."
                                    disabled={agentMutation.isPending}
                                    rows={1}
                                />
                                <div className="flex items-center gap-3 pb-2 pr-1">
                                    <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-secondary/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border border-border/50">
                                        <kbd>⏎</kbd>
                                        <span>Send</span>
                                    </div>
                                    <Button 
                                        type="submit" 
                                        size="icon"
                                        className="h-12 w-12 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-90 hover:scale-105 hover:shadow-primary/40 shrink-0"
                                        disabled={agentMutation.isPending || !agentQuery.trim()}
                                    >
                                        {agentMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-6 opacity-40 group-focus-within:opacity-100 transition-opacity">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground text-center">
                                SprintPilot Intelligence Engine v2.0
                            </p>
                        </div>
                    </form>
                </div>
            </div>
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
