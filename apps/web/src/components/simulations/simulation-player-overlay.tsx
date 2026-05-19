import type { SimulationItem } from '@package/shared';
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
      className="simulation-player-overlay"
      ref={(element) => {
        overlayRef.current = element as OverlayElement | null;
      }}
      role="dialog"
    >
      <header className="simulation-player-overlay__header">
        <div className="simulation-player-overlay__title">
          <h2 id={titleId}>{item.name}</h2>
          <p>
            {item.subject} · {item.category.name}
            {item.grades.length > 0 ? ` · ${item.grades.join(' / ')}` : ''}
          </p>
        </div>
        <button aria-label="关闭仿真演示" autoFocus onClick={onClose} type="button">
          ×
        </button>
      </header>
      <div className="simulation-player-overlay__frame">
        <iframe
          allowFullScreen
          onFocus={focusFirstControl}
          src={item.src}
          tabIndex={-1}
          title={item.name}
        />
      </div>
    </div>
  );
}
