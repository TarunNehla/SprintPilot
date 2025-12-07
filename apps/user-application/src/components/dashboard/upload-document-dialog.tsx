import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, FileText, AlertCircle } from "lucide-react";
import { docTypeEnum } from "@repo/data-ops/zod-schema/projects";

interface UploadDocumentDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentDialog({ projectId, open, onOpenChange }: UploadDocumentDialogProps) {
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<"design" | "note" | "retro" | "other">("note");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // 2-step mutation: Create -> Update(Content)
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      
      // Single step upload (backend handles R2 storage + DB)
      return api.createDoc(projectId, {
        file,
        title: title || undefined,
        docType: docType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "docs"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    }
  });

  const resetForm = () => {
    setTitle("");
    setDocType("note");
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        if (!title) {
            // Auto-set title from filename (remove extension)
            setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
        setError("Please select a file");
        return;
    }
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a text or markdown file to add to the project knowledge base.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto pr-2">
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
                {error && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="title">Document Title</Label>
                    <Input 
                        id="title" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder="e.g. System Architecture" 
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="docType">Document Type</Label>
                    <select 
                        id="docType"
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as any)}
                    >
                        {docTypeEnum.options.map(option => (
                            <option key={option} value={option}>
                                {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="file">File</Label>
                    <div 
                        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                            file ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            id="file" 
                            accept=".md,.txt,.json,.rst" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                        
                        {file ? (
                            <div className="text-center space-y-2">
                                 <FileText className="h-8 w-8 text-primary mx-auto" />
                                 <p className="font-medium text-sm">{file.name}</p>
                                 <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <div className="text-center space-y-2">
                                <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                                <p className="font-medium text-sm">Click to select file</p>
                                <p className="text-xs text-muted-foreground">Support Markdown, Text, JSON</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="sticky bottom-0 bg-background pt-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={uploadMutation.isPending || !file}>
                        {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Upload
                    </Button>
                </DialogFooter>
            </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
