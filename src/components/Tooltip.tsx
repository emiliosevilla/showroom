import React, { useId, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type TooltipProps = {
  content: string;
  children: React.ReactElement;
  side?: 'top' | 'bottom';
  delayMs?: number;
};

/**
 * Accessible tooltip: shows on hover and keyboard focus, Escape closes,
 * links via aria-describedby. Prefer over native title= for icon controls.
 */
export function Tooltip({ content, children, side = 'bottom', delayMs = 400 }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: side === 'top' ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, [side]);

  const show = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, delayMs);
  };

  const hide = () => {
    clearTimer();
    setOpen(false);
  };

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    const onScroll = () => hide();
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const child = React.Children.only(children);
  const childProps = {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const r = (child as any).ref;
      if (typeof r === 'function') r(node);
      else if (r && typeof r === 'object') r.current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      (child.props as any).onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      (child.props as any).onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      (child.props as any).onFocus?.(e);
      show();
    },
    onBlur: (e: React.FocusEvent) => {
      (child.props as any).onBlur?.(e);
      hide();
    },
    'aria-describedby': open ? id : (child.props as any)['aria-describedby'],
  };

  return (
    <>
      {React.cloneElement(child, childProps)}
      {open && coords && content && createPortal(
        <div
          id={id}
          role="tooltip"
          className="pointer-events-none fixed z-[300] max-w-xs px-2.5 py-1.5 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-md shadow-lg -translate-x-1/2"
          style={{
            top: side === 'top' ? undefined : coords.top,
            bottom: side === 'top' ? window.innerHeight - coords.top : undefined,
            left: coords.left,
            transform: side === 'top' ? 'translate(-50%, -100%)' : 'translateX(-50%)',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
