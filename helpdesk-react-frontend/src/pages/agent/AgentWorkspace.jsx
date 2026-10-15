import React, { useState, useEffect, useRef } from 'react';
import { api, useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  Loader2, PanelLeftClose, PanelLeftOpen, PanelRightClose, 
  PanelRightOpen, Maximize2, Minimize2, GripVertical, 
  ChevronDown, ChevronUp, RefreshCw 
} from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import SLAIndicator from '../../components/SLAIndicator';
import ConfirmModal from '../../components/ConfirmModal';
import ImageMarkupEditor from '../../components/ImageMarkupEditor';
import FormattedMessage from '../../components/FormattedMessage';

const DEFAULT_WORKSPACE_LAYOUT = {
  leftWidth: 320,
  rightWidth: 320,
  leftCollapsed: false,
  rightCollapsed: false,
  middleMaximized: false,
  summaryCollapsed: false,
  linkedCollapsed: false,
};

const statusConfig = {
  OPEN:        { label: 'Open',        color: 'var(--status-open)', bg: 'var(--status-open-bg)' },
  IN_PROGRESS: { label: 'In Progress', color: 'var(--status-progress)', bg: 'var(--status-progress-bg)' },
  RESOLVED:    { label: 'Resolved',    color: 'var(--status-resolved)', bg: 'var(--status-resolved-bg)' },
  CLOSED:      { label: 'Closed',      color: 'var(--status-closed)', bg: 'var(--status-closed-bg)' },
};

const priorityConfig = {
  URGENT: { label: 'Urgent', color: 'var(--priority-urgent)', bg: 'var(--priority-urgent-bg)', border: 'var(--priority-urgent-border)' },
  HIGH:   { label: 'High',   color: 'var(--priority-high)', bg: 'var(--priority-high-bg)', border: 'var(--priority-high-border)' },
  MEDIUM: { label: 'Medium', color: 'var(--priority-medium)', bg: 'var(--priority-medium-bg)', border: 'var(--priority-medium-border)' },
  LOW:    { label: 'Low',    color: 'var(--priority-low)', bg: 'var(--priority-low-bg)', border: 'var(--priority-low-border)' },
};

const previewableExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf', 'txt']);
const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?';
const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatDate = (d) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
const getTicketNumber = (ticket) => ticket?.ticketNumber || `HD-${ticket?.id?.slice(0, 8) || 'UNKNOWN'}`;

const getAttachmentExtension = (attachment) => {
  const source = attachment?.fileName || attachment?.fileUrl || '';
  const cleanName = source.split('?')[0].split('#')[0];
  const dotIndex = cleanName.lastIndexOf('.');
  return dotIndex >= 0 ? cleanName.substring(dotIndex + 1).toLowerCase() : '';
};

const getAttachmentKind = (attachment) => {
  const extension = getAttachmentExtension(attachment);
  if (!previewableExtensions.has(extension)) return 'file';
  if (extension === 'pdf') return 'pdf';
  if (extension === 'txt') return 'text';
  return 'image';
};

