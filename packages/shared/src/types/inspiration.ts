import type { AiChatSendResult, UploadedImageInput } from './ai.js';

export type InspirationGenerateInput = {
  sessionId?: string;
  grade: string;
  subject: string;
  topic: string;
  context?: string;
  uploadedImages?: UploadedImageInput[];
};

export type InspirationFollowUpInput = {
  sessionId: string;
  message: string;
};

export type InspirationGenerateResult = AiChatSendResult;

export type InspirationFollowUpResult = AiChatSendResult;
