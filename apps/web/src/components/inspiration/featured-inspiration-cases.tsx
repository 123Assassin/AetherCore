'use client';

import type { FeaturedInspirationCase } from './inspiration.data';

type FeaturedInspirationCasesProps = {
  cases: FeaturedInspirationCase[];
  disabled: boolean;
  onSelect: (item: FeaturedInspirationCase) => void;
};

export function FeaturedInspirationCases({
  cases,
  disabled,
  onSelect,
}: FeaturedInspirationCasesProps) {
  return (
    <section aria-label="精选案例" className="featured-inspiration">
      <div className="featured-inspiration__header">
        <h2>精选案例</h2>
      </div>
      <div className="featured-inspiration__list">
        {cases.map((item) => (
          <button
            aria-label={`使用精选案例：${item.title}`}
            className="featured-inspiration__item"
            disabled={disabled}
            key={item.id}
            onClick={() => onSelect(item)}
            type="button"
          >
            <span className="featured-inspiration__title">{item.title}</span>
            <span className="featured-inspiration__meta">
              {item.grade} · {item.subject} · {item.topic}
            </span>
            <span className="featured-inspiration__description">{item.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
