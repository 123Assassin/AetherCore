'use client';

import type {
  AdminSimulationListInput,
  SimulationFilters,
  SimulationItem,
  SimulationListResult,
} from '@package/shared';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SimulationCard } from '../../../components/simulations/simulation-card';
import {
  type SimulationStatusFilter,
  SimulationTreeFilter,
} from '../../../components/simulations/simulation-tree-filter';
import { useTrpcClient } from '../../../trpc/provider';

const emptyFilters: SimulationFilters = {
  categories: [],
  grades: [],
  subjects: [],
};

const emptyResult: SimulationListResult = {
  items: [],
  page: 1,
  pageSize: 100,
  total: 0,
};

export default function AdminSimulationsPage() {
  const client = useTrpcClient();
  const [filters, setFilters] = useState<SimulationFilters>(emptyFilters);
  const [result, setResult] = useState<SimulationListResult>(emptyResult);
  const [search, setSearch] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [status, setStatus] = useState<SimulationStatusFilter>('all');
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<string[]>([]);
  const listInput = useMemo<AdminSimulationListInput>(() => {
    const input: AdminSimulationListInput = {
      page: 1,
      pageSize: 100,
    };
    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      input.q = trimmedSearch;
    }

    if (selectedSubjects.length > 0) {
      input.subjects = selectedSubjects;
    }

    if (selectedCategoryIds.length > 0) {
      input.categoryIds = selectedCategoryIds;
    }

    if (selectedGrades.length > 0) {
      input.grades = selectedGrades;
    }

    if (status !== 'all') {
      input.isable = status === 'enabled';
    }

    return input;
  }, [search, selectedCategoryIds, selectedGrades, selectedSubjects, status]);
  const listRequestSequence = useRef(0);
  const listInputRef = useRef<AdminSimulationListInput>(listInput);
  const toggledItemsRef = useRef(new Map<string, SimulationItem>());

  useEffect(() => {
    listInputRef.current = listInput;
  }, [listInput]);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      setFiltersLoading(true);
      setError(null);

      try {
        const nextFilters = await client.adminSimulations.filters.query();

        if (!cancelled) {
          setFilters(nextFilters);
        }
      } catch {
        if (!cancelled) {
          setError('仿真实验筛选项加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (!cancelled) {
          setFiltersLoading(false);
        }
      }
    }

    void loadFilters();

    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    let cancelled = false;
    const requestId = listRequestSequence.current + 1;
    listRequestSequence.current = requestId;

    async function loadList() {
      setListLoading(true);
      setError(null);

      try {
        const nextResult = await client.adminSimulations.list.query(listInput);

        if (!cancelled && requestId === listRequestSequence.current) {
          setResult(mergeToggledItems(nextResult, toggledItemsRef.current, listInput));
        }
      } catch {
        if (!cancelled && requestId === listRequestSequence.current) {
          setError('仿真实验数据加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (!cancelled && requestId === listRequestSequence.current) {
          setListLoading(false);
        }
      }
    }

    void loadList();

    return () => {
      cancelled = true;
    };
  }, [client, listInput]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSelectedSubjects([]);
    setSelectedCategoryIds([]);
    setSelectedGrades([]);
    setStatus('all');
  }, []);

  async function handleToggleEnabled(item: SimulationItem) {
    setToggleError(null);
    setTogglingIds((current) => addUnique(current, item.id));

    try {
      const updated = await client.adminSimulations.setEnabled.mutate({
        id: item.id,
        isable: !item.isable,
      });

      toggledItemsRef.current.set(updated.id, updated);

      setResult((current) => reconcileToggledItem(current, updated, listInputRef.current));
    } catch {
      setToggleError(`"${item.name}" 状态更新失败，请稍后重试。`);
    } finally {
      setTogglingIds((current) => current.filter((id) => id !== item.id));
    }
  }

  return (
    <main className="flex h-full min-h-[750px] flex-col gap-4 overflow-hidden rounded-[40px] border border-slate-200 bg-white p-2 shadow-sm lg:flex-row lg:gap-10">
      <SimulationTreeFilter
        disabled={filtersLoading}
        filters={filters}
        onCategoryToggle={(categoryId) =>
          setSelectedCategoryIds((current) => toggleValue(current, categoryId))
        }
        onGradeToggle={(grade) => setSelectedGrades((current) => toggleValue(current, grade))}
        onReset={resetFilters}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onSubjectToggle={(subject) =>
          setSelectedSubjects((current) => toggleValue(current, subject))
        }
        search={search}
        selectedCategoryIds={selectedCategoryIds}
        selectedGrades={selectedGrades}
        selectedSubjects={selectedSubjects}
        status={status}
      />

      <section
        aria-busy={listLoading}
        aria-label="仿真实验列表"
        className="flex min-w-0 flex-1 flex-col gap-8 overflow-hidden p-6 lg:p-8"
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
              仿真实验资源
              <span className="rounded-md border border-slate-200/50 bg-slate-100 px-2 py-0.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                已筛选
              </span>
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-400">
              当前查询条件下共有 {listLoading ? '...' : result.total} 个结果
            </p>
          </div>
        </div>

        {error ? (
          <p
            aria-live="polite"
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {toggleError ? (
          <p
            aria-live="polite"
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
            role="alert"
          >
            {toggleError}
          </p>
        ) : null}

        <div className="custom-scrollbar grid grid-cols-1 gap-8 overflow-y-auto pr-1 pb-10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {listLoading ? (
            <p className="col-span-full rounded-[28px] border border-slate-100 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
              正在加载仿真实验...
            </p>
          ) : null}

          {!listLoading && result.items.length === 0 ? (
            <div className="col-span-full space-y-4 py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-200">
                <Search size={40} />
              </div>
              <p className="font-medium tracking-tight text-slate-400">
                在该过滤条件下未找到任何资源
              </p>
            </div>
          ) : null}

          {result.items.map((item) => (
            <SimulationCard
              item={item}
              key={item.id}
              onToggleEnabled={handleToggleEnabled}
              toggling={togglingIds.includes(item.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function addUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}

function reconcileToggledItem(
  current: SimulationListResult,
  updated: SimulationItem,
  input: AdminSimulationListInput
): SimulationListResult {
  const existingItem = current.items.find((item) => item.id === updated.id);

  if (!existingItem) {
    return current;
  }

  if (!matchesListInput(updated, input)) {
    return {
      ...current,
      items: current.items.filter((item) => item.id !== updated.id),
      total: Math.max(0, current.total - 1),
    };
  }

  return {
    ...current,
    items: current.items.map((item) => (item.id === updated.id ? updated : item)),
  };
}

function mergeToggledItems(
  result: SimulationListResult,
  toggledItems: Map<string, SimulationItem>,
  input: AdminSimulationListInput
): SimulationListResult {
  if (toggledItems.size === 0) {
    return result;
  }

  const seenIds = new Set<string>();
  const items = result.items.flatMap((item) => {
    const toggledItem = toggledItems.get(item.id);
    const nextItem = toggledItem ? { ...item, isable: toggledItem.isable } : item;

    seenIds.add(item.id);

    return matchesListInput(nextItem, input) ? [nextItem] : [];
  });

  let total = result.total - (result.items.length - items.length);

  for (const toggledItem of toggledItems.values()) {
    if (!seenIds.has(toggledItem.id) && matchesListInput(toggledItem, input)) {
      items.push(toggledItem);
      total += 1;
    }
  }

  return {
    ...result,
    items,
    total: Math.max(0, total),
  };
}

function matchesListInput(item: SimulationItem, input: AdminSimulationListInput): boolean {
  const subjects = getSimulationSubjectAssignments(item);

  if (input.isable !== undefined && item.isable !== input.isable) {
    return false;
  }

  if (input.q && !matchesSearch(item, input.q)) {
    return false;
  }

  if (
    input.subjects &&
    input.subjects.length > 0 &&
    !subjects.some((subject) => input.subjects?.includes(subject.subject))
  ) {
    return false;
  }

  if (
    input.categoryIds &&
    input.categoryIds.length > 0 &&
    !subjects.some((subject) => input.categoryIds?.includes(subject.category.id))
  ) {
    return false;
  }

  if (input.grades && input.grades.length > 0) {
    const selectedGrades = input.grades;

    if (!item.grades.some((grade) => selectedGrades.includes(grade))) {
      return false;
    }
  }

  return true;
}

function getSimulationSubjectAssignments(item: SimulationItem) {
  return Array.isArray(item.subjects) && item.subjects.length > 0
    ? item.subjects
    : [{ subject: item.subject, category: item.category }];
}

function matchesSearch(item: SimulationItem, query: string): boolean {
  const normalizedQuery = query.toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchable = [
    item.name,
    ...unknownArrayToStrings(item.topics),
    ...unknownArrayToStrings(item.sampleLearningGoals),
  ]
    .join(' ')
    .toLowerCase();

  return searchable.includes(normalizedQuery);
}

function unknownArrayToStrings(value: unknown[] | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}
