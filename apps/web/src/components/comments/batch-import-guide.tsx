'use client';

import { AlertCircle } from 'lucide-react';

const exampleTags = ['逻辑严密', '思维活跃', '基础扎实', '遵守纪律', '团结协作'];

export function BatchImportGuide() {
  return (
    <section
      aria-label="批量导入说明"
      className="flex flex-col gap-8 border-b border-slate-100 bg-slate-50/50 p-8 lg:w-1/3 lg:border-r lg:border-b-0"
    >
      <div>
        <h4 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800">
          <AlertCircle className="h-4 w-4 text-emerald-500" />
          导入操作指南
        </h4>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-600">
              1
            </span>
            <p className="text-xs leading-relaxed text-slate-500">
              上传 <span className="font-bold text-slate-700">.xlsx 表格</span>
              后，系统会创建待生成队列并展示预览行。
            </p>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-600">
              2
            </span>
            <p className="text-xs leading-relaxed text-slate-500">
              建议列包含
              <span className="font-bold text-slate-700"> 昵称、性别、年级、标签、关键词</span>
              ，标签可参考单人模式。
            </p>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-600">
              3
            </span>
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-bold text-emerald-600">计费说明：</span>
              系统将按照生成结果的有效行数计费，每成功生成一个学生的评语消耗 1 次额度。
            </p>
          </li>
        </ol>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-inner">
        <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          可用标签示例
        </p>
        <div className="flex flex-wrap gap-1">
          {exampleTags.map((tag) => (
            <span
              className="rounded border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
