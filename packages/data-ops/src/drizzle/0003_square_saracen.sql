CREATE TABLE "query_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"query_id" text NOT NULL,
	"chunk_id" text NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_queries" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"query" text NOT NULL,
	"filters" jsonb,
	"result_count" integer NOT NULL,
	"latency" integer NOT NULL,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "query_feedback" ADD CONSTRAINT "query_feedback_query_id_rag_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."rag_queries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_feedback" ADD CONSTRAINT "query_feedback_chunk_id_doc_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."doc_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_queries" ADD CONSTRAINT "rag_queries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "query_feedback_queryId_idx" ON "query_feedback" USING btree ("query_id");--> statement-breakpoint
CREATE INDEX "query_feedback_chunkId_idx" ON "query_feedback" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "rag_queries_projectId_idx" ON "rag_queries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "rag_queries_createdAt_idx" ON "rag_queries" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "doc_chunks" ADD COLUMN "text_tsv" tsvector GENERATED ALWAYS AS (to_tsvector('english', "text_content")) STORED;--> statement-breakpoint
CREATE INDEX "doc_chunks_text_tsv_idx" ON "doc_chunks" USING gin ("text_tsv");