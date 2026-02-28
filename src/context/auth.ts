import { createContext, useContext } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "driver" | "company" | "admin";
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: "driver" | "company" | "admin") => Promise<import("@supabase/supabase-js").User | null>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
