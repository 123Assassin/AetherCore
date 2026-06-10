import type { SimulationItem } from '@package/shared';

export const simulationPageSize = 100;

export const simulationFallbackDescription = '暂无学习目标信息。';

export const simulationUnavailableLabel = '暂无入口';

export const simulationThumbnailFallbackLabel = '仿真';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unknownValueToText(value: unknown): string[] {
  if (typeof value === 'string') {
    const text = value.trim();

    return text ? [text] : [];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap(unknownValueToText);
  }

  if (isRecord(value)) {
    const preferredFields = ['name', 'title', 'label', 'text', 'content', 'goal', 'topic'];
    const preferredText = preferredFields.flatMap((field) => unknownValueToText(value[field]));

    if (preferredText.length > 0) {
      return preferredText;
    }

    return Object.values(value).flatMap(unknownValueToText);
  }

  return [];
}

function uniqueText(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function getSimulationSubjectLabels(item: SimulationItem) {
  const subjects = Array.isArray(item.subjects) ? item.subjects : [];
  const labels = uniqueText(subjects.map((subject) => subject.subject));

  return labels.length > 0 ? labels : uniqueText([item.subject]);
}

export function getSimulationTopics(item: SimulationItem) {
  return uniqueText(unknownValueToText(item.topics));
}

export function getSimulationLearningGoals(item: SimulationItem) {
  return uniqueText(unknownValueToText(item.sampleLearningGoals));
}

export function getSimulationDescription(item: SimulationItem) {
  const learningGoals = getSimulationLearningGoals(item);

  if (learningGoals.length > 0) {
    return learningGoals.slice(0, 2).join('；');
  }

  const topics = getSimulationTopics(item);

  if (topics.length > 0) {
    return `关联主题：${topics.slice(0, 3).join('、')}`;
  }

  return simulationFallbackDescription;
}
