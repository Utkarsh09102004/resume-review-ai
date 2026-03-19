import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "@/lib/api";

describe("apiFetch", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls correct URL with Content-Type header", async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: "test" }) };
    (global.fetch as any).mockResolvedValue(mockResponse);

    await apiFetch("/api/resumes/");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/resumes/",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("throws on non-ok response", async () => {
    const mockResponse = { ok: false, status: 404, json: () => Promise.resolve({}) };
    (global.fetch as any).mockResolvedValue(mockResponse);

    await expect(apiFetch("/api/resumes/not-found")).rejects.toThrow("API error: 404");
  });

  it("returns parsed JSON on success", async () => {
    const data = { id: "123", title: "Test" };
    const mockResponse = { ok: true, json: () => Promise.resolve(data) };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await apiFetch("/api/resumes/");
    expect(result).toEqual(data);
  });
});
