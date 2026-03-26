'use client';

// Toast通知系统
// 全局操作反馈和状态提示

import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  progress?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // 自动隐藏
    if (toast.duration !== 0) {
      setTimeout(() => {
        hideToast(id);
      }, toast.duration || 5000);
    }

    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, updateToast }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Toast容器组件
const ToastContainer: React.FC<{ toasts: Toast[]; onHide: (id: string) => void }> = ({
  toasts,
  onHide
}) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onHide={() => onHide(toast.id)} />
      ))}
    </div>
  );
};

// 单个 Toast 组件
const ToastItem: React.FC<{ toast: Toast; onHide: () => void }> = ({ toast, onHide }) => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
    loading: '⟳'
  };

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    loading: '#6b7280'
  };

  // Toast 标题映射
  const titleMap: Record<ToastType, string> = {
    success: '操作成功',
    error: '操作失败',
    warning: '温馨提示',
    info: '提示信息',
    loading: '处理中'
  };

  return (
    <div
      className={`toast toast-${toast.type}`}
      style={{
        background: 'white',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        minWidth: '300px',
        maxWidth: '400px',
        animation: 'slideIn 0.3s ease'
      }}
    >
      <span
        className="toast-icon"
        style={{
          color: colors[toast.type],
          fontSize: '20px',
          fontWeight: 'bold',
          flexShrink: 0
        }}
      >
        {icons[toast.type]}
      </span>
      
      <div className="toast-content" style={{ flex: 1 }}>
        <div className="toast-title" style={{ fontWeight: 600, marginBottom: '4px' }}>
          {toast.title || titleMap[toast.type]}
        </div>
        
        {toast.message && (
          <div className="toast-message" style={{ fontSize: '14px', color: '#6b7280' }}>
            {toast.message}
          </div>
        )}
        
        {toast.progress !== undefined && (
          <div className="toast-progress" style={{ marginTop: '8px' }}>
            <div
              style={{
                height: '4px',
                background: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: colors[toast.type],
                  width: `${toast.progress}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {toast.progress}%
            </span>
          </div>
        )}
        
        {toast.action && (
          <button
            className="toast-action"
            onClick={toast.action.onClick}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: colors[toast.type],
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        className="toast-close"
        onClick={onHide}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          color: '#9ca3af',
          padding: '0',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  );
};

// 便捷函数
export const useToastHelpers = () => {
  const { showToast, hideToast, updateToast } = useToast();

  const success = useCallback((title: string, message?: string) => {
    return showToast({ type: 'success', title, message });
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    return showToast({ type: 'error', title, message, duration: 8000 });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string) => {
    return showToast({ type: 'warning', title, message });
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    return showToast({ type: 'info', title, message });
  }, [showToast]);

  const loading = useCallback((title: string, message?: string) => {
    return showToast({ type: 'loading', title, message, duration: 0 });
  }, [showToast]);

  const updateLoading = useCallback((id: string, progress: number, message?: string) => {
    updateToast(id, { progress, message });
  }, [updateToast]);

  const finishLoading = useCallback((id: string, type: 'success' | 'error', title: string, message?: string) => {
    updateToast(id, { type, title, message, progress: undefined, duration: 5000 });
  }, [updateToast]);

  return {
    success,
    error,
    warning,
    info,
    loading,
    updateLoading,
    finishLoading,
    hideToast
  };
};

// 添加CSS动画
const styles = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  @media (max-width: 640px) {
    .toast-container {
      left: 20px;
      right: 20px;
    }
    
    .toast {
      max-width: 100% !important;
    }
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
