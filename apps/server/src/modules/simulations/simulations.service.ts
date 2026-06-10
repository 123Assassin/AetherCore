import { Injectable } from '@nestjs/common';

import {
  SimulationsRepository,
  type SimulationRepositoryRow,
  type SimulationUpdateData,
} from './simulations.repository.js';

export type SimulationCategoryOption = {
  id: string;
  name: string;
};

export type SimulationSubjectOption = {
  name: string;
  categories: SimulationCategoryOption[];
};

export type SimulationFilterCategoryOption = {
  id: string;
  name: string;
  subject: string;
};

export type SimulationSubjectAssignment = {
  subject: string;
  category: SimulationCategoryOption;
};

export type SimulationFilters = {
  subjects: SimulationSubjectOption[];
  categories: SimulationFilterCategoryOption[];
  grades: string[];
};

export type SimulationItem = {
  id: string;
  name: string;
  subject: string;
  subjects: SimulationSubjectAssignment[];
  category: SimulationCategoryOption;
  grades: string[];
  thumbnail: string | null;
  src: string | null;
  isable: boolean;
  topics: unknown[] | null;
  sampleLearningGoals: unknown[] | null;
  createdAt: string;
  updatedAt: string;
};

export type SimulationListInput = {
  subjects?: string[];
  categoryIds?: string[];
  grades?: string[];
  q?: string;
  page?: number;
  pageSize?: number;
};

export type AdminSimulationListInput = SimulationListInput & {
  isable?: boolean;
};

