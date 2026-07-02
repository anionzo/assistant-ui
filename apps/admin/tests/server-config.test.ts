import { describe, expect, it } from "vitest";
import { getAdminConfig } from "../lib/server/config";

describe("admin server config", () => {
  it("separates the public auth URL from the Docker-internal API URL", () => {
    const config = getAdminConfig({
      IDX_API_URL: "https://api.example.edu/",
      IDX_API_INTERNAL_URL: "http://idx-api:4000/",
      IDX_SERVICE_SECRET: "secret",
      FRONTEND_URL: "https://admin.example.edu",
    });

    expect(config.authApiUrl).toBe("https://api.example.edu");
    expect(config.idxApiUrl).toBe("http://idx-api:4000");
  });
});
