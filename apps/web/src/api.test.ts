import { describe, expect, it } from "vitest"
import { resolveApiBase } from "./api"

describe("resolveApiBase", () => {
  it("falls back correctly when VITE_API_BASE is empty and trims trailing slashes", () => {
    expect(resolveApiBase("", false, "https://sidereus.example.com")).toBe("https://sidereus.example.com")
    expect(resolveApiBase("   ", true, "https://sidereus.example.com")).toBe("http://localhost:4000")
    expect(resolveApiBase("https://api.example.com///", false, "https://sidereus.example.com")).toBe(
      "https://api.example.com"
    )
  })

  it("uses localhost in dev when VITE_API_BASE is undefined", () => {
    expect(resolveApiBase(undefined, true, "https://sidereus.example.com")).toBe("http://localhost:4000")
  })

  it("uses current origin in production when VITE_API_BASE is undefined", () => {
    expect(resolveApiBase(undefined, false, "https://sidereus.example.com")).toBe("https://sidereus.example.com")
  })

  it("trims surrounding spaces and preserves API path", () => {
    expect(resolveApiBase("  https://api.example.com/v1/  ", false, "https://sidereus.example.com")).toBe(
      "https://api.example.com/v1"
    )
  })

  it("keeps configured API host in dev instead of fallback", () => {
    expect(resolveApiBase("http://127.0.0.1:9000/", true, "https://sidereus.example.com")).toBe(
      "http://127.0.0.1:9000"
    )
  })
})
