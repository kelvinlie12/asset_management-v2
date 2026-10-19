"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchBranding,
  resolveBrandingLogo,
  updateBranding,
  type Branding,
  type UpdateBrandingPayload,
} from "../services/branding";

interface BrandingContextValue {
  branding: Branding | null;
  /** Ready-to-use logo URL (respects the resolved path/URL). */
  logoUrl: string | null;
  companyName: string | null;
  isLoading: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  refresh: () => Promise<void>;
  saveBranding: (payload: UpdateBrandingPayload) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(
  undefined,
);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setBranding(await fetchBranding());
    } catch {
      // Branding is decorative: on failure the default logo is kept.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveBranding = useCallback(async (payload: UpdateBrandingPayload) => {
    setBranding(await updateBranding(payload));
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      logoUrl: resolveBrandingLogo(branding),
      companyName: branding?.company_name ?? null,
      isLoading,
      isModalOpen,
      openModal,
      closeModal,
      refresh,
      saveBranding,
    }),
    [branding, isLoading, isModalOpen, openModal, closeModal, refresh, saveBranding],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return ctx;
}
