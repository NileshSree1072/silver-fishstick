import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import ImageMarkupEditor from '../../components/ImageMarkupEditor';
import AttachmentPreviewModal from '../../components/AttachmentPreviewModal';
import ArticleModal from '../../components/ArticleModal';
import { createPendingAttachment, getAttachmentKind } from '../../utils/ticketMeta';
import HelpCenterTab from './components/HelpCenterTab';
import NewTicketTab from './components/NewTicketTab';
import MyTicketsTab from './components/MyTicketsTab';

const sameId = (a, b) => a && b && a.toString().toLowerCase() === b.toString().toLowerCase();

const CustomerPortal = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const { subscribeToTicket, addToast } = useNotifications();

  // ── Help center ──────────────────────────────────────────────
  const [kbQuery, setKbQuery] = useState('');
  const [kbSearched, setKbSearched] = useState('');
  const [articles, setArticles] = useState([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [openArticle, setOpenArticle] = useState(null);     // loaded article object
  const [openArticleId, setOpenArticleId] = useState(null); // id to fetch

  // ── New ticket ───────────────────────────────────────────────
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketCategory, setTicketCategory] = useState('');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [categories, setCategories] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [deflectionLoading, setDeflectionLoading] = useState(false);
  const deflectionRef = useRef(null);

  // ── My tickets ───────────────────────────────────────────────
  const [myTickets, setMyTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyPriority, setHistoryPriority] = useState('');
  const [historyCategory, setHistoryCategory] = useState('');
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [csatScore, setCsatScore] = useState(0);
  const [csatComment, setCsatComment] = useState('');
  const [submittingCsat, setSubmittingCsat] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [submittingAiFeedback, setSubmittingAiFeedback] = useState(false);
  const repliesEndRef = useRef(null);
  const replyRef = useRef(null);
  const activeTicketId = useRef(null);

  // ── Attachments & image editor ───────────────────────────────
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState(null);
  const [editingImageMode, setEditingImageMode] = useState('compose'); // compose | create | resend
  const [previewEditFile, setPreviewEditFile] = useState(null);
  const previewFileCacheRef = useRef(new Map());

  // ── Data loading ─────────────────────────────────────────────

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/admin/categories');
      setCategories(res.data || []);
    } catch { setCategories([]); }
  };

  const fetchArticles = async (q) => {
    setKbLoading(true);
    setKbSearched(q || '');
    try {
      const res = await api.get(q ? `/api/knowledge/search?q=${encodeURIComponent(q)}` : '/api/knowledge');
      setArticles(res.data || []);
    } catch {
      addToast('Failed to load articles.', 'Error', 'error');
    } finally {
      setKbLoading(false);
    }
  };

  const clearReplyAttachments = () => {
    setReplyAttachments(prev => {
      prev.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const selectTicketForChat = async (ticket) => {
    activeTicketId.current = ticket.id;
    setSelectedTicket(ticket);
    localStorage.setItem('helpdesk_selected_customer_ticket_id', ticket.id);
    setNewReply('');
    clearReplyAttachments();
    setReplies([]);
    setRepliesLoading(true);
    setExistingRating(null);
    setCsatScore(0);
    setCsatComment('');
    setTicketAttachments([]);
    try {
      const repliesRes = await api.get(`/api/tickets/${ticket.id}/replies`);
      if (activeTicketId.current !== ticket.id) return;
      setReplies(repliesRes.data || []);
      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        try {
          const ratingRes = await api.get(`/api/tickets/${ticket.id}/rating`);
          if (ratingRes.data) setExistingRating(ratingRes.data);
        } catch { /* not rated yet */ }
      }
      try {
        const attRes = await api.get(`/api/tickets/${ticket.id}/attachments`);
        setTicketAttachments(attRes.data || []);
      } catch { /* attachments are optional */ }
    } catch {
      addToast('Could not load this conversation.', 'Error', 'error');
    } finally {
      if (activeTicketId.current === ticket.id) setRepliesLoading(false);
    }
  };

  const fetchMyTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await api.get('/api/tickets/my', {
        params: {
          size: 50,
          q: historySearch || null,
          status: historyStatus || null,
          priority: historyPriority || null,
          categoryId: historyCategory || null,
        },
      });
      const list = res.data?.content || [];
      setMyTickets(list);

      // Restore the previously open ticket after a refresh (desktop only — on mobile start at the list)
      const savedTicketId = localStorage.getItem('helpdesk_selected_customer_ticket_id');
      const wide = window.matchMedia?.('(min-width: 768px)').matches;
      if (savedTicketId && wide && activeTicketId.current !== savedTicketId) {
        const found = list.find(t => t.id === savedTicketId);
        if (found) {
          selectTicketForChat(found);
        } else {
          try {
            const ticketRes = await api.get(`/api/tickets/${savedTicketId}`);
            if (ticketRes.data) selectTicketForChat(ticketRes.data);
          } catch {
            localStorage.removeItem('helpdesk_selected_customer_ticket_id');
          }
        }
      }
    } catch { /* keep current list */ }
    finally { setTicketsLoading(false); }
  };

  const reloadTicketDetails = async (id) => {
    try {
      const res = await api.get(`/api/tickets/${id}`);
      setSelectedTicket(prev => (prev?.id === id ? res.data : prev));
      setMyTickets(prev => prev.map(t => (t.id === id ? res.data : t)));
    } catch { /* keep current view */ }
  };

  useEffect(() => {
    loadCategories();
    if (activeTab === 'kb') fetchArticles('');
    if (activeTab === 'history') fetchMyTickets();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'history') return undefined;
    const timer = setTimeout(fetchMyTickets, 300);
    return () => clearTimeout(timer);
  }, [historySearch, historyStatus, historyPriority, historyCategory]);

  useEffect(() => { repliesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [replies]);

  useEffect(() => {
    if (!selectedTicket?.id) return undefined;
    const ticketId = selectedTicket.id;
    const unsub = subscribeToTicket(ticketId, (msg) => {
      if (msg.isInternal) return; // internal agent notes never reach the customer UI
      setReplies(prev => (prev.some(r => sameId(r.id, msg.id)) ? prev : [...prev, msg]));
      reloadTicketDetails(ticketId);
    });
    return () => unsub?.();
  }, [selectedTicket?.id]);

  // Tickets opened from the command menu
  const openTicketFromEvent = useCallback((e) => {
    if (e.detail) selectTicketForChat(e.detail);
  }, []);
  useEffect(() => {
    window.addEventListener('aegis:open-ticket', openTicketFromEvent);
    return () => window.removeEventListener('aegis:open-ticket', openTicketFromEvent);
  }, [openTicketFromEvent]);

  // ── New ticket ───────────────────────────────────────────────

  const resetNewTicket = () => {
    setTicketTitle(''); setTicketDesc(''); setTicketCategory('');
    setTicketPriority('MEDIUM'); setAttachments([]); setAiSuggestions([]);
  };

  const handleTitleChange = (value) => {
    setTicketTitle(value);
    if (deflectionRef.current) clearTimeout(deflectionRef.current);
    if (value.trim().length < 5) { setAiSuggestions([]); setDeflectionLoading(false); return; }
    setDeflectionLoading(true);
    deflectionRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/ai/search?query=${encodeURIComponent(value)}`);
        setAiSuggestions(res.data || []);
      } catch { /* suggestions are best-effort */ }
      finally { setDeflectionLoading(false); }
    }, 500);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDesc.trim()) return;
    setSubmittingTicket(true);
    try {
      const res = await api.post('/api/tickets', {
        title: ticketTitle, description: ticketDesc,
        categoryId: ticketCategory || null, priority: ticketPriority,
      });
      const created = res.data;
      for (const file of attachments) {
        const fd = new FormData();
        fd.append('file', file);
        try { await api.post(`/api/tickets/${created.id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); }
        catch { addToast(`Could not upload ${file.name}.`, 'Attachment failed', 'error'); }
      }
      addToast("We'll reply here — our AI assistant usually answers within a minute.", 'Ticket submitted', 'success');
      resetNewTicket();
      setActiveTab('history');
      selectTicketForChat(created);
    } catch {
      addToast('Failed to submit the ticket.', 'Error', 'error');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const openSuggestion = (s) => {
    if (s.type === 'article' && s.id) {
      setOpenArticle({ id: s.id, title: s.title, content: s.content || s.description, categoryName: s.categoryName });
    } else {
      setOpenArticle({ title: s.title, content: s.description || s.content, categoryName: 'Solved question' });
    }
  };

  // ── Replies ──────────────────────────────────────────────────

  const sendReplyRequest = (message, items) => {
    if (items?.length > 0) {
      const formData = new FormData();
      formData.append('message', message ?? '');
      formData.append('isInternal', 'false');
      items.forEach(item => formData.append('files', item.file, item.name));
      return api.post(`/api/tickets/${selectedTicket.id}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post(`/api/tickets/${selectedTicket.id}/replies`, { message, isInternal: false });
  };

  const handleSendReply = async () => {
    if (!selectedTicket || (!newReply.trim() && replyAttachments.length === 0)) return;
    const outgoingMsg = newReply;
    const outgoingAttachments = [...replyAttachments];

    // Clear immediately for instant feedback; restore if sending fails
    setNewReply('');
    setReplyAttachments([]);

    setSendingReply(true);
    try {
      const res = await sendReplyRequest(outgoingMsg, outgoingAttachments);
      outgoingAttachments.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      if (res?.data) setReplies(prev => (prev.some(r => sameId(r.id, res.data.id)) ? prev : [...prev, res.data]));
      reloadTicketDetails(selectedTicket.id);
    } catch {
      setNewReply(outgoingMsg);
      setReplyAttachments(outgoingAttachments);
      addToast('Failed to send your message.', 'Error', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      await api.post(`/api/tickets/${selectedTicket.id}/replies`, {
        message: 'This did not resolve my issue. I am reopening this ticket.',
        isInternal: false,
      });
      const res = await api.patch(`/api/tickets/${selectedTicket.id}/reopen`);
      setSelectedTicket(res.data);
      setMyTickets(prev => prev.map(t => (t.id === selectedTicket.id ? res.data : t)));
      addToast('An agent will follow up.', 'Ticket reopened', 'success');
      const rep = await api.get(`/api/tickets/${selectedTicket.id}/replies`);
      setReplies(rep.data || []);
    } catch {
      addToast('Failed to reopen the ticket.', 'Error', 'error');
    }
  };

  const handleAiFeedback = async (helpful) => {
    if (!selectedTicket || submittingAiFeedback) return;
    setSubmittingAiFeedback(true);
    try {
      const res = await api.post(`/api/tickets/${selectedTicket.id}/ai-feedback`, { helpful });
      setSelectedTicket(res.data);
      setMyTickets(prev => prev.map(t => (t.id === selectedTicket.id ? res.data : t)));
      addToast(
        helpful ? 'Glad that helped. Your ticket is now closed.' : 'A support agent will pick this up soon.',
        helpful ? 'Ticket closed' : 'Sent to an agent',
        'success',
      );
      const rep = await api.get(`/api/tickets/${selectedTicket.id}/replies`);
      setReplies(rep.data || []);
    } catch {
      addToast('Could not record your feedback. Please try again.', 'Error', 'error');
    } finally {
      setSubmittingAiFeedback(false);
    }
  };

  const handleSubmitCsat = async (e) => {
    e.preventDefault();
    if (!csatScore || !selectedTicket) return;
    setSubmittingCsat(true);
    try {
      const res = await api.post(`/api/tickets/${selectedTicket.id}/rating`, { score: csatScore, comment: csatComment });
      setExistingRating(res.data);
      addToast('Thanks for your feedback.', 'Rating submitted', 'success');
    } catch {
      addToast('Failed to submit your rating.', 'Error', 'error');
    } finally {
      setSubmittingCsat(false);
    }
  };

  // ── Attachments & image editing ──────────────────────────────

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

  const openImageEditor = (attachmentId, mode) => {
    setEditingAttachmentId(attachmentId);
    setEditingImageMode(mode);
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
      sendReplyRequest('', [{ id: crypto.randomUUID(), file: outgoingFile, name: outgoingFile.name }])
        .then(res => {
          setReplies(prev => (prev.some(r => sameId(r.id, res.data.id)) ? prev : [...prev, res.data]));
          reloadTicketDetails(selectedTicket.id);
        })
        .catch(() => addToast('Failed to send the edited image.', 'Error', 'error'))
        .finally(closeImageEditor);
      return;
    }

    if (editingImageMode === 'create') {
      const original = attachments[editingAttachmentId];
      if (!original) return;
      const editedFile = new File([blob], fileName || original.name, { type: blob.type || 'image/png' });
      setAttachments(prev => prev.map((item, idx) => (idx === editingAttachmentId ? editedFile : item)));
      closeImageEditor();
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

  const editorFile = previewEditFile
    || (editingImageMode === 'create' ? attachments[editingAttachmentId] : replyAttachments.find(item => item.id === editingAttachmentId)?.file)
    || null;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="h-full w-full overflow-hidden">
      {activeTab === 'kb' && (
        <HelpCenterTab
          query={kbQuery}
          onQueryChange={setKbQuery}
          onSearch={fetchArticles}
          articles={articles}
          loading={kbLoading}
          searched={kbSearched}
          onOpenArticle={setOpenArticle}
          onNewTicket={() => setActiveTab('create-ticket')}
        />
      )}

      {activeTab === 'create-ticket' && (
        <NewTicketTab
          title={ticketTitle} onTitleChange={handleTitleChange}
          description={ticketDesc} onDescriptionChange={setTicketDesc}
          category={ticketCategory} onCategoryChange={setTicketCategory}
          priority={ticketPriority} onPriorityChange={setTicketPriority}
          categories={categories}
          attachments={attachments}
          onAddAttachments={(files) => setAttachments(prev => [...prev, ...Array.from(files || [])])}
          onRemoveAttachment={(i) => setAttachments(prev => prev.filter((_, j) => j !== i))}
          onEditAttachment={(i) => openImageEditor(i, 'create')}
          submitting={submittingTicket}
          onSubmit={handleCreateTicket}
          onCancel={() => { resetNewTicket(); setActiveTab('kb'); }}
          onDiscard={() => { resetNewTicket(); setActiveTab('kb'); addToast('Glad you found your answer.', 'Ticket discarded', 'success'); }}
          suggestions={aiSuggestions}
          suggestionsLoading={deflectionLoading}
          onOpenSuggestion={openSuggestion}
        />
      )}

      {activeTab === 'history' && (
        <MyTicketsTab
          endRef={repliesEndRef}
          composerRef={replyRef}
          list={{
            tickets: myTickets,
            loading: ticketsLoading,
            onSelect: selectTicketForChat,
            search: historySearch, onSearchChange: setHistorySearch,
            status: historyStatus, onStatusChange: setHistoryStatus,
            priority: historyPriority, onPriorityChange: setHistoryPriority,
            category: historyCategory, onCategoryChange: setHistoryCategory,
            categories,
            onRefresh: fetchMyTickets,
            onNewTicket: () => setActiveTab('create-ticket'),
          }}
          detail={{
            ticket: selectedTicket,
            replies,
            repliesLoading,
            ticketAttachments,
            currentUserId: user?.userId,
            onBack: () => { setSelectedTicket(null); activeTicketId.current = null; },
            onOpenAttachment: openAttachmentPreview,
            onOpenArticle: setOpenArticleId,
            submittingAiFeedback,
            onAiFeedback: handleAiFeedback,
            resolved: {
              rating: existingRating,
              score: csatScore, onScoreChange: setCsatScore,
              comment: csatComment, onCommentChange: setCsatComment,
              submitting: submittingCsat,
              onSubmitRating: handleSubmitCsat,
              onReopen: handleReopenTicket,
            },
            composer: {
              value: newReply,
              onChange: setNewReply,
              attachments: replyAttachments,
              onAddFiles: (fileList) => {
                const files = Array.from(fileList || []).filter(Boolean);
                if (files.length) setReplyAttachments(prev => [...prev, ...files.map(createPendingAttachment)]);
              },
              onRemoveAttachment: (id) => setReplyAttachments(prev => {
                const target = prev.find(item => item.id === id);
                if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
                return prev.filter(item => item.id !== id);
              }),
              onEditAttachment: (id) => openImageEditor(id, 'compose'),
              sending: sendingReply,
              onSend: handleSendReply,
            },
          }}
        />
      )}

      {(openArticle || openArticleId) && (
        <ArticleModal
          article={openArticle}
          articleId={openArticle ? null : openArticleId}
          onClose={() => { setOpenArticle(null); setOpenArticleId(null); }}
        />
      )}
      <AttachmentPreviewModal attachment={attachmentPreview} onClose={() => setAttachmentPreview(null)} onEditImage={openImageEditFromPreview} />
      <ImageMarkupEditor
        open={imageEditorOpen}
        file={editorFile}
        onClose={closeImageEditor}
        onSave={handleEditedImage}
        actionLabel={editingImageMode === 'resend' ? 'Send edited image' : 'Save edited image'}
        title={editingImageMode === 'resend' ? 'Edit received image' : editingImageMode === 'create' ? 'Edit image before submitting' : 'Edit image before sending'}
      />
    </div>
  );
};

export default CustomerPortal;
