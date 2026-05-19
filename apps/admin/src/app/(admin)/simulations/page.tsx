'use client';

import type {
  AdminSimulationListInput,
  SimulationFilters,
  SimulationItem,
  SimulationListResult,
} from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Simulations</p>
          <h1 style={styles.heading}>仿真实验管理</h1>
        </div>
        <div style={styles.summary} aria-label="仿真实验统计">
          <strong style={styles.summaryNumber}>{result.total}</strong>
          <span style={styles.summaryText}>条结果</span>
        </div>
      </header>

      {error ? (
        <p aria-live="polite" role="alert" style={styles.error}>
          {error}
        </p>
      ) : null}

      {toggleError ? (
        <p aria-live="polite" role="alert" style={styles.error}>
          {toggleError}
        </p>
      ) : null}

      <div style={styles.layout}>
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

        <section aria-busy={listLoading} aria-label="仿真实验列表" style={styles.results}>
          {listLoading ? <p style={styles.stateText}>正在加载仿真实验...</p> : null}

          {!listLoading && result.items.length === 0 ? (
            <p style={styles.stateText}>没有匹配的仿真实验。</p>
          ) : null}

          {result.items.map((item) => (
            <SimulationCard
              item={item}
              key={item.id}
              onToggleEnabled={handleToggleEnabled}
              toggling={togglingIds.includes(item.id)}
            />
          ))}
        </section>
      </div>
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
  if (input.isable !== undefined && item.isable !== input.isable) {
    return false;
  }

  if (input.q && !matchesSearch(item, input.q)) {
    return false;
  }

  if (input.subjects && input.subjects.length > 0 && !input.subjects.includes(item.subject)) {
    return false;
  }

  if (
    input.categoryIds &&
    input.categoryIds.length > 0 &&
    !input.categoryIds.includes(item.category.id)
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

const styles = {
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    color: '#991b1b',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
    padding: '9px 11px',
  },
  eyebrow: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: '16px',
    margin: '0 0 4px',
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: 16,
    justifyContent: 'space-between',
  },
  heading: {
    color: '#172033',
    fontSize: 26,
    lineHeight: '34px',
    margin: 0,
  },
  layout: {
    alignItems: 'start',
    display: 'grid',
    gap: 18,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
  },
  main: {
    background: '#f8fafc',
    color: '#172033',
    display: 'grid',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    gap: 18,
    minHeight: '100vh',
    padding: 24,
  },
  results: {
    display: 'grid',
    gap: 12,
  },
  stateText: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    color: '#475569',
    fontSize: 14,
    lineHeight: '20px',
    margin: 0,
    padding: 18,
  },
  summary: {
    alignItems: 'baseline',
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'flex',
    gap: 6,
    padding: '10px 12px',
  },
  summaryNumber: {
    color: '#0f766e',
    fontSize: 22,
    lineHeight: '28px',
  },
  summaryText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: '18px',
  },
} satisfies Record<string, CSSProperties>;
