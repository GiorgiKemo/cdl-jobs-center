import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  email: string;
  name: string;
  role: "driver" | "company";
}

interface AuthContextType {
  user: User | null;
  signIn: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role: "driver" | "company") => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
