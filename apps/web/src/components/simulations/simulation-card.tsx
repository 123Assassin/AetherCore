import type { SimulationItem } from '@package/shared';
import { Box, ExternalLink, Play } from 'lucide-react';
import type { MouseEvent } from 'react';

import { simulationThumbnailFallbackLabel, simulationUnavailableLabel } from './simulations.data';

type FocusRestoreElement = {
  focus: () => void;
  isConnected?: boolean;
};

type SimulationOpenButtonElement = HTMLButtonElement & FocusRestoreElement;

type SimulationCardProps = {
  description: string;
  item: SimulationItem;
  onOpen: (item: SimulationItem, opener: FocusRestoreElement) => void;
};

export function SimulationCard({ description, item, onOpen }: SimulationCardProps) {
  const canOpen = Boolean(item.src);

  function handleOpen(event: MouseEvent<SimulationOpenButtonElement>) {
    if (canOpen) {
      onOpen(item, event.currentTarget);
    }
  }

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-xl hover:shadow-red-500/5 hover:ring-red-200">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {item.thumbnail ? (
          <img
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={item.thumbnail}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full items-center justify-center text-lg font-extrabold text-slate-400"
          >
            {simulationThumbnailFallbackLabel}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            aria-label={canOpen ? `打开 ${item.name}` : simulationUnavailableLabel}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-red-600 shadow-lg transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!canOpen}
            onClick={handleOpen}
            type="button"
          >
            <Play aria-hidden="true" className="h-4 w-4 fill-current" />
            {canOpen ? '立即开始' : simulationUnavailableLabel}
          </button>
        </div>

        <div className="absolute top-4 left-4 flex gap-2">
          <span className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-red-600 shadow-sm backdrop-blur">
            {item.subject}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h2 className="mb-2 line-clamp-1 text-lg font-bold text-slate-800 transition-colors group-hover:text-red-600">
          {item.name}
        </h2>
        <p className="mb-4 line-clamp-2 flex-1 text-sm text-slate-500">{description}</p>
        <div className="flex items-center justify-between border-t border-slate-50 pt-4">
          <div className="flex gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400"
              title="HTML5 支持"
            >
              <Box aria-hidden="true" className="h-4 w-4" />
            </div>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400"
              title={item.category.name}
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </div>
          </div>
          <div aria-label="适用年级" className="flex -space-x-2">
            {item.grades.length > 0 ? (
              item.grades.map((grade) => (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-400 shadow-sm ring-2 ring-slate-50"
                  key={grade}
                  title={grade}
                >
                  {grade.slice(0, 1)}
                </span>
              ))
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-400 shadow-sm ring-2 ring-slate-50"
                title="全年级"
              >
                全
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
