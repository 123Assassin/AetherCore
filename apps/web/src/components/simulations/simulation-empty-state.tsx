type SimulationEmptyStateProps = {
  onReset: () => void;
};

export function SimulationEmptyState({ onReset }: SimulationEmptyStateProps) {
  return (
    <section aria-label="无匹配仿真实验" className="simulation-empty-state">
      <div aria-hidden="true" className="simulation-empty-state__icon">
        ?
      </div>
      <h2>没有找到匹配的仿真实验</h2>
      <p>调整筛选条件或清空搜索后再试。</p>
      <button data-testid="simulation-reset-empty" onClick={onReset} type="button">
        重置所有筛选
      </button>
    </section>
  );
}
