import type { SimulationFilters } from '@package/shared';
import type { ChangeEvent } from 'react';

type SearchInputElement = HTMLInputElement & {
  value: string;
};

type SimulationFiltersProps = {
  disabled?: boolean;
  filters: SimulationFilters;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleGrade: (grade: string) => void;
  onToggleSubject: (subject: string) => void;
  search: string;
  selectedCategoryIds: string[];
  selectedGrades: string[];
  selectedSubjects: string[];
};

function isSelected(values: string[], value: string) {
  return values.includes(value);
}

function getInputValue(event: ChangeEvent<SearchInputElement>) {
  const target = event.currentTarget;

  return target.value;
}

export function SimulationFiltersPanel({
  disabled = false,
  filters,
  onReset,
  onSearchChange,
  onToggleCategory,
  onToggleGrade,
  onToggleSubject,
  search,
  selectedCategoryIds,
  selectedGrades,
  selectedSubjects,
}: SimulationFiltersProps) {
  const hasFilters =
    selectedSubjects.length > 0 ||
    selectedCategoryIds.length > 0 ||
    selectedGrades.length > 0 ||
    search.trim().length > 0;

  return (
    <aside aria-label="仿真筛选" className="simulation-filters">
      <label className="simulation-filters__search">
        <span>搜索</span>
        <input
          aria-label="搜索仿真实验"
          disabled={disabled}
          onChange={(event: ChangeEvent<SearchInputElement>) =>
            onSearchChange(getInputValue(event))
          }
          placeholder="搜索仿真实验..."
          type="search"
          value={search}
        />
      </label>

      <div className="simulation-filters__header">
        <h2>筛选</h2>
        <button disabled={!hasFilters || disabled} onClick={onReset} type="button">
          重置
        </button>
      </div>

      <fieldset className="simulation-filter-group">
        <legend>学科</legend>
        <div className="simulation-filter-group__options">
          {filters.subjects.map((subject) => (
            <label className="simulation-filter-option" key={subject.name}>
              <input
                checked={isSelected(selectedSubjects, subject.name)}
                disabled={disabled}
                onChange={() => onToggleSubject(subject.name)}
                type="checkbox"
              />
              <span>{subject.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="simulation-filter-group">
        <legend>分类</legend>
        <div className="simulation-filter-group__options simulation-filter-group__options--stacked">
          {filters.subjects.map((subject) => (
            <div className="simulation-filter-subject" key={subject.name}>
              <p>{subject.name}</p>
              {subject.categories.map((category) => (
                <label className="simulation-filter-option" key={category.id}>
                  <input
                    checked={isSelected(selectedCategoryIds, category.id)}
                    disabled={disabled}
                    onChange={() => onToggleCategory(category.id)}
                    type="checkbox"
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="simulation-filter-group">
        <legend>年级</legend>
        <div className="simulation-filter-group__options">
          {filters.grades.map((grade) => (
            <label className="simulation-filter-option" key={grade}>
              <input
                checked={isSelected(selectedGrades, grade)}
                disabled={disabled}
                onChange={() => onToggleGrade(grade)}
                type="checkbox"
              />
              <span>{grade}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </aside>
  );
}
