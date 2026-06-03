export const WEB_AGENT_MAPPING = {
  chat: {
    adminAgentKey: 'chat',
    category: 'chat',
    name: 'AI 助手智能体',
  },
  inspiration: {
    adminAgentKey: 'inspiration',
    category: 'inspiration',
    name: '知识精讲智能体',
  },
  comment: {
    adminAgentKey: 'comment',
    category: 'comment',
    name: '学生评语智能体',
  },
  teaching: {
    adminAgentKey: 'teaching',
    category: 'teaching',
    name: '题目变身智能体',
  },
} as const;

export type WebAgentKey = keyof typeof WEB_AGENT_MAPPING;
export type AiConversationCategory = (typeof WEB_AGENT_MAPPING)[WebAgentKey]['category'];
export type AdminAgentKey = (typeof WEB_AGENT_MAPPING)[WebAgentKey]['adminAgentKey'];

export const webAgentKeys = Object.keys(WEB_AGENT_MAPPING) as WebAgentKey[];
export const adminAgentKeys = webAgentKeys.map(
  (key) => WEB_AGENT_MAPPING[key].adminAgentKey
) as AdminAgentKey[];

export type AdminAgentClassificationMode = 'none' | 'grade' | 'gradeSubject';

export const adminAgentClassificationModes = {
  chat: 'none',
  inspiration: 'gradeSubject',
  comment: 'grade',
  teaching: 'gradeSubject',
} as const satisfies Record<AdminAgentKey, AdminAgentClassificationMode>;

export const inspirationAgentGradeOptions = ['小学', '初中'] as const;
export const commentAgentGradeOptions = ['小学', '初中'] as const;
export const teachingAgentGradeOptions = ['小学', '初中'] as const;
export const agentSubjectOptions = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '政治',
  '信息技术',
  '科学',
] as const;

const elementaryGradeAliases = ['小学', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
const middleSchoolGradeAliases = ['初中', '七年级', '八年级', '九年级'];

export function getAdminAgentClassificationMode(key: AdminAgentKey): AdminAgentClassificationMode {
  return adminAgentClassificationModes[key];
}

export function getAdminAgentGradeOptions(key: AdminAgentKey): readonly string[] {
  if (key === 'inspiration') {
    return inspirationAgentGradeOptions;
  }

  if (key === 'comment') {
    return commentAgentGradeOptions;
  }

  if (key === 'teaching') {
    return teachingAgentGradeOptions;
  }

  return [];
}

export function normalizeAdminAgentGradeClassification(
  key: AdminAgentKey,
  value: string | null | undefined
): string | null {
  if (getAdminAgentClassificationMode(key) === 'none') {
    return null;
  }

  const grade = value?.trim();

  if (!grade) {
    return null;
  }

  if (elementaryGradeAliases.includes(grade)) {
    return '小学';
  }

  if (middleSchoolGradeAliases.includes(grade)) {
    return '初中';
  }

  return getAdminAgentGradeOptions(key).includes(grade) ? grade : null;
}
