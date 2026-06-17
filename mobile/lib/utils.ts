/**
 * 相对时间格式化
 * 今天/昨天/N天前/月日
 */
export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--";
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 0) return "刚刚";
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 相对时间（分钟/小时/日期）
 */
export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--";
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 0) return "刚刚";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 分数对应的颜色 class
 */
export function getScoreColorClass(score: number | null): string {
  if (score === null) return "bg-muted";
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-primary";
  return "bg-destructive";
}
