export const COMMENT_GENDERS = ['男', '女'] as const;
export type CommentGender = (typeof COMMENT_GENDERS)[number];

export const COMMENT_GRADES = [
  '一年级',
  '二年级',
  '三年级',
  '四年级',
  '五年级',
  '六年级',
  '七年级',
  '八年级',
  '九年级',
] as const;
export type CommentGrade = (typeof COMMENT_GRADES)[number];

export const COMMENT_TAGS = [
  '思维活跃',
  '基础扎实',
  '勇于探索',
  '逻辑严密',
  '表达流利',
  '需要辅导',
  '偶尔走神',
  '诚实守信',
  '遵守纪律',
  '责任心强',
  '低碳环保',
  '热心公益',
  '生活简朴',
  '独立自强',
  '乐于分享',
  '团结协作',
  '沟通顺畅',
  '富有同理心',
  '领导力强',
  '善于倾听',
  '活泼开朗',
  '认真',
  '乐于助人',
] as const;
export type CommentTag = (typeof COMMENT_TAGS)[number];

export const DEFAULT_COMMENT_TONE = '温和鼓励';

export type CommentBatchJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CommentBatchRowStatus = 'pending' | 'generating' | 'success' | 'error';

export type CommentSingleGenerateInput = {
  sessionId?: string;
  nickname?: string;
  gender: CommentGender;
  grade: string;
  subject?: string;
  tags: string[];
  keywords?: string;
  tone?: string;
};

export type CommentSingleGenerateResult = {
  sessionId: string;
  comments: string[];
  credit: {
    remaining: number;
  };
};

export type CommentSingleGenerateStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'result'; result: CommentSingleGenerateResult }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string };

export type CommentUploadRowInput = {
  nickname?: string | null;
  gender: CommentGender;
  grade: string;
  subject?: string | null;
  tags: string[];
  keywords?: string | null;
};

export type CommentBatchCreateFromUploadInput = {
  fileName: string;
  fileSize: number;
  contentBase64?: string;
  defaultGrade?: CommentGrade;
  mimeType?: string;
  tone?: string;
  rows?: CommentUploadRowInput[];
  previewRows?: CommentUploadRowInput[];
};

export type CommentBatchJob = {
  id: string;
  status: CommentBatchJobStatus;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  tone: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  estimatedCredits: number;
  createdAt: string;
  updatedAt: string;
};

export type CommentBatchRow = {
  id: string;
  jobId: string;
  rowIndex: number;
  nickname: string | null;
  gender: CommentGender;
  grade: string;
  tags: string[];
  keywords: string | null;
  status: CommentBatchRowStatus;
  comments: string[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommentBatchCreateFromUploadResult = {
  job: CommentBatchJob;
  rowPreviews: CommentBatchRow[];
};

export type CommentBatchGenerateRowInput = {
  jobId: string;
  rowId: string;
};

export type CommentBatchGenerateRowResult = {
  job: CommentBatchJob;
  row: CommentBatchRow;
  credit: {
    remaining: number;
  };
};

export type CommentBatchUpdateRowCommentInput = {
  jobId: string;
  rowId: string;
  comment: string;
};

export type CommentBatchUpdateRowCommentResult = {
  job: CommentBatchJob;
  row: CommentBatchRow;
};

export type CommentBatchGenerateAllInput = {
  jobId: string;
};

export type CommentBatchGenerateAllResult = {
  job: CommentBatchJob;
  rows: CommentBatchRow[];
  credit: {
    remaining: number;
  };
};

export type CommentBatchExportInput = {
  jobId: string;
};

export type CommentBatchExportResult = {
  jobId: string;
  fileName: string;
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  contentBase64: string;
};
