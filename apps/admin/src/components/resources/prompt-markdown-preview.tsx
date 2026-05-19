import type { CSSProperties, ReactNode } from 'react';

type PromptMarkdownPreviewProps = {
  content: string;
};

type MarkdownBlock =
  | {
      level: 1 | 2 | 3;
      text: string;
      type: 'heading';
    }
  | {
      items: string[];
      type: 'ordered-list' | 'unordered-list';
    }
  | {
      text: string;
      type: 'paragraph';
    };

export function PromptMarkdownPreview({ content }: PromptMarkdownPreviewProps) {
  const blocks = parseMarkdownBlocks(content);

  if (blocks.length === 0) {
    return <p style={styles.empty}>暂无预览内容。</p>;
  }

  return (
    <div aria-label="Prompt Markdown 预览" style={styles.preview}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const paragraphLines: string[] = [];
  let list: {
    items: string[];
    type: 'ordered-list' | 'unordered-list';
  } | null = null;

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      text: paragraphLines.join(' '),
      type: 'paragraph',
    });
    paragraphLines.length = 0;
  }

  function flushList() {
    if (!list) {
      return;
    }

    blocks.push(list);
    list = null;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);

    if (headingMatch) {
      const headingMarks = headingMatch[1];
      const headingText = headingMatch[2];

      if (!headingMarks || !headingText) {
        continue;
      }

      flushParagraph();
      flushList();
      blocks.push({
        level: headingMarks.length as 1 | 2 | 3,
        text: headingText,
        type: 'heading',
      });
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.+)$/.exec(line);

    if (unorderedMatch) {
      const listItem = unorderedMatch[1];

      if (!listItem) {
        continue;
      }

      flushParagraph();

      if (!list || list.type !== 'unordered-list') {
        flushList();
        list = { items: [], type: 'unordered-list' };
      }

      list.items.push(listItem);
      continue;
    }

    const orderedMatch = /^\d+[.)]\s+(.+)$/.exec(line);

    if (orderedMatch) {
      const listItem = orderedMatch[1];

      if (!listItem) {
        continue;
      }

      flushParagraph();

      if (!list || list.type !== 'ordered-list') {
        flushList();
        list = { items: [], type: 'ordered-list' };
      }

      list.items.push(listItem);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderBlock(block: MarkdownBlock, index: number): ReactNode {
  if (block.type === 'heading') {
    const style =
      block.level === 1
        ? styles.headingOne
        : block.level === 2
          ? styles.headingTwo
          : styles.headingThree;
    const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3';

    return (
      <Tag key={`${block.type}-${index}`} style={style}>
        {renderInlineMarkdown(block.text)}
      </Tag>
    );
  }

  if (block.type === 'unordered-list') {
    return (
      <ul key={`${block.type}-${index}`} style={styles.list}>
        {block.items.map((item, itemIndex) => (
          <li key={`${item}-${itemIndex}`} style={styles.listItem}>
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === 'ordered-list') {
    return (
      <ol key={`${block.type}-${index}`} style={styles.list}>
        {block.items.map((item, itemIndex) => (
          <li key={`${item}-${itemIndex}`} style={styles.listItem}>
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === 'paragraph') {
    return (
      <p key={`${block.type}-${index}`} style={styles.paragraph}>
        {renderInlineMarkdown(block.text)}
      </p>
    );
  }

  return null;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith('`')) {
      nodes.push(
        <code key={`${token}-${match.index}`} style={styles.inlineCode}>
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(
        <strong key={`${token}-${match.index}`} style={styles.strong}>
          {token.slice(2, -2)}
        </strong>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

const headingBase = {
  color: '#172033',
  letterSpacing: 0,
  margin: 0,
} satisfies CSSProperties;

const styles = {
  empty: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
  },
  headingOne: {
    ...headingBase,
    fontSize: 20,
    lineHeight: '28px',
  },
  headingThree: {
    ...headingBase,
    fontSize: 15,
    lineHeight: '22px',
  },
  headingTwo: {
    ...headingBase,
    fontSize: 17,
    lineHeight: '24px',
  },
  inlineCode: {
    background: '#eef2f7',
    border: '1px solid #d8dee8',
    borderRadius: 4,
    color: '#334155',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: '18px',
    padding: '1px 4px',
  },
  list: {
    color: '#334155',
    display: 'grid',
    fontSize: 14,
    gap: 5,
    lineHeight: '21px',
    margin: 0,
    paddingLeft: 22,
  },
  listItem: {
    paddingLeft: 2,
  },
  paragraph: {
    color: '#334155',
    fontSize: 14,
    lineHeight: '21px',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  preview: {
    display: 'grid',
    gap: 10,
  },
  strong: {
    color: '#172033',
    fontWeight: 700,
  },
} satisfies Record<string, CSSProperties>;
