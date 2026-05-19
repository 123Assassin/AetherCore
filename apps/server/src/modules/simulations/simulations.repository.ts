import { Injectable } from '@nestjs/common';
import type { Database } from '@package/db';
import { db } from '@package/db';
import {
  gradeSimulationApps,
  grades,
  simulationApps,
  simulationCategories,
} from '@package/db/schema';
import { asc, eq, inArray } from 'drizzle-orm';

export type SimulationRepositoryRow = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  src: string | null;
  thumbnail: string | null;
  isable: boolean;
  topics: unknown[] | null;
  sampleLearningGoals: unknown[] | null;
  grades: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type SimulationUpdateData = {
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

export type SimulationCategoryRow = {
  id: string;
  name: string;
  parentId: string | null;
};

@Injectable()
export class SimulationsRepository {
  private readonly database: Database = db;

  async listNormalizedRows(): Promise<SimulationRepositoryRow[]> {
    const [apps, categories, gradeRows, gradeMappings] = await Promise.all([
      this.database.select().from(simulationApps).orderBy(asc(simulationApps.name)),
      this.database
        .select()
        .from(simulationCategories)
        .orderBy(asc(simulationCategories.sortOrder)),
      this.database.select().from(grades).orderBy(asc(grades.id)),
      this.database.select().from(gradeSimulationApps),
    ]);
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const gradeNamesById = new Map(gradeRows.map((grade) => [grade.id, grade.name]));
    const gradesBySimulationId = new Map<string, string[]>();

    for (const mapping of gradeMappings) {
      const gradeName = gradeNamesById.get(mapping.gradeId);

      if (!gradeName) {
        continue;
      }

      const simulationGrades = gradesBySimulationId.get(mapping.simulationAppId) ?? [];
      simulationGrades.push(gradeName);
      gradesBySimulationId.set(mapping.simulationAppId, simulationGrades);
    }

    return apps.map((app) => {
      const category = categoriesById.get(app.categoryId);
      const parentCategory = category?.parentId ? categoriesById.get(category.parentId) : null;

      return {
        id: app.id,
        name: app.name,
        categoryId: app.categoryId,
        categoryName: category?.name ?? app.categoryId,
        parentCategoryId: parentCategory?.id ?? null,
        parentCategoryName: parentCategory?.name ?? null,
        src: app.src,
        thumbnail: app.thumbnail,
        isable: app.isable,
        topics: app.topics ?? null,
        sampleLearningGoals: app.sampleLearningGoals ?? null,
        grades: gradesBySimulationId.get(app.id) ?? [],
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      };
    });
  }

  async findCategoryById(id: string): Promise<SimulationCategoryRow | null> {
    const [category] = await this.database
      .select({
        id: simulationCategories.id,
        name: simulationCategories.name,
        parentId: simulationCategories.parentId,
      })
      .from(simulationCategories)
      .where(eq(simulationCategories.id, id))
      .limit(1);

    return category ?? null;
  }

  async updateSimulation(input: SimulationUpdateData): Promise<SimulationRepositoryRow | null> {
    const values: Partial<typeof simulationApps.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      values.name = input.name;
    }
    if (input.categoryId !== undefined) {
      values.categoryId = input.categoryId;
    }
    if (input.thumbnail !== undefined) {
      values.thumbnail = input.thumbnail;
    }
    if (input.src !== undefined) {
      values.src = input.src;
    }
    if (input.isable !== undefined) {
      values.isable = input.isable;
    }
    if (input.topics !== undefined) {
      values.topics = input.topics;
    }
    if (input.sampleLearningGoals !== undefined) {
      values.sampleLearningGoals = input.sampleLearningGoals;
    }

    const updated = await this.database.transaction(async (transaction) => {
      const [simulation] = await transaction
        .update(simulationApps)
        .set(values)
        .where(eq(simulationApps.id, input.id))
        .returning({ id: simulationApps.id });

      if (!simulation) {
        return null;
      }

      if (input.grades !== undefined) {
        await transaction
          .delete(gradeSimulationApps)
          .where(eq(gradeSimulationApps.simulationAppId, input.id));

        if (input.grades.length > 0) {
          await transaction
            .insert(grades)
            .values(input.grades.map((name) => ({ name })))
            .onConflictDoNothing();

          const gradeRows = await transaction
            .select({ id: grades.id })
            .from(grades)
            .where(inArray(grades.name, input.grades));

          await transaction.insert(gradeSimulationApps).values(
            gradeRows.map((grade) => ({
              gradeId: grade.id,
              simulationAppId: input.id,
            }))
          );
        }
      }

      return simulation;
    });

    if (!updated) {
      return null;
    }

    return (await this.listNormalizedRows()).find((row) => row.id === updated.id) ?? null;
  }
}