export type SimulationListResult = {
  items: SimulationItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminSimulationSetEnabledInput = {
  id: string;
  isable: boolean;
};

export type AdminSimulationUpdateInput = {
  id: string;
  name?: string;
  categoryId?: string;
  grades?: string[];
  thumbnail?: string | null;
  src?: string | null;
  isable?: boolean;
  topics?: unknown[] | null;
  sampleLearningGoals?: unknown[] | null;
};

export class SimulationsServiceError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'BAD_REQUEST',
    message: string
  ) {
    super(message);
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

type NormalizedSimulationListInput = {
  subjects: string[];
  categoryIds: string[];
  grades: string[];
  q: string | undefined;
  page: number;
  pageSize: number;
};

@Injectable()
export class SimulationsService {
  constructor(private readonly simulationsRepository: SimulationsRepository) {}

  async listPublic(input: SimulationListInput = {}): Promise<SimulationListResult> {
    const normalizedInput = normalizeListInput(input);
    const rows = (await this.simulationsRepository.listNormalizedRows()).filter(
      (row) => row.isable
    );

    return toListResult(filterRows(rows, normalizedInput), normalizedInput);
  }

  async listAdmin(input: AdminSimulationListInput = {}): Promise<SimulationListResult> {
    const normalizedInput = normalizeListInput(input);
    let rows = await this.simulationsRepository.listNormalizedRows();

    if (input.isable !== undefined) {
      rows = rows.filter((row) => row.isable === input.isable);
    }

    return toListResult(filterRows(rows, normalizedInput), normalizedInput);
  }

  async filters(input: { enabledOnly?: boolean } = {}): Promise<SimulationFilters> {
    const rows = (await this.simulationsRepository.listNormalizedRows()).filter(
      (row) => !input.enabledOnly || row.isable
    );
    const subjectsByName = new Map<
      string,
      { name: string; categories: { id: string; name: string }[] }
    >();
    const categoriesById = new Map<string, { id: string; name: string; subject: string }>();
    const gradeNames = new Set<string>();

    for (const row of rows) {
      const item = toSimulationItem(row);

      for (const assignment of item.subjects) {
        const subject = subjectsByName.get(assignment.subject) ?? {
          name: assignment.subject,
          categories: [],
        };

        if (!subject.categories.some((category) => category.id === assignment.category.id)) {
          subject.categories.push(assignment.category);
        }

        subjectsByName.set(assignment.subject, subject);
        categoriesById.set(assignment.category.id, {
          ...assignment.category,
          subject: assignment.subject,
        });
      }

      for (const grade of item.grades) {
        gradeNames.add(grade);
      }
    }

    return {
      subjects: [...subjectsByName.values()],
      categories: [...categoriesById.values()],
      grades: [...gradeNames],
    };
  }

  async setEnabled(input: AdminSimulationSetEnabledInput): Promise<SimulationItem> {
    const id = requireTrimmedMax(input.id, 'Simulation id', 100, 'Simulation id is required');

    return this.updateRow({
      id,
      isable: input.isable,
    });
  }

  async update(input: AdminSimulationUpdateInput): Promise<SimulationItem> {
    const id = requireTrimmedMax(input.id, 'Simulation id', 100, 'Simulation id is required');
    const update = normalizeUpdateInput({ ...input, id });

    if (Object.keys(update).length === 1) {
      throw new SimulationsServiceError('BAD_REQUEST', 'Simulation update has no changes');
    }

    if (update.categoryId !== undefined) {
      await this.validateSecondaryCategory(update.categoryId);
    }

    return this.updateRow(update);
  }

  private async validateSecondaryCategory(categoryId: string): Promise<void> {
    const category = await this.simulationsRepository.findCategoryById(categoryId);

    if (!category?.parentId) {
      throw new SimulationsServiceError(
        'BAD_REQUEST',
        'Simulation categoryId must be a secondary category'
      );
    }
  }

  private async updateRow(input: SimulationUpdateData): Promise<SimulationItem> {
    const row = await this.simulationsRepository.updateSimulation(input);

    if (!row) {
      throw new SimulationsServiceError('NOT_FOUND', 'Simulation not found');
    }

    return toSimulationItem(row);
  }
}

function normalizeListInput(input: SimulationListInput): NormalizedSimulationListInput {
  return {
    subjects: normalizeStringArray(input.subjects),
    categoryIds: normalizeStringArray(input.categoryIds),
    grades: normalizeStringArray(input.grades),
    q: trimOptional(input.q),
    page: normalizePositiveInteger(input.page, DEFAULT_PAGE),
    pageSize: Math.min(normalizePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
  };
}

function normalizeUpdateInput(input: AdminSimulationUpdateInput): SimulationUpdateData {
  return {
    id: input.id,
    ...(input.name === undefined
      ? {}
      : {
          name: requireTrimmedMax(
            input.name,
            'Simulation name',
            100,
            'Simulation name is required'
          ),
        }),
    ...(input.categoryId === undefined
      ? {}
      : {
          categoryId: requireTrimmedMax(
            input.categoryId,
            'Simulation categoryId',
            100,
            'Simulation categoryId is required'
          ),
        }),
    ...(input.grades === undefined ? {} : { grades: normalizeGradeNames(input.grades) }),
    ...(input.thumbnail === undefined
      ? {}
      : { thumbnail: trimNullableMax(input.thumbnail, 'Simulation thumbnail', 500) }),
    ...(input.src === undefined ? {} : { src: trimNullable(input.src) }),
    ...(input.isable === undefined ? {} : { isable: input.isable }),
    ...(input.topics === undefined
      ? {}
      : { topics: normalizeUnknownArray(input.topics, 'topics') }),
    ...(input.sampleLearningGoals === undefined
      ? {}
      : {
          sampleLearningGoals: normalizeUnknownArray(
            input.sampleLearningGoals,
            'sampleLearningGoals'
          ),
        }),
  };
}

function filterRows(
  rows: SimulationRepositoryRow[],
  input: NormalizedSimulationListInput
): SimulationRepositoryRow[] {
  return rows.filter((row) => {
    const item = toSimulationItem(row);

    if (
      input.subjects.length > 0 &&
      !item.subjects.some((assignment) => input.subjects.includes(assignment.subject))
    ) {
      return false;
    }

    if (
      input.categoryIds.length > 0 &&
      !item.subjects.some((assignment) => input.categoryIds.includes(assignment.category.id))
    ) {
      return false;
    }

    if (input.grades.length > 0 && !item.grades.some((grade) => input.grades.includes(grade))) {
      return false;
    }

    if (input.q && !matchesSearch(item, input.q)) {
      return false;
    }

    return true;
  });
}

function toListResult(
  rows: SimulationRepositoryRow[],
  input: NormalizedSimulationListInput
): SimulationListResult {
  const start = (input.page - 1) * input.pageSize;
  const items = rows.slice(start, start + input.pageSize).map(toSimulationItem);

  return {
    items,
    total: rows.length,
    page: input.page,
    pageSize: input.pageSize,
  };
}

function toSimulationItem(row: SimulationRepositoryRow): SimulationItem {
  const fallbackSubject = row.parentCategoryName ?? row.categoryName;
  const fallbackCategory = {
    id: row.categoryId,
    name: row.categoryName,
  };
  const subjects = normalizeSubjectAssignments(row.subjects, fallbackSubject, fallbackCategory);
  const primarySubject = subjects[0] ?? {
    subject: fallbackSubject,
    category: fallbackCategory,
  };

  return {
    id: row.id,
    name: row.name,
    subject: primarySubject.subject,
    subjects,
    category: primarySubject.category,
    grades: row.grades,
    thumbnail: row.thumbnail,
    src: row.src,
    isable: row.isable,
    topics: row.topics,
    sampleLearningGoals: row.sampleLearningGoals,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function matchesSearch(item: SimulationItem, query: string): boolean {
  const normalizedQuery = query.toLowerCase();
  const searchable = [
    item.name,
    ...unknownArrayToStrings(item.topics),
    ...unknownArrayToStrings(item.sampleLearningGoals),
  ]
    .join(' ')
    .toLowerCase();

  return searchable.includes(normalizedQuery);
}

function normalizeSubjectAssignments(
  value: { subject: string; category: string }[] | null,
  fallbackSubject: string,
  fallbackCategory: SimulationCategoryOption
): SimulationSubjectAssignment[] {
  const seen = new Set<string>();
  const assignments: SimulationSubjectAssignment[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      const subject = item.subject.trim();
      const categoryName = item.category.trim();

      if (!subject || !categoryName) {
        continue;
      }

      const category =
        subject === fallbackSubject && categoryName === fallbackCategory.name
          ? fallbackCategory
          : { id: `${subject}-${categoryName}`, name: categoryName };
      const key = `${subject}\0${category.id}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      assignments.push({ subject, category });
    }
  }

  return assignments.length > 0
    ? assignments
    : [{ subject: fallbackSubject, category: fallbackCategory }];
}

function normalizeStringArray(value: string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function normalizeGradeNames(value: string[]): string[] {
  return normalizeStringArray(value).map((grade) =>
    requireMaxLength(grade, 'Simulation grade', 20)
  );
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new SimulationsServiceError('BAD_REQUEST', 'Pagination values must be positive integers');
  }

  return value;
}

function requireTrimmed(value: string, message: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new SimulationsServiceError('BAD_REQUEST', message);
  }

  return trimmed;
}

function requireTrimmedMax(
  value: string,
  field: string,
  maxLength: number,
  message: string
): string {
  const trimmed = requireTrimmed(value, message);

  return requireMaxLength(trimmed, field, maxLength);
}

function requireMaxLength(value: string, field: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw new SimulationsServiceError(
      'BAD_REQUEST',
      `${field} must be ${maxLength} characters or fewer`
    );
  }

  return value;
}

function trimOptional(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function trimNullable(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function trimNullableMax(value: string | null, field: string, maxLength: number): string | null {
  const trimmed = trimNullable(value);

  if (trimmed === null) {
    return null;
  }

  return requireMaxLength(trimmed, field, maxLength);
}

function normalizeUnknownArray(value: unknown[] | null, field: string): unknown[] | null {
  if (value === null || Array.isArray(value)) {
    return value;
  }

  throw new SimulationsServiceError('BAD_REQUEST', `Simulation ${field} must be an array or null`);
}

function unknownArrayToStrings(value: unknown[] | null): string[] {
  if (!value) {
    return [];
  }

  return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
}
