import { relations } from "drizzle-orm";
import { auth_user } from "./auth-schema";
import { projects, projectDocs, projectIssues, docChunks } from "./schema";

// auth_user relations - extend with projects
export const authUserProjectRelations = relations(auth_user, ({ many }) => ({
  projects: many(projects),
}));

// projects relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(auth_user, {
    fields: [projects.ownerId],
    references: [auth_user.id],
  }),
  projectDocs: many(projectDocs),
  projectIssues: many(projectIssues),
}));

// projectDocs relations
export const projectDocsRelations = relations(projectDocs, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectDocs.projectId],
    references: [projects.id],
  }),
  docChunks: many(docChunks),
}));

// projectIssues relations
export const projectIssuesRelations = relations(projectIssues, ({ one }) => ({
  project: one(projects, {
    fields: [projectIssues.projectId],
    references: [projects.id],
  }),
}));

// docChunks relations
export const docChunksRelations = relations(docChunks, ({ one }) => ({
  projectDoc: one(projectDocs, {
    fields: [docChunks.docId],
    references: [projectDocs.id],
  }),
}));
