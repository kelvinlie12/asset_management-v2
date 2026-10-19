export function extractApiError(err: unknown, fallback: string): string {
  const data = (err as {
    response?: { data?: { message?: string; errors?: Record<string, string[]> } };
  })?.response?.data;
  if (data?.errors && typeof data.errors === "object") {
    const all = Object.values(data.errors).flat();
    if (all.length > 0) return all.join(" ");
  }
  return data?.message || fallback;
}