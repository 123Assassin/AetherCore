import type { ReactNode } from 'react';

export default function OfficeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-112px)] min-w-0 flex-col max-[760px]:min-h-[calc(100vh-154px)]">
      <div className="mb-4 flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 md:mb-6">
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
