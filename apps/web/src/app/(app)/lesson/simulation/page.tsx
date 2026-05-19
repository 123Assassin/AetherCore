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
import { SimulationPlayerOverlay } from '../../../../components/simulations/simulation-player-overlay';
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

type FocusRestoreElement = {
  focus: () => void;
  isConnected?: boolean;
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
  const [activeSimulation, setActiveSimulation] = useState<SimulationItem | null>(null);
  const [simulationOpener, setSimulationOpener] = useState<FocusRestoreElement | null>(null);
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

  const openSimulation = useCallback((item: SimulationItem, opener: FocusRestoreElement) => {
    setSimulationOpener(opener);
    setActiveSimulation(item);
  }, []);

  const closeSimulation = useCallback(() => {
    setActiveSimulation(null);
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
    <div className="simulation-page">
      <SimulationFiltersPanel
        disabled={loadingFilters}
        filters={filters}
        onReset={resetFilters}
        onSearchChange={handleSearchChange}
        onToggleCategory={handleCategoryToggle}
        onToggleGrade={handleGradeToggle}
        onToggleSubject={handleSubjectToggle}
        search={search}
        selectedCategoryIds={selectedCategoryIds}
        selectedGrades={selectedGrades}
        selectedSubjects={selectedSubjects}
      />

      <main aria-busy={listLoading} className="simulation-results">
        <SimulationResultsHeader
          activeFilters={activeFilters}
          loading={listLoading}
          onReset={resetFilters}
          total={result.total}
        />

        {combinedError ? (
          <p className="simulation-results__alert" role="alert">
            {combinedError}
          </p>
        ) : null}

        {result.items.length > 0 ? (
          <section aria-label="仿真实验列表" className="simulation-results__grid">
            {result.items.map((item) => (
              <SimulationCard
                description={getSimulationDescription(item)}
                item={item}
                key={item.id}
                onOpen={openSimulation}
              />
            ))}
          </section>
        ) : listLoading ? (
          <p aria-live="polite" className="simulation-results__loading">
            正在加载仿真资源...
          </p>
        ) : !combinedError ? (
          <SimulationEmptyState onReset={resetFilters} />
        ) : null}

        {filtersError && listError ? (
          <p className="simulation-results__alert" role="alert">
            {listError}
          </p>
        ) : null}
      </main>

      {activeSimulation ? (
        <SimulationPlayerOverlay
          item={activeSimulation}
          onClose={closeSimulation}
          restoreFocusElement={simulationOpener}
        />
      ) : null}

      <style>{`
        .simulation-page {
          display: grid;
          min-width: 0;
          flex: 1;
          grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
          gap: 16px;
        }

        .simulation-filters,
        .simulation-results {
          min-width: 0;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
        }

        .simulation-filters {
          display: flex;
          align-self: start;
          flex-direction: column;
          gap: 16px;
          padding: 14px;
        }

        .simulation-filters__search {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .simulation-filters__search span,
        .simulation-filter-group legend {
          color: #374151;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .simulation-filters__search input {
          width: 100%;
          min-height: 38px;
          border: 1px solid #cbd5df;
          border-radius: 6px;
          color: #17202a;
          font: inherit;
          font-size: 14px;
          line-height: 20px;
          padding: 8px 10px;
        }

        .simulation-filters__search input:focus {
          border-color: #12645c;
          outline: 2px solid rgba(18, 100, 92, 0.18);
          outline-offset: 0;
        }

        .simulation-filters__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-top: 1px solid #eef2f6;
          padding-top: 14px;
        }

        .simulation-filters__header h2 {
          margin: 0;
          color: #111827;
          font-size: 16px;
          line-height: 22px;
        }

        .simulation-filters__header button,
        .simulation-results-header__reset,
        .simulation-empty-state button,
        .simulation-card__footer button,
        .simulation-player-overlay__header button {
          min-height: 34px;
          cursor: pointer;
          border: 0;
          border-radius: 6px;
          background: #12645c;
          color: #ffffff;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
          padding: 8px 12px;
        }

        .simulation-filters__header button:hover:not(:disabled),
        .simulation-results-header__reset:hover,
        .simulation-empty-state button:hover,
        .simulation-card__footer button:hover:not(:disabled) {
          background: #0f4f47;
        }

        .simulation-filters__header button:disabled,
        .simulation-card__footer button:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        .simulation-filter-group {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 8px;
          border: 0;
          margin: 0;
          padding: 0;
        }

        .simulation-filter-group__options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .simulation-filter-group__options--stacked {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .simulation-filter-subject {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 7px;
        }

        .simulation-filter-subject p {
          margin: 0;
          color: #6b7280;
          font-size: 12px;
          font-weight: 700;
          line-height: 16px;
        }

        .simulation-filter-option {
          display: flex;
          min-width: 0;
          cursor: pointer;
          align-items: flex-start;
          gap: 8px;
          color: #4b5563;
          font-size: 13px;
          line-height: 18px;
        }

        .simulation-filter-option input {
          margin: 2px 0 0;
          accent-color: #12645c;
        }

        .simulation-filter-option span {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .simulation-results {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px;
        }

        .simulation-results-header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #eef2f6;
          padding-bottom: 14px;
        }

        .simulation-results-header__summary {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 4px;
        }

        .simulation-results-header__summary h1 {
          margin: 0;
          color: #111827;
          font-size: 20px;
          line-height: 28px;
        }

        .simulation-results-header__summary p {
          margin: 0;
          color: #5f6b7a;
          font-size: 13px;
          line-height: 18px;
        }

        .simulation-results-header__filters {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .simulation-active-filter {
          display: inline-flex;
          max-width: 220px;
          min-width: 0;
          min-height: 30px;
          align-items: center;
          gap: 6px;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          background: #f8fafb;
          color: #374151;
          font-size: 12px;
          font-weight: 700;
          line-height: 16px;
          padding: 6px 8px;
        }

        .simulation-active-filter__label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .simulation-active-filter button {
          flex: 0 0 auto;
          cursor: pointer;
          border: 0;
          background: transparent;
          color: #6b7280;
          font: inherit;
          line-height: 1;
          padding: 0;
        }

        .simulation-results__alert {
          margin: 0;
          border: 1px solid #f0b8b8;
          border-radius: 6px;
          background: #fff1f1;
          color: #9f1f1f;
          font-size: 13px;
          line-height: 18px;
          padding: 8px 10px;
        }

        .simulation-results__loading {
          margin: 0;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          background: #f8fafb;
          color: #5f6b7a;
          font-size: 13px;
          line-height: 18px;
          padding: 10px 12px;
        }

        .simulation-results__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }

        .simulation-card {
          display: flex;
          min-width: 0;
          overflow: hidden;
          flex-direction: column;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
        }

        .simulation-card__media {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: #eef2f6;
        }

        .simulation-card__media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .simulation-card__fallback {
          display: flex;
          height: 100%;
          align-items: center;
          justify-content: center;
          color: #12645c;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0;
        }

        .simulation-card__subject {
          position: absolute;
          top: 10px;
          left: 10px;
          max-width: calc(100% - 20px);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.78);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.92);
          color: #0f4f47;
          font-size: 12px;
          font-weight: 800;
          line-height: 16px;
          padding: 5px 8px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .simulation-card__body {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
        }

        .simulation-card__meta {
          display: flex;
          min-width: 0;
          flex-wrap: wrap;
          gap: 8px;
          color: #6b7280;
          font-size: 12px;
          line-height: 16px;
        }

        .simulation-card h2 {
          margin: 0;
          color: #17202a;
          font-size: 16px;
          line-height: 22px;
        }

        .simulation-card p {
          display: -webkit-box;
          min-height: 42px;
          margin: 0;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          color: #5f6b7a;
          font-size: 13px;
          line-height: 21px;
        }

        .simulation-card__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-top: 1px solid #eef2f6;
          padding: 10px 12px 12px;
        }

        .simulation-card__grades {
          display: flex;
          min-width: 0;
          flex-wrap: wrap;
          gap: 5px;
        }

        .simulation-card__grades span {
          display: inline-flex;
          width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border: 1px solid #d8dee8;
          border-radius: 50%;
          background: #f8fafb;
          color: #4b5563;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
        }

        .simulation-empty-state {
          display: flex;
          min-height: 360px;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #5f6b7a;
          text-align: center;
        }

        .simulation-empty-state__icon {
          display: flex;
          width: 58px;
          height: 58px;
          align-items: center;
          justify-content: center;
          border: 1px solid #d8dee8;
          border-radius: 50%;
          background: #f8fafb;
          color: #12645c;
          font-size: 24px;
          font-weight: 800;
        }

        .simulation-empty-state h2 {
          margin: 14px 0 6px;
          color: #17202a;
          font-size: 18px;
          line-height: 26px;
        }

        .simulation-empty-state p {
          margin: 0 0 14px;
          font-size: 14px;
          line-height: 22px;
        }

        .simulation-player-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          min-width: 0;
          flex-direction: column;
          background: #111827;
        }

        .simulation-player-overlay__header {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
          background: #111827;
          color: #ffffff;
          padding: 12px 16px;
        }

        .simulation-player-overlay__title {
          min-width: 0;
        }

        .simulation-player-overlay__header h2 {
          margin: 0;
          overflow-wrap: anywhere;
          font-size: 16px;
          line-height: 22px;
        }

        .simulation-player-overlay__header p {
          margin: 4px 0 0;
          overflow-wrap: anywhere;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          line-height: 16px;
        }

        .simulation-player-overlay__header button {
          flex: 0 0 auto;
          min-width: 38px;
          padding: 8px 12px;
        }

        .simulation-player-overlay__frame {
          min-height: 0;
          flex: 1;
          background: #ffffff;
        }

        .simulation-player-overlay__frame iframe {
          width: 100%;
          height: 100%;
          border: 0;
        }

        @media (max-width: 900px) {
          .simulation-page {
            grid-template-columns: minmax(0, 1fr);
          }

          .simulation-filters {
            align-self: stretch;
          }
        }

        @media (max-width: 560px) {
          .simulation-filter-group__options {
            grid-template-columns: minmax(0, 1fr);
          }

          .simulation-results-header__filters {
            justify-content: flex-start;
          }

          .simulation-results__grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .simulation-player-overlay__header {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
