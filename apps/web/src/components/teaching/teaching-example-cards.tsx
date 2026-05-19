'use client';

import type { TeachingExampleCard } from './teaching.data';

type TeachingExampleCardsProps = {
  disabled: boolean;
  examples: TeachingExampleCard[];
  onSelect: (item: TeachingExampleCard) => void;
};

export function TeachingExampleCards({ disabled, examples, onSelect }: TeachingExampleCardsProps) {
  return (
    <section aria-label="经典案例" className="teaching-examples">
      <div className="teaching-examples__header">
        <h2>经典案例</h2>
      </div>
      <div className="teaching-examples__list">
        {examples.map((item) => (
          <button
            aria-label={`使用经典案例：${item.title}`}
            className="teaching-examples__item"
            disabled={disabled}
            key={item.id}
            onClick={() => onSelect(item)}
            type="button"
          >
            <span className="teaching-examples__title">{item.title}</span>
            <span className="teaching-examples__meta">{item.subject}</span>
            <span className="teaching-examples__description">{item.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
