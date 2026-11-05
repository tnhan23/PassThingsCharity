import { router } from "expo-router";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "@/api/session";
import { readShell, writeShell } from "@/api/storage";

type ShellMode = "member" | "desk";

type ShellValue = {
  desk: boolean;
  canSwitch: boolean;
  setMode: (mode: ShellMode) => void;
};

const ShellContext = createContext<ShellValue | null>(null);

const lockedDesk = new Set(["ADMIN", "STATION_MANAGER", "STAFF"]);

export function ShellProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [saved, setSaved] = useState<ShellMode | null>(null);

  useEffect(() => {
    if (!user?.id || user.role !== "ORG_MANAGER") return;
    let cancelled = false;
    readShell(user.id).then((mode) => {
      if (!cancelled) setSaved(mode);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const value = useMemo<ShellValue>(() => {
    const role = user?.role;
    const canSwitch = role === "ORG_MANAGER";
    const desk = role ? lockedDesk.has(role) || (canSwitch && saved !== "member") : false;
    return {
      desk,
      canSwitch,
      setMode(mode) {
        if (!user?.id || !canSwitch) return;
        setSaved(mode);
        void writeShell(user.id, mode);
        router.replace("/");
      },
    };
  }, [saved, user?.id, user?.role]);

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell phải nằm trong ShellProvider.");
  return value;
}
