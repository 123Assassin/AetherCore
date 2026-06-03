'use client';

import type { KeyboardEvent, RefObject } from 'react';

type FocusableElement = {
  focus: () => void;
  hasAttribute: (name: string) => boolean;
};

type FocusTrapContainer = FocusableElement & {
  ownerDocument?: {
    activeElement?: unknown;
  };
  querySelectorAll: (selector: string) => ArrayLike<unknown>;
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function trapModalFocus(
  event: KeyboardEvent<HTMLElement>,
  containerRef: RefObject<unknown>,
  onClose: () => void
) {
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  const container = containerRef.current as FocusTrapContainer | null;

  if (!container) {
    return;
  }

  const focusableElements = Array.from(container.querySelectorAll(focusableSelector)).filter(
    isEnabledFocusableElement
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);
  const activeElement = container.ownerDocument?.activeElement;

  if (!firstElement || !lastElement) {
    event.preventDefault();
    container.focus();
    return;
  }

  if (!focusableElements.includes(activeElement as FocusableElement)) {
    event.preventDefault();
    (event.shiftKey ? lastElement : firstElement).focus();
    return;
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function isEnabledFocusableElement(element: unknown): element is FocusableElement {
  if (typeof element !== 'object' || element === null) {
    return false;
  }

  const candidate = element as Partial<FocusableElement>;

  return (
    typeof candidate.focus === 'function' &&
    typeof candidate.hasAttribute === 'function' &&
    !candidate.hasAttribute('disabled')
  );
}
