'use client';

import type { CommentSingleGenerateInput } from '@package/shared';
import { useCallback, useState } from 'react';

import { CommentModeTabs } from '../../../../components/comments/comment-mode-tabs';
import { CommentResultList } from '../../../../components/comments/comment-result-list';
import { defaultCommentTone } from '../../../../components/comments/comment-tags.data';
import {
  SingleCommentForm,
  type SingleCommentFormValues,
} from '../../../../components/comments/single-comment-form';
import { useTrpcClient } from '../../../../trpc/provider';

const initialFormValues: SingleCommentFormValues = {
  nickname: '',
  gender: '',
  grade: '',
  tags: [],
  keywords: '',
  tone: defaultCommentTone,
};

function getMutationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '评语生成失败，请稍后重试。';
}

function buildSingleGenerateInput(
  values: SingleCommentFormValues,
  sessionId: string | undefined
): CommentSingleGenerateInput | null {
  if (!values.gender || !values.grade) {
    return null;
  }

  const nickname = values.nickname.trim();
  const keywords = values.keywords.trim();
  const tone = values.tone.trim() || defaultCommentTone;

  return {
    ...(sessionId ? { sessionId } : {}),
    ...(nickname ? { nickname } : {}),
    gender: values.gender,
    grade: values.grade,
    tags: values.tags,
    ...(keywords ? { keywords } : {}),
    tone,
  };
}

