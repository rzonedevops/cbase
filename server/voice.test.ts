import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as voiceTranscription from "./_core/voiceTranscription";

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

describe("voice router", () => {
  describe("voice.transcribe", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.voice.transcribe({
          audioUrl: "https://example.com/audio.mp3",
        })
      ).rejects.toThrow();
    });

    it("validates audioUrl as a valid URL", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.voice.transcribe({
          audioUrl: "invalid-url",
        })
      ).rejects.toThrow();
    });

    it("calls transcribeAudio with correct parameters", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockResult = {
        task: "transcribe" as const,
        language: "en",
        duration: 10.5,
        text: "Hello world",
        segments: [],
      };

      vi.spyOn(voiceTranscription, "transcribeAudio").mockResolvedValue(mockResult);

      const result = await caller.voice.transcribe({
        audioUrl: "https://example.com/audio.mp3",
        language: "en",
        prompt: "Test prompt",
      });

      expect(voiceTranscription.transcribeAudio).toHaveBeenCalledWith({
        audioUrl: "https://example.com/audio.mp3",
        language: "en",
        prompt: "Test prompt",
      });

      expect(result).toEqual(mockResult);
    });

    it("throws TRPCError when transcribeAudio returns error", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockError = {
        error: "Service error",
        code: "SERVICE_ERROR" as const,
        details: "Test error",
      };

      vi.spyOn(voiceTranscription, "transcribeAudio").mockResolvedValue(mockError);

      await expect(
        caller.voice.transcribe({
          audioUrl: "https://example.com/audio.mp3",
        })
      ).rejects.toThrow("Service error");
    });
  });
});
