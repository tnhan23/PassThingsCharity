import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type GuestValue = {
  guest: boolean;
  enterGuest: () => void;
  leaveGuest: () => void;
};

const GuestContext = createContext<GuestValue | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState(false);
  const value = useMemo<GuestValue>(() => {
    return {
      guest,
      enterGuest() {
        setGuest(true);
      },
      leaveGuest() {
        setGuest(false);
      },
    };
  }, [guest]);
  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const value = useContext(GuestContext);
  if (!value) throw new Error("useGuest phải nằm trong GuestProvider.");
  return value;
}
