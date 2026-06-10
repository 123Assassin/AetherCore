'use client';

import type { SimulationFilters } from '@package/shared';
import { BookOpen, ChevronDown, ChevronRight, Filter, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { getAdminSimulationGradeOptions } from './simulations.data';

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

const statusOptions: { label: string; value: SimulationStatusFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
];

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
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['subjects', 'grades']);
  const hasFilters =
    search.trim().length > 0 ||
    selectedSubjects.length > 0 ||
    selectedCategoryIds.length > 0 ||
    selectedGrades.length > 0 ||
    status !== 'all';

  function toggleNode(id: string) {
    setExpandedNodes((current) =>
      current.includes(id) ? current.filter((nodeId) => nodeId !== id) : [...current, id]
    );
  }

  return (
    <aside className="custom-scrollbar w-full shrink-0 space-y-8 overflow-y-auto border-r border-slate-100 bg-slate-50/20 p-8 lg:w-72">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h4 className="ml-1 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
            <Filter className="text-primary" size={14} />
            资源分类浏览器
          </h4>
          <button
            className="hover:text-primary rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black tracking-widest text-slate-400 uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasFilters || disabled}
            onClick={onReset}
            type="button"
          >
            重置
          </button>
        </div>

        <label className="relative block">
          <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" size={16} />
          <input
            aria-label="搜索仿真实验"
            className="focus:border-primary focus:ring-primary/10 w-full rounded-[14px] border border-slate-200 bg-white py-3 pr-4 pl-11 text-xs text-slate-700 transition-all outline-none focus:ring-4 disabled:opacity-60"
            disabled={disabled}
            onChange={(event) => onSearchChange(readControlValue(event.currentTarget))}
            placeholder="名称、主题或目标"
            type="search"
            value={search}
          />
        </label>

        <div className="grid grid-cols-3 rounded-2xl border border-slate-200/50 bg-slate-100 p-1.5 shadow-inner">
          {statusOptions.map((option) => (
            <button
              aria-pressed={status === option.value}
              className={`rounded-xl py-2 text-xs font-black transition-all ${
                status === option.value
                  ? 'text-primary bg-white shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              disabled={disabled}
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <nav className="space-y-1">
          <TreeGroup
            expanded={expandedNodes.includes('subjects')}
            label="科目分类"
            onToggle={() => toggleNode('subjects')}
          >
            {filters.subjects.map((subject) => (
              <div className="space-y-1" key={subject.name}>
                <FilterRow
                  active={selectedSubjects.includes(subject.name)}
                  disabled={disabled}
                  label={subject.name}
                  onClick={() => onSubjectToggle(subject.name)}
                />
                <div className="ml-4 space-y-1">
                  {subject.categories.map((category) => (
                    <FilterRow
                      active={selectedCategoryIds.includes(category.id)}
                      disabled={disabled}
                      key={category.id}
                      label={category.name}
                      onClick={() => onCategoryToggle(category.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </TreeGroup>

          <TreeGroup
            expanded={expandedNodes.includes('grades')}
            label="年级筛选"
            onToggle={() => toggleNode('grades')}
          >
            {getAdminSimulationGradeOptions(filters.grades).map((grade) => (
              <FilterRow
                active={selectedGrades.includes(grade)}
                disabled={disabled}
                key={grade}
                label={grade}
                onClick={() => onGradeToggle(grade)}
              />
            ))}
          </TreeGroup>
        </nav>
      </div>
    </aside>
  );
}

function TreeGroup({
  children,
  expanded,
  label,
  onToggle,
}: {
  children: ReactNode;
  expanded: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="select-none">
      <button
        className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-all duration-200 hover:bg-slate-100/50 hover:text-slate-900"
        onClick={onToggle}
        type="button"
      >
        {expanded ? <ChevronDown className="shrink-0" size={14} /> : <ChevronRight size={14} />}
        <span className="truncate">{label}</span>
      </button>
      {expanded ? <div className="mt-1 space-y-1">{children}</div> : null}
    </div>
  );
}

function FilterRow({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? 'bg-primary shadow-primary/20 font-bold text-white shadow-lg'
          : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900'
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className={`h-1 w-1 shrink-0 rounded-full ${active ? 'bg-white' : 'bg-slate-300'}`} />
      <span className="truncate">{label}</span>
      {active ? <BookOpen className="ml-auto opacity-70" size={12} /> : null}
    </button>
  );
}

function readControlValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}
