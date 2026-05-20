import type { AdminSystemAuditItem } from '@package/shared';
import type { CSSProperties } from 'react';

type AuditLogTableProps = {
  items: AdminSystemAuditItem[];
};

export function AuditLogTable({ items }: AuditLogTableProps) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.headerCell}>时间</th>
            <th style={styles.headerCell}>操作者</th>
            <th style={styles.headerCell}>动作</th>
            <th style={styles.headerCell}>资源</th>
            <th style={styles.headerCell}>IP</th>
            <th style={styles.headerCell}>元数据</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td style={styles.bodyCell}>
                <span style={styles.monoText}>{formatDateTime(item.createdAt)}</span>
              </td>
              <td style={styles.bodyCell}>
                <div style={styles.stack}>
                  <span style={getActorBadgeStyle(item.actorType)}>
                    {actorTypeLabels[item.actorType]}
                  </span>
                  <span style={styles.mutedText}>{item.actorId ?? '无 actorId'}</span>
                </div>
              </td>
              <td style={styles.bodyCell}>
                <strong style={styles.strongText}>{item.action}</strong>
              </td>
              <td style={styles.bodyCell}>
                <div style={styles.stack}>
                  <span style={styles.bodyText}>{item.resourceType ?? '未指定'}</span>
                  <span style={styles.mutedText}>{item.resourceId ?? '无 resourceId'}</span>
                </div>
              </td>
              <td style={styles.bodyCell}>
                <span style={styles.bodyText}>{item.ip ?? '未记录'}</span>
              </td>
              <td style={styles.bodyCell}>
                <span title={formatMetadata(item.metadata)} style={styles.metadataText}>
                  {formatMetadata(item.metadata)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getActorBadgeStyle(actorType: AdminSystemAuditItem['actorType']): CSSProperties {
  if (actorType === 'admin') {
    return styles.adminBadge;
  }

  if (actorType === 'user') {
    return styles.userBadge;
  }

  return styles.systemBadge;
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

function formatMetadata(value: Record<string, unknown> | null): string {
  if (!value) {
    return '无';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '无法显示';
  }
}

const actorTypeLabels: Record<AdminSystemAuditItem['actorType'], string> = {
  admin: '管理员',
  system: '系统',
  user: '用户',
};

const badgeBase = {
  borderRadius: 999,
  display: 'inline-flex',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: '16px',
  padding: '3px 8px',
  whiteSpace: 'nowrap',
} satisfies CSSProperties;

const styles = {
  adminBadge: {
    ...badgeBase,
    background: '#dbeafe',
    color: '#1d4ed8',
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
    whiteSpace: 'nowrap',
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
  metadataText: {
    color: '#475569',
    display: 'block',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
    lineHeight: '18px',
    maxWidth: 300,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  monoText: {
    color: '#475569',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  },
  mutedText: {
    color: '#64748b',
    display: 'block',
    fontSize: 12,
    lineHeight: '16px',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  stack: {
    display: 'grid',
    gap: 4,
    justifyItems: 'start',
  },
  strongText: {
    color: '#172033',
    display: 'block',
    fontSize: 13,
    lineHeight: '18px',
    maxWidth: 240,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  systemBadge: {
    ...badgeBase,
    background: '#f1f5f9',
    color: '#475569',
  },
  table: {
    borderCollapse: 'collapse',
    minWidth: 940,
    tableLayout: 'fixed',
    width: '100%',
  },
  tableWrap: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    overflowX: 'auto',
  },
  userBadge: {
    ...badgeBase,
    background: '#dcfce7',
    color: '#166534',
  },
} satisfies Record<string, CSSProperties>;
