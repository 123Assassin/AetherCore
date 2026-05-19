export default function SimulationPlaceholderPage() {
  return (
    <section aria-labelledby="simulation-placeholder-title" className="simulation-placeholder">
      <div className="simulation-placeholder__content">
        <p className="simulation-placeholder__eyebrow">仿真实训</p>
        <h1 id="simulation-placeholder-title">仿真实训正在建设中</h1>
        <p>这里将承载课程仿真实训能力。当前先提供占位页面，确保课程导航可以正常访问。</p>
      </div>

      <style>{`
        .simulation-placeholder {
          display: flex;
          min-width: 0;
          flex: 1;
          align-items: stretch;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
        }

        .simulation-placeholder__content {
          display: flex;
          max-width: 640px;
          flex-direction: column;
          justify-content: center;
          padding: 28px;
        }

        .simulation-placeholder__eyebrow {
          margin: 0 0 8px;
          color: #12645c;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .simulation-placeholder h1 {
          margin: 0;
          color: #17202a;
          font-size: 24px;
          line-height: 32px;
        }

        .simulation-placeholder p {
          color: #5f6b7a;
          font-size: 14px;
          line-height: 22px;
        }

        .simulation-placeholder h1 + p {
          margin: 10px 0 0;
        }

        @media (max-width: 520px) {
          .simulation-placeholder__content {
            padding: 20px;
          }
        }
      `}</style>
    </section>
  );
}
