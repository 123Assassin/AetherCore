import { Search } from 'lucide-react';

type SimulationEmptyStateProps = {
  onReset: () => void;
};

export function SimulationEmptyState({ onReset }: SimulationEmptyStateProps) {
  return (
    <section
      aria-label="无匹配仿真实验"
      className="flex flex-col items-center justify-center py-20 text-center text-slate-400"
    >
      <div
        aria-hidden="true"
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100"
      >
        <Search className="h-10 w-10" />
      </div>
      <h2 className="text-lg font-medium">没有找到匹配的仿真实验</h2>
      <button
        className="mt-4 font-bold text-red-500 hover:underline"
        data-testid="simulation-reset-empty"
        onClick={onReset}
        type="button"
      >
        重置所有筛选
      </button>
    </section>
  );
}
