import { useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { AuthContext, User } from "./auth";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { clearAllApplicationDrafts } from "@/hooks/useApplication";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const loadProfile = useCallback(async (userId: string, userEmail: string) => {
    // Retry up to 4 times with 600ms delay — the DB trigger that creates the
    // profiles row runs asynchronously and may not be committed yet on the
    // first attempt (especially right after signUp).
    let data = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: row } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("id", userId)
        .maybeSingle();
      if (row) { data = row; break; }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 600));
    }

    if (data) {
      setUser({
        id: data.id,
        name: data.name,
        email: userEmail,
        role: data.role as "driver" | "company" | "admin",
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Hydrate session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? "");
      } else {
        setLoading(false);
      }
    });

    // Keep in sync with Supabase auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id, session.user.email ?? "");
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: "driver" | "company" | "admin"
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) throw error;
    return data.user;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    clearAllApplicationDrafts();
  }, [queryClient]);

  const authValue = useMemo(
    () => ({ user, loading, signIn, register, signOut }),
    [user, loading, signIn, register, signOut],
  );

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}
