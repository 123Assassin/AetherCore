import type { SimulationItem } from '@package/shared';

export const adminSimulationGradeOptions = ['小学', '中学'] as const;

export function getSimulationSubjectLabels(item: SimulationItem) {
  const subjects = Array.isArray(item.subjects) ? item.subjects : [];
  const labels = uniqueText(subjects.map((subject) => subject.subject));

  return labels.length > 0 ? labels : uniqueText([item.subject]);
}

export function getAdminSimulationGradeOptions(grades: readonly string[]) {
  return adminSimulationGradeOptions.filter((grade) => grades.includes(grade));
}

function uniqueText(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
