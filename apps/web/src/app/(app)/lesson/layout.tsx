import type { ReactNode } from 'react';

import { LessonSubNav } from '../../../components/lesson/lesson-sub-nav';

export default function LessonLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lesson-layout">
      <LessonSubNav />
      {children}

      <style>{`
        .lesson-layout {
          display: flex;
          min-height: calc(100vh - 112px);
          min-width: 0;
          flex-direction: column;
          gap: 16px;
        }

        .lesson-sub-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border-bottom: 1px solid #d8dee8;
          padding-bottom: 12px;
        }

        .lesson-sub-nav__link {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          background: #ffffff;
          color: #4b5563;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          padding: 7px 12px;
          text-decoration: none;
        }

        .lesson-sub-nav__link:hover {
          border-color: #12645c;
          color: #0f4f47;
        }

        .lesson-sub-nav__link--active {
          border-color: #12645c;
          background: #e3f2ee;
          color: #0f4f47;
        }

        @media (max-width: 760px) {
          .lesson-layout {
            min-height: calc(100vh - 154px);
          }
        }
      `}</style>
    </div>
  );
}
