"use client";

import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 检查本地存储或系统偏好
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // 防止水合不匹配
  if (!mounted) {
    return (
      <button className="theme-toggle" aria-label="切换主题">
        <span className="theme-toggle__icon">☀️</span>
      </button>
    );
  }

  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      aria-label={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
      title={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
    >
      <span className="theme-toggle__icon">
        {theme === "light" ? "🌙" : "☀️"}
      </span>
      <span className="theme-toggle__text">
        {theme === "light" ? "深色" : "浅色"}
      </span>
    </button>
  );
}
