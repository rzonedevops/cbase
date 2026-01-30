import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { nanoid } from "nanoid";
import * as db from "./db";

// ============ AGENT ROUTER ============
const agentRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getAgentsByUserId(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getAgentById(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      systemPrompt: z.string().optional(),
      model: z.string().default("gpt-4"),
      conversationStarters: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      temperature: z.string().optional(),
      maxTokens: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agent = await db.createAgent({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        model: input.model,
        conversationStarters: input.conversationStarters || [],
        constraints: input.constraints || [],
        temperature: input.temperature || "0.7",
        maxTokens: input.maxTokens || 2048,
        status: "active",
        lastTrainedAt: new Date(),
      });
      return agent;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      systemPrompt: z.string().optional(),
      model: z.string().optional(),
      status: z.enum(["active", "inactive", "training"]).optional(),
      conversationStarters: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      temperature: z.string().optional(),
      maxTokens: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return db.updateAgent(id, ctx.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteAgent(input.id, ctx.user.id);
      return { success: true };
    }),

  train: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.trainAgent(input.id, ctx.user.id);
    }),
});

// ============ CHAT ROUTER ============
const chatRouter = router({
  // Create a new chat session
  createSession: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createChatSession({
        agentId: input.agentId,
        userId: ctx.user.id,
        title: input.title,
      });
    }),

  // Get chat sessions for an agent with optional date filtering
  getSessions: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      return db.getChatSessionsByAgentId(input.agentId, startDate, endDate);
    }),

  // Get full chat logs with messages
  getLogs: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      return db.getChatLogsWithMessages(input.agentId, startDate, endDate);
    }),

  // Get messages for a specific session
  getMessages: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getMessagesBySessionId(input.sessionId);
    }),

  // Send a message and get AI response (for playground)
  sendMessage: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      sessionId: z.number().optional(),
      message: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get or create session
      let sessionId = input.sessionId;
      if (!sessionId) {
        const session = await db.createChatSession({
          agentId: input.agentId,
          userId: ctx.user.id,
          title: input.message.slice(0, 50),
        });
        sessionId = session.id;
      }

      // Get agent configuration
      const agent = await db.getAgentById(input.agentId, ctx.user.id);
      if (!agent) {
        throw new Error("Agent not found");
      }

      // Save user message
      await db.createChatMessage({
        sessionId,
        role: "user",
        content: input.message,
      });

      // Get conversation history
      const history = await db.getMessagesBySessionId(sessionId);
      
      // Build messages for LLM
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
      
      if (agent.systemPrompt) {
        messages.push({ role: "system", content: agent.systemPrompt });
      }

      // Add conversation history (last 10 messages)
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
        }
      }

      // Call LLM
      const startTime = Date.now();
      const response = await invokeLLM({
        messages,
      });
      const latencyMs = Date.now() - startTime;

      const rawContent = response.choices[0]?.message?.content;
      const assistantContent = typeof rawContent === 'string' ? rawContent : "I apologize, but I couldn't generate a response.";
      
      // Calculate a simple signal score based on response characteristics
      const signalScore = calculateSignalScore(assistantContent, input.message);

      // Save assistant message
      const assistantMessage = await db.createChatMessage({
        sessionId,
        role: "assistant",
        content: assistantContent,
        signalScore: signalScore.toString(),
        aiRequests: 1,
        tokensUsed: response.usage?.total_tokens,
        latencyMs,
      });

      // Increment credits
      await db.incrementCreditsUsed(ctx.user.id);

      // Check for signal score alert
      await db.checkSignalScoreAlert(ctx.user.id, input.agentId, signalScore);

      // Log analytics event
      await db.createAnalyticsEvent({
        agentId: input.agentId,
        eventType: "chat_message",
        eventData: {
          sessionId,
          signalScore,
          tokensUsed: response.usage?.total_tokens,
          latencyMs,
        },
      });

      return {
        sessionId,
        message: assistantMessage,
      };
    }),
});

// Helper function to calculate signal score
function calculateSignalScore(response: string, query: string): number {
  let score = 0.5; // Base score

  // Length factor (longer, more detailed responses score higher)
  if (response.length > 100) score += 0.1;
  if (response.length > 500) score += 0.1;

  // Relevance factor (check if response contains query keywords)
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const responseWords = response.toLowerCase();
  const matchedWords = queryWords.filter(w => responseWords.includes(w));
  score += (matchedWords.length / Math.max(queryWords.length, 1)) * 0.2;

  // Structure factor (responses with formatting score higher)
  if (response.includes('\n')) score += 0.05;
  if (response.match(/\d+\./)) score += 0.05; // Numbered lists

  // Cap score between 0 and 1
  return Math.min(Math.max(score, 0), 1);
}

