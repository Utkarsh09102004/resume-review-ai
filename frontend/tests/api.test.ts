import { describe, expect, it } from "vitest";
import api from "@/lib/api";

describe("api client", () => {
  it("has correct baseURL", () => {
    expect(api.defaults.baseURL).toBe("http://localhost:8000");
  });

  it("has Content-Type header set", () => {
    expect(api.defaults.headers["Content-Type"]).toBe("application/json");
  });
});
