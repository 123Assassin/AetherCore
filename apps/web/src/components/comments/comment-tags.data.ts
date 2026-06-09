import type { CommentGender, CommentGrade, CommentTag } from '@package/shared';

export type CommentTagGroup = {
  label: string;
  tags: CommentTag[];
};

export const commentGenderOptions: CommentGender[] = ['男', '女'];

export const commentGradeOptions: CommentGrade[] = ['小学', '初中'];

export const defaultCommentTone = '温和鼓励';

export const commentTagGroups: CommentTagGroup[] = [
  {
    label: '学习表现',
    tags: [
      '思维活跃',
      '基础扎实',
      '勇于探索',
      '逻辑严密',
      '表达流利',
      '需要辅导',
      '偶尔走神',
      '认真',
    ],
  },
  {
    label: '品德行为',
    tags: ['诚实守信', '遵守纪律', '责任心强', '低碳环保', '热心公益', '生活简朴', '独立自强'],
  },
  {
    label: '社交互动',
    tags: [
      '乐于分享',
      '团结协作',
      '沟通顺畅',
      '富有同理心',
      '领导力强',
      '善于倾听',
      '活泼开朗',
      '乐于助人',
    ],
  },
];
