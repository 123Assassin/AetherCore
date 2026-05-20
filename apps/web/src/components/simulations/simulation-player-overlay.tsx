import type { SimulationItem } from '@package/shared';
import { ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useId, useRef } from 'react';

type SimulationPlayerOverlayProps = {
  item: SimulationItem;
  onClose: () => void;
  restoreFocusElement: FocusRestoreElement | null;
};

type FocusRestoreElement = {
  focus: () => void;
  isConnected?: boolean;
  offsetParent?: unknown;
  tagName?: string;
};

type OverlayElement = FocusRestoreElement & {
  querySelectorAll: (selector: string) => FocusRestoreElement[];
};

type KeyboardTrapEvent = {
  key?: string;
  shiftKey?: boolean;
  preventDefault: () => void;
};

type BrowserDocument = {
  activeElement: unknown;
  addEventListener: (type: 'keydown', listener: (event: KeyboardTrapEvent) => void) => void;
  removeEventListener: (type: 'keydown', listener: (event: KeyboardTrapEvent) => void) => void;
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getBrowserDocument() {
  return (globalThis as { document?: BrowserDocument }).document;
}

function getFocusableElements(overlay: OverlayElement | null) {
  return Array.from(overlay?.querySelectorAll(focusableSelector) ?? []).filter(
    (element) => element.offsetParent !== null
  );
}

export function SimulationPlayerOverlay({
  item,
  onClose,
  restoreFocusElement,
}: SimulationPlayerOverlayProps) {
  const titleId = useId();
  const overlayRef = useRef<OverlayElement | null>(null);

  const focusFirstControl = useCallback(() => {
    getFocusableElements(overlayRef.current)[0]?.focus();
  }, []);

  const trapFocus = useCallback((event: KeyboardTrapEvent) => {
    const browserDocument = getBrowserDocument();
    const focusableElements = getFocusableElements(overlayRef.current);

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (!firstElement || !lastElement) {
      return;
    }

    const activeElement = browserDocument?.activeElement;

    if (!focusableElements.includes(activeElement as FocusRestoreElement)) {
      event.preventDefault();
      firstElement.focus();
    } else if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, []);

  useEffect(() => {
    const browserDocument = getBrowserDocument();

    function handleDocumentKeyDown(event: KeyboardTrapEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        trapFocus(event);
      }
    }

    browserDocument?.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      browserDocument?.removeEventListener('keydown', handleDocumentKeyDown);
      if (restoreFocusElement?.isConnected !== false) {
        restoreFocusElement?.focus();
      }
    };
  }, [onClose, restoreFocusElement, trapFocus]);

  if (!item.src) {
    return null;
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[100] flex min-w-0 flex-col bg-black/90"
      ref={(element) => {
        overlayRef.current = element as OverlayElement | null;
      }}
      role="dialog"
    >
      <header className="flex min-w-0 items-center justify-between gap-4 bg-white/10 p-4 text-white backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-4">
          <button
            aria-label="返回仿真实验列表"
            autoFocus
            className="rounded-full p-2 transition-colors hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="h-6 w-6 rotate-180" />
          </button>
          <div className="min-w-0">
            <h2 className="truncate font-bold" id={titleId}>
              {item.name}
            </h2>
            <p className="mt-1 truncate text-xs text-white/60">
              {item.subject} · {item.category.name}
              {item.grades.length > 0 ? ` · ${item.grades.join(' / ')}` : ''}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <a
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold transition-colors hover:bg-red-600"
            href={item.src}
            rel="noreferrer"
            target="_blank"
          >
            全屏演示
          </a>
          <button
            aria-label="关闭仿真演示"
            className="rounded-full p-2 transition-colors hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            关闭
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 bg-white">
        <iframe
          allowFullScreen
          className="h-full w-full border-0"
          onFocus={focusFirstControl}
          src={item.src}
          tabIndex={-1}
          title={item.name}
        />
      </div>
    </div>
  );
}
