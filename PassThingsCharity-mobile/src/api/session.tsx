import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/api/client";
import { readSession, writeSession } from "@/api/storage";
import type { SessionUser } from "@/api/types";

type RegisterInput = {
  email: string;
  username: string;
  password: string;
  fullname: string;
  phone: string;
};

type SessionValue = {
  ready: boolean;
  token: string | null;
  user: SessionUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

function asUser(raw: { id: unknown; username: string; phone: string }): SessionUser {
  return { id: String(raw.id), username: raw.username, phone: raw.phone };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    readSession().then((stored) => {
      if (cancelled || !stored) return;
      setToken(stored.token);
      setUser(stored.user);
    }).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SessionValue>(() => {
    return {
      ready,
      token,
      user,
      async login(username, password) {
        const data = await api<{ token: string; user: { id: unknown; username: string; phone: string } }>(
          "/auth/login",
          { method: "POST", body: { username, password } },
        );
        const nextUser = asUser(data.user);
        setToken(data.token);
        setUser(nextUser);
        await writeSession({ token: data.token, user: nextUser });
      },
      async register(input) {
        await api("/auth/register", { method: "POST", body: input });
        const data = await api<{ token: string; user: { id: unknown; username: string; phone: string } }>(
          "/auth/login",
          { method: "POST", body: { username: input.username, password: input.password } },
        );
        const nextUser = asUser(data.user);
        setToken(data.token);
        setUser(nextUser);
        await writeSession({ token: data.token, user: nextUser });
      },
      async logout() {
        setToken(null);
        setUser(null);
        await writeSession(null);
      },
    };
  }, [ready, token, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession phải nằm trong SessionProvider.");
  return value;
}
