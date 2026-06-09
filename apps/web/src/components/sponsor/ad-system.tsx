'use client';

import { Download, ShieldCheck, Sparkles, Timer, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import type { AiGenerationAdMode } from '../../hooks/use-ai-generation-ad-gate';
import { trapModalFocus } from '../modal/focus-trap';

type AdConfig = {
  brandName: string;
  id: string;
  imageUrl: string;
  slogan: string;
};

const sampleAds: AdConfig[] = [
  {
    brandName: '知领智慧校园',
    id: '1',
    imageUrl: 'https://picsum.photos/seed/edu1/800/600',
    slogan: '全流程教务管理系统，助力学校数字化转型。',
  },
  {
    brandName: '晨鸣纸业',
    id: '2',
    imageUrl: 'https://picsum.photos/seed/edu2/800/600',
    slogan: '高品质办公用纸，呵护师生视力环境。',
  },
];

type ExportAdModalProps = {
  duration?: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

type GenerationAdOverlayProps = {
  duration?: number;
  isOpen: boolean;
  mode: AiGenerationAdMode;
  onClose: () => void;
};

function pickAd() {
  return sampleAds[Math.floor(Math.random() * sampleAds.length)] ?? sampleAds[0]!;
}

export function ExportAdModal({ duration = 15, isOpen, onClose, onConfirm }: ExportAdModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [ad, setAd] = useState(pickAd);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const resetTimer = setTimeout(() => {
      setTimeLeft(duration);
      setAd(pickAd());
      (dialogRef.current as { focus?: () => void } | null)?.focus?.();
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [duration, isOpen]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((current) => current - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  if (!isOpen) {
    return null;
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (timeLeft === 0) {
      trapModalFocus(event, dialogRef, onClose);
      return;
    }

    trapModalFocus(event, dialogRef, () => undefined);
  }

  return (
    <div className="animate-in fade-in fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-300 md:p-6">
      <div
        className="animate-in zoom-in-95 relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl duration-300"
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-8 py-4 text-white">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-black tracking-widest uppercase">
              文件准备中 · {timeLeft > 0 ? `等待充能 (${timeLeft}s)` : '准备就绪'}
            </span>
          </div>
          {timeLeft === 0 ? (
            <button
              aria-label="关闭广告"
              className="rounded-full p-1 transition-colors hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="custom-scrollbar flex flex-col items-center overflow-y-auto p-8">
          <div className="mb-6 w-full text-center">
            <h3 className="text-xl font-black tracking-tight text-slate-800">
              本次免费导出由品牌方赞助支持
            </h3>
            <p className="mt-1 text-xs font-bold text-slate-400">
              感谢合作伙伴的支持，让我们能持续为您提供专业 AI 教学服务
            </p>
          </div>

          <div
            aria-label="广告展示"
            className="group relative aspect-[16/9] w-full overflow-hidden rounded-3xl border-4 border-slate-50 shadow-inner"
          >
            <img
              alt="广告投放"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
              src={ad.imageUrl}
            />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-6 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex items-center gap-2 text-sm font-bold text-white">品牌展示</div>
            </div>
            <div className="absolute top-4 right-4 rounded bg-black/40 px-2 py-1 text-[10px] font-black tracking-tighter text-white/80 uppercase backdrop-blur">
              广告投放
            </div>
          </div>

          <div className="mt-6 flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-50 bg-white text-lg font-black text-slate-800 italic shadow-sm">
                {ad.brandName[0]}
              </div>
              <div className="min-w-0">
                <h4 className="mb-1 leading-none font-black text-slate-800">{ad.brandName}</h4>
                <p className="truncate text-xs font-medium text-slate-500">{ad.slogan}</p>
              </div>
            </div>
            <span className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-400">
              暂不跳转
            </span>
          </div>

          <div className="mt-8 w-full">
            <button
              className={`flex w-full items-center justify-center gap-3 rounded-[1.5rem] py-5 text-sm font-black tracking-widest transition-all ${
                timeLeft > 0
                  ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                  : 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95'
              }`}
              disabled={timeLeft > 0}
              onClick={onConfirm}
              type="button"
            >
              {timeLeft > 0 ? (
                <>
                  <Timer className="h-5 w-5" /> 正在处理数据包...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" /> 立即下载结果表 (.xlsx)
                </>
              )}
            </button>
            <p className="mt-4 flex items-center justify-center gap-1 text-center text-[10px] text-slate-300">
              <ShieldCheck className="h-3 w-3" /> 红笔AI 确保您的数据导出加密且安全
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GenerationAdOverlay({
  duration = 5,
  isOpen,
  mode,
  onClose,
}: GenerationAdOverlayProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [ad, setAd] = useState(pickAd);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const resetTimer = setTimeout(() => {
      setTimeLeft(duration);
      setAd(pickAd());
      (dialogRef.current as { focus?: () => void } | null)?.focus?.();
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [duration, isOpen]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((current) => current - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  if (!isOpen) {
    return null;
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (timeLeft === 0) {
      trapModalFocus(event, dialogRef, onClose);
      return;
    }

    trapModalFocus(event, dialogRef, () => undefined);
  }

  return (
    <div className="animate-in fade-in fixed inset-0 z-[220] flex items-center justify-center bg-white/30 p-4 backdrop-blur-xl duration-300 md:p-6">
      <div
        aria-modal="true"
        className="animate-in zoom-in-95 relative flex w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white/95 shadow-2xl ring-1 ring-white/70 duration-300"
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between bg-slate-950 px-6 py-4 text-white">
          <div>
            <div className="text-xs font-black tracking-widest text-white/60 uppercase">
              {mode === 'waiting' ? '广告结束后开始生成' : 'AI 正在生成'}
            </div>
            <div className="mt-1 text-sm font-bold">
              {timeLeft > 0 ? `请停留 ${timeLeft}s` : '广告展示完成'}
            </div>
          </div>
          {timeLeft === 0 ? (
            <button
              aria-label="关闭广告"
              className="rounded-full p-2 transition-colors hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="p-6">
          <div
            aria-label="广告展示"
            className="group relative block aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100"
          >
            <img
              alt="广告投放"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
              src={ad.imageUrl}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
              <div className="text-lg font-black">{ad.brandName}</div>
              <p className="mt-1 text-sm text-white/80">{ad.slogan}</p>
            </div>
            <div className="absolute top-4 right-4 rounded bg-black/50 px-2 py-1 text-[10px] font-black tracking-widest text-white/80 uppercase backdrop-blur">
              广告
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Timer className="h-4 w-4 text-slate-400" />
              {mode === 'waiting'
                ? '额度不足，本次生成将在关闭广告后开始'
                : '生成已开始，广告关闭后可继续查看结果'}
            </div>
            <span className="rounded-xl px-3 py-2 text-xs font-bold text-slate-400">暂不跳转</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdLoadingBot() {
  const [ad] = useState(pickAd);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex gap-6 duration-500">
      <div className="flex h-12 w-12 shrink-0 animate-pulse items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg">
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <div className="flex max-w-[400px] flex-col gap-3">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="group relative aspect-[16/9] overflow-hidden">
            <img
              alt="品牌推荐"
              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
              src={ad.imageUrl}
            />
            <div className="absolute top-3 right-3 rounded bg-black/20 px-1.5 py-0.5 text-[8px] font-black tracking-tighter text-white/60 uppercase backdrop-blur">
              资讯
            </div>
          </div>
          <div className="bg-white p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] leading-none font-black tracking-wide text-slate-500 uppercase">
                推荐
              </span>
              <h5 className="text-[11px] font-black text-slate-800">{ad.brandName}</h5>
            </div>
            <p className="line-clamp-1 text-[10px] font-medium text-slate-400">{ad.slogan}</p>
          </div>
        </div>
        <div className="flex w-fit items-center gap-3 rounded-full border border-slate-100 bg-slate-50 px-6 py-3">
          <div className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
            红笔专家思考中...
          </span>
        </div>
      </div>
    </div>
  );
}
