export const webGradeOptions = ['小学', '初中'] as const;
export type WebGrade = (typeof webGradeOptions)[number];

const elementaryGradeAliases = ['小学', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
const middleSchoolGradeAliases = ['初中', '七年级', '八年级', '九年级', '中学'];

const webGradeAliases = new Map<string, WebGrade>([
  ...elementaryGradeAliases.map((grade) => [grade, '小学'] as const),
  ...middleSchoolGradeAliases.map((grade) => [grade, '初中'] as const),
]);

export const webSubjectsByGrade: Record<WebGrade, readonly string[]> = {
  小学: [
    '语文',
    '数学',
    '英语',
    '道德与法治',
    '科学',
    '体育与健康',
    '音乐',
    '美术',
    '综合实践活动',
    '劳动',
  ],
  初中: [
    '语文',
    '数学',
    '英语',
    '道德与法治',
    '历史',
    '地理',
    '生物',
    '物理',
    '化学',
    '体育与健康',
    '音乐',
    '美术',
    '信息技术',
    '综合实践活动',
    '劳动',
    '心理健康',
    '安全教育',
  ],
};

function getWebGrade(grade: string): WebGrade | null {
  return webGradeAliases.get(grade.trim()) ?? null;
}

export function normalizeWebGradeOptions(grades: readonly string[]) {
  const normalizedGrades: WebGrade[] = [];

  for (const rawGrade of grades) {
    const grade = getWebGrade(rawGrade);

    if (grade && !normalizedGrades.includes(grade)) {
      normalizedGrades.push(grade);
    }
  }

  return normalizedGrades;
}

export function expandWebGradeFilters(grades: readonly string[]) {
  const expandedGrades: string[] = [];

  for (const rawGrade of grades) {
    const grade = rawGrade.trim();
    const aliases =
      grade === '小学' ? elementaryGradeAliases : grade === '初中' ? middleSchoolGradeAliases : [];

    for (const alias of aliases) {
      if (!expandedGrades.includes(alias)) {
        expandedGrades.push(alias);
      }
    }
  }

  return expandedGrades;
}

export function getWebSubjectsForGrade(grade: string) {
  const webGrade = getWebGrade(grade);

  return webGrade ? webSubjectsByGrade[webGrade] : [];
}

export function getDefaultWebSubjectForGrade(grade: string) {
  return getWebSubjectsForGrade(grade)[0] ?? '';
}

export function normalizeWebSubjectForGrade(grade: string, subject: string) {
  const subjects = getWebSubjectsForGrade(grade);
  const trimmedSubject = subject.trim();

  return subjects.includes(trimmedSubject) ? trimmedSubject : (subjects[0] ?? trimmedSubject);
}