const createPendingAttachment = (file) => ({
  id: crypto.randomUUID(),
  file,
  name: file.name,
  previewUrl: URL.createObjectURL(file),
});

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.OPEN;
  return (
    <span className="status-badge" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const AgentWorkspace = ({ activeTab }) => {
  const { user } = useAuth();
  const { subscribeToTicket, addToast } = useNotifications();

  // Layout preferences persisted in localStorage
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem('aegis_agent_workspace_layout_v1');
      return saved ? { ...DEFAULT_WORKSPACE_LAYOUT, ...JSON.parse(saved) } : DEFAULT_WORKSPACE_LAYOUT;
    } catch {
      return DEFAULT_WORKSPACE_LAYOUT;
    }
  });

  const updateLayout = (updater) => {
    setLayout(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try {
        localStorage.setItem('aegis_agent_workspace_layout_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [resizing, setResizing] = useState(null); // 'left' | 'right' | null

  const startResize = (type, e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(type);
    const startX = e.clientX;
    const startLeft = layout.leftWidth;
    const startRight = layout.rightWidth;

    const onMouseMove = (moveEvt) => {
      moveEvt.preventDefault();
      if (type === 'left') {
        const delta = moveEvt.clientX - startX;
        const newW = Math.max(200, Math.min(540, startLeft + delta));
        updateLayout(p => ({ ...p, leftWidth: newW, leftCollapsed: false, middleMaximized: false }));
      } else if (type === 'right') {
        const delta = startX - moveEvt.clientX;
        const newW = Math.max(220, Math.min(560, startRight + delta));
        updateLayout(p => ({ ...p, rightWidth: newW, rightCollapsed: false, middleMaximized: false }));
      }
    };

    const onMouseUp = () => {
      setResizing(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const isLeftCollapsed = layout.leftCollapsed || layout.middleMaximized;
  const isRightCollapsed = layout.rightCollapsed || layout.middleMaximized;


  const [tickets, setTickets]           = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [queueFilter, setQueueFilter]   = useState('my');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [ticketSearch, setTicketSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [replies, setReplies]           = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyMsg, setReplyMsg]         = useState('');
  const [isInternal, setIsInternal]     = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [updatingTicket, setUpdatingTicket] = useState(false);

  const [aiSummary, setAiSummary]       = useState('');
  const [summarizing, setSummarizing]   = useState(false);
  const [aiDraft, setAiDraft]           = useState('');
  const [drafting, setDrafting]         = useState(false);

  const [linkedTickets, setLinkedTickets] = useState([]);
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linking, setLinking]           = useState(false);
  const [linkSearch, setLinkSearch]     = useState('');
  const [linkResults, setLinkResults]   = useState([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);
  const [selectedLinkTicket, setSelectedLinkTicket] = useState(null);

  const [draftArticles, setDraftArticles] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [newDraftTitle, setNewDraftTitle] = useState('');
  const [newDraftContent, setNewDraftContent] = useState('');
  const [newDraftCategory, setNewDraftCategory] = useState('');
  const [categories, setCategories]     = useState([]);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState(null);
  const [editingImageMode, setEditingImageMode] = useState('compose');
  const [editingImageTitle, setEditingImageTitle] = useState('Edit image before sending');
  const [previewEditFile, setPreviewEditFile] = useState(null);
  const [selectedTicketSla, setSelectedTicketSla] = useState(null);
  const [loadingSla, setLoadingSla] = useState(false);

  // Ticket Reassignment Request States
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignCategory, setReassignCategory] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const openConfirm = (opts) => setConfirmModal({ open: true, ...opts });
  const closeConfirm = () => setConfirmModal({ open: false });

  const fetchSlaStatus = async (ticketId) => {
    if (!ticketId) return;
    setLoadingSla(true);
    try {
      const res = await api.get(`/api/tickets/${ticketId}/sla`);
      setSelectedTicketSla(res.data);
    } catch (err) {
      console.error("Failed to fetch ticket SLA status", err);
      setSelectedTicketSla(null);
    } finally {
      setLoadingSla(false);
    }
  };

  const chatEndRef = useRef(null);
  const replyFileRef = useRef(null);
  const previewFileCacheRef = useRef(new Map());
  const replyMsgRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'queue')     { fetchQueue(); loadCategories(); }
    if (activeTab === 'kb-drafts') { fetchDraftArticles(); loadCategories(); }
  }, [activeTab, queueFilter, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    if (activeTab !== 'queue') return;
    const timer = setTimeout(fetchQueue, 300);
    return () => clearTimeout(timer);
  }, [ticketSearch]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies]);

  useEffect(() => {
    if (replyMsgRef.current) {
      replyMsgRef.current.style.height = 'auto';
      replyMsgRef.current.style.height = `${replyMsgRef.current.scrollHeight}px`;
    }
  }, [replyMsg]);

  useEffect(() => {
    if (!selectedTicket?.id) return;
    const ticketId = selectedTicket.id;
    const unsub = subscribeToTicket(ticketId, (msg) => {
      console.log('Agent Workspace: Received WebSocket message for ticket ' + ticketId, msg);
      setReplies(prev => prev.some(r => r.id && msg.id && r.id.toString().toLowerCase() === msg.id.toString().toLowerCase()) ? prev : [...prev, msg]);
      reloadTicket(ticketId);
    });
    return () => unsub?.();
  }, [selectedTicket?.id]);

  const fetchQueue = async () => {
    setTicketsLoading(true);
    try {
      let endpoint = queueFilter === 'my' ? '/api/tickets/assigned' : '/api/tickets';
      const params = { page: 0, size: 100 };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (ticketSearch) params.q = ticketSearch;
      const res = await api.get(endpoint, { params });
      let results = res.data?.content || [];
      if (queueFilter === 'unassigned') results = results.filter(t => !t.assignedToId);
      setTickets(results);

      // Auto-restore selected ticket on page refresh
      const savedTicketId = localStorage.getItem('helpdesk_selected_agent_ticket_id');
      if (savedTicketId) {
        const found = results.find(t => t.id === savedTicketId);
        if (found) {
          selectTicketForWorkspace(found);
        } else {
          try {
            const ticketRes = await api.get(`/api/tickets/${savedTicketId}`);
            if (ticketRes.data) {
              selectTicketForWorkspace(ticketRes.data);
            }
          } catch {
            localStorage.removeItem('helpdesk_selected_agent_ticket_id');
          }
        }
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        addToast('You do not have permission to view this queue.', 'Access Denied', 'error');
      } else {
        addToast('Failed to load queue.', 'Error', 'error');
      }
    }
    finally { setTicketsLoading(false); }
  };

  const selectTicketForWorkspace = async (ticket) => {
    setSelectedTicket(ticket);
    localStorage.setItem('helpdesk_selected_agent_ticket_id', ticket.id);
    setReplyMsg('');
    setIsInternal(false);
    clearReplyAttachments();
    if (replyMsgRef.current) replyMsgRef.current.style.height = 'auto';
    setReplies([]); setRepliesLoading(true);
    setAiSummary(''); setAiDraft('');
    setLinkedTickets([]); setLinkTargetId('');
    setTicketAttachments([]);
    fetchSlaStatus(ticket.id);
    try {
      const repRes = await api.get(`/api/tickets/${ticket.id}/replies`);
      setReplies(repRes.data || []);
      try {
        const attRes = await api.get(`/api/tickets/${ticket.id}/attachments`);
        setTicketAttachments(attRes.data || []);
      } catch {}
      fetchLinkedTickets(ticket.id);
    } catch {}
    finally { setRepliesLoading(false); }
  };

  const fetchUrlAsFile = async (attachmentId, fallbackName, fallbackUrl) => {
    const cacheKey = attachmentId || fallbackUrl;
    const cachedFile = previewFileCacheRef.current.get(cacheKey);
    if (cachedFile) return cachedFile;

    const response = await api.get(`/api/tickets/attachments/${attachmentId}/content`, { responseType: 'blob' });
    if (response.status < 200 || response.status >= 300) {
      throw new Error('Failed to load attachment');
    }

    const blob = response.data;
    const fileName = fallbackName || fallbackUrl?.split('/').pop()?.split('?')[0] || 'image.png';
    let mimeType = blob.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
        mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      }
    }
    const file = new File([blob], fileName, { type: mimeType || 'image/png' });
    previewFileCacheRef.current.set(cacheKey, file);
    return file;
  };

  const addReplyAttachments = (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    setReplyAttachments((prev) => [...prev, ...files.map(createPendingAttachment)]);
  };

  const removeReplyAttachment = (attachmentId) => {
    setReplyAttachments((prev) => {
      const target = prev.find((item) => item.id === attachmentId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== attachmentId);
    });
  };

  const clearReplyAttachments = () => {
    setReplyAttachments((prev) => {
      prev.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const updateReplyAttachmentFile = (attachmentId, file) => {
    setReplyAttachments((prev) => prev.map((item) => {
      if (item.id !== attachmentId) return item;
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return {
        ...item,
        file,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      };
    }));
  };

  const openImageEditor = (attachmentId, mode = 'compose', title = 'Edit image before sending') => {
    setEditingAttachmentId(attachmentId);
    setEditingImageMode(mode);
    setEditingImageTitle(title);
    setImageEditorOpen(true);
  };

  const closeImageEditor = () => {
    setImageEditorOpen(false);
    setEditingAttachmentId(null);
    setPreviewEditFile(null);
    if (editingImageMode === 'resend') {
      clearReplyAttachments();
    }
    setEditingImageMode('compose');
    setEditingImageTitle('Edit image before sending');
  };

  const handleEditedImage = (blob, fileName) => {
    if (editingImageMode === 'resend') {
      const outgoingFile = new File([blob], fileName || 'edited-image.png', { type: blob.type || 'image/png' });
      const outgoingItem = { id: crypto.randomUUID(), file: outgoingFile, name: outgoingFile.name };
      sendReplyRequest('', [outgoingItem], false)
        .then((res) => {
          setReplies(prev => prev.some(r => r.id && res.data.id && r.id.toString().toLowerCase() === res.data.id.toString().toLowerCase()) ? prev : [...prev, res.data]);
          reloadTicket(selectedTicket.id);
        })
        .catch(() => addToast('Failed to send edited image.', 'Error', 'error'))
        .finally(() => closeImageEditor());
      return;
    }

    const target = replyAttachments.find((item) => item.id === editingAttachmentId);
    if (!target) return;
    const editedFile = new File([blob], fileName || target.name, { type: blob.type || 'image/png' });
    updateReplyAttachmentFile(target.id, editedFile);
    closeImageEditor();
  };

  const sendReplyRequest = async (message, items = replyAttachments, internalOverride = isInternal) => {
    if (items.length > 0) {
      const formData = new FormData();
      formData.append('message', message ?? '');
      formData.append('isInternal', String(internalOverride));
      items.forEach((item) => formData.append('files', item.file, item.name));
      return api.post(`/api/tickets/${selectedTicket.id}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    return api.post(`/api/tickets/${selectedTicket.id}/replies`, { message, isInternal });
  };

  const openAttachmentPreview = (attachment) => {
    const kind = getAttachmentKind(attachment);
    if (kind === 'file') {
      window.open(attachment.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setAttachmentPreview({ ...attachment, kind });
  };

  const openImageEditFromPreview = async () => {
    if (!attachmentPreview || attachmentPreview.kind !== 'image') return;
    try {
      const file = await fetchUrlAsFile(attachmentPreview.id, attachmentPreview.fileName, attachmentPreview.fileUrl);
      setPreviewEditFile(file);
      setEditingAttachmentId(null);
      setEditingImageMode('resend');
      setEditingImageTitle('Edit received image');
      setImageEditorOpen(true);
      setAttachmentPreview(null);
    } catch {
      addToast('Could not open the image for editing.', 'Error', 'error');
    }
  };

  const closeAttachmentPreview = () => setAttachmentPreview(null);

  const reloadTicket = async (id) => {
    try {
      const res = await api.get(`/api/tickets/${id}`);
      const refreshed = res.data;
      // If we're in "my" queue and the ticket is no longer assigned to us, remove it
      if (queueFilter === 'my' && refreshed.assignedToId && refreshed.assignedToId !== user?.userId) {
        setTickets(prev => prev.filter(t => t.id !== id));
        setSelectedTicket(prev => (prev?.id === id ? null : prev));
        localStorage.removeItem('helpdesk_selected_agent_ticket_id');
        addToast('This ticket has been reassigned to another agent.', 'Ticket Reassigned', 'info');
        return;
      }
      // Also remove from "my" queue if assignedTo is now null (unassigned)
      if (queueFilter === 'my' && !refreshed.assignedToId) {
        setTickets(prev => prev.filter(t => t.id !== id));
        setSelectedTicket(prev => (prev?.id === id ? null : prev));
        localStorage.removeItem('helpdesk_selected_agent_ticket_id');
        addToast('This ticket is now unassigned.', 'Ticket Unassigned', 'info');
        return;
      }
      setSelectedTicket(refreshed);
      setTickets(prev => prev.map(t => t.id === id ? refreshed : t));
      fetchSlaStatus(id);
    } catch {}
  };

  const updateTicketProperties = async (updates) => {
    if (!selectedTicket) return;
    setUpdatingTicket(true);
    try {
      const res = await api.patch(`/api/tickets/${selectedTicket.id}`, updates);
      const updated = res.data;
      const ticketId = selectedTicket.id;
      // If we're in "my" queue and the ticket is reassigned away from us, remove it
      if (queueFilter === 'my' && updated.assignedToId && updated.assignedToId !== user?.userId) {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        setSelectedTicket(null);
        localStorage.removeItem('helpdesk_selected_agent_ticket_id');
        addToast('Ticket reassigned — removed from your queue.', 'Reassigned', 'info');
        return;
      }
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => t.id === ticketId ? updated : t));
      addToast('Ticket updated.', 'Updated', 'success');
      fetchSlaStatus(ticketId);
      const repRes = await api.get(`/api/tickets/${ticketId}/replies`);
      setReplies(repRes.data || []);
    } catch { addToast('Failed to update ticket.', 'Error', 'error'); }
    finally { setUpdatingTicket(false); }
  };

  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTicket || (!replyMsg.trim() && replyAttachments.length === 0)) return;

    const outgoingMsg = replyMsg;
    const outgoingAttachments = [...replyAttachments];

    // Optimistically clear the message box immediately for instantaneous user feedback
    setReplyMsg('');
    setIsInternal(false);
    clearReplyAttachments();
    if (replyMsgRef.current) {
      replyMsgRef.current.style.height = 'auto';
    }

    setSendingReply(true);
    try {
      const res = await sendReplyRequest(outgoingMsg, outgoingAttachments);
      if (res?.data) {
        setReplies(prev => prev.some(r => r.id && res.data.id && r.id.toString().toLowerCase() === res.data.id.toString().toLowerCase()) ? prev : [...prev, res.data]);
      }
      reloadTicket(selectedTicket.id);
    } catch {
      // Restore on failure so agent does not lose input
      setReplyMsg(outgoingMsg);
      setReplyAttachments(outgoingAttachments);
      addToast('Failed to send reply.', 'Error', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSummarizeThread = async () => {
    if (!selectedTicket) return;
    setSummarizing(true); setAiSummary('');
    const retryTimer = setTimeout(() => addToast('AI rate limited — retrying with backoff...', 'AI Retry', 'info'), 3000);
    try {
      const res = await api.get(`/api/ai/summarize/${selectedTicket.id}`);
      clearTimeout(retryTimer);
      setAiSummary(res.data?.summary || 'No summary returned.');
    } catch {
      clearTimeout(retryTimer);
      addToast('Could not compile summary.', 'AI Error', 'error');
    }
    finally { setSummarizing(false); }
  };

  const handleGenerateDraft = async () => {
    if (!selectedTicket) return;
    setDrafting(true); setAiDraft('');
    const retryTimer = setTimeout(() => addToast('AI rate limited — retrying with backoff...', 'AI Retry', 'info'), 3000);
    try {
      const res = await api.get(`/api/ai/draft/${selectedTicket.id}`);
      clearTimeout(retryTimer);
      const draft = res.data?.draft || 'No draft generated.';
      setAiDraft(draft);
    } catch {
      clearTimeout(retryTimer);
      addToast('Could not generate AI draft.', 'AI Error', 'error');
    }
    finally { setDrafting(false); }
  };

  const fetchLinkedTickets = async (id) => {
    try {
      const res = await api.get(`/api/tickets/${id}/linked`);
      setLinkedTickets(res.data || []);
    } catch {}
  };

  const searchTicketsForLink = async (query) => {
    if (!query || query.trim().length < 2) { setLinkResults([]); setShowLinkDropdown(false); return; }
    setLinkSearching(true);
    try {
      const res = await api.get('/api/tickets/search', { params: { q: query.trim(), page: 0, size: 15 } });
      const all = res.data?.content || [];
      const alreadyLinkedIds = new Set(linkedTickets.map(lt => lt.id));
      const filtered = all.filter(t => t.id !== selectedTicket?.id && !alreadyLinkedIds.has(t.id));
      setLinkResults(filtered);
      setShowLinkDropdown(true);
    } catch { setLinkResults([]); setShowLinkDropdown(false); }
    finally { setLinkSearching(false); }
  };

  const handleLinkTicket = async (e) => {
    e.preventDefault();
    const targetId = selectedLinkTicket?.id || linkTargetId.trim();
    if (!selectedTicket || !targetId) return;
    setLinking(true);
    try {
      await api.post(`/api/tickets/${selectedTicket.id}/link/${targetId}`);
      addToast('Tickets linked.', 'Linked', 'success');
      setLinkTargetId(''); setLinkSearch(''); setSelectedLinkTicket(null); setLinkResults([]); setShowLinkDropdown(false);
      fetchLinkedTickets(selectedTicket.id);
    } catch { addToast('Could not link tickets.', 'Error', 'error'); }
    finally { setLinking(false); }
  };

  const handleUnlinkTicket = async (targetId) => {
    if (!selectedTicket) return;
    try {
      await api.delete(`/api/tickets/${selectedTicket.id}/link/${targetId}`);
      fetchLinkedTickets(selectedTicket.id);
    } catch {}
  };

  const handleBulkResolve = async () => {
    if (!selectedTicket) return;
    try {
      await api.post(`/api/tickets/${selectedTicket.id}/resolve-all-linked`);
      addToast('Bulk resolve complete.', 'Done', 'success');
      reloadTicket(selectedTicket.id);
      fetchLinkedTickets(selectedTicket.id);
    } catch { addToast('Bulk resolve failed.', 'Error', 'error'); }
  };

  const handleCreateKbFromTicket = async () => {
    if (!selectedTicket) return;
    try {
      await api.post(`/api/knowledge/from-ticket/${selectedTicket.id}`);
      addToast('KB draft created.', 'Success', 'success');
    } catch { addToast('Failed to create KB draft.', 'Error', 'error'); }
  };

  const fetchDraftArticles = async () => {
    setDraftsLoading(true);
    try {
      const res = await api.get('/api/knowledge/my');
      setDraftArticles(res.data || []);
    } catch {}
    finally { setDraftsLoading(false); }
  };

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/admin/categories');
      setCategories(res.data || []);
    } catch {}
  };

  const handleCreateDraft = async (e) => {
    e.preventDefault();
    if (!newDraftTitle.trim() || !newDraftContent.trim()) return;
    setSubmittingDraft(true);
    try {
      await api.post('/api/knowledge', { title: newDraftTitle, content: newDraftContent, categoryId: newDraftCategory || null });
      addToast('KB draft saved.', 'Saved', 'success');
      setNewDraftTitle(''); setNewDraftContent(''); setNewDraftCategory('');
      fetchDraftArticles();
    } catch { addToast('Failed to create draft.', 'Error', 'error'); }
    finally { setSubmittingDraft(false); }
  };

  const handleDeleteDraft = (id) => {
    openConfirm({
      title: 'Delete KB Draft?',
      message: 'This will permanently delete this knowledge base draft. This action cannot be undone.',
      confirmText: 'Delete Draft',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/api/knowledge/${id}`);
          addToast('KB draft deleted.', 'Deleted', 'success');
          fetchDraftArticles();
        } catch { addToast('Failed to delete KB draft.', 'Error', 'error'); }
      },
    });
  };

  const handleReassignRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !reassignReason.trim()) return;
    setSubmittingReassign(true);
    try {
      const payload = {
        targetCategoryId: reassignCategory || null,
        reason: reassignReason.trim()
      };
      await api.post(`/api/tickets/${selectedTicket.id}/reassign-request`, payload);
      addToast('Reassignment request submitted successfully.', 'Request Submitted', 'success');
      setShowReassignModal(false);
      setReassignCategory('');
      setReassignReason('');
      reloadTicket(selectedTicket.id);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit reassignment request.';
      addToast(msg, 'Error', 'error');
    } finally {
      setSubmittingReassign(false);
    }
  };

  const queueFilters = ['my', 'unassigned', 'all'];

  return (
    <div className="h-full w-full overflow-hidden flex flex-col p-md md:p-lg bg-background text-on-surface">

      {/* ── QUEUE TAB ─────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div 
          className="flex-1 flex gap-2 h-full overflow-hidden anim-fade-in relative"
          style={{ userSelect: resizing ? 'none' : 'auto' }}
        >

          {/* ── PANEL 1: TICKET QUEUE ──────────────────────────────────── */}
          {isLeftCollapsed ? (
            <div 
              className="w-12 shrink-0 bg-surface-container-low border border-outline-variant/30 rounded-xl flex flex-col items-center py-3 overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => updateLayout({ leftCollapsed: false, middleMaximized: false })}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                title="Expand Ticket Queue"
              >
                <PanelLeftOpen size={16} />
              </button>
              <div className="my-2.5 w-6 border-b border-outline-variant/30" />
              
              <button 
                onClick={fetchQueue} 
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors mb-2"
                title="Refresh queue"
              >
                <RefreshCw size={13} />
              </button>

              {/* Quick queue count pill */}
              <div 
                onClick={() => updateLayout({ leftCollapsed: false, middleMaximized: false })}
                className="flex flex-col items-center gap-1 cursor-pointer group px-1 text-center"
                title={`Active queue: ${queueFilter.toUpperCase()} (${tickets.length} tickets)`}
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary">confirmation_number</span>
                <span className="text-[10px] font-bold px-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {tickets.length}
                </span>
              </div>

              <div className="my-2 w-6 border-b border-outline-variant/30" />

              {/* Slim ticket dots */}
              <div className="flex flex-col items-center gap-2 overflow-y-auto flex-1 w-full px-1">
                {tickets.slice(0, 15).map(t => {
                  const isSelected = selectedTicket?.id === t.id;
                  const statusCol = statusConfig[t.status]?.color || 'var(--primary)';
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        selectTicketForWorkspace(t);
                      }}
                      className="relative cursor-pointer group p-1"
                      title={`${getTicketNumber(t)}: ${t.title}`}
                    >
                      <div 
                        className={`w-3 h-3 rounded-full transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'hover:scale-125 opacity-70 hover:opacity-100'}`}
                        style={{ background: statusCol }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div 
              className="shrink-0 flex flex-col bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden h-full transition-all"
              style={{
                width: `${layout.leftWidth}px`,
                transition: resizing === 'left' ? 'none' : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div className="p-4 space-y-3 border-b border-outline-variant/30 bg-surface-container-high/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Ticket Queue</span>
                  <div className="flex items-center gap-1">
                    <button onClick={fetchQueue} className="p-1 rounded-md text-on-surface-variant hover:text-primary cursor-pointer transition-colors" title="Refresh queue">
                      <span className="material-symbols-outlined text-[18px]">refresh</span>
                    </button>
                    <button 
                      onClick={() => updateLayout({ leftCollapsed: true })} 
                      className="p-1 rounded-md text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors"
                      title="Collapse Ticket Queue"
                    >
                      <PanelLeftClose size={14} />
                    </button>
                  </div>
                </div>

                {/* Toggle filters */}
                <div className="flex p-0.5 gap-0.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                  {queueFilters.map(f => (
                    <button 
                      key={f} 
                      onClick={() => setQueueFilter(f)}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-bold capitalize cursor-pointer transition-all ${
                        queueFilter === f 
                          ? 'bg-primary text-surface-container-lowest shadow-sm' 
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <CustomSelect
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'OPEN', label: 'Open' },
                    { value: 'IN_PROGRESS', label: 'In Progress' },
                    { value: 'RESOLVED', label: 'Resolved' },
                    { value: 'CLOSED', label: 'Closed' }
                  ]}
                  value={statusFilter}
                  onChange={val => setStatusFilter(val)}
                  placeholder="All Statuses"
                  triggerClassName="pl-3 pr-8 py-1.5 text-xs"
                />

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/50">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">search</span>
                  <input
                    className="flex-1 bg-transparent outline-none text-[11px] text-on-surface placeholder:text-on-surface-variant/50"
                    placeholder="Search ID, title, customer..."
                    value={ticketSearch}
                    onChange={e => setTicketSearch(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <CustomSelect
                    options={[{ value: '', label: 'All Priorities' }, ...Object.entries(priorityConfig).map(([value, cfg]) => ({ value, label: cfg.label }))]}
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                    triggerClassName="pl-3 pr-8 py-1.5 text-[10px]"
                  />
                  <CustomSelect
                    options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    triggerClassName="pl-3 pr-8 py-1.5 text-[10px]"
                  />
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-2 space-y-1 bg-surface-container-lowest/30">
                {ticketsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-on-surface-variant">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span className="text-xs">Loading queue...</span>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[32px] opacity-40 mb-1">inbox</span>
                    <p className="text-xs">No tickets in this queue</p>
                  </div>
                ) : (
                  tickets.map(t => {
                    const isActive = selectedTicket?.id === t.id;
                    const priorityColors = {
                      URGENT: 'bg-error',
                      HIGH: 'bg-error',
                      MEDIUM: 'bg-primary',
                      LOW: 'bg-secondary',
                    };
                    const pColor = priorityColors[t.priority] || 'bg-primary';

                    return (
                      <div 
                        key={t.id} 
                        onClick={() => selectTicketForWorkspace(t)}
                        className={`flex gap-2.5 p-3 rounded-lg cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-primary-container/10 border border-primary/30' 
                            : 'border border-transparent hover:bg-surface-container'
                        }`}
                      >
                        <div className={`w-0.5 rounded-full shrink-0 ${pColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <StatusBadge status={t.status} />
                            <span className="text-[9px] font-mono text-primary">{getTicketNumber(t)}</span>
                          </div>
                          <p className="text-xs font-semibold text-on-surface truncate mb-0.5">{t.title}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">
                            {t.createdByName || 'Unknown Client'} · {t.priority}
                          </p>
                          <div className="mt-1">
                            <SLAIndicator ticket={t} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── SPLITTER 1: Between Left and Middle ────────────────────── */}
          {!isLeftCollapsed && (
            <div
              onMouseDown={(e) => startResize('left', e)}
              onDoubleClick={() => updateLayout({ leftWidth: 320 })}
              title="Drag to resize Ticket Queue (Double-click to reset 320px)"
              className="group relative w-1.5 flex items-center justify-center cursor-col-resize shrink-0 select-none z-10 hover:w-2 transition-all -mx-0.5"
            >
              <div className={`w-0.5 h-full rounded-full transition-colors ${resizing === 'left' ? 'bg-primary w-1' : 'bg-transparent group-hover:bg-primary/60'}`} />
              <div className="absolute top-1/2 -translate-y-1/2 p-0.5 rounded bg-surface-container border border-outline-variant opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
                <GripVertical size={10} className="text-on-surface-variant" />
              </div>
            </div>
          )}

          {/* Center panel: Ticket detail and chat */}
          <div className="flex-1 min-w-[280px] bg-surface-container-low border border-outline-variant/30 rounded-xl flex flex-col overflow-hidden h-full transition-all">
            {selectedTicket ? (
              <>
                {/* Chat Header details */}
                <div className="px-5 py-4 border-b border-outline-variant/30 bg-surface-container flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {isLeftCollapsed && (
                        <button
                          onClick={() => updateLayout({ leftCollapsed: false, middleMaximized: false })}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold bg-surface-container-high/70 border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary cursor-pointer shrink-0 transition-colors"
                          title="Restore Ticket Queue"
                        >
                          <PanelLeftOpen size={12} className="text-primary" />
                          <span>Queue ({tickets.length})</span>
                        </button>
                      )}
                      <h3 className="text-sm font-semibold text-on-surface truncate">{selectedTicket.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-on-surface-variant">
                      <span className="font-mono text-primary">{getTicketNumber(selectedTicket)}</span>
                      <span>â€¢</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">person</span> {selectedTicket.createdByName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">tag</span> {selectedTicket.categoryName || 'General'}</span>
                    </div>
                  </div>
                  
                  {/* Select status/priority */}
                  <div className="flex items-center gap-2 shrink-0">
                    <CustomSelect
                      options={[
                        { value: 'OPEN', label: 'Open' },
                        { value: 'IN_PROGRESS', label: 'In Progress' },
                        { value: 'RESOLVED', label: 'Resolved' },
                        { value: 'CLOSED', label: 'Closed' }
                      ]}
                      value={selectedTicket.status}
                      disabled={updatingTicket}
                      onChange={val => updateTicketProperties({ status: val })}
                      className="w-auto"
                      optionsClassName="!min-w-[120px]"
                      renderTrigger={(selectedOption, isOpen) => (
                        <button
                          type="button"
                          className="text-[10px] font-bold py-1.5 pl-3 pr-7 rounded-lg cursor-pointer flex items-center justify-between gap-1 relative"
                          style={{
                            background: statusConfig[selectedOption.value]?.bg || 'rgba(0,0,0,0.1)',
                            color: statusConfig[selectedOption.value]?.color || 'var(--text-muted)',
                            border: `1px solid ${statusConfig[selectedOption.value]?.color || 'var(--border-subtle)'}33`,
                            outline: 'none',
                          }}
                        >
                          <span>{selectedOption.label}</span>
                          <span className={`material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[14px] transition-transform duration-180 ${isOpen ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </button>
                      )}
                    />

                    <CustomSelect
                      options={[
                        { value: 'LOW', label: 'Low' },
                        { value: 'MEDIUM', label: 'Medium' },
                        { value: 'HIGH', label: 'High' },
                        { value: 'URGENT', label: 'Urgent' }
                      ]}
                      value={selectedTicket.priority}
                      disabled={updatingTicket}
                      onChange={val => updateTicketProperties({ priority: val })}
                      className="w-auto"
                      optionsClassName="!min-w-[120px]"
                      renderTrigger={(selectedOption, isOpen) => (
                        <button
                          type="button"
                          className="text-[10px] font-bold py-1.5 pl-3 pr-7 rounded-lg cursor-pointer flex items-center justify-between gap-1 relative"
                          style={{
                            background: priorityConfig[selectedOption.value]?.bg || 'rgba(0,0,0,0.1)',
                            color: priorityConfig[selectedOption.value]?.color || 'var(--text-muted)',
                            border: `1px solid ${priorityConfig[selectedOption.value]?.border || 'var(--border-subtle)'}`,
                            outline: 'none',
                          }}
                        >
                          <span>{selectedOption.label}</span>
                          <span className={`material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[14px] transition-transform duration-180 ${isOpen ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </button>
                      )}
                    />

                    {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                      <button 
                        onClick={handleCreateKbFromTicket}
                        className="bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg py-1 px-2.5 text-[10px] font-bold text-primary flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-[12px]">library_books</span> Draft KB
                      </button>
                    )}

                    {isRightCollapsed && (
                      <button
                        onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false })}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold bg-surface-container-high/70 border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-secondary cursor-pointer shrink-0 transition-colors"
                        title="Restore AI Copilot"
                      >
                        <PanelRightOpen size={12} className="text-secondary" />
                        <span>Copilot</span>
                      </button>
                    )}

                    <button
                      onClick={() => updateLayout(p => ({ ...p, middleMaximized: !p.middleMaximized }))}
                      className="p-1.5 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors shrink-0"
                      title={layout.middleMaximized ? "Restore standard layout" : "Maximize ticket conversation"}
                    >
                      {layout.middleMaximized ? <Minimize2 size={13} className="text-primary" /> : <Maximize2 size={13} />}
                    </button>
                  </div>
                </div>

                {/* Messages feed */}
                <div className="flex-grow overflow-y-auto p-5 space-y-4">
                  
                  {/* Description Box */}
                  <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/50 shadow-sm mb-6">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2 mb-3 text-[10px] text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">description</span>
                        <span>Client Description by <strong className="text-on-surface font-semibold">{selectedTicket.createdByName}</strong></span>
                      </div>
                      <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                    <FormattedMessage content={selectedTicket.description} className="text-xs text-on-surface font-body-md" />
                    
                    {/* Attachments grid */}
                    {ticketAttachments.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-outline-variant/20 space-y-2">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Attachments ({ticketAttachments.length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ticketAttachments.map(att => (
                            <button
                              key={att.id}
                              type="button"
                              onClick={() => openAttachmentPreview(att)}
                              className="flex items-center justify-between text-left text-xs rounded-lg px-3 py-2 border border-outline-variant hover:bg-primary/5 transition-all text-primary bg-background/50 cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="material-symbols-outlined text-[14px]">attachment</span>
                                <span className="truncate">{att.fileName}</span>
                              </span>
                              <span className="text-[9px] font-bold uppercase bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">
                                {getAttachmentKind(att) === 'file' ? 'Open' : 'Preview'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Replies conversation list */}
                  {repliesLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-on-surface-variant">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span className="text-xs">Loading replies...</span>
                    </div>
                  ) : (
                    replies.map(rep => {
                      const isMe = user && rep.senderId === user.userId;
                      const isAi = rep.isAiGenerated;
                      const isInternalNote = rep.isInternal;
                      const isCustomer = rep.senderRole === 'USER';
                      const hasAttachments = Array.isArray(rep.attachments) && rep.attachments.length > 0;

                      let bubbleClass = "p-4 rounded-xl shadow-sm text-xs leading-relaxed ";
                      let headerTextClass;
                      let avatarBgClass;
                      let borderClass = isMe ? "rounded-br-none" : "rounded-bl-none";

                      if (isInternalNote) {
                        bubbleClass += `bg-amber-500/10 border-2 border-dashed border-amber-500/40 text-on-surface ${borderClass} border-l-4 border-l-amber-500`;
                        headerTextClass = "text-amber-500";
                        avatarBgClass = "bg-amber-500/20 text-amber-500";
                      } else if (isAi) {
                        bubbleClass += `glass-ai border border-violet-500/30 dark:border-violet-400/20 text-on-surface shadow-[0_0_12px_rgba(139,92,246,0.15)] ${borderClass}`;
                        headerTextClass = "text-violet-500 dark:text-violet-300";
                        avatarBgClass = "bg-violet-500/20 text-violet-500 dark:text-violet-300";
                      } else if (isCustomer) {
                        bubbleClass += `bg-sky-500/5 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-on-surface ${borderClass}`;
                        headerTextClass = "text-sky-600 dark:text-sky-300";
                        avatarBgClass = "bg-sky-500/20 text-sky-600 dark:text-sky-300";
                      } else {
                        // Agent/Admin sender
                        bubbleClass += `bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-on-surface ${borderClass}`;
                        headerTextClass = "text-emerald-600 dark:text-emerald-300";
                        avatarBgClass = "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300";
                      }

                      return (
                        <div key={rep.id} className={`max-w-[80%] flex flex-col ${isMe ? 'ml-auto items-end' : 'items-start'}`}>
                          <div className={bubbleClass}>
                            
                            {/* Internal label pill */}
                            {isInternalNote && (
                              <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 rounded px-1.5 py-0.5 mb-2 w-fit">
                                <span className="material-symbols-outlined text-amber-500 text-[10px]">sticky_note</span>
                                <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest">Internal Note — Agents Only</span>
                              </div>
                            )}

                            {/* Message Header */}
                            <div className="flex items-center gap-1.5 mb-2 border-b border-outline-variant/10 pb-1 text-[10px]">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${avatarBgClass}`}>
                                {isAi ? <span className="material-symbols-outlined text-[10px] icon-fill">auto_awesome</span> : isInternalNote ? <span className="material-symbols-outlined text-[10px]">sticky_note</span> : getInitials(rep.senderName)}
                              </div>
                              <span className={`font-semibold uppercase tracking-wider ${headerTextClass}`}>
                                {rep.senderName}{isAi ? ' (AI Assistant)' : ''}
                              </span>
                              <span className="text-on-surface-variant opacity-75">•</span>
                              <span className="text-on-surface-variant opacity-75">{formatTime(rep.createdAt)}</span>
                            </div>
                            
                            {/* Message Message */}
                            {rep.message && rep.message.trim().length > 0 ? (
                              <FormattedMessage content={rep.message} className="font-body-md" style={isInternalNote ? { color: '#f97316' } : {}} />
                            ) : hasAttachments ? (
                              <p className="font-body-md text-on-surface-variant italic">Attachment sent</p>
                            ) : null}

                            {hasAttachments && (
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {rep.attachments.map((att) => (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => openAttachmentPreview(att)}
                                    className="flex items-center justify-between rounded-lg border border-outline-variant bg-background/60 px-3 py-2 text-left text-[11px] text-primary transition-colors hover:bg-primary/5 cursor-pointer"
                                  >
                                    <span className="flex min-w-0 items-center gap-1.5">
                                      <span className="material-symbols-outlined text-[14px]">attachment</span>
                                      <span className="truncate">{att.fileName}</span>
                                    </span>
                                    <span className="text-[9px] font-bold uppercase bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">
                                      {getAttachmentKind(att) === 'file' ? 'Open' : 'Preview'}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* AI Draft Suggestion Box */}
                  {aiDraft && (
                    <div className="rounded-xl p-4 glass-panel border border-secondary/30 relative anim-slide-up mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">AI Suggested Draft</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setReplyMsg(aiDraft); setAiDraft(''); }}
                            className="bg-secondary text-surface-container-lowest py-0.5 px-2.5 rounded font-bold text-[10px] cursor-pointer hover:scale-98 transition-all"
                          >
                            Apply Draft
                          </button>
                          <button onClick={() => setAiDraft('')} className="p-0.5 text-on-surface-variant hover:text-on-surface cursor-pointer">
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-on-surface leading-relaxed italic font-body-md">"{aiDraft}"</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Reply Composer panel */}
                <div className="p-4 border-t border-outline-variant/30 bg-surface-container shrink-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsInternal(!isInternal)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                        isInternal 
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' 
                          : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">sticky_note</span>
                      {isInternal ? 'Internal Note' : 'Public Reply'}
                    </button>

                    <button 
                      onClick={handleGenerateDraft} 
                      disabled={drafting}
                      className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-[#4cd7f6] cursor-pointer disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[14px] ${drafting ? 'animate-spin' : ''}`}>auto_awesome</span>
                      {drafting ? 'Drafting...' : 'AI Suggest Draft'}
                    </button>
                  </div>

                  <form onSubmit={handleSendReply} className="space-y-3">
                    <textarea
                      ref={replyMsgRef}
                      rows={2}
                      className="w-full bg-surface-container-low border rounded-lg px-4 py-2 text-xs text-on-surface focus:outline-none focus:border-primary resize-none placeholder:text-on-surface-variant/40 max-h-48 overflow-y-auto"
                      placeholder={isInternal ? 'Write internal note (visible only to support agents)...' : 'Write public reply to customer...'}
                      value={replyMsg}
                      onChange={e => setReplyMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(e); } }}
                      style={isInternal ? { borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.03)', maxHeight: '192px' } : { maxHeight: '192px' }}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          ref={replyFileRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                          className="hidden"
                          onChange={(e) => {
                            addReplyAttachments(e.target.files);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => replyFileRef.current?.click()}
                          className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                        >
                          Attach
                        </button>
                      </div>

                      <button 
                        type="submit" 
                        disabled={sendingReply || (!replyMsg.trim() && replyAttachments.length === 0)} 
                        className="px-4 py-2 bg-primary text-on-primary hover:bg-[#5a52f0] rounded-lg text-xs font-semibold self-end flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {sendingReply ? <Loader2 size={13} className="animate-spin" /> : <span className="material-symbols-outlined text-[16px]">send</span>}
                      </button>
                    </div>

                    {replyAttachments.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {replyAttachments.map((item) => {
                          const isImage = item.file.type?.startsWith('image/');
                          return (
                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-outline-variant bg-background/60 px-3 py-2 text-xs">
                              <span className="flex min-w-0 items-center gap-1.5 text-on-surface">
                                <span className="material-symbols-outlined text-[14px]">{isImage ? 'image' : 'attachment'}</span>
                                <span className="truncate">{item.name}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isImage && (
                                  <button type="button" onClick={() => openImageEditor(item.id)} className="text-secondary hover:text-primary cursor-pointer">
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                  </button>
                                )}
                                <button type="button" onClick={() => removeReplyAttachment(item.id)} className="text-on-surface-variant hover:text-error cursor-pointer">
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </form>
                </div>

                <ImageMarkupEditor
                  open={imageEditorOpen}
                  file={previewEditFile || replyAttachments.find((item) => item.id === editingAttachmentId)?.file || null}
                  onClose={closeImageEditor}
                  onSave={handleEditedImage}
                  actionLabel={editingImageMode === 'resend' ? 'Send edited image' : 'Save edited image'}
                  title={editingImageMode === 'resend' ? 'Edit received image' : editingImageTitle}
                />

                {/* File Attachment preview overlay */}
                {attachmentPreview && (
                  <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/85"
                    onClick={closeAttachmentPreview}
                  >
                    <div
                      className="w-full max-w-4xl overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-outline-variant/30 bg-surface-container-low">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-on-surface">{attachmentPreview.fileName}</p>
                          <p className="text-[10px] uppercase tracking-wide text-on-surface-variant font-mono">
                            {attachmentPreview.kind === 'pdf' ? 'PDF Document' : attachmentPreview.kind === 'text' ? 'Text Document' : 'Image attachment'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {attachmentPreview.kind === 'image' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                openImageEditFromPreview();
                              }}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-primary text-on-primary hover:bg-[#5a52f0] cursor-pointer transition-colors"
                            >
                              Edit image
                            </button>
                          )}
                          <button type="button" onClick={closeAttachmentPreview} className="rounded-full p-1.5 transition-colors hover:bg-surface-container-highest cursor-pointer text-on-surface-variant hover:text-on-surface">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>
                        </div>
                      </div>
                      <div className="bg-black/95 p-3 flex items-center justify-center" style={{ minHeight: '60vh' }}>
                        {attachmentPreview.kind === 'image' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              openImageEditFromPreview();
                            }}
                            className="relative group max-h-[70vh] rounded-lg overflow-hidden cursor-pointer"
                          >
                            <img
                              src={attachmentPreview.fileUrl}
                              alt={attachmentPreview.fileName}
                              className="max-h-[70vh] w-auto rounded-lg object-contain"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                              <span className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-on-surface shadow-md">
                                Click to edit
                              </span>
                            </div>
                          </button>
                        ) : (
                          <iframe
                            src={attachmentPreview.fileUrl}
                            title={attachmentPreview.fileName}
                            className="w-full h-[70vh] rounded-lg bg-white"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface-container-lowest/30 p-4">
                {(isLeftCollapsed || isRightCollapsed) && (
                  <div className="flex items-center gap-2 mb-2">
                    {isLeftCollapsed && (
                      <button
                        onClick={() => updateLayout({ leftCollapsed: false, middleMaximized: false })}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary cursor-pointer transition-colors"
                      >
                        <PanelLeftOpen size={14} className="text-primary" />
                        <span>Show Queue ({tickets.length})</span>
                      </button>
                    )}
                    {isRightCollapsed && (
                      <button
                        onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false })}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-secondary cursor-pointer transition-colors"
                      >
                        <PanelRightOpen size={14} className="text-secondary" />
                        <span>Show Copilot</span>
                      </button>
                    )}
                  </div>
                )}
                <span className="material-symbols-outlined text-[48px] opacity-25">chat</span>
                <p className="text-xs">Select a ticket from the queue to start support collaboration.</p>
              </div>
            )}
          </div>

          {/* ── SPLITTER 2: Between Middle and Right ───────────────────── */}
          {!isRightCollapsed && (
            <div
              onMouseDown={(e) => startResize('right', e)}
              onDoubleClick={() => updateLayout({ rightWidth: 320 })}
              title="Drag to resize AI Copilot (Double-click to reset 320px)"
              className="group relative w-1.5 flex items-center justify-center cursor-col-resize shrink-0 select-none z-10 hover:w-2 transition-all -mx-0.5"
            >
              <div className={`w-0.5 h-full rounded-full transition-colors ${resizing === 'right' ? 'bg-primary w-1' : 'bg-transparent group-hover:bg-primary/60'}`} />
              <div className="absolute top-1/2 -translate-y-1/2 p-0.5 rounded bg-surface-container border border-outline-variant opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
                <GripVertical size={10} className="text-on-surface-variant" />
              </div>
            </div>
          )}

          {/* ── PANEL 3: AI COPILOT ────────────────────────────────────── */}
          {isRightCollapsed ? (
            <div 
              className="w-12 shrink-0 bg-surface-container-low border border-outline-variant/30 rounded-xl flex flex-col items-center py-3 overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false })}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container cursor-pointer transition-colors"
                title="Expand AI Copilot"
              >
                <PanelRightOpen size={16} />
              </button>
              <div className="my-2.5 w-6 border-b border-outline-variant/30" />
              
              <div 
                onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false })}
                className="flex flex-col items-center gap-1 cursor-pointer group"
                title="AI Copilot"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
              </div>

              {selectedTicket && (
                <>
                  <div className="my-2 w-6 border-b border-outline-variant/30" />
                  <div 
                    onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false })}
                    className="cursor-pointer group flex flex-col items-center gap-1"
                    title="Ticket SLA Status"
                  >
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary">timer</span>
                  </div>
                  {linkedTickets.length > 0 && (
                    <div 
                      onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false, linkedCollapsed: false })}
                      className="cursor-pointer group flex flex-col items-center gap-0.5 mt-2"
                      title={`${linkedTickets.length} Linked Cases`}
                    >
                      <span className="material-symbols-outlined text-[15px] text-on-surface-variant group-hover:text-primary">link</span>
                      <span className="text-[9px] px-1 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">
                        {linkedTickets.length}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div 
              className="shrink-0 bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-y-auto p-4 flex flex-col gap-4 h-full transition-all"
              style={{
                width: `${layout.rightWidth}px`,
                transition: resizing === 'right' ? 'none' : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-secondary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant truncate">AI Copilot</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => updateLayout({ rightCollapsed: true })} 
                    className="p-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Collapse AI Copilot panel"
                  >
                    <PanelRightClose size={13} />
                  </button>
                </div>
              </div>

              {selectedTicket ? (
                <div className="space-y-4">
                  {/* SLA Resolution Details */}
                  <SLAIndicator ticket={selectedTicket} slaInfo={selectedTicketSla} showDetails={true} />

                  {/* Reassignment Request Action */}
                  {selectedTicket.assignedToId && (
                    <div className="p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/40">
                      <button
                        onClick={() => {
                          setReassignCategory('');
                          setReassignReason('');
                          setShowReassignModal(true);
                        }}
                        className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg py-2 px-3 text-xs font-semibold text-primary flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                        Request Reassignment
                      </button>
                    </div>
                  )}

                  {/* Thread Summary Card */}
                  <div className="rounded-xl overflow-hidden border border-secondary/20">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-secondary/5 border-b border-secondary/15">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">summarize</span> Thread Summary
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={handleSummarizeThread} 
                          disabled={summarizing}
                          className="text-[10px] font-semibold text-secondary hover:text-[#4cd7f6] flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                        >
                          <span className={`material-symbols-outlined text-[12px] ${summarizing ? 'animate-spin' : ''}`}>sync</span>
                          Recalculate
                        </button>
                        <button
                          onClick={() => updateLayout(p => ({ ...p, summaryCollapsed: !p.summaryCollapsed }))}
                          className="p-1 rounded hover:bg-secondary/10 cursor-pointer text-secondary"
                          title={layout.summaryCollapsed ? "Expand Thread Summary" : "Shrink Thread Summary"}
                        >
                          {layout.summaryCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                        </button>
                      </div>
                    </div>
                    {!layout.summaryCollapsed && (
                      aiSummary ? (
                        <div className="p-3 bg-surface-container-lowest/40">
                          <p className="text-xs leading-relaxed italic text-on-surface font-body-md">"{aiSummary}"</p>
                        </div>
                      ) : (
                        <div className="p-4 text-center bg-surface-container-lowest/40">
                          <button 
                            onClick={handleSummarizeThread} 
                            disabled={summarizing} 
                            className="bg-secondary text-surface-container-lowest font-semibold py-1.5 px-4 rounded-lg text-xs hover:scale-98 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {summarizing ? 'Summarizing...' : 'Summarize Thread'}
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Linked cases section */}
                  <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest/20">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-outline-variant/30 bg-surface-container-high/30">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">link</span> Linked Cases
                      </span>
                      <div className="flex items-center gap-1.5">
                        {linkedTickets.length > 0 && (
                          <button onClick={handleBulkResolve} className="text-[10px] font-semibold text-error hover:text-red-400 flex items-center gap-0.5 cursor-pointer">
                            <span className="material-symbols-outlined text-[12px] icon-fill">check_circle</span> Resolve All
                          </button>
                        )}
                        <button
                          onClick={() => updateLayout(p => ({ ...p, linkedCollapsed: !p.linkedCollapsed }))}
                          className="p-1 rounded hover:bg-surface-container cursor-pointer text-on-surface-variant hover:text-on-surface"
                          title={layout.linkedCollapsed ? "Expand Linked Cases" : "Shrink Linked Cases"}
                        >
                          {layout.linkedCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                        </button>
                      </div>
                    </div>
                    
                    {!layout.linkedCollapsed && (
                      <div className="p-3 space-y-2">
                        {linkedTickets.length === 0 ? (
                          <p className="text-[10px] text-center py-2 text-on-surface-variant">No linked tickets</p>
                        ) : (
                          linkedTickets.map(lt => (
                            <div key={lt.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 bg-surface-container border border-outline-variant/20 text-xs">
                              <button
                                type="button"
                                onClick={() => selectTicketForWorkspace(lt)}
                                className="text-[10px] font-medium truncate flex-1 text-left text-on-surface hover:text-primary hover:underline cursor-pointer"
                                title={`Open ticket: ${lt.title}`}
                              >
                                {lt.title}
                              </button>
                              <button
                                onClick={() => handleUnlinkTicket(lt.id)}
                                className="ml-2 text-[9px] font-bold text-error bg-error/5 hover:bg-error/15 border border-error/20 rounded px-1.5 py-0.5 cursor-pointer"
                              >
                                Unlink
                              </button>
                            </div>
                          ))
                        )}

                        {/* Linking Autocomplete Form */}
                        <form onSubmit={handleLinkTicket} className="flex gap-2 pt-3 border-t border-outline-variant/20 mt-2 flex-col">
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-1.5 text-[10px] text-on-surface placeholder:text-on-surface-variant/40"
                              placeholder="Link another ticket (type title)..."
                              value={selectedLinkTicket ? selectedLinkTicket.title : linkSearch}
                              onChange={e => {
                                setLinkSearch(e.target.value);
                                setSelectedLinkTicket(null);
                                searchTicketsForLink(e.target.value);
                              }}
                              onFocus={() => linkSearch && setShowLinkDropdown(linkResults.length > 0)}
                              autoComplete="off"
                            />
                            {selectedLinkTicket && (
                              <button type="button" onClick={() => { setSelectedLinkTicket(null); setLinkSearch(''); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            )}
                            
                            {showLinkDropdown && (
                              <div className="absolute top-full left-0 right-0 z-50 bg-surface-container-high border border-outline-variant rounded-lg mt-1 max-h-40 overflow-y-auto shadow-xl divide-y divide-outline-variant/30">
                                {linkSearching && <p className="text-[10px] p-2 text-on-surface-variant">Searching...</p>}
                                {linkResults.map(t => (
                                  <button 
                                    key={t.id} 
                                    type="button"
                                    onClick={() => { setSelectedLinkTicket(t); setShowLinkDropdown(false); }}
                                    className="w-full text-left p-2 hover:bg-primary/10 transition-colors"
                                  >
                                    <p className="text-[10px] font-semibold text-on-surface truncate">{t.title}</p>
                                    <p className="text-[8px] text-on-surface-variant mt-0.5">{t.status} · {t.priority}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button 
                            type="submit" 
                            disabled={linking || !selectedLinkTicket} 
                            className="w-full bg-primary text-on-primary hover:bg-[#5a52f0] py-1 px-3 rounded-lg text-[10px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {linking ? 'Linking...' : 'Link Ticket'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[28px] opacity-25">smart_toy</span>
                  <p className="text-[11px] leading-relaxed">Open a ticket in the workspace to utilize AI Summary tools.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── KB DRAFTS TAB ──────────────────────────────────── */}
      {activeTab === 'kb-drafts' && (
        <div className="flex gap-5 h-full overflow-hidden anim-fade-in w-full max-w-container-max mx-auto">
          {/* New article form */}
          <form onSubmit={handleCreateDraft} className="flex-1 overflow-y-auto pr-1">
            <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/30 space-y-4 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-on-surface mb-1">New KB Article Draft</h3>
                <p className="text-xs text-on-surface-variant">Submit a new solution article for admin review and publishing.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-on-surface-variant">Article Title</label>
                <input 
                  type="text" 
                  required 
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-on-surface-variant/40" 
                  value={newDraftTitle} 
                  onChange={e => setNewDraftTitle(e.target.value)}
                  placeholder="e.g. Troubleshooting VPN client disconnection errors on macOS" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-on-surface-variant">Category</label>
                <CustomSelect
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={newDraftCategory}
                  onChange={val => setNewDraftCategory(val)}
                  placeholder="Select category..."
                  triggerClassName="!bg-surface-container-low px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-on-surface-variant">Content</label>
                <textarea 
                  required 
                  rows={8} 
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y" 
                  placeholder="Explain the symptom, root cause, and step-by-step resolution details..."
                  value={newDraftContent} 
                  onChange={e => setNewDraftContent(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                disabled={submittingDraft} 
                className="w-full bg-primary hover:bg-[#5a52f0] text-on-primary py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submittingDraft ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span> Create Draft
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right drafts panel */}
          <div className="w-80 shrink-0 bg-surface-container border border-outline-variant/30 rounded-xl flex flex-col overflow-hidden h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30 bg-surface-container-high/30">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">My Drafts</span>
              <button onClick={fetchDraftArticles} className="p-1 rounded-md text-on-surface-variant hover:text-primary cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-2 space-y-2 bg-surface-container-lowest/30">
              {draftsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-on-surface-variant">
                  <Loader2 size={15} className="animate-spin text-primary" />
                  <span className="text-xs">Loading drafts...</span>
                </div>
              ) : draftArticles.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[28px] opacity-40 mb-1">note_stack</span>
                  <p className="text-xs">No article drafts yet</p>
                </div>
              ) : (
                draftArticles.map(art => (
                  <div key={art.id} className="p-3 bg-surface-container border border-outline-variant/20 rounded-xl relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wide ${
                        art.published 
                          ? 'bg-primary/10 text-primary border border-primary/20' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {art.published ? 'PUBLISHED' : 'PENDING'}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                        <span>{formatDate(art.createdAt)}</span>
                        <button 
                          onClick={() => handleDeleteDraft(art.id)} 
                          className="p-0.5 rounded hover:bg-error/10 hover:text-error transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-on-surface truncate pr-4">{art.title}</p>
                    <p className="text-[10px] text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">{art.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── REASSIGNMENT REQUEST MODAL ────────────────────── */}
      {showReassignModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setShowReassignModal(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-2xl anim-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-outline-variant/30 bg-surface-container-low">
              <div>
                <p className="text-sm font-semibold text-on-surface">Request Ticket Reassignment</p>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                  Request admin to unassign and update category.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowReassignModal(false)} 
                className="rounded-full p-1.5 transition-colors hover:bg-surface-container-highest cursor-pointer text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleReassignRequestSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-on-surface-variant">
                  Target Category (Optional)
                </label>
                <CustomSelect
                  options={[{ value: '', label: 'Keep Current Category' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                  value={reassignCategory}
                  onChange={val => setReassignCategory(val)}
                  placeholder="Select category..."
                  triggerClassName="!bg-surface-container-low px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-on-surface-variant">
                  Reason for Reassignment
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none placeholder:text-on-surface-variant/40"
                  placeholder="Explain why this ticket needs reassignment..."
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-3 py-1.5 bg-surface-container-high border border-outline-variant text-on-surface hover:bg-surface-container-highest rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReassign}
                  className="px-3 py-1.5 bg-primary text-on-primary hover:bg-[#5a52f0] rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {submittingReassign ? <Loader2 size={13} className="animate-spin" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── GLOBAL CONFIRM MODAL ──────────────────── */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

    </div>
  );
};

export default AgentWorkspace;
