import type { SimulationFilters } from '@package/shared';
import { CheckSquare, Plus } from 'lucide-react';

type SimulationFiltersProps = {
  disabled?: boolean;
  filters: SimulationFilters;
  onToggleCategory: (categoryId: string) => void;
  onToggleGrade: (grade: string) => void;
  onToggleSubject: (subject: string) => void;
  selectedCategoryIds: string[];
  selectedGrades: string[];
  selectedSubjects: string[];
};

function isSelected(values: string[], value: string) {
  return values.includes(value);
}

function FilterBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded border transition-all ${
        checked ? 'border-red-500 bg-red-500' : 'border-slate-300 group-hover:border-red-400'
      } h-5 w-5`}
    >
      {checked ? <CheckSquare aria-hidden="true" className="h-4 w-4 text-white" /> : null}
    </span>
  );
}

function SmallFilterBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded border transition-all ${
        checked ? 'border-red-400 bg-red-400' : 'border-slate-300 group-hover:border-red-300'
      } h-4 w-4`}
    >
      {checked ? <CheckSquare aria-hidden="true" className="h-3 w-3 text-white" /> : null}
    </span>
  );
}

export function SimulationFiltersPanel({
  disabled = false,
  filters,
  onToggleCategory,
  onToggleGrade,
  onToggleSubject,
  selectedCategoryIds,
  selectedGrades,
  selectedSubjects,
}: SimulationFiltersProps) {
  return (
    <aside
      aria-label="仿真筛选"
      className="max-h-72 w-full shrink-0 overflow-y-auto border-b border-slate-100 p-6 lg:max-h-none lg:w-72 lg:border-r lg:border-b-0"
    >
      <div className="mb-8">
        <h2 className="mb-6 flex items-center justify-between text-lg font-bold text-slate-800">
          科目
          <button
            aria-label="科目筛选"
            className="text-slate-400 transition-colors hover:text-slate-600"
            disabled
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
        </h2>
        <div className="space-y-4">
          {filters.subjects.map((subject) => {
            const subjectChecked = isSelected(selectedSubjects, subject.name);

            return (
              <div className="space-y-2" key={subject.name}>
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    checked={subjectChecked}
                    className="sr-only"
                    disabled={disabled}
                    onChange={() => onToggleSubject(subject.name)}
                    type="checkbox"
                  />
                  <FilterBox checked={subjectChecked} />
                  <span
                    className={`text-sm font-medium ${
                      subjectChecked ? 'text-red-600' : 'text-slate-600'
                    }`}
                  >
                    {subject.name}
                  </span>
                </label>

                {subject.categories.length > 0 ? (
                  <div className="space-y-2 pl-8">
                    {subject.categories.map((category) => {
                      const categoryChecked = isSelected(selectedCategoryIds, category.id);

                      return (
                        <label
                          className="group flex cursor-pointer items-center gap-3"
                          key={category.id}
                        >
                          <input
                            checked={categoryChecked}
                            className="sr-only"
                            disabled={disabled}
                            onChange={() => onToggleCategory(category.id)}
                            type="checkbox"
                          />
                          <SmallFilterBox checked={categoryChecked} />
                          <span
                            className={`text-xs ${
                              categoryChecked ? 'font-medium text-red-500' : 'text-slate-500'
                            }`}
                          >
                            {category.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-8">
        <h2 className="mb-6 flex items-center justify-between text-lg font-bold text-slate-800">
          年级
          <button
            aria-label="年级筛选"
            className="text-slate-400 transition-colors hover:text-slate-600"
            disabled
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
        </h2>
        <div className="space-y-4">
          {filters.grades.map((grade) => {
            const gradeChecked = isSelected(selectedGrades, grade);

            return (
              <label className="group flex cursor-pointer items-center gap-3" key={grade}>
                <input
                  checked={gradeChecked}
                  className="sr-only"
                  disabled={disabled}
                  onChange={() => onToggleGrade(grade)}
                  type="checkbox"
                />
                <FilterBox checked={gradeChecked} />
                <span
                  className={`text-sm font-medium ${
                    gradeChecked ? 'text-red-600' : 'text-slate-600'
                  }`}
                >
                  {grade}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
