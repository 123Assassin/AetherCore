import type { AiChatSendResult } from './ai.js';

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

export type TeachingFollowUpInput = {
  sessionId: string;
  message: string;
};

export type TeachingGenerateResult = AiChatSendResult;

export type TeachingFollowUpResult = AiChatSendResult;
