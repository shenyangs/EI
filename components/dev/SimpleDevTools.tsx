'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 超管信息
const SUPER_ADMIN = {
  id: 'super_admin_001',
  email: 'admin@system.com',
  username: 'super_admin',
  fullName: '超级管理员',
  userType: 'admin',
  institution: '系统管理',
  department: '管理部门',
  isSuperAdmin: true
};

export default function SimpleDevTools() {
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 检查当前是否是超管状态
    const checkAdminStatus = () => {
      const adminToken = localStorage.getItem('super_admin_token');
      setIsAdmin(!!adminToken);
    };
    checkAdminStatus();
  }, []);

  const handleToggleAdmin = () => {
    if (isAdmin) {
      // 退出超管状态
      localStorage.removeItem('super_admin_token');
      localStorage.removeItem('user_token');
      setIsAdmin(false);
      router.refresh();
    } else {
      // 进入超管状态
      const token = 'super_admin_token_' + Date.now();
      localStorage.setItem('super_admin_token', token);
      localStorage.setItem('user_token', token);
      setIsAdmin(true);
      router.refresh();
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={handleToggleAdmin}
        className={`fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white font-bold text-lg transition-all hover:scale-110 ${
          isAdmin ? 'bg-red-500 animate-pulse' : 'bg-blue-600'
        }`}
        title={isAdmin ? '点击退出超管' : '点击进入超管'}
      >
        {isAdmin ? '👑' : '🔑'}
      </button>

      {/* 超管状态提示 */}
      {isAdmin && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-40 font-bold text-sm">
          👑 超级管理员模式 - 拥有所有权限 👑
        </div>
      )}
    </>
  );
}