export default function OfficeCommentPage() {
  const client = useTrpcClient();
  const [formValues, setFormValues] = useState<SingleCommentFormValues>(initialFormValues);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [comments, setComments] = useState<string[]>([]);
  const [creditRemaining, setCreditRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  const handleFormChange = useCallback(
    (nextValues: SingleCommentFormValues) => {
      setFormValues(nextValues);

      if (formError && nextValues.gender && nextValues.grade) {
        setFormError(null);
      }
    },
    [formError]
  );

  const generateComment = useCallback(
    async (values: SingleCommentFormValues) => {
      const input = buildSingleGenerateInput(values, sessionId);

      if (!input) {
        setFormError('请选择性别和年级。');
        return;
      }

      if (loading) {
        return;
      }

      setLoading(true);
      setFormError(null);
      setResultError(null);

      try {
        const result = await client.comments.single.generate.mutate(input);

        setSessionId(result.sessionId);
        setComments(result.comments);
        setCreditRemaining(result.credit.remaining);
      } catch (mutationError) {
        setResultError(getMutationErrorMessage(mutationError));
      } finally {
        setLoading(false);
      }
    },
    [client, loading, sessionId]
  );

  return (
    <div className="office-comment-page">
      <section aria-label="评语生成设置" className="office-comment-page__controls">
        <CommentModeTabs activeMode="single" />
        <SingleCommentForm
          disabled={loading}
          error={formError}
          onChange={handleFormChange}
          onSubmit={generateComment}
          values={formValues}
        />
      </section>

      <section className="office-comment-page__results">
        {resultError ? (
          <div aria-live="assertive" className="office-comment-page__alert" role="alert">
            {resultError}
          </div>
        ) : null}

        {creditRemaining === null ? null : (
          <div className="office-comment-page__credit" aria-live="polite">
            剩余点数：{creditRemaining}
          </div>
        )}

        <CommentResultList comments={comments} loading={loading} />
      </section>

      <style>{`
        .office-comment-page {
          display: grid;
          min-width: 0;
          flex: 1;
          grid-template-columns: minmax(280px, 390px) minmax(0, 1fr);
          gap: 16px;
        }

        .office-comment-page__controls,
        .office-comment-page__results {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 14px;
        }

        .comment-mode-tabs,
        .single-comment-form,
        .comment-results {
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
        }

        .comment-mode-tabs {
          display: flex;
          gap: 8px;
          padding: 8px;
        }

        .comment-mode-tabs__tab {
          min-height: 36px;
          cursor: pointer;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          background: #ffffff;
          color: #4b5563;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
          padding: 7px 12px;
        }

        .comment-mode-tabs__tab--active {
          border-color: #12645c;
          background: #e3f2ee;
          color: #0f4f47;
        }

        .comment-mode-tabs__tab--disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        .single-comment-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
        }

        .single-comment-form__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .comment-field {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 6px;
        }

        .comment-field__label,
        .student-tag-selector legend {
          color: #374151;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .comment-field__control {
          width: 100%;
          min-height: 38px;
          border: 1px solid #cbd5df;
          border-radius: 6px;
          color: #17202a;
          font: inherit;
          font-size: 14px;
          line-height: 20px;
          padding: 8px 10px;
        }

        .comment-field__textarea {
          min-height: 112px;
          resize: vertical;
        }

        .comment-field__control:focus {
          border-color: #12645c;
          outline: 2px solid rgba(18, 100, 92, 0.18);
          outline-offset: 0;
        }

        .comment-field__control:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .single-comment-form__alert,
        .office-comment-page__alert,
        .comment-results__alert {
          border: 1px solid #f0b8b8;
          border-radius: 6px;
          background: #fff1f1;
          color: #9f1f1f;
          font-size: 13px;
          line-height: 18px;
          padding: 8px 10px;
        }

        .student-tag-selector {
          min-width: 0;
          border: 0;
          margin: 0;
          padding: 0;
        }

        .student-tag-selector__groups {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 8px;
        }

        .student-tag-selector__group {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 7px;
        }

        .student-tag-selector__group p {
          margin: 0;
          color: #5f6b7a;
          font-size: 12px;
          font-weight: 700;
          line-height: 17px;
        }

        .student-tag-selector__options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .student-tag-option {
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          gap: 5px;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          background: #f8fafb;
          color: #374151;
          font-size: 13px;
          line-height: 18px;
          padding: 5px 8px;
        }

        .student-tag-option input {
          width: 14px;
          height: 14px;
          margin: 0;
          accent-color: #12645c;
        }

        .single-comment-form__submit,
        .comment-result-card__copy {
          min-height: 38px;
          cursor: pointer;
          border: 0;
          border-radius: 6px;
          background: #12645c;
          color: #ffffff;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
          padding: 8px 14px;
        }

        .single-comment-form__submit:hover:not(:disabled),
        .comment-result-card__copy:hover {
          background: #0f4f47;
        }

        .single-comment-form__submit:disabled,
        .student-tag-option:has(input:disabled) {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .office-comment-page__credit {
          align-self: flex-end;
          color: #5f6b7a;
          font-size: 13px;
          line-height: 18px;
        }

        .comment-results {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
        }

        .comment-results__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .comment-results__header h2 {
          margin: 0;
          color: #111827;
          font-size: 18px;
          line-height: 26px;
        }

        .comment-results__header p {
          margin: 2px 0 0;
          color: #5f6b7a;
          font-size: 13px;
          line-height: 18px;
        }

        .comment-results__body {
          display: flex;
          min-height: 420px;
          flex: 1;
          flex-direction: column;
          gap: 12px;
        }

        .comment-results__empty {
          display: flex;
          min-height: 320px;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #f8fafb;
          color: #5f6b7a;
          text-align: center;
        }

        .comment-results__empty h3 {
          margin: 0 0 8px;
          color: #17202a;
          font-size: 18px;
          line-height: 26px;
        }

        .comment-results__empty p {
          max-width: 360px;
          margin: 0;
          font-size: 14px;
          line-height: 22px;
        }

        .comment-result-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 10px;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #f8fafb;
          padding: 13px;
        }

        .comment-result-card__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .comment-result-card__top span {
          color: #4b5563;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .comment-result-card__copy {
          min-width: 74px;
          min-height: 34px;
          padding: 7px 12px;
        }

        .comment-result-card p {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          color: #17202a;
          font-size: 15px;
          line-height: 24px;
        }

        @media (max-width: 980px) {
          .office-comment-page {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .single-comment-form__grid {
            grid-template-columns: 1fr;
          }

          .comment-mode-tabs {
            flex-direction: column;
          }

          .comment-mode-tabs__tab {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
