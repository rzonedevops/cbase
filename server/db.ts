import { eq, desc, and, gte, lte, sql, count, avg } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  agents, InsertAgent, Agent,
  chatSessions, InsertChatSession, ChatSession,
  chatMessages, InsertChatMessage, ChatMessage,
  accountSettings, InsertAccountSettings, AccountSettings,
  analyticsEvents, InsertAnalyticsEvent,
  exportedFiles, InsertExportedFile,
  alerts, InsertAlert, Alert
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from 'nanoid';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ AGENT FUNCTIONS ============

export async function createAgent(data: Omit<InsertAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agents).values({
    ...data,
    conversationStarters: data.conversationStarters || [],
    constraints: data.constraints || [],
  });
  
  const [agent] = await db.select().from(agents).where(eq(agents.id, Number(result[0].insertId)));
  return agent;
}

export async function getAgentsByUserId(userId: number): Promise<Agent[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.createdAt));
}

export async function getAgentById(id: number, userId: number): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [agent] = await db.select().from(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
  return agent;
}

export async function updateAgent(id: number, userId: number, data: Partial<InsertAgent>): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(agents)
    .set(data)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
  
  return getAgentById(id, userId);
}

export async function deleteAgent(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
  return true;
}

export async function trainAgent(id: number, userId: number): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(agents)
    .set({ 
      status: 'active',
      lastTrainedAt: new Date()
    })
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
  
  return getAgentById(id, userId);
}

// ============ CHAT SESSION FUNCTIONS ============

export async function createChatSession(data: Omit<InsertChatSession, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>): Promise<ChatSession> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sessionId = nanoid(16);
  const result = await db.insert(chatSessions).values({
    ...data,
    sessionId,
  });
  
  const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, Number(result[0].insertId)));
  return session;
}

export async function getChatSessionsByAgentId(agentId: number, startDate?: Date, endDate?: Date): Promise<ChatSession[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(chatSessions).where(eq(chatSessions.agentId, agentId));
  
  if (startDate && endDate) {
    query = db.select().from(chatSessions)
      .where(and(
        eq(chatSessions.agentId, agentId),
        gte(chatSessions.createdAt, startDate),
        lte(chatSessions.createdAt, endDate)
      ));
  }
  
  return query.orderBy(desc(chatSessions.createdAt));
}

export async function getChatSessionById(id: number): Promise<ChatSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
  return session;
}

export async function getChatSessionBySessionId(sessionId: string): Promise<ChatSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [session] = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));
  return session;
}

// ============ CHAT MESSAGE FUNCTIONS ============

export async function createChatMessage(data: Omit<InsertChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values(data);
  
  const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, Number(result[0].insertId)));
  return message;
}

export async function getMessagesBySessionId(sessionId: number): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);
}

export async function getChatLogsWithMessages(agentId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const sessions = await getChatSessionsByAgentId(agentId, startDate, endDate);
  
  const logsWithMessages = await Promise.all(
    sessions.map(async (session) => {
      const messages = await getMessagesBySessionId(session.id);
      const avgSignalScore = messages
        .filter(m => m.signalScore !== null)
        .reduce((sum, m) => sum + Number(m.signalScore), 0) / 
        (messages.filter(m => m.signalScore !== null).length || 1);
      
      return {
        ...session,
        messages,
        messageCount: messages.length,
        avgSignalScore: avgSignalScore || 0,
      };
    })
  );
  
  return logsWithMessages;
}

// ============ ACCOUNT SETTINGS FUNCTIONS ============

export async function getOrCreateAccountSettings(userId: number): Promise<AccountSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select().from(accountSettings).where(eq(accountSettings.userId, userId));
  
  if (existing) return existing;

  // Create default settings
  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1);
  resetDate.setDate(1);
  
  await db.insert(accountSettings).values({
    userId,
    creditsResetAt: resetDate,
  });
  
  const [settings] = await db.select().from(accountSettings).where(eq(accountSettings.userId, userId));
  return settings;
}

export async function updateAccountSettings(userId: number, data: Partial<InsertAccountSettings>): Promise<AccountSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(accountSettings)
    .set(data)
    .where(eq(accountSettings.userId, userId));
  
  return getOrCreateAccountSettings(userId);
}

export async function incrementCreditsUsed(userId: number, amount: number = 1): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(accountSettings)
    .set({ 
      creditsUsed: sql`${accountSettings.creditsUsed} + ${amount}`
    })
    .where(eq(accountSettings.userId, userId));
}

// ============ ANALYTICS FUNCTIONS ============

export async function createAnalyticsEvent(data: Omit<InsertAnalyticsEvent, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(analyticsEvents).values(data);
}

