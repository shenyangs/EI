"use client";

import { useEffect, useState } from "react";

// 检测是否为移动设备
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// 检测触摸设备
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}

// 移动端手势支持
export function useSwipeGesture(
  elementRef: React.RefObject<HTMLElement>,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();
      
      const diffX = endX - startX;
      const diffY = endY - startY;
      const diffTime = endTime - startTime;
      
      // 最小滑动距离和最大滑动时间
      const minSwipeDistance = 50;
      const maxSwipeTime = 300;
      
      if (diffTime > maxSwipeTime) return;
      
      // 水平滑动
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      
      // 垂直滑动
      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > minSwipeDistance) {
        if (diffY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);
}

// 移动端优化样式组件
export function MobileStyles() {
  return (
    <style jsx global>{`
      /* 移动端触摸优化 */
      @media (max-width: 768px) {
        /* 增大触摸目标 */
        button, 
        .primary-button, 
        .secondary-button,
        .line-item,
        .choice-card,
        .project-nav__item {
          min-height: 48px;
          min-width: 48px;
        }
        
        /* 优化滚动体验 */
        .project-nav,
        .chapter-menu--carousel,
        .mobile-step-strip {
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
        }
        
        .project-nav__item,
        .chapter-menu__item {
          scroll-snap-align: start;
        }
        
        /* 禁用文本选择（提升触摸体验） */
        .project-nav,
        .mobile-project-dock {
          user-select: none;
          -webkit-user-select: none;
        }
        
        /* 优化输入框 */
        input, textarea {
          font-size: 16px; /* 防止iOS缩放 */
          touch-action: manipulation;
        }
        
        /* 优化按钮触摸反馈 */
        button:active,
        .primary-button:active,
        .secondary-button:active {
          transform: scale(0.98);
          transition: transform 0.1s ease;
        }
        
        /* 优化卡片阴影 */
        .content-card,
        .hero-card,
        .project-card {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        /* 优化加载动画 */
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(43, 102, 245, 0.1);
          border-top-color: #2b66f5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* 优化底部安全区域 */
        .mobile-project-dock {
          padding-bottom: max(10px, env(safe-area-inset-bottom));
        }
        
        /* 优化头部安全区域 */
        .site-header {
          padding-top: max(12px, env(safe-area-inset-top));
        }
      }
      
      /* 深色模式支持 */
      @media (prefers-color-scheme: dark) {
        @media (max-width: 768px) {
          .content-card,
          .hero-card,
          .project-card {
            background: rgba(30, 30, 30, 0.95);
            border-color: rgba(255, 255, 255, 0.1);
          }
        }
      }
      
      /* 减少动画（尊重用户偏好） */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}

// 移动端加载状态组件
export function MobileLoadingState({ message = "加载中..." }: { message?: string }) {
  return (
    <div className="mobile-loading-state" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: '16px'
    }}>
      <div className="loading-spinner" />
      <span style={{ 
        color: 'var(--muted)', 
        fontSize: '14px',
        textAlign: 'center'
      }}>
        {message}
      </span>
    </div>
  );
}

// 移动端错误状态组件
export function MobileErrorState({ 
  message = "出错了", 
  onRetry 
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mobile-error-state" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: '16px',
      textAlign: 'center'
    }}>
      <span style={{ fontSize: '48px' }}>⚠️</span>
      <span style={{ 
        color: 'var(--text)', 
        fontSize: '16px',
        fontWeight: 600
      }}>
        {message}
      </span>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="secondary-button"
          style={{ marginTop: '8px' }}
        >
          重试
        </button>
      )}
    </div>
  );
}

// 移动端空状态组件
export function MobileEmptyState({ 
  message = "暂无数据",
  icon = "📭"
}: { 
  message?: string;
  icon?: string;
}) {
  return (
    <div className="mobile-empty-state" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: '12px',
      textAlign: 'center'
    }}>
      <span style={{ fontSize: '48px', opacity: 0.5 }}>{icon}</span>
      <span style={{ 
        color: 'var(--muted)', 
        fontSize: '14px'
      }}>
        {message}
      </span>
    </div>
  );
}

// 移动端下拉刷新组件
export function usePullToRefresh(
  elementRef: React.RefObject<HTMLElement>,
  onRefresh: () => Promise<void>
) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      // 只有在顶部时才允许下拉刷新
      if (element.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      // 如果向下拉动超过100px，触发刷新
      if (diff > 100 && !isRefreshing) {
        setIsRefreshing(true);
        onRefresh().finally(() => {
          setIsRefreshing(false);
        });
        isPulling = false;
      }
    };

    const handleTouchEnd = () => {
      isPulling = false;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, onRefresh, isRefreshing]);

  return { isRefreshing };
}
