const getHeaderValue = (headers, headerName) => {
  if (!headers || !headerName) {
    return null;
  }

  const normalizedName = headerName.toLowerCase();

  if (typeof headers.get === "function") {
    const valueFromGetter = headers.get(headerName);
    if (valueFromGetter !== undefined && valueFromGetter !== null) {
      const trimmedValue = `${valueFromGetter}`.trim();
      return trimmedValue || null;
    }
  }

  const directValue =
    headers[headerName] ??
    headers[normalizedName] ??
    headers[headerName.toUpperCase()];

  if (directValue !== undefined && directValue !== null) {
    const trimmedValue = `${directValue}`.trim();
    return trimmedValue || null;
  }

  const caseInsensitiveEntry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === normalizedName,
  );

  if (!caseInsensitiveEntry) {
    return null;
  }

  const [, entryValue] = caseInsensitiveEntry;
  const trimmedValue = `${entryValue}`.trim();
  return trimmedValue || null;
};

const normalizeBearerToken = (token) => {
  if (!token) {
    return null;
  }

  const tokenWithoutPrefix = token.replace(/^Bearer(?:\s+|$)/i, "").trim();
  return tokenWithoutPrefix || null;
};

export const applyRefreshHeaders = (headers) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const existingStoredToken = localStorage.getItem("token");
    if (!existingStoredToken) {
      return;
    }

    const refreshedTokenHeader = getHeaderValue(headers, "x-refresh-token");
    const refreshedToken = normalizeBearerToken(refreshedTokenHeader);

    if (!refreshedToken) {
      return;
    }

    localStorage.setItem("token", `Bearer ${refreshedToken}`);

    const expiresAtHeader = getHeaderValue(headers, "x-refresh-token-expires-at");
    if (expiresAtHeader) {
      const parsedExpiresAt = new Date(expiresAtHeader);
      if (!Number.isNaN(parsedExpiresAt.getTime())) {
        localStorage.setItem("expirationTime", expiresAtHeader);
        return;
      }

      console.warn(
        "Received invalid x-refresh-token-expires-at header; skipping expiration update.",
      );
      return;
    }

    const expiresInHeader = getHeaderValue(headers, "x-refresh-token-expires-in");
    if (!expiresInHeader) {
      return;
    }

    const expiresInSeconds = Number(expiresInHeader);
    if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
      const nextExpirationTime = new Date(
        Date.now() + expiresInSeconds * 1000,
      ).toISOString();
      localStorage.setItem("expirationTime", nextExpirationTime);
      return;
    }

    console.warn(
      "Received invalid x-refresh-token-expires-in header; skipping expiration update.",
    );
  } catch (error) {
    console.warn("Failed to apply refresh token headers.", error);
  }
};
