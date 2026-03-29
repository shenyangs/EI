"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

export function AuthNav({ allowRegistration }: { allowRegistration: boolean }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsLoggedIn(isAuthenticated());
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <nav className="auth-nav">
      {isLoggedIn ? (
        <Link href="/profile" className="auth-nav__link">
          个人中心
        </Link>
      ) : (
        <>
          <Link href="/login" className="auth-nav__link">
            登录
          </Link>
          {allowRegistration ? (
            <Link href="/register" className="auth-nav__link auth-nav__link--primary">
              注册
            </Link>
          ) : null}
        </>
      )}
    </nav>
  );
}
