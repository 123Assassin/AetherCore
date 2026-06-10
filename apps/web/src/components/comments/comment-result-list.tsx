'use client';

import { Check, Copy, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';

import { copyTextToClipboard } from '../../lib/clipboard';
import { getCommentCopyText } from './comment-copy.data';

type CommentResultListProps = {
  comments: string[];
  loading: boolean;
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
    function clearCopiedState() {
      setCopiedIndex(null);

      if (clearCopyStateRef.current) {
        clearTimeout(clearCopyStateRef.current);
        clearCopyStateRef.current = null;
      }
    }

    if (await copyTextToClipboard(getCommentCopyText(comment))) {
      setCopyError(null);
      setCopiedIndex(index);

      if (clearCopyStateRef.current) {
        clearTimeout(clearCopyStateRef.current);
      }

      clearCopyStateRef.current = setTimeout(() => {
        setCopiedIndex(null);
        clearCopyStateRef.current = null;
      }, 2000);
      return;
    }

    clearCopiedState();
    setCopyError(copyFailureMessage);
  }

  return (
    <section aria-label="评语结果" className="flex flex-col gap-4">
      {copyError ? (
        <div
          aria-live="assertive"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
          role="alert"
        >
          {copyError}
        </div>
      ) : null}

      {loading && comments.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-6 w-12 rounded-md bg-slate-100" />
              <div className="h-4 w-24 rounded-md bg-slate-50" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded-md bg-slate-50" />
              <div className="h-4 w-[90%] rounded-md bg-slate-50" />
              <div className="h-4 w-[40%] rounded-md bg-slate-50" />
            </div>
          </div>
        </div>
      ) : null}

      {!loading && comments.length === 0 ? (
        <div className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
          <div className="mb-6 flex h-20 w-20 rotate-3 items-center justify-center rounded-[2rem] bg-emerald-50">
            <Sparkles className="h-10 w-10 text-emerald-400" />
          </div>
          <h4 className="mb-2 text-lg font-black tracking-tight text-slate-800">
            准备好让 AI 助力了吗？
          </h4>
          <p className="max-w-[280px] text-sm leading-relaxed font-medium text-slate-500">
            在左侧面板填写学生的成长亮点，AI 将为您精准编撰专业评语。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              三明治反馈法
            </span>
            <span className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              千人千面
            </span>
          </div>
        </div>
      ) : null}

      {comments.map((comment, index) => (
        <article
          aria-label={`评语结果 ${index + 1}`}
          className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          key={index}
        >
          <div className="absolute top-6 right-6 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
              onClick={() => void copyComment(comment, index)}
              type="button"
            >
              {copiedIndex === index ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copiedIndex === index ? '已复制' : '复制内容'}
            </button>
          </div>
          <div className="max-w-none pr-0 text-sm leading-7 whitespace-pre-wrap text-slate-700 md:pr-28 [&_p]:my-0 [&_p+p]:mt-3">
            <Markdown>{comment}</Markdown>
          </div>
        </article>
      ))}
    </section>
  );
}
