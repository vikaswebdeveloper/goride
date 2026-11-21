// Browser-side fetch helper that unwraps the standard { success, data, error } API envelope.
export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: Record<string, string[]>) {
    super(message);
  }
}

export async function api<T>(url: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<{ data: T; meta?: Record<string, number> }> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let json: { success: boolean; data?: T; meta?: Record<string, number>; error?: { code: string; message: string; details?: Record<string, string[]> } };
  try {
    json = await res.json();
  } catch {
    throw new ApiError("INTERNAL", "Unexpected server response.", res.status);
  }
  if (!json.success) throw new ApiError(json.error?.code ?? "INTERNAL", json.error?.message ?? "Request failed.", res.status, json.error?.details);
  return { data: json.data as T, meta: json.meta };
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong.";
}
