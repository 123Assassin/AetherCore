import type { ReactNode } from 'react';

import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell__workspace">
        <AppHeader />
        <main className="app-shell__content">{children}</main>
      </div>
      <style>{`
        :root {
          color: #17202a;
          background: #f6f7f9;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        body {
          margin: 0;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        .app-shell {
          display: flex;
          min-height: 100vh;
          background: #f6f7f9;
        }

        .app-shell__workspace {
          display: flex;
          flex: 1;
          min-width: 0;
          flex-direction: column;
        }

        .app-shell__content {
          flex: 1;
          min-width: 0;
          padding: 24px;
        }

        .app-sidebar {
          display: flex;
          width: 248px;
          flex: 0 0 248px;
          flex-direction: column;
          border-right: 1px solid #d8dee8;
          background: #ffffff;
        }

        .app-sidebar__brand {
          display: flex;
          height: 64px;
          flex: 0 0 64px;
          align-items: center;
          border-bottom: 1px solid #e3e7ef;
          padding: 0 20px;
        }

        .app-sidebar__brand-mark {
          display: grid;
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          place-items: center;
          border-radius: 6px;
          background: #12645c;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          line-height: 1;
        }

        .app-sidebar__brand-text {
          min-width: 0;
          margin-left: 10px;
          overflow: hidden;
          color: #111827;
          font-size: 15px;
          font-weight: 700;
          line-height: 20px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .app-sidebar__nav {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 4px;
          padding: 16px 12px;
        }

        .app-sidebar__link {
          display: flex;
          min-height: 40px;
          align-items: center;
          border-radius: 6px;
          color: #4b5563;
          font-size: 14px;
          font-weight: 500;
          line-height: 20px;
          padding: 10px 12px;
          text-decoration: none;
        }

        .app-sidebar__link:hover {
          background: #eef2f5;
          color: #17202a;
        }

        .app-sidebar__link--active {
          background: #e3f2ee;
          color: #0f4f47;
          font-weight: 700;
        }

        .app-header {
          display: flex;
          min-height: 64px;
          flex: 0 0 64px;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #d8dee8;
          background: #ffffff;
          padding: 0 24px;
        }

        .app-header__title {
          min-width: 0;
        }

        .app-header__actions {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 10px;
        }

        .app-header__eyebrow {
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          line-height: 16px;
        }

        .app-header__heading {
          margin: 0;
          overflow: hidden;
          color: #111827;
          font-size: 18px;
          font-weight: 700;
          line-height: 26px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .app-header__route {
          max-width: 42vw;
          overflow: hidden;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          color: #4b5563;
          font-size: 13px;
          line-height: 18px;
          padding: 6px 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .app-header__login-button {
          min-height: 32px;
          flex: 0 0 auto;
          border: 1px solid #12645c;
          border-radius: 6px;
          background: #12645c;
          color: #ffffff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          line-height: 18px;
          padding: 6px 12px;
          white-space: nowrap;
        }

        .app-header__login-button:hover {
          background: #0f4f47;
          border-color: #0f4f47;
        }

        @media (max-width: 760px) {
          .app-shell {
            flex-direction: column;
          }

          .app-sidebar {
            width: 100%;
            flex-basis: auto;
            border-right: 0;
            border-bottom: 1px solid #d8dee8;
          }

          .app-sidebar__brand {
            height: 56px;
            flex-basis: 56px;
            padding: 0 16px;
          }

          .app-sidebar__nav {
            flex-direction: row;
            overflow-x: auto;
            padding: 10px 12px;
          }

          .app-sidebar__link {
            flex: 0 0 auto;
            min-height: 36px;
            white-space: nowrap;
          }

          .app-header {
            min-height: 58px;
            flex-basis: 58px;
            padding: 0 16px;
          }

          .app-header__route {
            display: none;
          }

          .app-shell__content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
