import { createContext, useContext } from "react";

export interface User {
  email: string;
  name: string;
  role: "driver" | "company";
}

export interface AuthContextType {
  user: User | null;
  signIn: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role: "driver" | "company") => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
