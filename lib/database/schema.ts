import { pgTable, text, timestamp, integer, decimal, jsonb, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().unique(),
  projectPath: text('project_path'),
  status: text('status', { enum: ['idle', 'processing', 'error', 'completed'] }).notNull().default('idle'),
  error: text('error'),
  config: jsonb('config').$type<{
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }>(),
  totalTokens: integer('total_tokens').notNull().default(0),
  totalCost: decimal('total_cost', { precision: 10, scale: 6 }).notNull().default('0'),
  messageCount: integer('message_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
});

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: text('message_id').notNull().unique(),
  sessionId: text('session_id').notNull().references(() => sessions.sessionId, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    tokens?: number;
    cost?: number;
    toolUse?: any[];
    incomplete?: boolean;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Session activity logs
export const sessionLogs = pgTable('session_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().references(() => sessions.sessionId, { onDelete: 'cascade' }),
  action: text('action').notNull(), // 'created', 'message_sent', 'command_executed', 'error', 'completed'
  details: jsonb('details'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Zod schemas for validation
export const insertSessionSchema = createInsertSchema(sessions);
export const selectSessionSchema = createSelectSchema(sessions);

export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);

export const insertSessionLogSchema = createInsertSchema(sessionLogs);
export const selectSessionLogSchema = createSelectSchema(sessionLogs);

// Types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type SessionLog = typeof sessionLogs.$inferSelect;
export type NewSessionLog = typeof sessionLogs.$inferInsert;