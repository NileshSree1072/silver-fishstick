import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api, useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import ConfirmModal from '../../components/ConfirmModal';
import ImageMarkupEditor from '../../components/ImageMarkupEditor';
import AttachmentPreviewModal from '../../components/AttachmentPreviewModal';
import ArticleModal from '../../components/ArticleModal';
import useHotkeys from '../../hooks/useHotkeys';
import { createPendingAttachment, getAttachmentKind } from '../../utils/ticketMeta';
import TicketQueue, { isAtRisk } from './components/TicketQueue';
import ConversationPanel from './components/ConversationPanel';
import ReplyComposer from './components/ReplyComposer';
import CopilotPanel from './components/CopilotPanel';
import KbDraftsTab from './components/KbDraftsTab';
import ReassignModal from './components/ReassignModal';

const LAYOUT_KEY = 'aegis_agent_workspace_layout_v2';
const DEFAULT_LAYOUT = {
  leftWidth: 320,
  rightWidth: 340,
  leftCollapsed: false,
  rightCollapsed: false,
  middleMaximized: false,
};

const IDLE = { status: 'idle' };
const EMPTY_DRAFT = { status: 'idle', text: '', sources: [] };
const EMPTY_SIMILAR = { status: 'idle', items: [] };

const sameId = (a, b) => a && b && a.toString().toLowerCase() === b.toString().toLowerCase();

