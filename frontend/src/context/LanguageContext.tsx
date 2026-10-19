"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { id as idDict } from "../locales/id";

export type Lang = "en" | "id";

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (s: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [lang, setLang] = useState<Lang>("id");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setLang("id");
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("lang", lang);
      document.documentElement.lang = lang;
    }
  }, [lang, isInitialized]);

  const toggleLang = () => {
    setLang((prev) => (prev === "id" ? "en" : "id"));
  };

  const t = (
    s: string,
    vars?: Record<string, string | number>,
  ): string => {
    let out = lang === "id" ? (idDict[s] ?? s) : s;
    if (vars) {
      for (const k of Object.keys(vars)) {
        out = out.split(`{${k}}`).join(String(vars[k]));
      }
    }
    return out;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (ctx === undefined) {
    throw new Error("useLang must be used within a LanguageProvider");
  }
  return ctx;
};