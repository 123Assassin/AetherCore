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

export type SimulationFilters = {
  subjects: SimulationSubjectOption[];
  categories: SimulationFilterCategoryOption[];
  grades: string[];
};

export type SimulationItem = {
  id: string;
  name: string;
  subject: string;
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
