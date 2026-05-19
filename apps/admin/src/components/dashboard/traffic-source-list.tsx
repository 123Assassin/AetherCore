import type { CSSProperties } from 'react';

export type TrafficSourceItem = {
  label: string;
  ratio: number;
  visits: string;
};

type TrafficSourceListProps = {
  items: TrafficSourceItem[];
};

export function TrafficSourceList({ items }: TrafficSourceListProps) {
  return (
    <section aria-label="流量来源 Top 5" style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>流量来源 Top 5</h2>
        <span style={styles.meta}>今日 UV 占比</span>
      </div>
      <ol style={styles.list}>
        {items.map((item) => (
          <li key={item.label} style={styles.item}>
            <div style={styles.itemHeader}>
              <span style={styles.name}>{item.label}</span>
              <span style={styles.value}>{item.visits}</span>
            </div>
            <div aria-hidden="true" style={styles.track}>
              <span style={{ ...styles.bar, width: `${item.ratio}%` }} />
            </div>
            <span style={styles.ratio}>{item.ratio}%</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const styles = {
  bar: {
    background: '#0f766e',
    borderRadius: 999,
    display: 'block',
    height: '100%',
    minWidth: 8,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
  },
  item: {
    display: 'grid',
    gap: 6,
    gridTemplateColumns: 'minmax(0, 1fr) auto',
  },
  itemHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: 10,
    gridColumn: '1 / -1',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  list: {
    display: 'grid',
    gap: 14,
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  },
  name: {
    color: '#172033',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 16,
    padding: 16,
  },
  ratio: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
  },
  title: {
    color: '#172033',
    fontSize: 16,
    lineHeight: '22px',
    margin: 0,
  },
  track: {
    background: '#e2e8f0',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  value: {
    color: '#334155',
    fontSize: 13,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, CSSProperties>;
