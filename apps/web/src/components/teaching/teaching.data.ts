export const teachingModes = ['variant', 'knowledge'] as const;

export const teachingVariantLevels = ['similar', 'challenge', 'creative'] as const;

export const teachingKnowledgeLevels = ['foundation', 'application', 'expansion'] as const;

export type TeachingMode = (typeof teachingModes)[number];

export type TeachingVariantLevel = (typeof teachingVariantLevels)[number];

export type TeachingKnowledgeLevel = (typeof teachingKnowledgeLevels)[number];

export type TeachingLevel = TeachingVariantLevel | TeachingKnowledgeLevel;

type TeachingGenerateBaseInput = {
  sessionId?: string;
  subject: string;
  stage: string;
  prompt: string;
};

export type TeachingGenerateInput =
  | (TeachingGenerateBaseInput & {
      mode: 'variant';
      level: TeachingVariantLevel;
    })
  | (TeachingGenerateBaseInput & {
      mode: 'knowledge';
      level: TeachingKnowledgeLevel;
    });

export type TeachingFormValues = {
  subject: string;
  stage: string;
  mode: TeachingMode;
  prompt: string;
  level: TeachingLevel;
};

export type TeachingLevelOption<TLevel extends TeachingLevel = TeachingLevel> = {
  id: TLevel;
  label: string;
  description: string;
};

export type TeachingExampleCard = {
  id: string;
  title: string;
  subject: string;
  description: string;
  content: string;
};

export const teachingSubjectOptions = ['语文', '数学', '英语', '物理', '化学', '生物', '其他'];

export const teachingStageOptions = ['小学', '初中', '高中'];

export const teachingModeOptions: Array<{
  mode: TeachingMode;
  label: string;
}> = [
  { mode: 'variant', label: '原题变式' },
  { mode: 'knowledge', label: '知识点出题' },
];

export const teachingModeCopy: Record<
  TeachingMode,
  {
    inputLabel: string;
    placeholder: string;
    levelLabel: string;
    submitLabel: string;
    loadingLabel: string;
    userMessageLabel: string;
  }
> = {
  knowledge: {
    inputLabel: '输入知识点',
    levelLabel: '选择出题难度',
    loadingLabel: '命题专家思考中...',
    placeholder: '在此输入要考察的知识点，例如“牛顿第二定律”、“定语从句”...',
    submitLabel: '生成原创题',
    userMessageLabel: '考查知识点',
  },
  variant: {
    inputLabel: '置入内容',
    levelLabel: '选择变身力度',
    loadingLabel: '命题专家思考中...',
    placeholder: '在此粘贴原题文字或描述需求...',
    submitLabel: '生成变式题',
    userMessageLabel: '原题内容',
  },
};

export const variantLevelOptions: Array<TeachingLevelOption<TeachingVariantLevel>> = [
  {
    description: '微调数据与表达，保持难度一致',
    id: 'similar',
    label: '同类变式',
  },
  {
    description: '增加复合考点，提升思维深度',
    id: 'challenge',
    label: '难度进阶',
  },
  {
    description: '结合时事、动漫、游戏或生活点滴',
    id: 'creative',
    label: '情境跨界',
  },
];

export const knowledgeLevelOptions: Array<TeachingLevelOption<TeachingKnowledgeLevel>> = [
  {
    description: '立足核心概念，强化记忆与理解',
    id: 'foundation',
    label: '基础巩固',
  },
  {
    description: '结合实际场景，考察应用能力',
    id: 'application',
    label: '综合运用',
  },
  {
    description: '拓展关联知识，适合培优与选拔',
    id: 'expansion',
    label: '拓展拔高',
  },
];

export const teachingExampleCards: TeachingExampleCard[] = [
  {
    content: '在一个直角三角形中，两条直角边的长度分别为3和4，求斜边的长度。',
    description: '从基础长度计算，变身为生活中的梯子安全距离。',
    id: 'pythagorean-ladder',
    subject: '数学',
    title: '数学：勾股定理',
  },
  {
    content: 'I ______ (visit) my grandparents yesterday.',
    description: '将枯燥的语料变身为“假如我在火星”的科幻背景。',
    id: 'english-tense',
    subject: '英语',
    title: '英语：时态填空',
  },
  {
    content: '请赏析《静夜思》中“举头望明月，低头思故乡”所表达的感情。',
    description: '把思乡之情转化为现代“朋友圈”的打卡感悟。',
    id: 'poem-appreciation',
    subject: '语文',
    title: '语文：古诗赏析',
  },
];

export const defaultFollowUpSuggestions = [
  '把情境换成“三体”风格',
  '再出一道填空题形式的',
  '帮我提炼本题考查的核心素养',
  '帮我生成配套的批改评语',
  '把难度再提高两个等级',
];

export function getTeachingLevelOptions(mode: TeachingMode): TeachingLevelOption[] {
  return mode === 'variant' ? variantLevelOptions : knowledgeLevelOptions;
}

export function getDefaultTeachingLevel(mode: 'variant'): TeachingVariantLevel;
export function getDefaultTeachingLevel(mode: 'knowledge'): TeachingKnowledgeLevel;
export function getDefaultTeachingLevel(
  mode: TeachingMode
): TeachingVariantLevel | TeachingKnowledgeLevel;
export function getDefaultTeachingLevel(
  mode: TeachingMode
): TeachingVariantLevel | TeachingKnowledgeLevel {
  return mode === 'variant' ? 'similar' : 'foundation';
}

export function isTeachingLevelValidForMode(
  level: TeachingLevel,
  mode: 'variant'
): level is TeachingVariantLevel;
export function isTeachingLevelValidForMode(
  level: TeachingLevel,
  mode: 'knowledge'
): level is TeachingKnowledgeLevel;
export function isTeachingLevelValidForMode(level: TeachingLevel, mode: TeachingMode): boolean;
export function isTeachingLevelValidForMode(level: TeachingLevel, mode: TeachingMode): boolean {
  return getTeachingLevelOptions(mode).some((option) => option.id === level);
}
