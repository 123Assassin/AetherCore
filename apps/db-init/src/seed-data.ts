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
  children?: SimulationDataItem[];
  src?: string;
  thumbnail?: string;
  isable?: boolean;
  topics?: unknown[];
  sample_learning_goals?: unknown[];
};

type GradeJson = {
  年级: Record<string, string[]>;
};

type SeedSource = {
  subjects: SimulationDataItem[];
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
    subjects: JSON.parse(dataContent) as SimulationDataItem[],
    grades: (JSON.parse(gradeContent) as GradeJson).年级,
  };
}

export function buildSeedRows(source: SeedSource): SimulationSeedRows {
  const categories: CategoryInsert[] = [];
  const apps: AppInsert[] = [];
  const gradesRows = Object.keys(source.grades).map((name) => ({ name }));
  const appNameToIds = new Map<string, string[]>();

  for (const subject of source.subjects) {
    categories.push({
      id: subject.name,
      name: subject.name,
      parentId: null,
      sortOrder: 0,
    });

    for (const category of subject.children ?? []) {
      const categoryId = `${subject.name}-${category.id}`;

      categories.push({
        id: categoryId,
        name: category.name || category.id,
        parentId: subject.name,
        sortOrder: 0,
      });

      for (const app of category.children ?? []) {
        const appId = `${categoryId}-${app.id}`;

        apps.push({
          id: appId,
          name: app.name,
          categoryId,
          src: app.src ?? null,
          thumbnail: app.thumbnail ?? null,
          isable: app.isable ?? true,
          topics: app.topics ?? null,
          sampleLearningGoals: app.sample_learning_goals ?? null,
        });

        const ids = appNameToIds.get(app.name) ?? [];
        ids.push(appId);
        appNameToIds.set(app.name, ids);
      }
    }
  }

  const gradeSimulationAppRows: GradeSimulationAppSeed[] = [];

  for (const [gradeName, appNames] of Object.entries(source.grades)) {
    for (const appName of appNames) {
      const simulationAppIds = appNameToIds.get(appName) ?? [];

      for (const simulationAppId of simulationAppIds) {
        gradeSimulationAppRows.push({ gradeName, simulationAppId });
      }
    }
  }

  return {
    categories,
    apps,
    grades: gradesRows,
    gradeSimulationApps: gradeSimulationAppRows,
  };
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
