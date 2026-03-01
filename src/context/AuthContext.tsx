import { useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { AuthContext, User } from "./auth";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { clearAllApplicationDrafts } from "@/hooks/useApplication";

const ROLE_CACHE_KEY = "cdl-cached-role";

const parseUserRole = (value: unknown): User["role"] | null => {
  if (value === "driver" || value === "company" || value === "admin") return value;
  return null;
};

const fallbackDisplayName = (email: string, preferred?: string) => {
  if (preferred && preferred.trim()) return preferred.trim();
  const localPart = email.split("@")[0]?.trim();
  return localPart || "User";
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const loadProfile = useCallback(async (sessionUser: SupabaseUser) => {
    const userId = sessionUser.id;
    const userEmail = sessionUser.email ?? "";
    const fallbackRole = parseUserRole(sessionUser.user_metadata?.role);
    const fallbackName = typeof sessionUser.user_metadata?.name === "string"
      ? sessionUser.user_metadata.name
      : undefined;

    // Retry up to 4 times with 600ms delay. The DB trigger that creates the
    // profiles row runs asynchronously and may not be committed yet on the
    // first attempt (especially right after signUp).
    let data: { id: string; name: string | null; role: string | null } | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: row } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("id", userId)
        .maybeSingle();

      if (row) {
        data = {
          id: row.id as string,
          name: (row.name as string | null) ?? null,
          role: (row.role as string | null) ?? null,
        };
        break;
      }

      if (attempt < 3) await new Promise((r) => setTimeout(r, 600));
    }

    if (data) {
      const role = parseUserRole(data.role) ?? fallbackRole ?? "driver";
      setUser({
        id: data.id,
        name: data.name ?? fallbackDisplayName(userEmail, fallbackName),
        email: userEmail,
        role,
      });
      localStorage.setItem(ROLE_CACHE_KEY, role);
    } else if (fallbackRole) {
      // If profile row creation lags behind auth, keep the session usable.
      setUser({
        id: userId,
        name: fallbackDisplayName(userEmail, fallbackName),
        email: userEmail,
        role: fallbackRole,
      });
      localStorage.setItem(ROLE_CACHE_KEY, fallbackRole);
    } else {
      setUser(null);
      localStorage.removeItem(ROLE_CACHE_KEY);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Hydrate session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    // Keep in sync with Supabase auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadProfile(session.user);
        } else {
          setUser(null);
          localStorage.removeItem(ROLE_CACHE_KEY);
          setLoading(false);
        }
      },
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
    role: "driver" | "company",
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
    localStorage.removeItem(ROLE_CACHE_KEY);
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