const AgentWorkspace = ({ activeTab }) => {
  const { user } = useAuth();
  const { subscribeToTicket, addToast } = useNotifications();

  // ── Layout (persisted) ───────────────────────────────────────
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      return saved ? { ...DEFAULT_LAYOUT, ...JSON.parse(saved) } : DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  });
  const updateLayout = (updater) => {
    setLayout(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };
  const [resizing, setResizing] = useState(null);
  const [mobilePane, setMobilePane] = useState('queue');

  const startResize = (side, e) => {
    e.preventDefault();
    setResizing(side);
    const startX = e.clientX;
    const startLeft = layout.leftWidth;
    const startRight = layout.rightWidth;
    const onMove = (ev) => {
      if (side === 'left') {
        updateLayout(p => ({ ...p, leftWidth: Math.max(240, Math.min(520, startLeft + ev.clientX - startX)) }));
      } else {
        updateLayout(p => ({ ...p, rightWidth: Math.max(280, Math.min(560, startRight + startX - ev.clientX)) }));
      }
    };
    const onUp = () => {
      setResizing(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const leftHidden = layout.leftCollapsed || layout.middleMaximized;
  const rightHidden = layout.rightCollapsed || layout.middleMaximized;

  // ── Queue ────────────────────────────────────────────────────
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [queueScope, setQueueScope] = useState('my');
  const [quickFilter, setQuickFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [categories, setCategories] = useState([]);

  // ── Conversation ─────────────────────────────────────────────
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyMsg, setReplyMsg] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [selectedTicketSla, setSelectedTicketSla] = useState(null);
  const [linkedTickets, setLinkedTickets] = useState([]);

  // ── Copilot ──────────────────────────────────────────────────
  const [insights, setInsights] = useState(IDLE);
  const [summary, setSummary] = useState(IDLE);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [similar, setSimilar] = useState(EMPTY_SIMILAR);
  const [votes, setVotes] = useState({});
  const insightsCache = useRef(new Map());
  const activeTicketId = useRef(null);

  // ── KB drafts ────────────────────────────────────────────────
  const [draftArticles, setDraftArticles] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [newDraftTitle, setNewDraftTitle] = useState('');
  const [newDraftContent, setNewDraftContent] = useState('');
  const [newDraftCategory, setNewDraftCategory] = useState('');
  const [submittingDraft, setSubmittingDraft] = useState(false);

  // ── Modals ───────────────────────────────────────────────────
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState(null);
  const [editingImageMode, setEditingImageMode] = useState('compose');
  const [previewEditFile, setPreviewEditFile] = useState(null);
  const [openArticleId, setOpenArticleId] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignCategory, setReassignCategory] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const openConfirm = (opts) => setConfirmModal({ open: true, ...opts });
  const closeConfirm = () => setConfirmModal({ open: false });

  const chatEndRef = useRef(null);
  const replyRef = useRef(null);
  const searchRef = useRef(null);
  const previewFileCacheRef = useRef(new Map());

  const visibleTickets = useMemo(() => {
    if (quickFilter === 'risk') return tickets.filter(isAtRisk);
    if (quickFilter === 'ai-rejected') return tickets.filter(t => t.aiFeedback === 'REJECTED');
    return tickets;
  }, [tickets, quickFilter]);

  // ── Data loading ─────────────────────────────────────────────

  const fetchSlaStatus = async (ticketId) => {
    try {
      const res = await api.get(`/api/tickets/${ticketId}/sla`);
      setSelectedTicketSla(res.data);
    } catch {
      setSelectedTicketSla(null);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/admin/categories');
      setCategories(res.data || []);
    } catch { /* categories are optional filters */ }
  };

  const fetchLinkedTickets = async (id) => {
    try {
      const res = await api.get(`/api/tickets/${id}/linked`);
      setLinkedTickets(res.data || []);
    } catch { /* keep previous list */ }
  };

  const loadInsights = async (ticketId, force = false) => {
    if (!force && insightsCache.current.has(ticketId)) {
      setInsights({ status: 'ready', data: insightsCache.current.get(ticketId) });
      return;
    }
    setInsights(prev => ({ status: 'loading', data: force ? prev.data : undefined }));
    try {
      const res = await api.get(`/api/ai/insights/${ticketId}`);
      insightsCache.current.set(ticketId, res.data);
      if (activeTicketId.current === ticketId) setInsights({ status: 'ready', data: res.data });
    } catch {
      if (activeTicketId.current === ticketId) setInsights({ status: 'error' });
    }
  };

  const loadSimilar = async (ticketId) => {
    setSimilar({ status: 'loading', items: [] });
    try {
      const res = await api.get(`/api/ai/similar/${ticketId}`);
      if (activeTicketId.current === ticketId) setSimilar({ status: 'ready', items: res.data || [] });
    } catch {
      if (activeTicketId.current === ticketId) setSimilar({ status: 'error', items: [] });
    }
  };

  const clearReplyAttachments = () => {
    setReplyAttachments(prev => {
      prev.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const selectTicketForWorkspace = async (ticket) => {
    activeTicketId.current = ticket.id;
    setSelectedTicket(ticket);
    setMobilePane('ticket');
    localStorage.setItem('helpdesk_selected_agent_ticket_id', ticket.id);
    setReplyMsg('');
    setIsInternal(false);
    clearReplyAttachments();
    setReplies([]); setRepliesLoading(true);
    setSummary(IDLE); setDraft(EMPTY_DRAFT); setVotes({});
    setLinkedTickets([]); setTicketAttachments([]);
    setSelectedTicketSla(null);
    fetchSlaStatus(ticket.id);
    loadInsights(ticket.id);
    loadSimilar(ticket.id);
    try {
      const repRes = await api.get(`/api/tickets/${ticket.id}/replies`);
      if (activeTicketId.current !== ticket.id) return;
      setReplies(repRes.data || []);
      try {
        const attRes = await api.get(`/api/tickets/${ticket.id}/attachments`);
        setTicketAttachments(attRes.data || []);
      } catch { /* attachments are optional */ }
      fetchLinkedTickets(ticket.id);
    } catch {
      addToast('Could not load this conversation.', 'Error', 'error');
    } finally {
      if (activeTicketId.current === ticket.id) setRepliesLoading(false);
    }
  };

  // Tickets from search results / similar lists may be partial; load the full record first
  const openTicket = useCallback(async (ticket) => {
    if (ticket.createdByName !== undefined && ticket.description !== undefined) {
      selectTicketForWorkspace(ticket);
      return;
    }
    try {
      const res = await api.get(`/api/tickets/${ticket.id}`);
      selectTicketForWorkspace(res.data);
    } catch {
      addToast('You may not have access to that ticket.', 'Could not open ticket', 'error');
    }
  }, []);

  const fetchQueue = async () => {
    setTicketsLoading(true);
    try {
      const endpoint = queueScope === 'my' ? '/api/tickets/assigned' : '/api/tickets';
      const params = { page: 0, size: 100 };
      if (statusFilter && statusFilter !== 'ACTIVE') params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (ticketSearch) params.q = ticketSearch;
      const res = await api.get(endpoint, { params });
      let results = res.data?.content || [];
      if (statusFilter === 'ACTIVE') results = results.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
      if (queueScope === 'unassigned') results = results.filter(t => !t.assignedToId);
      setTickets(results);

      // Restore the previously open ticket after a refresh
      const savedTicketId = localStorage.getItem('helpdesk_selected_agent_ticket_id');
      if (savedTicketId && activeTicketId.current !== savedTicketId) {
        const found = results.find(t => t.id === savedTicketId);
        if (found) {
          selectTicketForWorkspace(found);
        } else {
          try {
            const ticketRes = await api.get(`/api/tickets/${savedTicketId}`);
            if (ticketRes.data) selectTicketForWorkspace(ticketRes.data);
          } catch {
            localStorage.removeItem('helpdesk_selected_agent_ticket_id');
          }
        }
      }
    } catch (err) {
      if (err?.response?.status === 403) {
        addToast('You do not have permission to view this queue.', 'Access denied', 'error');
      } else {
        addToast('Failed to load the inbox.', 'Error', 'error');
      }
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchDraftArticles = async () => {
    setDraftsLoading(true);
    try {
      const res = await api.get('/api/knowledge/my');
      setDraftArticles(res.data || []);
    } catch { /* show empty list */ }
    finally { setDraftsLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'queue') { fetchQueue(); loadCategories(); }
    if (activeTab === 'kb-drafts') { fetchDraftArticles(); loadCategories(); }
  }, [activeTab, queueScope, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    if (activeTab !== 'queue') return undefined;
    const timer = setTimeout(fetchQueue, 300);
    return () => clearTimeout(timer);
  }, [ticketSearch]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [replies]);

  // Live replies for the open ticket
  useEffect(() => {
    if (!selectedTicket?.id) return undefined;
    const ticketId = selectedTicket.id;
    const unsub = subscribeToTicket(ticketId, (msg) => {
      setReplies(prev => (prev.some(r => sameId(r.id, msg.id)) ? prev : [...prev, msg]));
      reloadTicket(ticketId);
    });
    return () => unsub?.();
  }, [selectedTicket?.id]);

  // Tickets opened from the command menu
  useEffect(() => {
    const onOpen = (e) => e.detail && openTicket(e.detail);
    window.addEventListener('aegis:open-ticket', onOpen);
    return () => window.removeEventListener('aegis:open-ticket', onOpen);
  }, [openTicket]);

  // ── Ticket updates ───────────────────────────────────────────

  const dropFromMyQueue = (id, message, title) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    setSelectedTicket(prev => (prev?.id === id ? null : prev));
    activeTicketId.current = null;
    localStorage.removeItem('helpdesk_selected_agent_ticket_id');
    addToast(message, title, 'info');
  };

  const reloadTicket = async (id) => {
    try {
      const res = await api.get(`/api/tickets/${id}`);
      const refreshed = res.data;
      if (queueScope === 'my' && refreshed.assignedToId !== user?.userId) {
        dropFromMyQueue(id,
          refreshed.assignedToId ? 'This ticket was reassigned to another agent.' : 'This ticket is now unassigned.',
          refreshed.assignedToId ? 'Ticket reassigned' : 'Ticket unassigned');
        return;
      }
      setSelectedTicket(prev => (prev?.id === id ? refreshed : prev));
      setTickets(prev => prev.map(t => (t.id === id ? refreshed : t)));
      fetchSlaStatus(id);
    } catch { /* keep current view */ }
  };

  const updateTicketProperties = async (updates) => {
    if (!selectedTicket) return false;
    const ticketId = selectedTicket.id;
    setUpdatingTicket(true);
    try {
      const res = await api.patch(`/api/tickets/${ticketId}`, updates);
      const updated = res.data;
      if (queueScope === 'my' && updated.assignedToId && updated.assignedToId !== user?.userId) {
        dropFromMyQueue(ticketId, 'Ticket reassigned — removed from your inbox.', 'Reassigned');
        return true;
      }
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => (t.id === ticketId ? updated : t)));
      addToast('Ticket updated.', 'Saved', 'success');
      fetchSlaStatus(ticketId);
      const repRes = await api.get(`/api/tickets/${ticketId}/replies`);
      setReplies(repRes.data || []);
      return true;
    } catch {
      addToast('Failed to update the ticket.', 'Error', 'error');
      return false;
    } finally {
      setUpdatingTicket(false);
    }
  };

  // ── Replies & attachments ────────────────────────────────────

  const sendReplyRequest = (message, items, internal) => {
    if (items.length > 0) {
      const formData = new FormData();
      formData.append('message', message ?? '');
      formData.append('isInternal', String(internal));
      items.forEach(item => formData.append('files', item.file, item.name));
      return api.post(`/api/tickets/${selectedTicket.id}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post(`/api/tickets/${selectedTicket.id}/replies`, { message, isInternal: internal });
  };

  const handleSendReply = async () => {
    if (!selectedTicket || (!replyMsg.trim() && replyAttachments.length === 0)) return false;
    const outgoingMsg = replyMsg;
    const outgoingAttachments = [...replyAttachments];
    const outgoingInternal = isInternal;

    // Clear immediately for instant feedback; restore if sending fails
    setReplyMsg('');
    setIsInternal(false);
    setReplyAttachments([]);

    setSendingReply(true);
    try {
      const res = await sendReplyRequest(outgoingMsg, outgoingAttachments, outgoingInternal);
      outgoingAttachments.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      if (res?.data) setReplies(prev => (prev.some(r => sameId(r.id, res.data.id)) ? prev : [...prev, res.data]));
      reloadTicket(selectedTicket.id);
      return true;
    } catch {
      setReplyMsg(outgoingMsg);
      setReplyAttachments(outgoingAttachments);
      setIsInternal(outgoingInternal);
      addToast('Failed to send the reply.', 'Error', 'error');
      return false;
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendAndResolve = async () => {
    if (await handleSendReply()) await updateTicketProperties({ status: 'RESOLVED' });
  };

  const addReplyAttachments = (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length) setReplyAttachments(prev => [...prev, ...files.map(createPendingAttachment)]);
  };

  const removeReplyAttachment = (attachmentId) => {
    setReplyAttachments(prev => {
      const target = prev.find(item => item.id === attachmentId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(item => item.id !== attachmentId);
    });
  };

  const openAttachmentPreview = (attachment) => {
    const kind = getAttachmentKind(attachment);
    if (kind === 'file') {
      window.open(attachment.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setAttachmentPreview({ ...attachment, kind });
  };

  const fetchUrlAsFile = async (attachmentId, fallbackName, fallbackUrl) => {
    const cacheKey = attachmentId || fallbackUrl;
    const cached = previewFileCacheRef.current.get(cacheKey);
    if (cached) return cached;
    const response = await api.get(`/api/tickets/attachments/${attachmentId}/content`, { responseType: 'blob' });
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

  const openImageEditor = (attachmentId) => {
    setEditingAttachmentId(attachmentId);
    setEditingImageMode('compose');
    setImageEditorOpen(true);
  };

  const openImageEditFromPreview = async () => {
    if (attachmentPreview?.kind !== 'image') return;
    try {
      const file = await fetchUrlAsFile(attachmentPreview.id, attachmentPreview.fileName, attachmentPreview.fileUrl);
      setPreviewEditFile(file);
      setEditingAttachmentId(null);
      setEditingImageMode('resend');
      setImageEditorOpen(true);
      setAttachmentPreview(null);
    } catch {
      addToast('Could not open the image for editing.', 'Error', 'error');
    }
  };

  const closeImageEditor = () => {
    setImageEditorOpen(false);
    setEditingAttachmentId(null);
    setPreviewEditFile(null);
    setEditingImageMode('compose');
  };

  const handleEditedImage = (blob, fileName) => {
    if (editingImageMode === 'resend') {
      const outgoingFile = new File([blob], fileName || 'edited-image.png', { type: blob.type || 'image/png' });
      sendReplyRequest('', [{ id: crypto.randomUUID(), file: outgoingFile, name: outgoingFile.name }], false)
        .then(res => {
          setReplies(prev => (prev.some(r => sameId(r.id, res.data.id)) ? prev : [...prev, res.data]));
          reloadTicket(selectedTicket.id);
        })
        .catch(() => addToast('Failed to send the edited image.', 'Error', 'error'))
        .finally(closeImageEditor);
      return;
    }
    const target = replyAttachments.find(item => item.id === editingAttachmentId);
    if (!target) return;
    const editedFile = new File([blob], fileName || target.name, { type: blob.type || 'image/png' });
    setReplyAttachments(prev => prev.map(item => {
      if (item.id !== target.id) return item;
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return { ...item, file: editedFile, name: editedFile.name, previewUrl: URL.createObjectURL(editedFile) };
    }));
    closeImageEditor();
  };

  // ── Copilot actions ──────────────────────────────────────────

  const handleSummarize = async () => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id;
    setSummary({ status: 'loading' });
    try {
      const res = await api.get(`/api/ai/summarize/${ticketId}`);
      if (activeTicketId.current === ticketId) setSummary({ status: 'ready', text: res.data?.summary || 'No summary returned.' });
    } catch {
      if (activeTicketId.current === ticketId) setSummary({ status: 'error' });
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id;
    setDraft({ ...EMPTY_DRAFT, status: 'loading' });
    setRightOpenOnMobile();
    try {
      const res = await api.get(`/api/ai/draft/${ticketId}`);
      if (activeTicketId.current === ticketId) {
        setDraft({ status: 'ready', text: res.data?.draft || '', sources: Array.isArray(res.data?.sources) ? res.data.sources : [] });
        setVotes(v => ({ ...v, DRAFT: undefined }));
      }
    } catch {
      if (activeTicketId.current === ticketId) setDraft({ ...EMPTY_DRAFT, status: 'error' });
    }
  };

  const setRightOpenOnMobile = () => {
    if (layout.rightCollapsed || layout.middleMaximized) updateLayout({ rightCollapsed: false, middleMaximized: false });
  };

  const handleUseDraft = () => {
    setIsInternal(false);
    setReplyMsg(draft.text);
    setMobilePane('ticket');
    setTimeout(() => replyRef.current?.focus(), 0);
    addToast('Review the reply before sending.', 'Reply added', 'success');
  };

  const handleVote = async (kind, helpful) => {
    if (!selectedTicket) return;
    setVotes(v => ({ ...v, [kind]: helpful }));
    try {
      await api.post('/api/ai/feedback', { ticketId: selectedTicket.id, kind, helpful });
    } catch { /* feedback is best-effort */ }
  };

  const handleLink = async (targetId) => {
    if (!selectedTicket) return;
    try {
      await api.post(`/api/tickets/${selectedTicket.id}/link/${targetId}`);
      addToast('Tickets linked.', 'Linked', 'success');
      fetchLinkedTickets(selectedTicket.id);
    } catch {
      addToast('Could not link the tickets.', 'Error', 'error');
    }
  };

  const handleUnlink = async (targetId) => {
    if (!selectedTicket) return;
    try {
      await api.delete(`/api/tickets/${selectedTicket.id}/link/${targetId}`);
      fetchLinkedTickets(selectedTicket.id);
    } catch {
      addToast('Could not unlink the ticket.', 'Error', 'error');
    }
  };

  const handleBulkResolve = () => {
    if (!selectedTicket) return;
    openConfirm({
      title: 'Resolve all linked tickets?',
      message: `This resolves this ticket and ${linkedTickets.length} linked ticket${linkedTickets.length === 1 ? '' : 's'}.`,
      confirmText: 'Resolve all',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.post(`/api/tickets/${selectedTicket.id}/resolve-all-linked`);
          addToast('All linked tickets resolved.', 'Done', 'success');
          reloadTicket(selectedTicket.id);
          fetchLinkedTickets(selectedTicket.id);
        } catch {
          addToast('Bulk resolve failed.', 'Error', 'error');
        }
      },
    });
  };

  const handleCreateKbFromTicket = async () => {
    if (!selectedTicket) return;
    try {
      await api.post(`/api/knowledge/from-ticket/${selectedTicket.id}`);
      addToast('A KB draft was created from this ticket.', 'Draft created', 'success');
    } catch {
      addToast('Failed to create a KB draft.', 'Error', 'error');
    }
  };

  // ── KB drafts ────────────────────────────────────────────────

  const handleCreateDraft = async (e) => {
    e.preventDefault();
    if (!newDraftTitle.trim() || !newDraftContent.trim()) return;
    setSubmittingDraft(true);
    try {
      await api.post('/api/knowledge', { title: newDraftTitle, content: newDraftContent, categoryId: newDraftCategory || null });
      addToast('Your draft was submitted for review.', 'Draft saved', 'success');
      setNewDraftTitle(''); setNewDraftContent(''); setNewDraftCategory('');
      fetchDraftArticles();
    } catch {
      addToast('Failed to save the draft.', 'Error', 'error');
    } finally {
      setSubmittingDraft(false);
    }
  };

  const handleDeleteDraft = (id) => {
    openConfirm({
      title: 'Delete this draft?',
      message: 'This permanently deletes the knowledge base draft.',
      confirmText: 'Delete draft',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/api/knowledge/${id}`);
          addToast('Draft deleted.', 'Deleted', 'success');
          fetchDraftArticles();
        } catch {
          addToast('Failed to delete the draft.', 'Error', 'error');
        }
      },
    });
  };

  // ── Reassignment ─────────────────────────────────────────────

  const handleReassignRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !reassignReason.trim()) return;
    setSubmittingReassign(true);
    try {
      await api.post(`/api/tickets/${selectedTicket.id}/reassign-request`, {
        targetCategoryId: reassignCategory || null,
        reason: reassignReason.trim(),
      });
      addToast('An admin will review your request.', 'Request submitted', 'success');
      setShowReassignModal(false);
      setReassignCategory('');
      setReassignReason('');
      reloadTicket(selectedTicket.id);
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to submit the request.', 'Error', 'error');
    } finally {
      setSubmittingReassign(false);
    }
  };

  // ── Keyboard shortcuts ───────────────────────────────────────

  const moveSelection = (delta) => {
    if (visibleTickets.length === 0) return;
    const idx = visibleTickets.findIndex(t => t.id === selectedTicket?.id);
    const next = visibleTickets[Math.max(0, Math.min(visibleTickets.length - 1, idx + delta))];
    if (next && next.id !== selectedTicket?.id) selectTicketForWorkspace(next);
  };

  const focusComposer = (internal) => {
    if (!selectedTicket) return;
    setIsInternal(internal);
    setMobilePane('ticket');
    setTimeout(() => replyRef.current?.focus(), 0);
  };

  const anyModalOpen = confirmModal.open || showReassignModal || imageEditorOpen || !!attachmentPreview || !!openArticleId;

  useHotkeys({
    j: () => moveSelection(1),
    k: () => moveSelection(-1),
    '/': () => { updateLayout({ leftCollapsed: false, middleMaximized: false }); setMobilePane('queue'); setTimeout(() => searchRef.current?.focus(), 0); },
    r: () => focusComposer(false),
    n: () => focusComposer(true),
    'g d': () => selectedTicket && handleGenerateDraft(),
    e: () => selectedTicket && selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && openConfirm({
      title: 'Resolve this ticket?',
      message: 'The customer will be notified that their ticket is resolved.',
      confirmText: 'Resolve',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: () => { closeConfirm(); updateTicketProperties({ status: 'RESOLVED' }); },
    }),
  }, activeTab === 'queue' && !anyModalOpen);

  // ── Render ───────────────────────────────────────────────────

  const modals = (
    <>
      <ImageMarkupEditor
        open={imageEditorOpen}
        file={previewEditFile || replyAttachments.find(item => item.id === editingAttachmentId)?.file || null}
        onClose={closeImageEditor}
        onSave={handleEditedImage}
        actionLabel={editingImageMode === 'resend' ? 'Send edited image' : 'Save edited image'}
        title={editingImageMode === 'resend' ? 'Edit received image' : 'Edit image before sending'}
      />
      <AttachmentPreviewModal attachment={attachmentPreview} onClose={() => setAttachmentPreview(null)} onEditImage={openImageEditFromPreview} />
      {openArticleId && <ArticleModal articleId={openArticleId} onClose={() => setOpenArticleId(null)} />}
      <ReassignModal
        open={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        categories={categories}
        category={reassignCategory}
        onCategoryChange={setReassignCategory}
        reason={reassignReason}
        onReasonChange={setReassignReason}
        submitting={submittingReassign}
        onSubmit={handleReassignRequestSubmit}
      />
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
    </>
  );

  if (activeTab === 'kb-drafts') {
    return (
      <>
        <KbDraftsTab
          title={newDraftTitle} onTitleChange={setNewDraftTitle}
          content={newDraftContent} onContentChange={setNewDraftContent}
          category={newDraftCategory} onCategoryChange={setNewDraftCategory}
          categories={categories}
          submitting={submittingDraft} onSubmit={handleCreateDraft}
          drafts={draftArticles} loading={draftsLoading}
          onRefresh={fetchDraftArticles} onDelete={handleDeleteDraft}
        />
        {modals}
      </>
    );
  }

  const paneClass = (pane, hiddenOnDesktop) =>
    `${mobilePane === pane ? 'flex' : 'hidden'} ${hiddenOnDesktop ? 'lg:hidden' : 'lg:flex'} flex-col min-h-0 min-w-0`;

  const splitter = (side) => (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={(e) => startResize(side, e)}
      onDoubleClick={() => updateLayout(side === 'left' ? { leftWidth: DEFAULT_LAYOUT.leftWidth } : { rightWidth: DEFAULT_LAYOUT.rightWidth })}
      title="Drag to resize · double-click to reset"
      className={`hidden lg:block w-1 -mx-0.5 z-10 shrink-0 cursor-col-resize transition-colors ${resizing === side ? 'bg-primary' : 'hover:bg-primary/40'}`}
    />
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        <aside
          className={`${paneClass('queue', leftHidden)} w-full lg:w-[var(--queue-w)] shrink-0 bg-surface-container-low lg:border-r border-outline-variant`}
          style={{ '--queue-w': `${layout.leftWidth}px` }}
          aria-label="Inbox"
        >
          <TicketQueue
            tickets={tickets}
            visibleTickets={visibleTickets}
            loading={ticketsLoading}
            selectedId={selectedTicket?.id}
            onSelect={selectTicketForWorkspace}
            onRefresh={fetchQueue}
            scope={queueScope} onScopeChange={setQueueScope}
            quickFilter={quickFilter} onQuickFilterChange={setQuickFilter}
            statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter} onPriorityFilterChange={setPriorityFilter}
            categoryFilter={categoryFilter} onCategoryFilterChange={setCategoryFilter}
            categories={categories}
            search={ticketSearch} onSearchChange={setTicketSearch}
            searchRef={searchRef}
            onCollapse={() => updateLayout({ leftCollapsed: true })}
          />
        </aside>
        {!leftHidden && splitter('left')}

        <main className={`${paneClass('ticket', false)} flex-1 bg-background`} aria-label="Conversation">
          <ConversationPanel
            ticket={selectedTicket}
            replies={replies}
            repliesLoading={repliesLoading}
            ticketAttachments={ticketAttachments}
            currentUserId={user?.userId}
            onOpenAttachment={openAttachmentPreview}
            onOpenArticle={setOpenArticleId}
            chatEndRef={chatEndRef}
            header={{
              updating: updatingTicket,
              onUpdate: updateTicketProperties,
              onBack: () => setMobilePane('queue'),
              showInboxButton: leftHidden,
              onShowInbox: () => updateLayout({ leftCollapsed: false, middleMaximized: false }),
              showCopilotButton: rightHidden,
              onShowCopilot: () => updateLayout({ rightCollapsed: false, middleMaximized: false }),
              onDraftKb: handleCreateKbFromTicket,
              onRequestReassign: () => { setReassignCategory(''); setReassignReason(''); setShowReassignModal(true); },
              maximized: layout.middleMaximized,
              onToggleMaximize: () => updateLayout(p => ({ ...p, middleMaximized: !p.middleMaximized })),
            }}
            composer={selectedTicket && (
              <ReplyComposer
                ticketId={selectedTicket.id}
                value={replyMsg}
                onChange={setReplyMsg}
                isInternal={isInternal}
                onModeChange={setIsInternal}
                textareaRef={replyRef}
                attachments={replyAttachments}
                onAddFiles={addReplyAttachments}
                onRemoveAttachment={removeReplyAttachment}
                onEditAttachment={openImageEditor}
                sending={sendingReply}
                onSend={handleSendReply}
                onSendAndResolve={handleSendAndResolve}
                addToast={addToast}
              />
            )}
          />
        </main>

        {!rightHidden && splitter('right')}
        <aside
          className={`${paneClass('copilot', rightHidden)} w-full lg:w-[var(--copilot-w)] shrink-0 lg:border-l border-outline-variant`}
          style={{ '--copilot-w': `${layout.rightWidth}px` }}
          aria-label="Copilot"
        >
          <CopilotPanel
            ticket={selectedTicket}
            sla={selectedTicketSla}
            insights={insights}
            summary={summary}
            draft={draft}
            similar={similar}
            linked={linkedTickets}
            votes={votes}
            onRefreshInsights={() => selectedTicket && loadInsights(selectedTicket.id, true)}
            onApplyPriority={(priority) => updateTicketProperties({ priority })}
            onSummarize={handleSummarize}
            onGenerateDraft={handleGenerateDraft}
            onUseDraft={handleUseDraft}
            onVote={handleVote}
            onLink={handleLink}
            onUnlink={handleUnlink}
            onBulkResolve={handleBulkResolve}
            onOpenTicket={openTicket}
            onOpenArticle={setOpenArticleId}
            onCollapse={() => updateLayout({ rightCollapsed: true })}
          />
        </aside>
      </div>

      {/* Mobile: panes become bottom tabs */}
      <nav className="lg:hidden flex border-t border-outline-variant bg-surface-container-low shrink-0" aria-label="Workspace panels">
        {[
          { id: 'queue', icon: 'inbox', label: 'Inbox' },
          { id: 'ticket', icon: 'forum', label: 'Ticket' },
          { id: 'copilot', icon: 'auto_awesome', label: 'Copilot' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobilePane(tab.id)}
            aria-current={mobilePane === tab.id ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-2.5 text-[11.5px] font-medium cursor-pointer ${
              mobilePane === tab.id ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined !text-[21px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {modals}
    </div>
  );
};

export default AgentWorkspace;
