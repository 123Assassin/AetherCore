import ReactMarkdown from 'react-markdown';

type PromptMarkdownPreviewProps = {
  content: string;
};

export function PromptMarkdownPreview({ content }: PromptMarkdownPreviewProps) {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return <p className="m-0 text-sm text-slate-400">暂无预览内容。</p>;
  }

  return (
    <div aria-label="Prompt Markdown 预览" className="space-y-3 text-sm leading-6 text-slate-600">
      <ReactMarkdown
        components={{
          code: ({ children }) => (
            <code className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-700">
              {children}
            </code>
          ),
          h1: ({ children }) => (
            <h1 className="m-0 text-xl font-extrabold tracking-normal text-slate-900">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="m-0 text-lg font-bold tracking-normal text-slate-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="m-0 text-base font-bold tracking-normal text-slate-900">{children}</h3>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          ol: ({ children }) => <ol className="m-0 list-decimal space-y-1 pl-5">{children}</ol>,
          p: ({ children }) => <p className="m-0 whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">{children}</strong>
          ),
          ul: ({ children }) => <ul className="m-0 list-disc space-y-1 pl-5">{children}</ul>,
        }}
      >
        {trimmedContent}
      </ReactMarkdown>
    </div>
  );
}