export async function getAnalyticsByAgentId(agentId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  // Get all sessions for this agent
  const sessions = await getChatSessionsByAgentId(agentId, startDate, endDate);
  const sessionIds = sessions.map(s => s.id);
  
  if (sessionIds.length === 0) {
    return {
      totalMessages: 0,
      botMessages: 0,
      userMessages: 0,
      avgSignalScore: 0,
      signalScores: [],
      topicsDistribution: [],
      emojiUsage: {},
      messagesOverTime: [],
    };
  }

  // Get all messages for these sessions
  const allMessages: ChatMessage[] = [];
  for (const sessionId of sessionIds) {
    const messages = await getMessagesBySessionId(sessionId);
    allMessages.push(...messages);
  }

  const botMessages = allMessages.filter(m => m.role === 'assistant');
  const userMessages = allMessages.filter(m => m.role === 'user');
  
  const signalScores = botMessages
    .filter(m => m.signalScore !== null)
    .map(m => Number(m.signalScore));
  
  const avgSignalScore = signalScores.length > 0 
    ? signalScores.reduce((a, b) => a + b, 0) / signalScores.length 
    : 0;

  // Extract emoji usage
  // Match common emojis using character ranges
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g;
  const emojiUsage: Record<string, number> = {};
  allMessages.forEach(m => {
    const emojis = m.content.match(emojiRegex) || [];
    emojis.forEach(emoji => {
      emojiUsage[emoji] = (emojiUsage[emoji] || 0) + 1;
    });
  });

  // Topic distribution (simple keyword-based)
  const topicKeywords: Record<string, RegExp> = {
    'Magic/Enchanted': /magic|enchant/gi,
    'Unicorn Hypergraph': /hypergraph/gi,
    'Council of Wizards': /wizard/gi,
    'Forest Membranes': /membrane/gi,
    'ASCII Art': /ascii/gi,
    'Entropy': /entropy/gi,
    'Neural Network': /neural|hgnn/gi,
  };

  const topicsDistribution = Object.entries(topicKeywords).map(([topic, regex]) => {
    const mentions = allMessages.reduce((count, m) => {
      const matches = m.content.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    return { topic, mentions };
  }).filter(t => t.mentions > 0).sort((a, b) => b.mentions - a.mentions);

  return {
    totalMessages: allMessages.length,
    botMessages: botMessages.length,
    userMessages: userMessages.length,
    avgSignalScore,
    signalScores,
    topicsDistribution,
    emojiUsage,
    sessionsCount: sessions.length,
  };
}

// ============ EXPORTED FILES FUNCTIONS ============

export async function createExportedFile(data: Omit<InsertExportedFile, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(exportedFiles).values(data);
  const [file] = await db.select().from(exportedFiles).where(eq(exportedFiles.id, Number(result[0].insertId)));
  return file;
}

export async function getExportedFilesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(exportedFiles)
    .where(eq(exportedFiles.userId, userId))
    .orderBy(desc(exportedFiles.createdAt));
}

// ============ ALERTS FUNCTIONS ============

export async function createAlert(data: Omit<InsertAlert, 'id' | 'createdAt'>): Promise<Alert> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(alerts).values(data);
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, Number(result[0].insertId)));
  
  // Send notification to owner for important alerts
  if (data.alertType === 'signal_score' || data.alertType === 'retraining') {
    try {
      const { notifyOwner } = await import('./_core/notification');
      await notifyOwner({
        title: data.title,
        content: data.message,
      });
    } catch (error) {
      console.error('[Alerts] Failed to notify owner:', error);
    }
  }
  
  return alert;
}

export async function getAlertsByUserId(userId: number, unreadOnly: boolean = false): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];

  if (unreadOnly) {
    return db.select().from(alerts)
      .where(and(eq(alerts.userId, userId), eq(alerts.isRead, 0)))
      .orderBy(desc(alerts.createdAt));
  }

  return db.select().from(alerts)
    .where(eq(alerts.userId, userId))
    .orderBy(desc(alerts.createdAt));
}

export async function markAlertAsRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(alerts)
    .set({ isRead: 1 })
    .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
}

export async function markAllAlertsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(alerts)
    .set({ isRead: 1 })
    .where(eq(alerts.userId, userId));
}

// ============ SIGNAL SCORE ALERT CHECK ============

export async function checkSignalScoreAlert(userId: number, agentId: number, signalScore: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const settings = await getOrCreateAccountSettings(userId);
  const threshold = Number(settings.signalScoreThreshold) || 0.5;

  if (signalScore < threshold && settings.alertsEnabled) {
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
    
    await createAlert({
      userId,
      agentId,
      alertType: 'signal_score',
      title: 'Low Signal Score Detected',
      message: `Agent "${agent?.name || 'Unknown'}" received a response with signal score ${signalScore.toFixed(3)}, which is below your threshold of ${threshold}.`,
      isRead: 0,
    });
  }
}

// ============ RETRAINING ALERT CHECK ============

export async function checkRetrainingAlert(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const userAgents = await getAgentsByUserId(userId);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const agent of userAgents) {
    if (agent.lastTrainedAt && new Date(agent.lastTrainedAt) < sixMonthsAgo) {
      // Check if we already have an unread alert for this agent
      const existingAlerts = await db.select().from(alerts)
        .where(and(
          eq(alerts.userId, userId),
          eq(alerts.agentId, agent.id),
          eq(alerts.alertType, 'retraining'),
          eq(alerts.isRead, 0)
        ));

      if (existingAlerts.length === 0) {
        await createAlert({
          userId,
          agentId: agent.id,
          alertType: 'retraining',
          title: 'Agent Needs Retraining',
          message: `Agent "${agent.name}" was last trained more than 6 months ago. Consider retraining to improve performance.`,
          isRead: 0,
        });
      }
    }
  }
}
