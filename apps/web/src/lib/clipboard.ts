type ClipboardWriter = {
  writeText: (text: string) => Promise<void>;
};

type ClipboardElement = {
  focus?: () => void;
  select: () => void;
  setAttribute: (name: string, value: string) => void;
  setSelectionRange?: (start: number, end: number) => void;
  style: Record<string, string>;
  value: string;
};

type ClipboardDocument = {
  body: {
    appendChild: (element: ClipboardElement) => unknown;
    removeChild: (element: ClipboardElement) => unknown;
  };
  createElement: (tagName: 'textarea') => ClipboardElement;
  execCommand?: (command: string) => boolean;
};

export type ClipboardEnvironment = {
  clipboard?: ClipboardWriter | null;
  document?: ClipboardDocument | null;
};

function getDefaultClipboardEnvironment(): ClipboardEnvironment {
  const globalObject = globalThis as typeof globalThis & {
    document?: ClipboardDocument;
    navigator?: {
      clipboard?: ClipboardWriter;
    };
  };

  return {
    clipboard: globalObject.navigator?.clipboard ?? null,
    document: globalObject.document ?? null,
  };
}

function copyWithTemporaryTextarea(text: string, document: ClipboardDocument | null | undefined) {
  if (!document?.execCommand) {
    return false;
  }

  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  textarea.style.opacity = '0';

  try {
    document.body.appendChild(textarea);
    textarea.focus?.();
    textarea.select();
    textarea.setSelectionRange?.(0, text.length);

    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    try {
      document.body.removeChild(textarea);
    } catch {
      // The element may not have been appended if the browser rejected the operation.
    }
  }
}

export async function copyTextToClipboard(
  text: string,
  environment: ClipboardEnvironment = getDefaultClipboardEnvironment()
) {
  if (environment.clipboard) {
    try {
      await environment.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back for browsers that expose clipboard but block writeText in this context.
    }
  }

  return copyWithTemporaryTextarea(text, environment.document);
}
