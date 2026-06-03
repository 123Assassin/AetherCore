import type { ReactNode } from 'react';

import { OfficeSubNav } from '../../../components/office/office-sub-nav';

export default function OfficeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-112px)] min-w-0 flex-col max-[760px]:min-h-[calc(100vh-154px)]">
      <div className="mb-4 flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 md:mb-6">
        <div className="shrink-0 border-b border-slate-100 px-4 pt-4 md:px-6 md:pt-5">
          <OfficeSubNav />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>

      <style>{`
        .office-sub-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .office-sub-nav__link {
          display: inline-flex;
          position: relative;
          align-items: center;
          color: #64748b;
          font-size: 14px;
          font-weight: 800;
          line-height: 20px;
          padding: 0 4px 12px;
          text-decoration: none;
        }

        .office-sub-nav__link:hover {
          color: #334155;
        }

        .office-sub-nav__link--active {
          color: #059669;
        }

        .office-sub-nav__link--active::after {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          border-radius: 999px 999px 0 0;
          background: #059669;
          content: '';
        }
      `}</style>
    </div>
  );
}
