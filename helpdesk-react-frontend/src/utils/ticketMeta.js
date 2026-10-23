// Shared ticket display helpers used by the agent workspace and customer portal

export const STATUS_META = {
  OPEN:        { label: 'Open',        dot: 'var(--status-open)' },
  IN_PROGRESS: { label: 'In progress', dot: 'var(--status-progress)' },
  RESOLVED:    { label: 'Resolved',    dot: 'var(--status-resolved)' },
  CLOSED:      { label: 'Closed',      dot: 'var(--status-closed)' },
};

// level drives the signal-bar icon (0 = low … 3 = urgent)
export const PRIORITY_META = {
  LOW:    { label: 'Low',    level: 0 },
  MEDIUM: { label: 'Medium', level: 1 },
  HIGH:   { label: 'High',   level: 2 },
  URGENT: { label: 'Urgent', level: 3 },
};

export const AI_FEEDBACK_META = {
  PENDING:  { label: 'AI answered',  agentLabel: 'AI answered · awaiting customer', tone: 'ai' },
  ACCEPTED: { label: 'Solved by AI', agentLabel: 'AI answer accepted',             tone: 'success' },
  REJECTED: { label: 'AI rejected',  agentLabel: 'AI answer rejected by customer', tone: 'danger' },
};

export const SENTIMENT_META = {
  POSITIVE:   { label: 'Positive',   tone: 'success' },
  NEUTRAL:    { label: 'Neutral',    tone: 'neutral' },
  CONCERNED:  { label: 'Concerned',  tone: 'warning' },
  FRUSTRATED: { label: 'Frustrated', tone: 'danger' },
  ANGRY:      { label: 'Angry',      tone: 'danger' },
};

export const getTicketNumber = (ticket) => ticket?.ticketNumber || `HD-${ticket?.id?.slice(0, 8) || 'UNKNOWN'}`;

// "HD-20261022-000118" → "000118" for compact lists
export const getShortTicketNumber = (ticket) => getTicketNumber(ticket).split('-').pop();

export const getInitials = (name) => (name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?');

export const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const formatDate = (d) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });

export const formatDateTime = (d) => new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const timeAgo = (d) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d` : formatDate(d);
};

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export const dayLabel = (d) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

// ── Attachments ─────────────────────────────────────────────

const previewableExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf', 'txt']);

export const getAttachmentExtension = (attachment) => {
  const source = attachment?.fileName || attachment?.fileUrl || '';
  const cleanName = source.split('?')[0].split('#')[0];
  const dotIndex = cleanName.lastIndexOf('.');
  return dotIndex >= 0 ? cleanName.substring(dotIndex + 1).toLowerCase() : '';
};

export const getAttachmentKind = (attachment) => {
  const extension = getAttachmentExtension(attachment);
  if (!previewableExtensions.has(extension)) return 'file';
  if (extension === 'pdf') return 'pdf';
  if (extension === 'txt') return 'text';
  return 'image';
};

export const createPendingAttachment = (file) => ({
  id: crypto.randomUUID(),
  file,
  name: file.name,
  previewUrl: URL.createObjectURL(file),
});
