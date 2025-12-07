import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, Tag, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DocumentDetailsDialogProps {
  projectId: string;
  documentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentDetailsDialog({ projectId, documentId, open, onOpenChange }: DocumentDetailsDialogProps) {
  const { data: doc, isLoading, error } = useQuery({
    queryKey: ["project", projectId, "doc", documentId],
    queryFn: () => (documentId ? api.getDoc(projectId, documentId) : Promise.reject("No ID")),
    enabled: !!documentId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        
        {/* Header Section */}
        <div className="p-6 border-b">
            {isLoading ? (
                <div className="h-8 w-48 bg-secondary animate-pulse rounded" />
            ) : doc ? (
                <div className="space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                             <FileText className="h-6 w-6 text-primary" />
                             {doc.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Badge variant="outline" className="capitalize">
                            {doc.docType}
                        </Badge>
                         <div className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" />
                            <span className="capitalize">{doc.status}</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                         </div>
                    </div>
                </div>
            ) : (
                <DialogTitle>Document Details</DialogTitle>
            )}
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 </div>
            ) : error ? (
                 <div className="flex flex-col items-center justify-center h-48 text-destructive">
                    <p>Failed to load document details.</p>
                    <p className="text-sm text-muted-foreground mt-2">{(error as Error).message || "Unknown error"}</p>
                 </div>
            ) : doc ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code({node, className, children, ...props}) {
                                return (
                                    <code className={`${className} bg-secondary/50 px-1.5 py-0.5 rounded text-sm`} {...props}>
                                        {children}
                                    </code>
                                )
                            },
                            pre({node, children, ...props}) {
                                return (
                                    <pre className="bg-secondary/30 p-4 rounded-lg overflow-x-auto" {...props}>
                                        {children}
                                    </pre>
                                )
                            }
                        }}
                    >
                        {doc.content || "*No content available*"}
                    </ReactMarkdown>
                </div>
            ) : null}
        </div>
        
        <div className="p-4 border-t flex justify-end">
             <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
