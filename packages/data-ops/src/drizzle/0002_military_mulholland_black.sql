CREATE TYPE "public"."doc_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('design', 'note', 'retro', 'other');--> statement-breakpoint
CREATE TYPE "public"."issue_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "doc_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"doc_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"text_content" text NOT NULL,
	"embedding" vector(384),
	"token_count" integer,
	"indexed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_docs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"doc_type" "doc_type" NOT NULL,
	"status" "doc_status" DEFAULT 'active' NOT NULL,
	"r2_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"priority" "issue_priority" DEFAULT 'medium' NOT NULL,
	"r2_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doc_chunks" ADD CONSTRAINT "doc_chunks_doc_id_project_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."project_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_docs" ADD CONSTRAINT "project_docs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_auth_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_chunks_docId_idx" ON "doc_chunks" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "project_docs_projectId_idx" ON "project_docs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_issues_projectId_idx" ON "project_issues" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_issues_status_idx" ON "project_issues" USING btree ("status");