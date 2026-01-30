import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as map from "./_core/map";

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

describe("maps router", () => {
  describe("maps.geocode", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.maps.geocode({
          address: "1600 Amphitheatre Parkway, Mountain View, CA",
        })
      ).rejects.toThrow();
    });

    it("requires either address or latlng", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.maps.geocode({})).rejects.toThrow(
        "Either address or latlng must be provided"
      );
    });

    it("calls makeRequest with correct parameters for address", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockResult: map.GeocodingResult = {
        results: [
          {
            address_components: [],
            formatted_address: "1600 Amphitheatre Parkway, Mountain View, CA",
            geometry: {
              location: { lat: 37.422, lng: -122.084 },
              location_type: "ROOFTOP",
              viewport: {
                northeast: { lat: 37.423, lng: -122.083 },
                southwest: { lat: 37.421, lng: -122.085 },
              },
            },
            place_id: "test-place-id",
            types: ["street_address"],
          },
        ],
        status: "OK",
      };

      vi.spyOn(map, "makeRequest").mockResolvedValue(mockResult);

      const result = await caller.maps.geocode({
        address: "1600 Amphitheatre Parkway, Mountain View, CA",
      });

      expect(map.makeRequest).toHaveBeenCalledWith("/maps/api/geocode/json", {
        address: "1600 Amphitheatre Parkway, Mountain View, CA",
      });

      expect(result).toEqual(mockResult);
    });
  });

  describe("maps.directions", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.maps.directions({
          origin: "San Francisco, CA",
          destination: "Los Angeles, CA",
        })
      ).rejects.toThrow();
    });

    it("calls makeRequest with correct parameters", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockResult: map.DirectionsResult = {
        routes: [],
        status: "OK",
      };

      vi.spyOn(map, "makeRequest").mockResolvedValue(mockResult);

      await caller.maps.directions({
        origin: "San Francisco, CA",
        destination: "Los Angeles, CA",
        mode: "driving",
      });

      expect(map.makeRequest).toHaveBeenCalledWith("/maps/api/directions/json", {
        origin: "San Francisco, CA",
        destination: "Los Angeles, CA",
        mode: "driving",
      });
    });
  });

  describe("maps.distanceMatrix", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.maps.distanceMatrix({
          origins: "New York, NY",
          destinations: "Boston, MA",
        })
      ).rejects.toThrow();
    });
  });

  describe("maps.placeSearch", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.maps.placeSearch({
          query: "restaurants",
        })
      ).rejects.toThrow();
    });
  });

  describe("maps.nearbySearch", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.maps.nearbySearch({
          location: "37.42,-122.08",
          radius: 1000,
        })
      ).rejects.toThrow();
    });
  });

  describe("maps.placeDetails", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.maps.placeDetails({
          place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        })
      ).rejects.toThrow();
    });
  });

  describe("maps.elevation", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.maps.elevation({
          locations: "39.73,-104.98",
        })
      ).rejects.toThrow();
    });

    it("requires either locations or path", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.maps.elevation({})).rejects.toThrow(
        "Either locations or path must be provided"
      );
    });
  });

  describe("maps.timeZone", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.maps.timeZone({
          location: "39.73,-104.98",
          timestamp: Math.floor(Date.now() / 1000),
        })
      ).rejects.toThrow();
    });
  });

  describe("maps.placeAutocomplete", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.maps.placeAutocomplete({
          input: "San Francisco",
        })
      ).rejects.toThrow();
    });
  });
});
