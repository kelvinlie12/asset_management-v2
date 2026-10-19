"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type TeamContextType = {
  activeTeamId: string;
  setActiveTeamId: (id: string) => void;
};

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const STORAGE_KEY = "activeTeamId";

export const TeamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [activeTeamId, setActiveTeamIdState] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setActiveTeamIdState(saved ? String(saved) : "");
  }, []);

  const setActiveTeamId = (id: string) => {
    const next = id ? String(id) : "";
    setActiveTeamIdState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <TeamContext.Provider value={{ activeTeamId, setActiveTeamId }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const ctx = useContext(TeamContext);
  if (ctx === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return ctx;
};