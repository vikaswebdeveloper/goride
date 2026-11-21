import { NextResponse } from "next/server";
import { ZodError, type ZodType, z } from "zod";
import { AppError } from "./errors";
import { logger } from "./logger";

export type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = { success: false; error: { code: string; message: string; details?: unknown } };

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json<ApiFailure>({ success: false, error: { code, message, details } }, { status });
}

/** Same-origin check for state-changing requests (defence-in-depth next to SameSite=Lax cookies). */
function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (curl, server-to-server); cookies are SameSite=Lax anyway
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw new AppError("FORBIDDEN", "Cross-origin request blocked.");
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler with origin check + centralised error handling. */
export function route<P = Record<string, never>>(
  handler: (req: Request, ctx: Ctx<P>) => Promise<Response>,
  opts: { skipOriginCheck?: boolean } = {},
) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      if (!opts.skipOriginCheck) assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof AppError) return fail(e.status, e.code, e.message, e.details);
      if (e instanceof ZodError) {
        return fail(422, "VALIDATION_ERROR", "Invalid input.", z.flattenError(e).fieldErrors);
      }
      logger.error("Unhandled API error", { path: new URL(req.url).pathname, err: e instanceof Error ? e.message : String(e) });
      return fail(500, "INTERNAL", "Something went wrong. Please try again.");
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
  }
  return schema.parse(json);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams));
}
