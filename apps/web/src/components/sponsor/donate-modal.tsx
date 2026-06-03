'use client';

import { Heart, Mail, X } from 'lucide-react';
import { type KeyboardEvent, useRef } from 'react';

import { trapModalFocus } from '../modal/focus-trap';

type DonateModalProps = {
  confirmLabel?: string;
  onClose: () => void;
  onConfirm?: () => void;
  open: boolean;
};

export function DonateModal({
  confirmLabel = '我知道了',
  onClose,
  onConfirm,
  open,
}: DonateModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);

  if (!open) {
    return null;
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    trapModalFocus(event, dialogRef, onClose);
  }

  return (
    <div
      aria-labelledby="donate-modal-title"
      aria-modal="true"
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm duration-200"
      role="dialog"
    >
      <section
        className="animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl duration-200"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
                <Heart className="h-5 w-5 fill-current" />
              </div>
              <h2 className="text-xl font-bold text-slate-800" id="donate-modal-title">
                赞助与合作
              </h2>
            </div>
            <button
              aria-label="关闭赞助弹窗"
              autoFocus
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5">
            <p className="text-[15px] leading-7 text-slate-700">
              由于服务器与 AI Token 成本持续增长，项目可能会在赞助资源耗尽后暂停服务。如果您觉得{' '}
              <strong className="font-semibold text-slate-900">红笔AI</strong>{' '}
              有价值，欢迎通过赞助或合作帮助我们走得更远。
            </p>

            <p className="text-sm leading-relaxed text-slate-500">
              我们开放广告位与商业合作。如有赞助、推广、技术合作意向，欢迎来信并附上联系方式、合作事由与意向报价。
            </p>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Mail className="h-5 w-5 text-slate-400" />
              <div className="flex flex-col">
                <span className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  合作联系
                </span>
                <a
                  className="font-bold text-blue-600 hover:underline"
                  href="mailto:3697543027@qq.com"
                >
                  3697543027@qq.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              className="w-full rounded-xl bg-rose-500 py-3 font-bold text-white shadow-lg shadow-rose-200 transition-colors hover:bg-rose-600"
              onClick={onConfirm ?? onClose}
              type="button"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
