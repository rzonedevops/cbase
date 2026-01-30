import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as imageGeneration from "./_core/imageGeneration";

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

describe("image router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("image.generate", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.image.generate({
          prompt: "A beautiful landscape",
        })
      ).rejects.toThrow();
    });

    it("validates prompt is not empty", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.image.generate({
          prompt: "",
        })
      ).rejects.toThrow();
    });

    it("calls generateImage with correct parameters", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockResult = {
        url: "https://example.com/generated-image.png",
      };

      vi.spyOn(imageGeneration, "generateImage").mockResolvedValue(mockResult);

      const result = await caller.image.generate({
        prompt: "A beautiful landscape",
      });

      expect(imageGeneration.generateImage).toHaveBeenCalledWith({
        prompt: "A beautiful landscape",
      });

      expect(result).toEqual(mockResult);
    });

    it("supports originalImages parameter", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockResult = {
        url: "https://example.com/edited-image.png",
      };

      vi.spyOn(imageGeneration, "generateImage").mockResolvedValue(mockResult);

      const result = await caller.image.generate({
        prompt: "Add a rainbow",
        originalImages: [
          {
            url: "https://example.com/original.jpg",
            mimeType: "image/jpeg",
          },
        ],
      });

      expect(imageGeneration.generateImage).toHaveBeenCalledWith({
        prompt: "Add a rainbow",
        originalImages: [
          {
            url: "https://example.com/original.jpg",
            mimeType: "image/jpeg",
          },
        ],
      });

      expect(result).toEqual(mockResult);
    });

    it("handles errors from generateImage", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      vi.spyOn(imageGeneration, "generateImage").mockRejectedValue(
        new Error("Service unavailable")
      );

      await expect(
        caller.image.generate({
          prompt: "A beautiful landscape",
        })
      ).rejects.toThrow("Service unavailable");
    });
  });
});
