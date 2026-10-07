"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { setAuthToken } from "@/lib/api";
import { type SessionUser, writeUserCookie } from "@/lib/session";

type AuthContextValue = {
  user: SessionUser | null;
  signIn: (user: SessionUser) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser = null,
  children,
}: {
  initialUser?: SessionUser | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    setAuthToken(initialUser?.token ?? null);
    return initialUser;
  });

  const signIn = useCallback((next: SessionUser) => {
    setAuthToken(next.token);
    writeUserCookie(next);
    setUser(next);
  }, []);

  const signOut = useCallback(() => {
    setAuthToken(null);
    writeUserCookie(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
