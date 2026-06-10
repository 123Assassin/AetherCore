import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Database } from '@package/db';
import {
  grades,
  gradeSimulationApps,
  simulationApps,
  simulationCategories,
} from '@package/db/schema';

type SimulationDataItem = {
  id: string;
  name: string;
  src?: string;
  thumbnail?: string;
  isable?: boolean;
  topics?: unknown[];
  sample_learning_goals?: unknown[];
  subjects?: SimulationSourceSubject[];
};

type SimulationSourceSubject = {
  subject: string;
  category: string;
};

type GradeJson = {
  年级: Record<string, string[]>;
};

type SeedSource = {
  gradeGroups: Record<string, SimulationDataItem[]>;
  grades: Record<string, string[]>;
};

type CategoryInsert = typeof simulationCategories.$inferInsert;
type AppInsert = typeof simulationApps.$inferInsert;
type GradeInsert = typeof grades.$inferInsert;

type GradeSimulationAppSeed = {
  gradeName: string;
  simulationAppId: string;
};

export type SimulationSeedRows = {
  categories: CategoryInsert[];
  apps: AppInsert[];
  grades: GradeInsert[];
  gradeSimulationApps: GradeSimulationAppSeed[];
};

export async function loadSeedSource(dataPath = process.cwd()): Promise<SeedSource> {
  const [dataContent, gradeContent] = await Promise.all([
    readFile(join(dataPath, 'data.json'), 'utf8'),
    readFile(join(dataPath, 'grade.json'), 'utf8'),
  ]);

  return {
    gradeGroups: JSON.parse(dataContent) as Record<string, SimulationDataItem[]>,
    grades: (JSON.parse(gradeContent) as GradeJson).年级,
  };
}

export function buildSeedRows(source: SeedSource): SimulationSeedRows {
  const categoriesById = new Map<string, CategoryInsert>();
  const appsById = new Map<string, AppInsert>();
  const appIds: string[] = [];
  const gradesRows = Object.keys(source.grades).map((name) => ({ name }));
  const categorySortOrderById = new Map<string, number>();

  for (const apps of Object.values(source.gradeGroups)) {
    for (const app of apps) {
      const appSubjects = normalizeSourceSubjects(app.subjects);

      for (const subject of appSubjects) {
        ensureCategory(categoriesById, categorySortOrderById, {
          id: subject.subject,
          name: subject.subject,
          parentId: null,
        });
        ensureCategory(categoriesById, categorySortOrderById, {
          id: toCategoryId(subject),
          name: subject.category,
          parentId: subject.subject,
        });
      }

      const primarySubject = appSubjects[0];

      if (!primarySubject) {
        continue;
      }

      const existingApp = appsById.get(app.id);

      if (existingApp) {
        existingApp.subjects = mergeSourceSubjects(existingApp.subjects, appSubjects);
        continue;
      }

      appsById.set(app.id, {
        id: app.id,
        name: app.name,
        categoryId: toCategoryId(primarySubject),
        src: app.src ?? null,
        thumbnail: app.thumbnail ?? null,
        isable: app.isable ?? true,
        topics: app.topics ?? null,
        subjects: appSubjects,
        sampleLearningGoals: app.sample_learning_goals ?? null,
      });
      appIds.push(app.id);
    }
  }

  const apps = appIds.map((id) => appsById.get(id)).filter((app): app is AppInsert => Boolean(app));
  const appNameToIds = new Map<string, string[]>();

  for (const app of apps) {
    const ids = appNameToIds.get(app.name) ?? [];

    if (!ids.includes(app.id)) {
      ids.push(app.id);
    }

    appNameToIds.set(app.name, ids);
  }

  const gradeSimulationAppRows: GradeSimulationAppSeed[] = [];
  const gradeSimulationAppKeys = new Set<string>();

  for (const [gradeName, appNames] of Object.entries(source.grades)) {
    for (const appName of appNames) {
      const simulationAppIds = appNameToIds.get(appName) ?? [];

      for (const simulationAppId of simulationAppIds) {
        const key = `${gradeName}\0${simulationAppId}`;

        if (gradeSimulationAppKeys.has(key)) {
          continue;
        }

        gradeSimulationAppKeys.add(key);
        gradeSimulationAppRows.push({ gradeName, simulationAppId });
      }
    }
  }

  return {
    categories: [...categoriesById.values()],
    apps,
    grades: gradesRows,
    gradeSimulationApps: gradeSimulationAppRows,
  };
}

function ensureCategory(
  categoriesById: Map<string, CategoryInsert>,
  categorySortOrderById: Map<string, number>,
  input: Pick<CategoryInsert, 'id' | 'name' | 'parentId'>
) {
  if (categoriesById.has(input.id)) {
    return;
  }

  categorySortOrderById.set(input.id, categorySortOrderById.size);
  categoriesById.set(input.id, {
    ...input,
    sortOrder: categorySortOrderById.get(input.id) ?? 0,
  });
}

function normalizeSourceSubjects(
  subjects: SimulationSourceSubject[] | undefined
): SimulationSourceSubject[] {
  const seen = new Set<string>();
  const normalized: SimulationSourceSubject[] = [];

  for (const subject of subjects ?? []) {
    const subjectName = subject.subject.trim();
    const categoryName = subject.category.trim();

    if (!subjectName || !categoryName) {
      continue;
    }

    const key = `${subjectName}\0${categoryName}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({ subject: subjectName, category: categoryName });
  }

  return normalized;
}

function mergeSourceSubjects(
  current: { subject: string; category: string }[] | null | undefined,
  next: SimulationSourceSubject[]
): SimulationSourceSubject[] {
  return normalizeSourceSubjects([...(current ?? []), ...next]);
}

function toCategoryId(subject: SimulationSourceSubject): string {
  return `${subject.subject}-${subject.category}`;
}

export async function seedData(db: Database) {
  const rows = buildSeedRows(await loadSeedSource());

  await db.delete(gradeSimulationApps);
  await db.delete(simulationApps);
  await db.delete(simulationCategories);
  await db.delete(grades);

  if (rows.categories.length > 0) {
    await db.insert(simulationCategories).values(rows.categories);
  }

  if (rows.apps.length > 0) {
    await db.insert(simulationApps).values(rows.apps);
  }

  if (rows.grades.length === 0) {
    return;
  }

  const insertedGrades = await db.insert(grades).values(rows.grades).returning();
  const gradeIdByName = new Map(insertedGrades.map((grade) => [grade.name, grade.id]));
  const gradeAppRows = rows.gradeSimulationApps.flatMap((row) => {
    const gradeId = gradeIdByName.get(row.gradeName);

    return gradeId ? [{ gradeId, simulationAppId: row.simulationAppId }] : [];
  });

  if (gradeAppRows.length > 0) {
    await db.insert(gradeSimulationApps).values(gradeAppRows);
  }
}
