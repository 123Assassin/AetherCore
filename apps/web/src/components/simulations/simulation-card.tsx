import type { SimulationItem } from '@package/shared';
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

  return (
    <article className="simulation-card">
      <div className="simulation-card__media">
        {item.thumbnail ? (
          <img alt="" loading="lazy" referrerPolicy="no-referrer" src={item.thumbnail} />
        ) : (
          <div aria-hidden="true" className="simulation-card__fallback">
            {simulationThumbnailFallbackLabel}
          </div>
        )}
        <span className="simulation-card__subject">{item.subject}</span>
      </div>

      <div className="simulation-card__body">
        <div className="simulation-card__meta">
          <span>{item.category.name}</span>
          <span>{item.grades.length > 0 ? item.grades.join(' / ') : '全年级'}</span>
        </div>
        <h2>{item.name}</h2>
        <p>{description}</p>
      </div>

      <div className="simulation-card__footer">
        <div aria-label="适用年级" className="simulation-card__grades">
          {item.grades.length > 0 ? (
            item.grades.map((grade) => (
              <span key={grade} title={grade}>
                {grade.slice(0, 1)}
              </span>
            ))
          ) : (
            <span title="全年级">全</span>
          )}
        </div>
        <button
          aria-label={canOpen ? `打开 ${item.name}` : simulationUnavailableLabel}
          disabled={!canOpen}
          onClick={(event: MouseEvent<SimulationOpenButtonElement>) =>
            onOpen(item, event.currentTarget)
          }
          type="button"
        >
          {canOpen ? '打开' : simulationUnavailableLabel}
        </button>
      </div>
    </article>
  );
}
