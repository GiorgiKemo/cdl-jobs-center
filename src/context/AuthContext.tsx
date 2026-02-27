import { useState, ReactNode } from "react";
import { AuthContext, User } from "./auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("cdl-user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Mock sign-in — replace body with Supabase when ready:
  // const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  const signIn = async (username: string, _password: string) => {
    const newUser: User = { name: username, email: `${username}@cdl.local`, role: "driver" };
    localStorage.setItem("cdl-user", JSON.stringify(newUser));
    setUser(newUser);
  };

  // Mock register — replace body with Supabase when ready:
  // const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } })
  const register = async (username: string, email: string, _password: string, role: "driver" | "company") => {
    const newUser: User = { name: username, email, role };
    localStorage.setItem("cdl-user", JSON.stringify(newUser));
    setUser(newUser);
  };

  const signOut = () => {
    localStorage.removeItem("cdl-user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
