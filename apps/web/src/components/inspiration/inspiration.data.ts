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

export const gradeOptions = ['小学', '初中', '高中', '大学'] as const;

export const subjectOptions = [
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

export const featuredInspirationCases: FeaturedInspirationCase[] = [
  {
    context: '',
    description: '别再死背公式了！带上摩天轮，30秒看透 sin/cos。',
    grade: '高中',
    icon: '🎡',
    id: 'trigonometric-functions',
    subject: '数学',
    title: '三角函数',
    topic: '三角函数',
  },
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
    description: '磁铁是客人，线圈是主人。用“傲娇规律”破解增反减同。',
    grade: '高中',
    icon: '🧲',
    id: 'lenz-law',
    subject: '物理',
    title: '楞次定律',
    topic: '楞次定律',
  },
];
