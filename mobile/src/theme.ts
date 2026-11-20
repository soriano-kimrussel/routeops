export const colors = {
  background: '#f1f5f9',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  primary: '#047857',
  primaryPressed: '#065f46',
  primarySoft: '#d1fae5',
  warning: '#b45309',
  warningSoft: '#fef3c7',
  danger: '#b91c1c',
  dangerSoft: '#fee2e2',
  neutralSoft: '#e2e8f0',
};

export const statusColors = {
  pending: { background: colors.neutralSoft, text: '#334155' },
  completed: { background: colors.primarySoft, text: '#065f46' },
  skipped: { background: colors.warningSoft, text: '#92400e' },
} as const;
