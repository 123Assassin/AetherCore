import {
  getDefaultWebSubjectForGrade,
  getWebSubjectsForGrade,
  normalizeWebSubjectForGrade,
  webGradeOptions,
  webSubjectsByGrade,
} from '../../lib/web-grades';

export type InspirationFormValues = {
  grade: string;
  subject: string;
  topic: string;
  context: string;
};

export type FeaturedInspirationCase = InspirationFormValues & {
  icon: string;
  id: string;
  title: string;
  description: string;
};

export const gradeOptions = webGradeOptions;

export const subjectOptions = Array.from(new Set(Object.values(webSubjectsByGrade).flat()));

export const availableInspirationSubjectsByGrade = webSubjectsByGrade;

export function getInspirationSubjectOptions(grade: string) {
  return getWebSubjectsForGrade(grade);
}

export function getDefaultInspirationSubjectForGrade(grade: string) {
  return getDefaultWebSubjectForGrade(grade);
}

export function normalizeInspirationSubjectForGrade(grade: string, subject: string) {
  return normalizeWebSubjectForGrade(grade, subject);
}

export const defaultInspirationFormValues: InspirationFormValues = {
  context: '',
  grade: '小学',
  subject: getDefaultInspirationSubjectForGrade('小学'),
  topic: '',
};

export const featuredInspirationCases: FeaturedInspirationCase[] = [
  {
    context: '',
    description: '电子就是“债务”，带学生用“还债”逻辑秒懂氧化还原。',
    grade: '初中',
    icon: '💰',
    id: 'redox-reaction',
    subject: '化学',
    title: '氧化还原反应',
    topic: '氧化还原反应',
  },
  {
    context: '',
    description: '把抽象等高线变成立体山坡，学生一眼判断陡缓与山脊山谷。',
    grade: '初中',
    icon: '⛰️',
    id: 'contour-map',
    subject: '地理',
    title: '等高线地形图',
    topic: '等高线地形图判读',
  },
  {
    context: '',
    description: '把叶片想成小工厂，用能量流动拆开光合作用全过程。',
    grade: '初中',
    icon: '🌿',
    id: 'photosynthesis',
    subject: '生物',
    title: '光合作用',
    topic: '光合作用',
  },
];
