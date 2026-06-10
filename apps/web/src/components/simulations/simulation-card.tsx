import type { SimulationItem } from '@package/shared';
import { X } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { useState } from 'react';

import {
  resolveSimulationAppUrl,
  resolveSimulationThumbnailUrl,
} from '../../lib/simulation-assets';
import {
  getSimulationLearningGoals,
  getSimulationSubjectLabels,
  getSimulationTopics,
  simulationFallbackDescription,
  simulationThumbnailFallbackLabel,
  simulationUnavailableLabel,
} from './simulations.data';

type SimulationCardProps = {
  item: SimulationItem;
};

export function SimulationCard({ item }: SimulationCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const thumbnailUrl = resolveSimulationThumbnailUrl(item.thumbnail);
  const simulationUrl = resolveSimulationAppUrl(item.src);
  const subjectLabels = getSimulationSubjectLabels(item);
  const topics = getSimulationTopics(item);
  const learningGoals = getSimulationLearningGoals(item);

  function openDetail() {
    setDetailOpen(true);
  }

  function closeDetail() {
    setDetailOpen(false);
  }

  function stopCardClick(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-xl hover:shadow-red-500/5 hover:ring-red-200">
      <button
        aria-label={`查看 ${item.name} 详情`}
        className="absolute inset-0 z-10 cursor-pointer rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        onClick={openDetail}
        type="button"
      />
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {thumbnailUrl ? (
          <img
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={thumbnailUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full items-center justify-center text-lg font-extrabold text-slate-400"
          >
            {simulationThumbnailFallbackLabel}
          </div>
        )}

        <div className="absolute top-4 left-4 flex max-w-[calc(100%-5rem)] flex-wrap gap-2">
          {subjectLabels.map((subject) => (
            <span
              className="rounded-2xl bg-white/90 px-4 py-2 text-sm font-bold text-red-600 shadow-sm backdrop-blur"
              key={subject}
            >
              {subject}
            </span>
          ))}
        </div>

        <div
          aria-label="适用年级"
          className="pointer-events-none absolute top-4 right-4 z-20 flex -space-x-2"
        >
          {item.grades.length > 0 ? (
            item.grades.map((grade) => (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[10px] font-bold text-slate-500 shadow-sm ring-2 ring-slate-50"
                key={grade}
                title={grade}
              >
                {grade.slice(0, 1)}
              </span>
            ))
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[10px] font-bold text-slate-500 shadow-sm ring-2 ring-slate-50"
              title="全年级"
            >
              全
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h2 className="line-clamp-1 text-lg font-bold text-slate-800 transition-colors group-hover:text-red-600">
          {item.name}
        </h2>
      </div>

      {detailOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onClick={closeDetail}
        >
          <section
            aria-labelledby={`simulation-detail-${item.id}`}
            aria-modal="true"
            className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 text-slate-900 shadow-2xl"
            onClick={stopCardClick}
            role="dialog"
          >
            <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
              {thumbnailUrl ? (
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  src={thumbnailUrl}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-full items-center justify-center text-lg font-extrabold text-slate-400"
                >
                  {simulationThumbnailFallbackLabel}
                </div>
              )}
            </div>

            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.24em] text-red-500 uppercase">
                  实验详情
                </p>
                <h3
                  className="mt-2 text-2xl font-black tracking-tight text-slate-900"
                  id={`simulation-detail-${item.id}`}
                >
                  {item.name}
                </h3>
              </div>
              <button
                aria-label="关闭详情"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                onClick={closeDetail}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                {simulationUrl ? (
                  <a
                    className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700"
                    href={simulationUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    打开仿真程序
                  </a>
                ) : (
                  <button
                    className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500"
                    disabled
                    type="button"
                  >
                    {simulationUnavailableLabel}
                  </button>
                )}
              </div>

              <DetailBlock label="名称">
                <p className="text-base font-semibold text-slate-900">{item.name}</p>
              </DetailBlock>

              <DetailBlock label="标题">
                {topics.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <span
                        className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-600"
                        key={topic}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">暂无标题信息。</p>
                )}
              </DetailBlock>

              <DetailBlock label="学习目标">
                {learningGoals.length > 0 ? (
                  <ul className="space-y-3">
                    {learningGoals.map((goal) => (
                      <li className="flex gap-3 text-sm leading-6 text-slate-600" key={goal}>
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        <span>{goal}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">{simulationFallbackDescription}</p>
                )}
              </DetailBlock>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}

function DetailBlock({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <h4 className="mb-3 text-xs font-black tracking-[0.2em] text-slate-400 uppercase">{label}</h4>
      {children}
    </section>
  );
}
