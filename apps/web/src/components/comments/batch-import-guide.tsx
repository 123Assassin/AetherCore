'use client';

import { Download, FileSpreadsheet, Sparkles } from 'lucide-react';

type BatchImportGuideProps = {
  disabled?: boolean;
  downloadingTemplate: boolean;
  onDownloadTemplate: () => void;
  onInjectDemoData: () => void;
};

export function BatchImportGuide({
  disabled = false,
  downloadingTemplate,
  onDownloadTemplate,
  onInjectDemoData,
}: BatchImportGuideProps) {
  return (
    <section
      aria-label="批量导入说明"
      className="flex flex-col gap-5 border-b border-slate-100 bg-white p-8 lg:w-1/3 lg:border-r lg:border-b-0"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-600/20">
          2
        </span>
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-800">准备与上传表格</h3>
          <p className="mt-1 text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
            Prepare & Upload
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800">
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          1. 准备数据表格
        </h4>
        <ol className="space-y-4">
          <li className="flex items-baseline gap-4">
            <span className="text-xs font-black text-emerald-600">A</span>
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-bold text-slate-700">昵称/姓名</span> 与{' '}
              <span className="font-bold text-slate-700">性别</span>、{' '}
              <span className="font-bold text-slate-700">表现标签</span>{' '}
              为必填项，系统将根据学生信息和标签生成评语。
            </p>
          </li>
          <li className="flex items-baseline gap-4">
            <span className="text-xs font-black text-emerald-600">B</span>
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-bold text-slate-700">表现标签</span>{' '}
              可填写多个关键词，如：逻辑严密、懂礼貌，支持中文逗号或空格分隔。
            </p>
          </li>
          <li className="flex items-baseline gap-4">
            <span className="text-xs font-black text-emerald-600">C</span>
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-bold text-slate-700">语义识别：</span>
              无需刻意修改您的表头，红笔AI 会自动匹配含义相近的列。
            </p>
          </li>
        </ol>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-slate-800">可选：下载标准模板</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          使用模板可减少表头识别误差，适合首次导入时参考。
        </p>
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || downloadingTemplate}
          onClick={onDownloadTemplate}
          type="button"
        >
          <Download className="h-4 w-4" />
          {downloadingTemplate ? '模板下载中...' : '下载文件导入模板'}
        </button>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
        <p className="flex items-center gap-2 text-sm font-black text-sky-900">
          <Sparkles className="h-4 w-4 text-sky-500" />
          快速体验功能
        </p>
        <p className="mt-1 text-xs leading-relaxed text-sky-700">
          想看看“评语相似度过高”的提示效果吗？
        </p>
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-xs font-black text-white transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={onInjectDemoData}
          type="button"
        >
          <Sparkles className="h-4 w-4" />
          注入相似度演示数据
        </button>
      </div>
    </section>
  );
}
