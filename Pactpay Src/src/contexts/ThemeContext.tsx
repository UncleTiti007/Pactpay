import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // 1. Check localStorage for saved preference
    const savedTheme = localStorage.getItem("pactpay-theme") as Theme | null;
    
    // 2. Determine initial theme
    let initialTheme: Theme;
    if (savedTheme) {
      initialTheme = savedTheme;
    } else {
      initialTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    // 3. Apply theme
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    // 4. Listen for OS theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Only apply OS change if user HAS NO manual override saved
      if (!localStorage.getItem("pactpay-theme")) {
        const newTheme = e.matches ? "dark" : "light";
        setTheme(newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("pactpay-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
