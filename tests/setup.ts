import { vi } from "vitest";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.PAYMENT_PROVIDER = "mock";
process.env.AUTH_SECRET ||= "test-secret-test-secret-test-secret-123";

// next/cache + next/headers need a request scope; stub them for service-level tests.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => {},
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));
