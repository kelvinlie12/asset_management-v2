import api from "./api";

export interface Branding {
  company_name: string | null;
  /** Server-relative path, e.g. "uploads/branding/logo_abc.png". */
  logo_path: string | null;
  /** Absolute URL built from APP_URL. */
  logo_url: string | null;
}

// In development VITE_API_URL is empty and the API is reached through the Vite
// proxy, so a relative download path works. In production the backend lives on
// its own origin, so the absolute URL is the safe choice.
const apiRoot = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/**
 * Resolve the logo to a URL the browser can load in the current environment.
 */
export function resolveBrandingLogo(branding: Branding | null): string | null {
  if (!branding) return null;
  if (!apiRoot && branding.logo_path) return `/${branding.logo_path}`;
  return branding.logo_url;
}

export async function fetchBranding(): Promise<Branding> {
  const { data } = await api.get<{ branding: Branding }>("/branding");
  return data.branding;
}

export interface UpdateBrandingPayload {
  company_name?: string | null;
  logo?: File | null;
  remove_logo?: boolean;
}

export async function updateBranding(
  payload: UpdateBrandingPayload,
): Promise<Branding> {
  const form = new FormData();

  if (payload.company_name !== undefined) {
    form.append("company_name", payload.company_name ?? "");
  }
  if (payload.logo) {
    form.append("logo", payload.logo);
  }
  if (payload.remove_logo) {
    form.append("remove_logo", "1");
  }

  const { data } = await api.post<{ branding: Branding }>("/branding", form);
  return data.branding;
}