// ============ ANALYTICS ROUTER ============
const analyticsRouter = router({
  getByAgent: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      return db.getAnalyticsByAgentId(input.agentId, startDate, endDate);
    }),

  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const agents = await db.getAgentsByUserId(ctx.user.id);
    const settings = await db.getOrCreateAccountSettings(ctx.user.id);
    
    // Aggregate analytics across all agents
    let totalMessages = 0;
    let totalSessions = 0;
    const allSignalScores: number[] = [];

    for (const agent of agents) {
      const analytics = await db.getAnalyticsByAgentId(agent.id);
      if (analytics) {
        totalMessages += analytics.totalMessages;
        totalSessions += analytics.sessionsCount || 0;
        allSignalScores.push(...analytics.signalScores);
      }
    }

    const avgSignalScore = allSignalScores.length > 0
      ? allSignalScores.reduce((a, b) => a + b, 0) / allSignalScores.length
      : 0;

    return {
      totalAgents: agents.length,
      totalMessages,
      totalSessions,
      avgSignalScore,
      creditsUsed: settings.creditsUsed,
      creditsTotal: settings.creditsTotal,
      creditsResetAt: settings.creditsResetAt,
    };
  }),
});

// ============ SETTINGS ROUTER ============
const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return db.getOrCreateAccountSettings(ctx.user.id);
  }),

  update: protectedProcedure
    .input(z.object({
      signalScoreThreshold: z.string().optional(),
      alertsEnabled: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.updateAccountSettings(ctx.user.id, input);
    }),

  generateApiKey: protectedProcedure.mutation(async ({ ctx }) => {
    const apiKey = `cb_${nanoid(32)}`;
    await db.updateAccountSettings(ctx.user.id, { apiKey });
    return { apiKey };
  }),
});

// ============ ALERTS ROUTER ============
const alertsRouter = router({
  list: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.getAlertsByUserId(ctx.user.id, input?.unreadOnly);
    }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.markAlertAsRead(input.id, ctx.user.id);
      return { success: true };
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markAllAlertsAsRead(ctx.user.id);
    return { success: true };
  }),

  checkRetraining: protectedProcedure.mutation(async ({ ctx }) => {
    await db.checkRetrainingAlert(ctx.user.id);
    return { success: true };
  }),
});

// ============ EXPORT ROUTER ============
const exportRouter = router({
  chatLogsCSV: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      const logs = await db.getChatLogsWithMessages(input.agentId, startDate, endDate);
      
      // Generate CSV content
      let csv = "Session ID,Created At,Role,Content,Signal Score,AI Requests\n";
      
      for (const log of logs) {
        for (const msg of log.messages) {
          const row = [
            log.sessionId,
            msg.createdAt.toISOString(),
            msg.role,
            `"${msg.content.replace(/"/g, '""')}"`,
            msg.signalScore || "",
            msg.aiRequests || "",
          ].join(",");
          csv += row + "\n";
        }
      }

      // Upload to S3
      const fileName = `chat-logs-${input.agentId}-${Date.now()}.csv`;
      const fileKey = `exports/${ctx.user.id}/${fileName}`;
      const { url } = await storagePut(fileKey, Buffer.from(csv), "text/csv");

      // Save export record
      const exportRecord = await db.createExportedFile({
        userId: ctx.user.id,
        fileName,
        fileType: "csv",
        fileUrl: url,
        fileKey,
        exportType: "chat_logs",
      });

      return { url, fileName };
    }),

  analyticsReport: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      const analytics = await db.getAnalyticsByAgentId(input.agentId, startDate, endDate);
      const agent = await db.getAgentById(input.agentId, ctx.user.id);

      // Generate markdown report
      let report = `# Analytics Report\n\n`;
      report += `## Agent: ${agent?.name || "Unknown"}\n\n`;
      report += `**Date Range:** ${startDate?.toISOString().split('T')[0] || 'All time'} to ${endDate?.toISOString().split('T')[0] || 'Present'}\n\n`;
      report += `## Summary\n\n`;
      report += `| Metric | Value |\n`;
      report += `|--------|-------|\n`;
      report += `| Total Messages | ${analytics?.totalMessages || 0} |\n`;
      report += `| Bot Messages | ${analytics?.botMessages || 0} |\n`;
      report += `| User Messages | ${analytics?.userMessages || 0} |\n`;
      report += `| Average Signal Score | ${(analytics?.avgSignalScore || 0).toFixed(3)} |\n`;
      report += `| Total Sessions | ${analytics?.sessionsCount || 0} |\n\n`;

      if (analytics?.topicsDistribution && analytics.topicsDistribution.length > 0) {
        report += `## Topic Distribution\n\n`;
        report += `| Topic | Mentions |\n`;
        report += `|-------|----------|\n`;
        for (const topic of analytics.topicsDistribution) {
          report += `| ${topic.topic} | ${topic.mentions} |\n`;
        }
        report += `\n`;
      }

      // Upload to S3
      const fileName = `analytics-report-${input.agentId}-${Date.now()}.md`;
      const fileKey = `exports/${ctx.user.id}/${fileName}`;
      const { url } = await storagePut(fileKey, Buffer.from(report), "text/markdown");

      // Save export record
      await db.createExportedFile({
        userId: ctx.user.id,
        fileName,
        fileType: "csv", // Using csv as closest match
        fileUrl: url,
        fileKey,
        exportType: "analytics_report",
      });

      return { url, fileName };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getExportedFilesByUserId(ctx.user.id);
  }),
});

// ============ MAIN ROUTER ============
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  agent: agentRouter,
  chat: chatRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
  alerts: alertsRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
