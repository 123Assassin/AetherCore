'use client';

import { useEffect, useRef, useState } from 'react';

type CommentResultListProps = {
  comments: string[];
  loading: boolean;
};

type ClipboardNavigator = Navigator & {
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
};

const copyFailureMessage = '复制失败，请手动选择文本复制。';

export function CommentResultList({ comments, loading }: CommentResultListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const clearCopyStateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearCopyStateRef.current) {
        clearTimeout(clearCopyStateRef.current);
      }
    };
  }, []);

  async function copyComment(comment: string, index: number) {
    const clipboard = (navigator as ClipboardNavigator).clipboard;

    function clearCopiedState() {
      setCopiedIndex(null);

      if (clearCopyStateRef.current) {
        clearTimeout(clearCopyStateRef.current);
        clearCopyStateRef.current = null;
      }
    }

    if (!clipboard) {
      clearCopiedState();
      setCopyError(copyFailureMessage);
      return;
    }

    try {
      await clipboard.writeText(comment);
      setCopyError(null);
      setCopiedIndex(index);

      if (clearCopyStateRef.current) {
        clearTimeout(clearCopyStateRef.current);
      }

      clearCopyStateRef.current = setTimeout(() => {
        setCopiedIndex(null);
        clearCopyStateRef.current = null;
      }, 2000);
    } catch {
      clearCopiedState();
      setCopyError(copyFailureMessage);
    }
  }

  return (
    <section aria-label="评语结果" className="comment-results">
      <div className="comment-results__header">
        <div>
          <h2>生成结果</h2>
          <p>{comments.length > 0 ? `共 ${comments.length} 条评语` : '生成后会显示在这里'}</p>
        </div>
      </div>

      {copyError ? (
        <div aria-live="assertive" className="comment-results__alert" role="alert">
          {copyError}
        </div>
      ) : null}

      <div className="comment-results__body" aria-live="polite">
        {comments.length === 0 ? (
          <div className="comment-results__empty">
            <h3>{loading ? '正在生成评语' : '等待生成结果'}</h3>
            <p>{loading ? '生成完成后会展示三条可复制评语。' : '填写必要信息后生成评语。'}</p>
          </div>
        ) : (
          comments.map((comment, index) => (
            <article
              aria-label={`评语结果 ${index + 1}`}
              className="comment-result-card"
              key={index}
            >
              <div className="comment-result-card__top">
                <span>版本 {index + 1}</span>
                <button
                  className="comment-result-card__copy"
                  onClick={() => void copyComment(comment, index)}
                  type="button"
                >
                  {copiedIndex === index ? '已复制' : '复制'}
                </button>
              </div>
              <p>{comment}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
