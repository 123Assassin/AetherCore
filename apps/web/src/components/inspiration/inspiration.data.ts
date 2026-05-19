export type InspirationFormValues = {
  grade: string;
  subject: string;
  topic: string;
  context: string;
};

export type FeaturedInspirationCase = InspirationFormValues & {
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
    context: '学生已经掌握一次函数，希望通过真实问题理解参数变化。',
    description: '把函数参数和城市交通票价、等待时间联系起来。',
    grade: '高中',
    id: 'function-transport',
    subject: '数学',
    title: '函数与城市交通',
    topic: '一次函数的实际应用',
  },
  {
    context: '班级正在做跨学科阅读，需要兼顾表达训练和科学观察。',
    description: '从校园植物观察切入，生成阅读、记录和表达活动。',
    grade: '初中',
    id: 'plant-observation',
    subject: '语文',
    title: '校园植物观察',
    topic: '观察描写与说明表达',
  },
  {
    context: '学生对抽象实验兴趣不足，希望用低门槛材料组织探究。',
    description: '围绕家用材料设计安全、可讨论的课堂探究。',
    grade: '初中',
    id: 'chemistry-home',
    subject: '化学',
    title: '厨房里的化学',
    topic: '酸碱指示剂',
  },
];
