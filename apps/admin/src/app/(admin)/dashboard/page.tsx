'use client';

import type { CSSProperties } from 'react';

import { DashboardStatCard } from '../../../components/dashboard/dashboard-stat-card';
import {
  type TrafficSourceItem,
  TrafficSourceList,
} from '../../../components/dashboard/traffic-source-list';

const overviewMetrics = [
  { label: '当前在线用户', tone: 'green', trend: '+12%', value: '1,248' },
  { label: '今日模型 Token 消耗', tone: 'blue', trend: '+8.6%', value: '3.82M' },
  { label: '今日 UV', tone: 'amber', trend: '+5.4%', value: '18,420' },
  { label: '今日 PV', tone: 'slate', trend: '+9.1%', value: '73,908' },
  { label: '平均访问时长', tone: 'green', trend: '+32s', value: '06:42' },
] as const;

const trafficSources: TrafficSourceItem[] = [
  { label: '自然搜索', ratio: 36, visits: '6,631' },
  { label: '课程分享链接', ratio: 24, visits: '4,421' },
  { label: '学校工作台', ratio: 18, visits: '3,316' },
  { label: '直接访问', ratio: 14, visits: '2,579' },
  { label: '活动页入口', ratio: 8, visits: '1,473' },
];

const trendRows = [
  { label: '00:00', pv: '4.8k', tokens: '210k' },
  { label: '06:00', pv: '7.2k', tokens: '460k' },
  { label: '12:00', pv: '25.4k', tokens: '1.46M' },
  { label: '18:00', pv: '36.5k', tokens: '1.69M' },
];

export default function DashboardPage() {
  return (
    <main style={styles.main}>
      <section aria-label="后台概览指标" style={styles.statsGrid}>
        {overviewMetrics.map((metric) => (
          <DashboardStatCard
            key={metric.label}
            label={metric.label}
            tone={metric.tone}
            trend={metric.trend}
            value={metric.value}
          />
        ))}
      </section>

      <section style={styles.contentGrid}>
        <TrafficSourceList items={trafficSources} />

        <section aria-label="趋势预留区" style={styles.trendPanel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>访问与 Token 趋势</h2>
            <span style={styles.panelMeta}>确定性 mock 数据</span>
          </div>
          <div aria-hidden="true" style={styles.trendCanvas}>
            {trendRows.map((row, index) => (
              <span
                key={row.label}
                style={{
                  ...styles.trendBar,
                  height: `${42 + index * 18}px`,
                  left: `${12 + index * 23}%`,
                }}
              />
            ))}
          </div>
          <dl style={styles.trendList}>
            {trendRows.map((row) => (
              <div key={row.label} style={styles.trendItem}>
                <dt style={styles.trendTime}>{row.label}</dt>
                <dd style={styles.trendValue}>PV {row.pv}</dd>
                <dd style={styles.trendValue}>Token {row.tokens}</dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </main>
  );
}

const styles = {
  contentGrid: {
    alignItems: 'start',
    display: 'grid',
    gap: 18,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
  },
  main: {
    display: 'grid',
    gap: 18,
    padding: 24,
  },
  panelHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
  },
  panelMeta: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  },
  panelTitle: {
    color: '#172033',
    fontSize: 16,
    lineHeight: '22px',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 188px), 1fr))',
  },
  trendBar: {
    background: '#0f766e',
    borderRadius: '6px 6px 0 0',
    bottom: 0,
    position: 'absolute',
    width: '13%',
  },
  trendCanvas: {
    background:
      'linear-gradient(180deg, #ffffff 0%, #ffffff 24%, #f1f5f9 24%, #f1f5f9 25%, #ffffff 25%, #ffffff 49%, #f1f5f9 49%, #f1f5f9 50%, #ffffff 50%, #ffffff 74%, #f1f5f9 74%, #f1f5f9 75%, #ffffff 75%)',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    height: 176,
    position: 'relative',
  },
  trendItem: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    display: 'grid',
    gap: 3,
    padding: 10,
  },
  trendList: {
    display: 'grid',
    gap: 10,
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    margin: 0,
  },
  trendPanel: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 16,
    padding: 16,
  },
  trendTime: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
  },
  trendValue: {
    color: '#172033',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;
