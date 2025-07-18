import { eq, desc, and, gte } from 'drizzle-orm';

import { db } from './connection';
import { sessions, messages, sessionLogs, type Session, type NewSession, type Message, type NewMessage } from './schema';

export class DatabaseSessionManager {
  // Session operations
  async createSession(sessionData: Omit<NewSession, 'id' | 'createdAt' | 'updatedAt' | 'lastActivity'>): Promise<Session> {
    const [session] = await db.insert(sessions).values({
      ...sessionData,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
    }).returning();

    if (!session) {
      throw new Error('Failed to create session');
    }

    await this.logSessionActivity(sessionData.sessionId, 'created', {
      projectPath: sessionData.projectPath,
      config: sessionData.config,
    });

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const [session] = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId));
    return session || null;
  }

  async updateSession(sessionId: string, updates: Partial<Omit<NewSession, 'sessionId'>>): Promise<Session | null> {
    const [session] = await db
      .update(sessions)
      .set({
        ...updates,
        updatedAt: new Date(),
        lastActivity: new Date(),
      })
      .where(eq(sessions.sessionId, sessionId))
      .returning();

    if (session && updates.status) {
      await this.logSessionActivity(sessionId, 'status_change', {
        newStatus: updates.status,
        error: updates.error,
      });
    }

    return session || null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const result = await db.delete(sessions).where(eq(sessions.sessionId, sessionId)).returning();
      
      if (result.length > 0) {
        await this.logSessionActivity(sessionId, 'deleted');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  async listSessions(filters: {
    status?: string;
    projectPath?: string;
    since?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ sessions: Session[]; total: number }> {
    const conditions = [];
    
    // Build conditions array
    if (filters.status) {
      conditions.push(eq(sessions.status, filters.status as any));
    }
    
    if (filters.projectPath) {
      conditions.push(eq(sessions.projectPath, filters.projectPath));
    }
    
    if (filters.since) {
      conditions.push(gte(sessions.lastActivity, filters.since));
    }

    // Apply conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    let query = db.select().from(sessions);
    let countQuery = db.select({ count: sessions.id }).from(sessions);
    
    if (whereClause) {
      query = query.where(whereClause) as any;
      countQuery = countQuery.where(whereClause) as any;
    }

    // Apply pagination
    query = query.orderBy(desc(sessions.lastActivity)) as any;
    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters.offset) {
      query = query.offset(filters.offset) as any;
    }

    const [sessionsResult, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      sessions: sessionsResult,
      total: countResult.length,
    };
  }

  // Message operations
  async createMessage(messageData: Omit<NewMessage, 'id' | 'createdAt'>): Promise<Message> {
    const [message] = await db.insert(messages).values({
      ...messageData,
      createdAt: new Date(),
    }).returning();

    if (!message) {
      throw new Error('Failed to create message');
    }

    // Update session statistics
    await this.updateSessionStats(messageData.sessionId, {
      messageCount: 1,
      tokens: messageData.metadata?.tokens || 0,
      cost: messageData.metadata?.cost || 0,
    });

    await this.logSessionActivity(messageData.sessionId, 'message_sent', {
      messageId: messageData.messageId,
      role: messageData.role,
      tokens: messageData.metadata?.tokens,
      cost: messageData.metadata?.cost,
    });

    return message;
  }

  async getSessionMessages(sessionId: string, options: {
    limit?: number;
    offset?: number;
    role?: string;
  } = {}): Promise<{ messages: Message[]; total: number }> {
    const conditions = [eq(messages.sessionId, sessionId)];
    
    if (options.role) {
      conditions.push(eq(messages.role, options.role as any));
    }
    
    const whereClause = and(...conditions);
    
    let query = db.select().from(messages).where(whereClause);
    const countQuery = db.select({ count: messages.id }).from(messages).where(whereClause);

    query = query.orderBy(messages.createdAt) as any;
    if (options.limit) {
      query = query.limit(options.limit) as any;
    }
    if (options.offset) {
      query = query.offset(options.offset) as any;
    }

    const [messagesResult, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      messages: messagesResult,
      total: countResult.length,
    };
  }

  async updateMessage(messageId: string, updates: Partial<Omit<NewMessage, 'messageId' | 'sessionId'>>): Promise<Message | null> {
    const [message] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.messageId, messageId))
      .returning();

    return message || null;
  }

  // Session statistics
  private async updateSessionStats(sessionId: string, deltas: {
    messageCount?: number;
    tokens?: number;
    cost?: number;
  }): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const updates: Partial<NewSession> = {
      lastActivity: new Date(),
      updatedAt: new Date(),
    };

    if (deltas.messageCount) {
      updates.messageCount = session.messageCount + deltas.messageCount;
    }
    
    if (deltas.tokens) {
      updates.totalTokens = session.totalTokens + deltas.tokens;
    }
    
    if (deltas.cost) {
      const currentCost = parseFloat(session.totalCost);
      const newCost = currentCost + deltas.cost;
      updates.totalCost = newCost.toFixed(6);
    }

    await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.sessionId, sessionId));
  }

  // Activity logging
  async logSessionActivity(sessionId: string, action: string, details?: any): Promise<void> {
    try {
      await db.insert(sessionLogs).values({
        sessionId,
        action,
        details,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log session activity:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  async getSessionLogs(sessionId: string, limit: number = 50): Promise<any[]> {
    return db
      .select()
      .from(sessionLogs)
      .where(eq(sessionLogs.sessionId, sessionId))
      .orderBy(desc(sessionLogs.timestamp))
      .limit(limit);
  }

  // Cleanup operations
  async cleanupOldSessions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const result = await db
        .delete(sessions)
        .where(and(
          eq(sessions.status, 'completed'),
          gte(sessions.lastActivity, cutoffDate)
        ))
        .returning();

      return result.length;
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const sessionManager = new DatabaseSessionManager();