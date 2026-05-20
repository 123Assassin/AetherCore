import type { AdminModelEngineItem } from '@package/shared';
import type { CSSProperties } from 'react';

type EngineTableProps = {
  deletingId: string | null;
  items: AdminModelEngineItem[];
  onDelete: (item: AdminModelEngineItem) => void;
  onEdit: (item: AdminModelEngineItem) => void;
};

export function EngineTable({ deletingId, items, onDelete, onEdit }: EngineTableProps) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.headerCell}>名称</th>
            <th style={styles.headerCell}>Provider</th>
            <th style={styles.headerCell}>Base URL</th>
            <th style={styles.headerCell}>API Key</th>
            <th style={styles.headerCell}>Model</th>
            <th style={styles.headerCell}>状态</th>
            <th style={styles.headerCell}>更新时间</th>
            <th style={styles.actionHeaderCell}>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const enabled = item.status === 'enabled';

            return (
              <tr key={item.id}>
                <td style={styles.bodyCell}>
                  <div style={styles.nameGroup}>
                    <strong style={styles.name}>{item.name}</strong>
                    <span style={styles.idText}>{item.id}</span>
                  </div>
                </td>
                <td style={styles.bodyCell}>
                  <span style={styles.providerBadge}>{providerLabels[item.provider]}</span>
                </td>
                <td style={styles.bodyCell}>
                  <code style={styles.codeText}>{item.apiBaseUrl}</code>
                </td>
                <td style={styles.bodyCell}>
                  <code style={styles.keyText}>{item.apiKeyMasked}</code>
                </td>
                <td style={styles.bodyCell}>
                  <span style={item.modelName ? styles.bodyText : styles.mutedText}>
                    {item.modelName || '未指定'}
                  </span>
                </td>
                <td style={styles.bodyCell}>
                  <span style={enabled ? styles.enabledBadge : styles.disabledBadge}>
                    {enabled ? '启用' : '停用'}
                  </span>
                </td>
                <td style={styles.bodyCell}>
                  <span style={styles.bodyText}>{formatDateTime(item.updatedAt)}</span>
                </td>
                <td style={styles.actionCell}>
                  <div style={styles.actions}>
                    <button
                      onClick={() => onEdit(item)}
                      style={styles.secondaryButton}
                      type="button"
                    >
                      编辑
                    </button>
                    <button
                      disabled={deletingId === item.id}
                      onClick={() => onDelete(item)}
                      style={styles.dangerButton}
                      type="button"
                    >
                      {deletingId === item.id ? '删除中...' : '删除'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const providerLabels: Record<AdminModelEngineItem['provider'], string> = {
  custom: 'Custom',
  gemini: 'Gemini',
  openai: 'OpenAI',
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
  actionCell: {
    borderTop: '1px solid #e5eaf1',
    padding: '12px 14px',
    textAlign: 'right',
    verticalAlign: 'top',
  },
  actionHeaderCell: {
    background: '#f8fafc',
    borderBottom: '1px solid #d8dee8',
    color: '#475569',
    fontSize: 12,
    lineHeight: '16px',
    padding: '10px 14px',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'end',
  },
  bodyCell: {
    borderTop: '1px solid #e5eaf1',
    padding: '12px 14px',
    verticalAlign: 'top',
  },
  bodyText: {
    color: '#172033',
    fontSize: 13,
    lineHeight: '18px',
  },
  codeText: {
    color: '#334155',
    display: 'block',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: '18px',
    maxWidth: 260,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dangerButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #fecaca',
    color: '#b91c1c',
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
  headerCell: {
    background: '#f8fafc',
    borderBottom: '1px solid #d8dee8',
    color: '#475569',
    fontSize: 12,
    lineHeight: '16px',
    padding: '10px 14px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  idText: {
    color: '#64748b',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: '16px',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  keyText: {
    color: '#334155',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  },
  mutedText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: '18px',
  },
  name: {
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
  },
  nameGroup: {
    display: 'grid',
    gap: 4,
    minWidth: 0,
  },
  providerBadge: {
    ...badgeBase,
    background: '#e6f4f1',
    color: '#0f766e',
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  table: {
    borderCollapse: 'collapse',
    minWidth: 980,
    width: '100%',
  },
  tableWrap: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    overflowX: 'auto',
  },
} satisfies Record<string, CSSProperties>;
