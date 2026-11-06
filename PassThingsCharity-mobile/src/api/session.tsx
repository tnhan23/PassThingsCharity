import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { backend } from "@/api/backend";
import { readSession, writeSession } from "@/api/storage";
import type { SessionUser, StationRow } from "@/api/types";

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
  patchUser: (partial: Partial<SessionUser>) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

const roleNames = ["ADMIN", "ORG_MANAGER", "STATION_MANAGER", "STAFF", "VOLUNTEER", "USER"];

export function isOperator(role?: string) {
  return role === "ADMIN" || role === "ORG_MANAGER" || role === "STATION_MANAGER" || role === "STAFF";
}

function roleName(role: unknown) {
  if (typeof role === "string" && roleNames.includes(role)) return role;
  if (role && typeof role === "object" && "name" in role) {
    const name = (role as { name?: unknown }).name;
    if (typeof name === "string" && roleNames.includes(name)) return name;
  }
  return undefined;
}

function asUser(raw: { id: unknown; username: string; phone?: string | null; role?: unknown; email?: string | null; fullName?: string | null; avatarUrl?: string | null; stations?: StationRow[] }): SessionUser {
  const role = roleName(raw.role);
  const stations = raw.stations?.flatMap((station) => station._id ? [station] : []) ?? [];
  return {
    id: String(raw.id),
    username: raw.username,
    phone: raw.phone || "",
    email: raw.email || undefined,
    fullName: raw.fullName || undefined,
    avatarUrl: raw.avatarUrl || undefined,
    role,
    stations,
  };
}

async function userWithRole(token: string, user: SessionUser) {
  try {
    const profile = await backend.myProfile(token);
    const role = roleName(profile.user.role) || user.role;
    return {
      ...user,
      id: profile.user.id ? String(profile.user.id) : user.id,
      role,
      phone: profile.user.phone || user.phone || "",
      email: profile.user.email || user.email,
      fullName: profile.user.fullName || user.fullName,
      avatarUrl: profile.user.avatarUrl || user.avatarUrl,
    };
  } catch {
    return user;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    readSession().then(async (stored) => {
      if (cancelled || !stored) return;
      const user = await userWithRole(stored.token, stored.user);
      if (cancelled) return;
      setToken(stored.token);
      setUser(user);
      if (user.role !== stored.user.role) await writeSession({ token: stored.token, user });
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
        const data = await backend.login(username, password);
        const nextUser = await userWithRole(data.token, asUser(data.user));
        setToken(data.token);
        setUser(nextUser);
        await writeSession({ token: data.token, user: nextUser });
      },
      async register(input) {
        await backend.register(input);
        const data = await backend.login(input.username, input.password);
        const nextUser = await userWithRole(data.token, asUser(data.user));
        setToken(data.token);
        setUser(nextUser);
        await writeSession({ token: data.token, user: nextUser });
      },
      async logout() {
        setToken(null);
        setUser(null);
        await writeSession(null);
      },
      patchUser(partial) {
        setUser((current) => {
          if (!current || !token) return current;
          const next = { ...current, ...partial };
          void writeSession({ token, user: next });
          return next;
        });
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
