import type { SimulationSubjectOption } from '@package/shared';

export type SimulationSubjectFilterSelection = {
  selectedCategoryIds: string[];
  selectedSubjects: string[];
};

export function isSubjectFilterChecked(
  subject: SimulationSubjectOption,
  selection: SimulationSubjectFilterSelection
) {
  if (selection.selectedSubjects.includes(subject.name)) {
    return true;
  }

  return getSubjectCategoryIds(subject).some((categoryId) =>
    selection.selectedCategoryIds.includes(categoryId)
  );
}

export function getNextSubjectFilterSelection(
  subject: SimulationSubjectOption,
  selection: SimulationSubjectFilterSelection
): SimulationSubjectFilterSelection {
  const categoryIds = getSubjectCategoryIds(subject);

  if (categoryIds.length === 0) {
    return {
      ...selection,
      selectedSubjects: toggleValue(selection.selectedSubjects, subject.name),
    };
  }

  const allCategoriesSelected = categoryIds.every((categoryId) =>
    selection.selectedCategoryIds.includes(categoryId)
  );

  if (allCategoriesSelected) {
    return {
      selectedCategoryIds: removeValues(selection.selectedCategoryIds, categoryIds),
      selectedSubjects: removeValue(selection.selectedSubjects, subject.name),
    };
  }

  return {
    selectedCategoryIds: addValues(selection.selectedCategoryIds, categoryIds),
    selectedSubjects: addValue(selection.selectedSubjects, subject.name),
  };
}

export function getNextCategoryFilterSelection(
  subject: SimulationSubjectOption,
  categoryId: string,
  selection: SimulationSubjectFilterSelection
): SimulationSubjectFilterSelection {
  const categoryIds = getSubjectCategoryIds(subject);
  const selectedCategoryIds = toggleValue(selection.selectedCategoryIds, categoryId);
  const allCategoriesSelected =
    categoryIds.length > 0 &&
    categoryIds.every((subjectCategoryId) => selectedCategoryIds.includes(subjectCategoryId));

  return {
    selectedCategoryIds,
    selectedSubjects: allCategoriesSelected
      ? addValue(selection.selectedSubjects, subject.name)
      : removeValue(selection.selectedSubjects, subject.name),
  };
}

function getSubjectCategoryIds(subject: SimulationSubjectOption) {
  return subject.categories.map((category) => category.id);
}

function addValue(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}

function addValues(values: string[], nextValues: string[]) {
  return nextValues.reduce((current, value) => addValue(current, value), values);
}

function removeValue(values: string[], value: string) {
  return values.filter((item) => item !== value);
}

function removeValues(values: string[], nextValues: string[]) {
  const nextValueSet = new Set(nextValues);

  return values.filter((value) => !nextValueSet.has(value));
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? removeValue(values, value) : [...values, value];
}
