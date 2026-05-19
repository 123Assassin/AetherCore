import type { AdminAgentItem } from '@package/shared';
import type { CSSProperties } from 'react';

type AgentCardProps = {
  deleting?: boolean;
  engineName: string;
  item: AdminAgentItem;
  onDelete: (item: AdminAgentItem) => void;
  onEdit: (item: AdminAgentItem) => void;
  promptTitle: string;
  sensitiveListName: string;
};

export function AgentCard({
  deleting = false,
  engineName,
  item,
  onDelete,
  onEdit,
  promptTitle,
  sensitiveListName,
}: AgentCardProps) {
  const enabled = item.status === 'enabled';

  return (
    <article style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.titleGroup}>
          <h2 style={styles.name}>{item.name}</h2>
          <p style={styles.meta}>
            {agentKeyLabels[item.key]} / {item.key}
          </p>
        </div>
        <span style={enabled ? styles.enabledBadge : styles.disabledBadge}>
          {enabled ? '启用' : '停用'}
        </span>
      </div>

      <dl style={styles.details}>
        <div style={styles.detailItem}>
          <dt style={styles.detailLabel}>模型引擎</dt>
          <dd style={styles.detailValue}>{engineName}</dd>
        </div>
        <div style={styles.detailItem}>
          <dt style={styles.detailLabel}>Prompt</dt>
          <dd style={item.promptId ? styles.detailValue : styles.mutedValue}>{promptTitle}</dd>
        </div>
        <div style={styles.detailItem}>
          <dt style={styles.detailLabel}>敏感词库</dt>
          <dd style={item.sensitiveListId ? styles.detailValue : styles.mutedValue}>
            {sensitiveListName}
          </dd>
        </div>
        <div style={styles.detailItem}>
          <dt style={styles.detailLabel}>采样参数</dt>
          <dd style={styles.detailValue}>
            T {item.temperature} / TopP {item.topP} / {item.maxTokens}
          </dd>
        </div>
      </dl>

      <div style={styles.footer}>
        <span style={styles.idText}>{item.id}</span>
        <div style={styles.actions}>
          <button onClick={() => onEdit(item)} style={styles.secondaryButton} type="button">
            编辑
          </button>
          <button
            disabled={deleting}
            onClick={() => onDelete(item)}
            style={styles.dangerButton}
            type="button"
          >
            {deleting ? '删除中…' : '删除'}
          </button>
        </div>
      </div>
    </article>
  );
}

const agentKeyLabels: Record<AdminAgentItem['key'], string> = {
  chat: '对话智能体',
  comment: '点评智能体',
  inspiration: '灵感智能体',
  teaching: '教学智能体',
};

const badgeBase = {
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  lineHeight: '16px',
  padding: '3px 8px',
  whiteSpace: 'nowrap',
} satisfies CSSProperties;

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  padding: '7px 11px',
} satisfies CSSProperties;

const styles = {
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'end',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 14,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'start',
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
  },
  dangerButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #fecaca',
    color: '#b91c1c',
  },
  detailItem: {
    display: 'grid',
    gap: 4,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
  },
  details: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(126px, 1fr))',
    margin: 0,
  },
  detailValue: {
    color: '#172033',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  disabledBadge: {
    ...badgeBase,
    background: '#f1f5f9',
    color: '#64748b',
  },
  enabledBadge: {
    ...badgeBase,
    background: '#dcfce7',
    color: '#166534',
  },
  footer: {
    alignItems: 'center',
    borderTop: '1px solid #e5eaf1',
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  idText: {
    color: '#64748b',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: '16px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    color: '#475569',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
  },
  mutedValue: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
  },
  name: {
    color: '#172033',
    fontSize: 16,
    lineHeight: '22px',
    margin: 0,
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  titleGroup: {
    display: 'grid',
    gap: 4,
    minWidth: 0,
  },
} satisfies Record<string, CSSProperties>;
