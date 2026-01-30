import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * AI Agents table - stores chatbot configurations
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt"),
  model: varchar("model", { length: 64 }).default("gpt-4").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "training"]).default("active").notNull(),
  conversationStarters: json("conversationStarters").$type<string[]>(),
  constraints: json("constraints").$type<string[]>(),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  maxTokens: int("maxTokens").default(2048),
  lastTrainedAt: timestamp("lastTrainedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Chat sessions/conversations
 */
export const chatSessions = mysqlTable("chatSessions", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

/**
 * Individual chat messages
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  signalScore: decimal("signalScore", { precision: 5, scale: 3 }),
  aiRequests: int("aiRequests").default(1),
  tokensUsed: int("tokensUsed"),
  latencyMs: int("latencyMs"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Account settings and credits
 */
export const accountSettings = mysqlTable("accountSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
  creditsUsed: int("creditsUsed").default(0).notNull(),
  creditsTotal: int("creditsTotal").default(50).notNull(),
  creditsResetAt: timestamp("creditsResetAt"),
  signalScoreThreshold: decimal("signalScoreThreshold", { precision: 3, scale: 2 }).default("0.5"),
  alertsEnabled: int("alertsEnabled").default(1),
  apiKey: varchar("apiKey", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountSettings = typeof accountSettings.$inferSelect;
export type InsertAccountSettings = typeof accountSettings.$inferInsert;

/**
 * Analytics events for tracking
 */
export const analyticsEvents = mysqlTable("analyticsEvents", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  eventData: json("eventData").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

/**
 * Exported files tracking
 */
export const exportedFiles = mysqlTable("exportedFiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["csv", "pdf"]).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  exportType: varchar("exportType", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExportedFile = typeof exportedFiles.$inferSelect;
export type InsertExportedFile = typeof exportedFiles.$inferInsert;

/**
 * Alerts and notifications
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  alertType: mysqlEnum("alertType", ["signal_score", "retraining", "credits", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: int("isRead").default(0).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;
