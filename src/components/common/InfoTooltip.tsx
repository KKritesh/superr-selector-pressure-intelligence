import { useId, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
export function InfoTooltip({
  text,
  floating = false,
  label = 'About this metric',
}: {
  text: string;
  floating?: boolean;
  label?: string;
}) {
  const id = useId(),
    [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!open || !floating) return;
    const update = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        const height = tooltipRef.current?.getBoundingClientRect().height ?? 0;
        const preferredTop = rect.top - height - 8 >= 8 ? rect.top - height - 8 : rect.bottom + 8;
        setPosition({
          left: Math.max(8, Math.min(window.innerWidth - 258, rect.right - 238)),
          top: Math.max(8, Math.min(window.innerHeight - height - 8, preferredTop)),
        });
      }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, floating]);
  const tooltip = (
    <span
      ref={tooltipRef}
      className="tooltip"
      role="tooltip"
      id={id}
      style={
        floating
          ? {
              position: 'fixed',
              left: position.left,
              top: position.top,
              bottom: 'auto',
              right: 'auto',
              maxWidth: 'calc(100vw - 16px)',
              maxHeight: 'calc(100vh - 16px)',
              overflowY: 'auto',
              zIndex: 15,
            }
          : undefined
      }
    >
      {text}
    </span>
  );
  return (
    <span className="tooltip-wrap">
      <button
        ref={ref}
        className="info-button"
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <Info size={14} />
      </button>
      {open && (floating ? createPortal(tooltip, document.body) : tooltip)}
    </span>
  );
}
