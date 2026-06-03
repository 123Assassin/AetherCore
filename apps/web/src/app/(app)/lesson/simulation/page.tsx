'use client';

import type {
  SimulationFilters,
  SimulationItem,
  SimulationListInput,
  SimulationListResult,
} from '@package/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { SimulationCard } from '../../../../components/simulations/simulation-card';
import { SimulationEmptyState } from '../../../../components/simulations/simulation-empty-state';
import { SimulationFiltersPanel } from '../../../../components/simulations/simulation-filters';
import {
  type ActiveSimulationFilter,
  SimulationResultsHeader,
} from '../../../../components/simulations/simulation-results-header';
import {
  getSimulationDescription,
  simulationPageSize,
} from '../../../../components/simulations/simulations.data';
import type { TrpcClient } from '../../../../trpc/client';
import { useTrpcClient } from '../../../../trpc/provider';

const emptyFilters: SimulationFilters = {
  categories: [],
  grades: [],
  subjects: [],
};

const emptyListResult: SimulationListResult = {
  items: [],
  page: 1,
  pageSize: simulationPageSize,
  total: 0,
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '仿真资源加载失败，请稍后重试。';
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function buildListInput(
  selectedSubjects: string[],
  selectedCategoryIds: string[],
  selectedGrades: string[],
  search: string
): SimulationListInput {
  const trimmedSearch = search.trim();

  return {
    page: 1,
    pageSize: simulationPageSize,
    ...(selectedSubjects.length > 0 ? { subjects: selectedSubjects } : {}),
    ...(selectedCategoryIds.length > 0 ? { categoryIds: selectedCategoryIds } : {}),
    ...(selectedGrades.length > 0 ? { grades: selectedGrades } : {}),
    ...(trimmedSearch ? { q: trimmedSearch } : {}),
  };
}

async function fetchSimulationListPages(
  client: TrpcClient,
  input: SimulationListInput,
  shouldContinue: () => boolean = () => true
): Promise<SimulationListResult> {
  const firstResult = await client.simulations.list.query(input);
  const items = [...firstResult.items];
  let currentResult = firstResult;
  let nextPage = firstResult.page + 1;

  while (shouldContinue() && items.length < currentResult.total && currentResult.items.length > 0) {
    currentResult = await client.simulations.list.query({
      ...input,
      page: nextPage,
    });
    items.push(...currentResult.items);
    nextPage += 1;
  }

  return {
    ...currentResult,
    items,
    page: 1,
    pageSize: firstResult.pageSize,
  };
}

export default function SimulationPage() {
  const client = useTrpcClient();
  const [filters, setFilters] = useState<SimulationFilters>(emptyFilters);
  const [result, setResult] = useState<SimulationListResult>(emptyListResult);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 220);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    let ignore = false;

    void client.simulations.filters
      .query()
      .then((nextFilters) => {
        if (!ignore) {
          setFilters(nextFilters);
          setFiltersError(null);
        }
      })
      .catch((fetchError: unknown) => {
        if (!ignore) {
          setFiltersError(getErrorMessage(fetchError));
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingFilters(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [client]);

  useEffect(() => {
    let ignore = false;
    const input = buildListInput(
      selectedSubjects,
      selectedCategoryIds,
      selectedGrades,
      debouncedSearch
    );

    void Promise.resolve()
      .then(async () => {
        if (ignore) {
          return;
        }

        setLoadingList(true);
        const nextResult = await fetchSimulationListPages(client, input, () => !ignore);

        if (!ignore) {
          setResult(nextResult);
          setListError(null);
        }
      })
      .catch((fetchError: unknown) => {
        if (!ignore) {
          setResult(emptyListResult);
          setListError(getErrorMessage(fetchError));
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingList(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [client, debouncedSearch, selectedCategoryIds, selectedGrades, selectedSubjects]);

  const resetFilters = useCallback(() => {
    setSelectedSubjects([]);
    setSelectedCategoryIds([]);
    setSelectedGrades([]);
    setSearch('');
    setDebouncedSearch('');
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleSubjectToggle = useCallback((subject: string) => {
    setSelectedSubjects((current) => toggleValue(current, subject));
  }, []);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setSelectedCategoryIds((current) => toggleValue(current, categoryId));
  }, []);

  const handleGradeToggle = useCallback((grade: string) => {
    setSelectedGrades((current) => toggleValue(current, grade));
  }, []);

  const categoryLabels = useMemo(
    () => new Map(filters.categories.map((category) => [category.id, category.name])),
    [filters.categories]
  );

  const activeFilters = useMemo<ActiveSimulationFilter[]>(() => {
    const subjectFilters = selectedSubjects.map((subject) => ({
      id: `subject-${subject}`,
      label: subject,
      onRemove: () => {
        setSelectedSubjects((current) => current.filter((item) => item !== subject));
      },
    }));
    const categoryFilters = selectedCategoryIds.map((categoryId) => ({
      id: `category-${categoryId}`,
      label: categoryLabels.get(categoryId) ?? categoryId,
      onRemove: () => {
        setSelectedCategoryIds((current) => current.filter((item) => item !== categoryId));
      },
    }));
    const gradeFilters = selectedGrades.map((grade) => ({
      id: `grade-${grade}`,
      label: grade,
      onRemove: () => {
        setSelectedGrades((current) => current.filter((item) => item !== grade));
      },
    }));
    const searchFilter = search.trim()
      ? [
          {
            id: 'search',
            label: `搜索：${search.trim()}`,
            onRemove: () => {
              setSearch('');
            },
          },
        ]
      : [];

    return [...subjectFilters, ...categoryFilters, ...gradeFilters, ...searchFilter];
  }, [categoryLabels, search, selectedCategoryIds, selectedGrades, selectedSubjects]);

  const listLoading = loadingFilters || loadingList;
  const combinedError = filtersError ?? listError;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white lg:flex-row">
      <SimulationFiltersPanel
        disabled={loadingFilters}
        filters={filters}
        onToggleCategory={handleCategoryToggle}
        onToggleGrade={handleGradeToggle}
        onToggleSubject={handleSubjectToggle}
        selectedCategoryIds={selectedCategoryIds}
        selectedGrades={selectedGrades}
        selectedSubjects={selectedSubjects}
      />

      <main aria-busy={listLoading} className="flex min-w-0 flex-1 flex-col bg-slate-50/30">
        <SimulationResultsHeader
          activeFilters={activeFilters}
          loading={listLoading}
          onSearchChange={handleSearchChange}
          onReset={resetFilters}
          search={search}
          total={result.total}
        />

        {combinedError ? (
          <p
            className="mx-8 mt-8 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
            role="alert"
          >
            {combinedError}
          </p>
        ) : null}

        <div className="flex-1 overflow-y-auto p-8">
          {result.items.length > 0 ? (
            <section
              aria-label="仿真实验列表"
              className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3"
            >
              {result.items.map((item) => (
                <SimulationCard
                  description={getSimulationDescription(item)}
                  item={item}
                  key={item.id}
                />
              ))}
            </section>
          ) : listLoading ? (
            <p
              aria-live="polite"
              className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200/60"
            >
              正在加载仿真资源...
            </p>
          ) : !combinedError ? (
            <SimulationEmptyState onReset={resetFilters} />
          ) : null}

          {filtersError && listError ? (
            <p
              className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
              role="alert"
            >
              {listError}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
