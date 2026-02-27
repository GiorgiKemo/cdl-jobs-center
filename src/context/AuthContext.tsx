import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
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

  // Mock sign-in — swap this block for Supabase when ready:
  // const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  const signIn = async (email: string, _password: string) => {
    const name = email.split("@")[0];
    const newUser = { email, name };
    localStorage.setItem("cdl-user", JSON.stringify(newUser));
    setUser(newUser);
  };

  const signOut = () => {
    localStorage.removeItem("cdl-user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
