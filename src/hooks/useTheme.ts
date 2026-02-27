import { useState, useEffect } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("cdl-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("cdl-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("cdl-theme", "light");
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((d) => !d) };
}
