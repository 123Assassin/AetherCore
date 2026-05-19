'use client';

import type { SimulationFilters } from '@package/shared';
import { type ChangeEvent, type CSSProperties, useState } from 'react';

export type SimulationStatusFilter = 'all' | 'enabled' | 'disabled';

type SimulationTreeFilterProps = {
  disabled?: boolean;
  filters: SimulationFilters;
  onCategoryToggle: (categoryId: string) => void;
  onGradeToggle: (grade: string) => void;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: SimulationStatusFilter) => void;
  onSubjectToggle: (subject: string) => void;
  search: string;
  selectedCategoryIds: string[];
  selectedGrades: string[];
  selectedSubjects: string[];
  status: SimulationStatusFilter;
};

export function SimulationTreeFilter({
  disabled = false,
  filters,
  onCategoryToggle,
  onGradeToggle,
  onReset,
  onSearchChange,
  onStatusChange,
  onSubjectToggle,
  search,
  selectedCategoryIds,
  selectedGrades,
  selectedSubjects,
  status,
}: SimulationTreeFilterProps) {
  const [focusedStatus, setFocusedStatus] = useState<SimulationStatusFilter | null>(null);
  const hasFilters =
    search.trim().length > 0 ||
    selectedSubjects.length > 0 ||
    selectedCategoryIds.length > 0 ||
    selectedGrades.length > 0 ||
    status !== 'all';

  return (
    <aside aria-label="仿真实验筛选" style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>筛选</h2>
        <button
          disabled={!hasFilters || disabled}
          onClick={onReset}
          style={styles.reset}
          type="button"
        >
          重置
        </button>
      </div>

      <label style={styles.searchLabel}>
        <span style={styles.labelText}>搜索</span>
        <input
          aria-label="搜索仿真实验"
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onSearchChange(readInputValue(event.currentTarget))
          }
          placeholder="名称、学科或分类"
          style={styles.input}
          type="search"
          value={search}
        />
      </label>

      <fieldset style={styles.group}>
        <legend style={styles.legend}>状态</legend>
        <div style={styles.segmented}>
          {statusOptions.map((option) => {
            const selected = status === option.value;
            const focused = focusedStatus === option.value;

            return (
              <label key={option.value} style={styles.segmentedOption}>
                <input
                  checked={selected}
                  disabled={disabled}
                  name="simulation-status"
                  onBlur={() => setFocusedStatus(null)}
                  onChange={() => onStatusChange(option.value)}
                  onFocus={() => setFocusedStatus(option.value)}
                  style={styles.radio}
                  type="radio"
                />
                <span
                  style={{
                    ...(selected ? styles.segmentedActive : styles.segmentedText),
                    ...(focused ? styles.segmentedFocus : {}),
                  }}
                >
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset style={styles.group}>
        <legend style={styles.legend}>学科与分类</legend>
        <div style={styles.stack}>
          {filters.subjects.map((subject) => (
            <div key={subject.name} style={styles.subjectBlock}>
              <label style={styles.optionStrong}>
                <input
                  checked={selectedSubjects.includes(subject.name)}
                  disabled={disabled}
                  onChange={() => onSubjectToggle(subject.name)}
                  type="checkbox"
                />
                <span>{subject.name}</span>
              </label>
              <div style={styles.categoryList}>
                {subject.categories.map((category) => (
                  <label key={category.id} style={styles.option}>
                    <input
                      checked={selectedCategoryIds.includes(category.id)}
                      disabled={disabled}
                      onChange={() => onCategoryToggle(category.id)}
                      type="checkbox"
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset style={styles.group}>
        <legend style={styles.legend}>年级</legend>
        <div style={styles.gradeGrid}>
          {filters.grades.map((grade) => (
            <label key={grade} style={styles.option}>
              <input
                checked={selectedGrades.includes(grade)}
                disabled={disabled}
                onChange={() => onGradeToggle(grade)}
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

const statusOptions: { label: string; value: SimulationStatusFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
];

function readInputValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}

const styles = {
  categoryList: {
    display: 'grid',
    gap: 8,
    paddingLeft: 22,
  },
  gradeGrid: {
    display: 'grid',
    gap: 8,
    gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
  },
  group: {
    border: 0,
    display: 'grid',
    gap: 10,
    margin: 0,
    padding: 0,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  input: {
    border: '1px solid #b8c2d0',
    borderRadius: 6,
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    padding: '8px 10px',
    width: '100%',
  },
  labelText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: '18px',
  },
  legend: {
    color: '#172033',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
    marginBottom: 10,
    padding: 0,
  },
  option: {
    alignItems: 'center',
    color: '#334155',
    display: 'flex',
    fontSize: 13,
    gap: 7,
    lineHeight: '18px',
  },
  optionStrong: {
    alignItems: 'center',
    color: '#172033',
    display: 'flex',
    fontSize: 13,
    fontWeight: 700,
    gap: 7,
    lineHeight: '18px',
  },
  panel: {
    alignSelf: 'start',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 18,
    padding: 16,
  },
  radio: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
  reset: {
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    borderRadius: 6,
    color: '#334155',
    cursor: 'pointer',
    fontSize: 13,
    lineHeight: '18px',
    padding: '5px 9px',
  },
  searchLabel: {
    display: 'grid',
    gap: 6,
  },
  segmented: {
    border: '1px solid #c8d1dc',
    borderRadius: 6,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    overflow: 'hidden',
  },
  segmentedActive: {
    background: '#0f766e',
    color: '#ffffff',
    display: 'block',
    fontSize: 13,
    lineHeight: '18px',
    padding: '7px 8px',
    textAlign: 'center',
  },
  segmentedFocus: {
    outline: '2px solid #2563eb',
    outlineOffset: -2,
  },
  segmentedOption: {
    cursor: 'pointer',
    position: 'relative',
  },
  segmentedText: {
    background: '#ffffff',
    color: '#334155',
    display: 'block',
    fontSize: 13,
    lineHeight: '18px',
    padding: '7px 8px',
    textAlign: 'center',
  },
  stack: {
    display: 'grid',
    gap: 14,
  },
  subjectBlock: {
    display: 'grid',
    gap: 8,
  },
  title: {
    color: '#172033',
    fontSize: 18,
    lineHeight: '24px',
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;
