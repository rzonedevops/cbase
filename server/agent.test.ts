import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("agent router", () => {
  describe("agent.list", () => {
    it("returns empty array when no agents exist", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agent.list();

      expect(Array.isArray(result)).toBe(true);
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.agent.list()).rejects.toThrow();
    });
  });

  describe("agent.create", () => {
    it("creates a new agent with valid data", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agent.create({
        name: "Test Agent",
        description: "A test agent for unit testing",
        systemPrompt: "You are a helpful assistant.",
        model: "gpt-4",
        conversationStarters: ["Hello", "How can I help?"],
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("number");
    });

    it("requires a name", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.agent.create({
          name: "",
          model: "gpt-4",
        })
      ).rejects.toThrow();
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.agent.create({
          name: "Test Agent",
          model: "gpt-4",
        })
      ).rejects.toThrow();
    });
  });

  describe("agent.get", () => {
    it("returns undefined for non-existent agent", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agent.get({ id: 99999 });

      expect(result).toBeUndefined();
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.agent.get({ id: 1 })).rejects.toThrow();
    });
  });

  describe("agent.update", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.agent.update({
          id: 1,
          name: "Updated Name",
        })
      ).rejects.toThrow();
    });
  });

  describe("agent.delete", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.agent.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("agent.train", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.agent.train({ id: 1 })).rejects.toThrow();
    });
  });
});

describe("chat router", () => {
  describe("chat.sendMessage", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.chat.sendMessage({
          agentId: 1,
          message: "Hello",
        })
      ).rejects.toThrow();
    });
  });

  describe("chat.getLogs", () => {
    it("returns empty array when no logs exist", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.chat.getLogs({
        agentId: 99999,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.chat.getLogs({
          agentId: 1,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
      ).rejects.toThrow();
    });
  });
});

describe("analytics router", () => {
  describe("analytics.getDashboard", () => {
    it("returns dashboard data", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getDashboard();

      expect(result).toBeDefined();
      expect(typeof result.totalAgents).toBe("number");
      expect(typeof result.totalMessages).toBe("number");
      expect(typeof result.avgSignalScore).toBe("number");
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.analytics.getDashboard()).rejects.toThrow();
    });
  });

  describe("analytics.getByAgent", () => {
    it("returns analytics for an agent", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getByAgent({
        agentId: 1,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      expect(result).toBeDefined();
      expect(typeof result.totalMessages).toBe("number");
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.analytics.getByAgent({
          agentId: 1,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
      ).rejects.toThrow();
    });
  });
});

describe("settings router", () => {
  describe("settings.get", () => {
    it("returns settings for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.settings.get();

      expect(result).toBeDefined();
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.settings.get()).rejects.toThrow();
    });
  });

  describe("settings.generateApiKey", () => {
    it("generates a new API key", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.settings.generateApiKey();

      expect(result).toBeDefined();
      expect(result.apiKey).toBeDefined();
      expect(typeof result.apiKey).toBe("string");
      expect(result.apiKey.length).toBeGreaterThan(0);
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.settings.generateApiKey()).rejects.toThrow();
    });
  });
});

describe("alerts router", () => {
  describe("alerts.list", () => {
    it("returns alerts for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.alerts.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.alerts.list({})).rejects.toThrow();
    });
  });
});
