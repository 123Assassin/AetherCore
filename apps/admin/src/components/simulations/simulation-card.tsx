'use client';

import type { SimulationItem } from '@package/shared';
import { GraduationCap, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { resolveSimulationThumbnailUrl } from '../../lib/simulation-assets';
import { getSimulationSubjectLabels } from './simulations.data';

type SimulationCardProps = {
  item: SimulationItem;
  onToggleEnabled: (item: SimulationItem) => void;
  toggling?: boolean;
};

export function SimulationCard({ item, onToggleEnabled, toggling = false }: SimulationCardProps) {
  const enabled = item.isable;
  const grades = item.grades.length > 0 ? item.grades.join(' / ') : '全年级';
  const thumbnailUrl = resolveSimulationThumbnailUrl(item.thumbnail);
  const subjectLabels = getSimulationSubjectLabels(item);

  return (
    <motion.article
      className={`group flex flex-col overflow-hidden rounded-[28px] border bg-white transition-all duration-300 ${
        enabled
          ? 'hover:border-primary/20 border-slate-100 shadow-sm hover:shadow-2xl'
          : 'border-slate-100 opacity-55 grayscale'
      }`}
      layout
    >
      <div className="relative aspect-[1.4/1] overflow-hidden rounded-t-[28px] bg-slate-100">
        {thumbnailUrl ? (
          <img
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={thumbnailUrl}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
            <Zap size={42} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute top-4 left-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
          {subjectLabels.map((subject) => (
            <span
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-1.5 text-[10px] font-black tracking-widest text-slate-900 uppercase shadow-lg backdrop-blur-md"
              key={subject}
            >
              {subject}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div>
          <h4 className="group-hover:text-primary line-clamp-1 text-base font-extrabold text-slate-900 transition-colors">
            {item.name}
          </h4>
          <div className="mt-1.5 flex items-center gap-2">
            <GraduationCap className="text-slate-400" size={12} />
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {grades}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
          <div className="flex items-center gap-3">
            <button
              aria-label={`${enabled ? '停用' : '启用'} ${item.name}`}
              aria-pressed={enabled}
              className={`relative h-6 w-11 rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                enabled ? 'bg-primary shadow-primary/20 shadow-lg' : 'bg-slate-200'
              }`}
              disabled={toggling}
              onClick={() => onToggleEnabled(item)}
              type="button"
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                  enabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
            <span
              className={`text-[10px] font-black tracking-widest uppercase ${
                enabled ? 'text-primary' : 'text-slate-400'
              }`}
            >
              {toggling ? '更新中' : enabled ? '已启用' : '已禁用'}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
