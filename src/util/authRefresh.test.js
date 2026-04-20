import { applyRefreshHeaders } from "util/authRefresh";

describe("applyRefreshHeaders", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("updates token and expirationTime from refresh headers", () => {
    localStorage.setItem("token", "Bearer old-token");
    localStorage.setItem("expirationTime", "2026-01-01T00:00:00.000Z");

    applyRefreshHeaders({
      "x-refresh-token": "new-token",
      "x-refresh-token-expires-at": "2026-04-20T22:30:00.000000Z",
    });

    expect(localStorage.getItem("token")).toBe("Bearer new-token");
    expect(localStorage.getItem("expirationTime")).toBe(
      "2026-04-20T22:30:00.000000Z",
    );
  });

  it("falls back to expires-in when expires-at is absent", () => {
    localStorage.setItem("token", "Bearer old-token");
    localStorage.setItem("expirationTime", "2026-01-01T00:00:00.000Z");

    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    applyRefreshHeaders({
      "x-refresh-token": "new-token",
      "x-refresh-token-expires-in": "60",
    });

    expect(localStorage.getItem("token")).toBe("Bearer new-token");
    expect(localStorage.getItem("expirationTime")).toBe(
      new Date(1_700_000_060_000).toISOString(),
    );

    nowSpy.mockRestore();
  });

  it("does nothing when there is no stored auth token", () => {
    applyRefreshHeaders({
      "x-refresh-token": "new-token",
      "x-refresh-token-expires-at": "2026-04-20T22:30:00.000000Z",
    });

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("expirationTime")).toBeNull();
  });

  it("updates token but keeps existing expirationTime when expires-at is invalid", () => {
    localStorage.setItem("token", "Bearer old-token");
    localStorage.setItem("expirationTime", "2026-01-01T00:00:00.000Z");

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    applyRefreshHeaders({
      "x-refresh-token": "new-token",
      "x-refresh-token-expires-at": "not-a-date",
    });

    expect(localStorage.getItem("token")).toBe("Bearer new-token");
    expect(localStorage.getItem("expirationTime")).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(warnSpy).toHaveBeenCalled();
  });

  it("ignores malformed bearer-only refresh token header", () => {
    localStorage.setItem("token", "Bearer old-token");
    localStorage.setItem("expirationTime", "2026-01-01T00:00:00.000Z");

    applyRefreshHeaders({
      "x-refresh-token": "Bearer",
      "x-refresh-token-expires-at": "2026-04-20T22:30:00.000000Z",
    });

    expect(localStorage.getItem("token")).toBe("Bearer old-token");
    expect(localStorage.getItem("expirationTime")).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });
});
