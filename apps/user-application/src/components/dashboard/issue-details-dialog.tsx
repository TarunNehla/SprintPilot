import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ListTodo, Edit2, Calendar } from "lucide-react";
import { issuePriorityEnum, issueStatusEnum } from "@repo/data-ops/zod-schema/projects";

interface IssueDetailsDialogProps {
  projectId: string;
  issueId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueDetailsDialog({ projectId, issueId, open, onOpenChange }: IssueDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
      title: "",
      description: "",
      status: "open",
      priority: "medium"
  });
  
  const queryClient = useQueryClient();

  const { data: issue, isLoading, error } = useQuery({
    queryKey: ["project", projectId, "issue", issueId],
    queryFn: () => (issueId ? api.getIssue(projectId, issueId) : Promise.reject("No ID")),
    enabled: !!issueId && open,
  });

  // Sync form with data when loaded
  useEffect(() => {
    if (issue) {
        setEditForm({
            title: issue.title,
            description: issue.description,
            status: issue.status,
            priority: issue.priority
        });
    }
  }, [issue]);

  // Reset editing state on close
  useEffect(() => {
      if (!open) setIsEditing(false);
  }, [open]);

  const updateMutation = useMutation({
    mutationFn: async () => {
        if (!issueId) throw new Error("No Issue ID");
        // Only send changed fields or all? sending all is safer for now
        return api.updateIssue(projectId, issueId, {
            title: editForm.title,
            description: editForm.description,
            status: editForm.status as any,
            priority: editForm.priority as any
        });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["project", projectId, "issues"] });
        queryClient.invalidateQueries({ queryKey: ["project", projectId, "issue", issueId] });
        setIsEditing(false);
    },
  });

  const handleSave = () => {
      if (!editForm.title || !editForm.description) return; // Simple validation
      updateMutation.mutate();
  }

  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'high': return 'text-red-500 font-medium';
          case 'medium': return 'text-yellow-600';
          case 'low': return 'text-green-600';
          default: return 'text-muted-foreground';
      }
  }

  const getStatusColor = (s: string) => {
      switch(s) {
          case 'open': return 'bg-green-100 text-green-700 hover:bg-green-100';
          case 'in_progress': return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
          case 'done': return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
          default: return 'bg-secondary text-secondary-foreground';
      }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0" showCloseButton={false}>
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-start">
            <DialogHeader className="flex-1 mr-4">
                {isLoading ? (
                     <div className="h-8 w-48 bg-secondary animate-pulse rounded" />
                ) : isEditing ? (
                    <Input 
                        value={editForm.title}
                        onChange={(e) => setEditForm(prev => ({...prev, title: e.target.value}))}
                        className="text-lg font-semibold"
                        placeholder="Issue Title"
                    />
                ) : (
                    <DialogTitle className="text-xl flex items-start gap-2">
                        <ListTodo className="h-6 w-6 text-primary mt-1 shrink-0" />
                        <span className="leading-tight">{issue?.title}</span>
                    </DialogTitle>
                )}
            </DialogHeader>

            {!isLoading && issue && !isEditing && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                </Button>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 </div>
            ) : error ? (
                 <div className="flex flex-col items-center justify-center h-48 text-destructive">
                    <p>Failed to load issue details.</p>
                 </div>
            ) : issue ? (
                <div className="space-y-6">
                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-6 text-sm">
                        <div className="space-y-1.5">
                            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Status</span>
                            {isEditing ? (
                                <select 
                                    className="flex h-9 w-32 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
                                    value={editForm.status}
                                    onChange={(e) => setEditForm(prev => ({...prev, status: e.target.value}))}
                                >
                                    {issueStatusEnum.options.map(s => (
                                        <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                                    ))}
                                </select>
                            ) : (
                                <div>
                                    <Badge variant="secondary" className={`capitalize ${getStatusColor(issue.status)}`}>
                                        {issue.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Priority</span>
                             {isEditing ? (
                                <select 
                                    className="flex h-9 w-32 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
                                    value={editForm.priority}
                                    onChange={(e) => setEditForm(prev => ({...prev, priority: e.target.value}))}
                                >
                                    {issuePriorityEnum.options.map(p => (
                                        <option key={p} value={p}>{p.toUpperCase()}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className={`capitalize font-medium ${getPriorityColor(issue.priority)}`}>
                                    {issue.priority}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Created</span>
                            <div className="flex items-center gap-1.5 pt-1">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider block">Description</span>
                        {isEditing ? (
                             <Textarea 
                                value={editForm.description}
                                onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))}
                                className="min-h-[200px]"
                                placeholder="Issue description..."
                            />
                        ) : (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                                {issue.description}
                            </p>
                        )}
                    </div>
                </div>
            ) : null}
        </div>

        {/* Footer Actions */}
        {isEditing ? (
            <div className="p-4 border-t flex justify-end gap-2 bg-muted/10">
                <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={updateMutation.isPending}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        ) : (
             <div className="p-4 border-t flex justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
        )}


      </DialogContent>
    </Dialog>
  );
}
