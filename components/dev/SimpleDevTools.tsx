'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function SimpleDevTools() {
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isOnAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    const checkAdminStatus = () => {
      const adminToken = localStorage.getItem('super_admin_token');
      setIsAdmin(!!adminToken);
    };

    checkAdminStatus();
  }, []);

  const enableAdmin = () => {
    const token = 'super_admin_token_' + Date.now();
    localStorage.setItem('super_admin_token', token);
    localStorage.setItem('user_token', token);
    localStorage.setItem('authToken', token);
    setIsAdmin(true);
  };

  const disableAdmin = () => {
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('user_token');
    localStorage.removeItem('authToken');
    setIsAdmin(false);
    if (isOnAdminPage) {
      window.location.href = '/';
      return;
    }
    router.refresh();
  };

  if (isAdmin && isOnAdminPage) {
    return (
      <button
        onClick={disableAdmin}
        className="super-admin-key super-admin-key--active"
        title="点击退出超管"
        aria-label="点击退出超管"
        type="button"
      >
        🔑
      </button>
    );
  }

  return (
    <Link
      href="/admin"
      onClick={() => {
        if (!isAdmin) {
          enableAdmin();
        }
      }}
      className={isAdmin ? 'super-admin-key super-admin-key--active' : 'super-admin-key'}
      title={isAdmin ? '超管已开启，点击进入后台' : '点击进入超管'}
      aria-label={isAdmin ? '超管已开启，点击进入后台' : '点击进入超管'}
      prefetch={false}
    >
      🔑
    </Link>
  );
}
