"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import type { AppMetadata } from "@/lib/types";

/*
 * Session Supabase + vai trò đọc từ user.app_metadata (CONTRACT §4 — chỉ service role gán được).
 *  { nexora_role: "curator" } | { nexora_role: "customer", customer_id }
 * Vai trò chỉ dùng để ẨN/HIỆN giao diện; quyền thật do RLS ở DB quyết định.
 */

export type Role = AppMetadata["nexora_role"];

type AuthState = {
  loading: boolean;
  session: Session | null;
  email: string | null;
  role: Role | null; // null = đăng nhập nhưng chưa được gán vai trò
  customerId: string | null; // chỉ có với role customer
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function parseRole(session: Session | null): { role: Role | null; customerId: string | null } {
  const meta = session?.user.app_metadata as Partial<{ nexora_role: string; customer_id: string }> | undefined;
  if (meta?.nexora_role === "curator") return { role: "curator", customerId: null };
  if (meta?.nexora_role === "customer" && meta.customer_id) return { role: "customer", customerId: meta.customer_id };
  return { role: null, customerId: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; session: Session | null }>({ loading: true, session: null });

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => setState({ loading: false, session: data.session }));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setState({ loading: false, session }));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    loading: state.loading,
    session: state.session,
    email: state.session?.user.email ?? null,
    ...parseRole(state.session),
    signOut: async () => {
      await getSupabase().auth.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return ctx;
}

// Trang đầu tiên của mỗi vai trò sau khi đăng nhập
export const HOME_BY_ROLE: Record<Role, string> = { curator: "/nhap-van-ban", customer: "/tong-quan" };
