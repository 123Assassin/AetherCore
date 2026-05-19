export type ActiveSimulationFilter = {
  id: string;
  label: string;
  onRemove: () => void;
};

type SimulationResultsHeaderProps = {
  activeFilters: ActiveSimulationFilter[];
  loading?: boolean;
  onReset: () => void;
  total: number;
};

export function SimulationResultsHeader({
  activeFilters,
  loading = false,
  onReset,
  total,
}: SimulationResultsHeaderProps) {
  return (
    <header className="simulation-results-header">
      <div className="simulation-results-header__summary">
        <h1>仿真实训</h1>
        <p aria-live="polite">{loading ? '正在加载资源...' : `${total} 个结果`}</p>
      </div>

      {activeFilters.length > 0 ? (
        <div aria-label="已选筛选" className="simulation-results-header__filters">
          {activeFilters.map((filter) => (
            <span className="simulation-active-filter" key={filter.id}>
              <span className="simulation-active-filter__label">{filter.label}</span>
              <button
                aria-label={`移除筛选 ${filter.label}`}
                onClick={filter.onRemove}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          <button className="simulation-results-header__reset" onClick={onReset} type="button">
            清除全部
          </button>
        </div>
      ) : null}
    </header>
  );
}
