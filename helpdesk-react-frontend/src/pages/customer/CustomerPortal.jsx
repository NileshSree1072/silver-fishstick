import React, { useState, useEffect, useRef } from 'react';
import { api, useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Loader2 } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import ImageMarkupEditor from '../../components/ImageMarkupEditor';
import FormattedMessage from '../../components/FormattedMessage';

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

const CustomerPortal = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const { subscribeToTicket, addToast } = useNotifications();

  // KB state
  const [kbQuery, setKbQuery]             = useState('');
  const [articles, setArticles]           = useState([]);
  const [kbLoading, setKbLoading]         = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Create ticket state
  const [ticketTitle, setTicketTitle]     = useState('');
  const [ticketDesc, setTicketDesc]       = useState('');
  const [ticketCategory, setTicketCategory] = useState('');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [categories, setCategories]       = useState([]);
  const [attachments, setAttachments]     = useState([]);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [deflectionLoading, setDeflectionLoading] = useState(false);
  const deflectionRef = useRef(null);
  const fileRef = useRef(null);

  // History state
  const [myTickets, setMyTickets]         = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyPriority, setHistoryPriority] = useState('');
  const [historyCategory, setHistoryCategory] = useState('');
  const [replies, setReplies]             = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [newReply, setNewReply]           = useState('');
  const [sendingReply, setSendingReply]   = useState(false);
  const [csatScore, setCsatScore]         = useState(0);
  const [csatComment, setCsatComment]     = useState('');
  const [submittingCsat, setSubmittingCsat] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [replyAttachments, setReplyAttachments] = useState([]);
  const repliesEndRef = useRef(null);
  const replyFileRef = useRef(null);
  const newReplyRef = useRef(null);

  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState(null);
  const [editingImageMode, setEditingImageMode] = useState('compose');
  const [editingImageTitle, setEditingImageTitle] = useState('Edit image before sending');
  const [previewEditFile, setPreviewEditFile] = useState(null);
  const previewFileCacheRef = useRef(new Map());

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
      sendReplyRequest('', false, [outgoingItem])
        .then((res) => {
          setReplies(prev => prev.some(r => r.id && res.data.id && r.id.toString().toLowerCase() === res.data.id.toString().toLowerCase()) ? prev : [...prev, res.data]);
          reloadTicketDetails(selectedTicket.id);
        })
        .catch(() => addToast('Failed to send edited image.', 'Error', 'error'))
        .finally(() => closeImageEditor());
      return;
    }

    if (editingImageMode === 'create') {
      const targetIndex = attachments.findIndex((_, idx) => idx === editingAttachmentId);
      if (targetIndex === -1) return;
      const editedFile = new File([blob], fileName || attachments[targetIndex].name, { type: blob.type || 'image/png' });
      setAttachments((prev) => prev.map((item, idx) => idx === editingAttachmentId ? editedFile : item));
      closeImageEditor();
      return;
    }

    const target = replyAttachments.find((item) => item.id === editingAttachmentId);
    if (!target) return;
    const editedFile = new File([blob], fileName || target.name, { type: blob.type || 'image/png' });
    updateReplyAttachmentFile(target.id, editedFile);
    closeImageEditor();
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

  const categoriesList = [
    { name: 'General', desc: 'Basic onboarding guides, account updates, and platform setup instructions.', icon: 'rocket_launch' },
    { name: 'Technical Support', desc: 'API connectivity, webhooks registration, and backend architecture guidelines.', icon: 'settings_applications' },
    { name: 'Billing & Plans', desc: 'Invoices tracker, subscription plans management, and payment methods.', icon: 'credit_card' },
    { name: 'Security & Privacy', desc: 'SSO configuration, 2FA credentials, and compliance policies.', icon: 'security' },
  ];

  useEffect(() => {
    loadCategories();
    if (activeTab === 'kb')      fetchArticles('');
    if (activeTab === 'history') fetchMyTickets();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    const timer = setTimeout(fetchMyTickets, 300);
    return () => clearTimeout(timer);
  }, [historySearch, historyStatus, historyPriority, historyCategory]);

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  useEffect(() => {
    if (newReplyRef.current) {
      newReplyRef.current.style.height = 'auto';
      newReplyRef.current.style.height = `${newReplyRef.current.scrollHeight}px`;
    }
  }, [newReply]);

  useEffect(() => {
    if (!selectedTicket?.id) return;
    const ticketId = selectedTicket.id;
    const unsub = subscribeToTicket(ticketId, (msg) => {
      console.log('Customer Portal: Received WebSocket message for ticket ' + ticketId, msg);
      if (msg.isInternal) return; // Prevent internal agent notes from leaking to customer UI
      setReplies(prev => prev.some(r => r.id && msg.id && r.id.toString().toLowerCase() === msg.id.toString().toLowerCase()) ? prev : [...prev, msg]);
      reloadTicketDetails(ticketId);
    });
    return () => unsub?.();
  }, [selectedTicket?.id]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/admin/categories');
      setCategories(res.data || []);
    } catch { setCategories([]); }
  };

  const fetchArticles = async (q) => {
    setKbLoading(true);
    try {
      const url = q ? `/api/knowledge/search?q=${encodeURIComponent(q)}` : '/api/knowledge';
      const res = await api.get(url);
      setArticles(res.data || []);
    } catch { addToast('Failed to load articles.', 'Error', 'error'); }
    finally { setKbLoading(false); }
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
        }
      });
      const list = res.data?.content || [];
      setMyTickets(list);

      // Auto-restore selected ticket on page refresh
      const savedTicketId = localStorage.getItem('helpdesk_selected_customer_ticket_id');
      if (savedTicketId) {
        const found = list.find(t => t.id === savedTicketId);
        if (found) {
          selectTicketForChat(found);
        } else {
          try {
            const ticketRes = await api.get(`/api/tickets/${savedTicketId}`);
            if (ticketRes.data) {
              selectTicketForChat(ticketRes.data);
            }
          } catch {
            localStorage.removeItem('helpdesk_selected_customer_ticket_id');
          }
        }
      }
    } catch {}
    finally { setTicketsLoading(false); }
  };

  const selectTicketForChat = async (ticket) => {
    setSelectedTicket(ticket);
    localStorage.setItem('helpdesk_selected_customer_ticket_id', ticket.id);
    setNewReply('');
    clearReplyAttachments();
    if (newReplyRef.current) newReplyRef.current.style.height = 'auto';
    setReplies([]);
    setRepliesLoading(true);
    setExistingRating(null);
    setCsatScore(0);
    setCsatComment('');
    setTicketAttachments([]);
    try {
      const repliesRes = await api.get(`/api/tickets/${ticket.id}/replies`);
      setReplies(repliesRes.data || []);
      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        try {
          const ratingRes = await api.get(`/api/tickets/${ticket.id}/rating`);
          if (ratingRes.data) setExistingRating(ratingRes.data);
        } catch {}
      }
      try {
        const attRes = await api.get(`/api/tickets/${ticket.id}/attachments`);
        setTicketAttachments(attRes.data || []);
      } catch {}
    } catch {}
    finally { setRepliesLoading(false); }
  };

  const reloadTicketDetails = async (id) => {
    try {
      const res = await api.get(`/api/tickets/${id}`);
      setSelectedTicket(res.data);
      setMyTickets(prev => prev.map(t => t.id === id ? res.data : t));
    } catch {}
  };

  const openAttachmentPreview = (attachment) => {
    const kind = getAttachmentKind(attachment);
    if (kind === 'file') {
      window.open(attachment.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setAttachmentPreview({ ...attachment, kind });
  };

  const closeAttachmentPreview = () => setAttachmentPreview(null);

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

  const sendReplyRequest = async (message, isInternal, items) => {
    if (items?.length > 0) {
      const formData = new FormData();
      formData.append('message', message ?? '');
      formData.append('isInternal', String(isInternal));
      items.forEach((item) => formData.append('files', item.file, item.name));
      return api.post(`/api/tickets/${selectedTicket.id}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    return api.post(`/api/tickets/${selectedTicket.id}/replies`, { message, isInternal });
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    setTicketTitle(value);
    if (deflectionRef.current) clearTimeout(deflectionRef.current);
    if (value.trim().length < 5) { setAiSuggestions([]); return; }
    setDeflectionLoading(true);
    deflectionRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/ai/search?query=${encodeURIComponent(value)}`);
        setAiSuggestions(res.data || []);
      } catch {}
      finally { setDeflectionLoading(false); }
    }, 600);
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
        catch {}
      }
      addToast('Ticket submitted successfully!', 'Success', 'success');
      setTicketTitle(''); setTicketDesc(''); setTicketCategory('');
      setTicketPriority('MEDIUM'); setAttachments([]); setAiSuggestions([]);
      setActiveTab('history');
      selectTicketForChat(created);
    } catch { addToast('Failed to submit ticket.', 'Error', 'error'); }
    finally { setSubmittingTicket(false); }
  };

  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTicket || (!newReply.trim() && replyAttachments.length === 0)) return;

    const outgoingMsg = newReply;
    const outgoingAttachments = [...replyAttachments];

    // Optimistically clear the message box immediately for instantaneous user feedback
    setNewReply('');
    clearReplyAttachments();
    if (newReplyRef.current) {
      newReplyRef.current.style.height = 'auto';
    }

    setSendingReply(true);
    try {
      const res = await sendReplyRequest(outgoingMsg, false, outgoingAttachments);
      if (res?.data) {
        setReplies(prev => prev.some(r => r.id && res.data.id && r.id.toString().toLowerCase() === res.data.id.toString().toLowerCase()) ? prev : [...prev, res.data]);
      }
      reloadTicketDetails(selectedTicket.id);
    } catch {
      // Restore previous content on network or submission error
      setNewReply(outgoingMsg);
      setReplyAttachments(outgoingAttachments);
      addToast('Failed to send reply.', 'Error', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      await api.post(`/api/tickets/${selectedTicket.id}/replies`, {
        message: 'This did not resolve my issue. I am reopening this ticket.',
        isInternal: false
      });
      const res = await api.patch(`/api/tickets/${selectedTicket.id}/reopen`);
      setSelectedTicket(res.data);
      addToast('Ticket reopened.', 'Reopened', 'success');
      setMyTickets(prev => prev.map(t => t.id === selectedTicket.id ? res.data : t));
      const rep = await api.get(`/api/tickets/${selectedTicket.id}/replies`);
      setReplies(rep.data || []);
    } catch {}
  };

  const handleConfirmAiResolution = async () => {
    if (!selectedTicket) return;
    try {
      await api.post(`/api/tickets/${selectedTicket.id}/replies`, {
        message: 'I confirmed the AI resolution worked and closed this ticket.',
        isInternal: false
      });
      const res = await api.patch(`/api/tickets/${selectedTicket.id}/close`);
      setSelectedTicket(res.data);
      addToast('Ticket successfully resolved and closed.', 'Ticket Closed', 'success');
      setMyTickets(prev => prev.map(t => t.id === selectedTicket.id ? res.data : t));
      const rep = await api.get(`/api/tickets/${selectedTicket.id}/replies`);
      setReplies(rep.data || []);
    } catch {
      addToast('Failed to close ticket.', 'Error', 'error');
    }
  };

  const handleRejectAiResolution = async () => {
    if (!selectedTicket) return;
    try {
      await api.post(`/api/tickets/${selectedTicket.id}/replies`, {
        message: 'This article did not resolve my issue. I still need help from a support agent.',
        isInternal: false
      });
      const res = await api.patch(`/api/tickets/${selectedTicket.id}/reopen`);
      setSelectedTicket(res.data);
      addToast('Ticket reopened. An agent will assist you soon.', 'Reopened', 'success');
      setMyTickets(prev => prev.map(t => t.id === selectedTicket.id ? res.data : t));
      const rep = await api.get(`/api/tickets/${selectedTicket.id}/replies`);
      setReplies(rep.data || []);
    } catch {
      addToast('Failed to reopen ticket.', 'Error', 'error');
    }
  };

  const handleSubmitCsat = async (e) => {
    e.preventDefault();
    if (!csatScore || !selectedTicket) return;
    setSubmittingCsat(true);
    try {
      const res = await api.post(`/api/tickets/${selectedTicket.id}/rating`, { score: csatScore, comment: csatComment });
      setExistingRating(res.data);
      addToast('Thank you for your feedback!', 'Submitted', 'success');
    } catch { addToast('Failed to submit feedback.', 'Error', 'error'); }
    finally { setSubmittingCsat(false); }
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col p-lg lg:p-xl bg-background text-on-surface">

      {/* ── KB TAB ─────────────────────────────────────────── */}
      {activeTab === 'kb' && (
        <div className="flex flex-col h-full overflow-hidden anim-fade-in w-full max-w-container-max mx-auto">
          {/* Hero Search Section */}
          <section className="mb-8 text-center pt-4 pb-8 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
            <h2 className="font-display-xl text-display-xl md:text-headline-lg text-on-surface mb-3 tracking-tight">How can we help you today?</h2>
            <p className="font-body-lg text-body-md text-on-surface-variant mb-6 max-w-xl mx-auto">Search our knowledge base for answers, or browse categories below to find documentation, guides, and troubleshooting steps.</p>
            
            {/* Search Input Box */}
            <div className="max-w-2xl mx-auto relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">search</span>
              <input 
                className="w-full bg-surface-container-high border border-outline-variant rounded-xl py-3.5 pl-12 pr-28 text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-surface-container transition-all" 
                placeholder="Search knowledge base articles..." 
                type="text"
                value={kbQuery}
                onChange={e => setKbQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchArticles(kbQuery)}
              />
              <button 
                onClick={() => fetchArticles(kbQuery)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-surface-container hover:bg-surface-container-highest border border-outline-variant rounded-lg px-3.5 py-1.5 flex items-center gap-1 text-secondary font-label-sm text-label-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Search
              </button>
            </div>
          </section>

          {/* Results / Categories */}
          <div className="flex-grow overflow-y-auto pr-1">
            {kbLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-on-surface-variant">
                <Loader2 size={20} className="animate-spin text-primary" />
                <span className="text-sm">Searching articles...</span>
              </div>
            ) : articles.length === 0 ? (
              <>
                {/* Custom Category Bento Grid */}
                <section className="mb-8">
                  <h3 className="font-title-md text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">Browse Categories</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoriesList.map((cat, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setKbQuery(cat.name);
                          fetchArticles(cat.name);
                        }}
                        className="bg-surface-container-low border border-outline-variant rounded-xl p-5 hover:bg-surface-container transition-colors group flex items-start gap-4 cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors shrink-0">
                          <span className="material-symbols-outlined">{cat.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-title-md text-base text-on-surface mb-1 group-hover:text-primary transition-colors">{cat.name}</h4>
                          <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">{cat.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] opacity-30 mb-2">find_in_page</span>
                  <p className="text-xs">Select a category above or type a search query to view articles.</p>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticle(art)}
                    className="bg-surface-container-low border border-outline-variant rounded-xl p-5 hover:bg-surface-container transition-all hover:scale-[1.01] hover:border-outline/50 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-container/10 border border-primary/20 text-primary uppercase">
                          {art.categoryName || 'General'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">{formatDate(art.createdAt)}</span>
                      </div>
                      <h4 className="font-title-md text-sm font-semibold text-on-surface mb-2 line-clamp-1">
                        {art.title}
                      </h4>
                      <p className="text-xs text-on-surface-variant mb-4 line-clamp-3 leading-relaxed">
                        {art.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                      Read article 
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ARTICLE MODAL ──────────────────────────────────── */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl overflow-hidden glass-panel"
            style={{ boxShadow: 'var(--shadow-xl)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary-container/10 border border-primary/25 text-primary uppercase">
                  {selectedArticle.categoryName || 'General'}
                </span>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-surface-container">
              <h3 className="text-lg font-bold text-on-surface mb-2">
                {selectedArticle.title}
              </h3>
              <p className="text-xs text-on-surface-variant mb-4">
                Published by <span className="font-semibold">{selectedArticle.authorName || 'AI Copilot'}</span> · {new Date(selectedArticle.createdAt).toLocaleString()}
              </p>
              <div className="h-px bg-outline-variant/20 mb-4" />
              <p className="text-xs leading-relaxed text-on-surface whitespace-pre-wrap">
                {selectedArticle.content}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE TICKET TAB ──────────────────────────────── */}
      {activeTab === 'create-ticket' && (
        <div className="flex-1 flex flex-col xl:flex-row gap-gutter overflow-hidden h-full anim-fade-in w-full max-w-container-max mx-auto">
          {/* Form Area */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="mb-lg">
              <h1 className="font-title-md text-xl text-on-surface mb-1.5">Create New Ticket</h1>
              <p className="text-on-surface-variant text-xs">Provide details below. Our AI assistant will suggest relevant resources in real time.</p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-md bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-sm">
              {/* Title / Subject */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-on-surface-variant" htmlFor="subject">
                  Subject <span className="text-error" title="Required">*</span>
                </label>
                <input 
                  required 
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-on-surface-variant/40 text-xs" 
                  id="subject" 
                  placeholder="Brief summary of the issue" 
                  type="text"
                  value={ticketTitle}
                  onChange={handleTitleChange}
                />
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-on-surface-variant" htmlFor="category">
                  Category <span className="text-on-surface-variant/50 font-normal lowercase italic">(Optional)</span>
                </label>
                <CustomSelect
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={ticketCategory}
                  onChange={val => setTicketCategory(val)}
                  placeholder="Select category..."
                  triggerClassName="!bg-surface-container-low px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-on-surface-variant" htmlFor="description">
                  Detailed Description <span className="text-error" title="Required">*</span>
                </label>
                <textarea 
                  required 
                  rows={5} 
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-on-surface-variant/40 resize-y text-xs font-body-md" 
                  id="description" 
                  placeholder="Provide context. Include errors, environment info, steps to reproduce, and logs." 
                  value={ticketDesc}
                  onChange={e => setTicketDesc(e.target.value)}
                />
              </div>

              {/* Drag and Drop File Upload */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-on-surface-variant">
                  Attachments <span className="text-on-surface-variant/50 font-normal lowercase italic">(Optional)</span>
                </label>
                <div 
                  className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer relative overflow-hidden group"
                  onClick={() => fileRef.current?.click()}
                >
                  <input 
                    type="file" 
                    multiple 
                    ref={fileRef} 
                    className="hidden" 
                    onChange={e => setAttachments(prev => [...prev, ...Array.from(e.target.files)])} 
                  />
                  <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">upload_file</span>
                    </div>
                    <p className="text-xs font-medium text-on-surface">Drag & drop files or click to browse</p>
                    <p className="text-[10px] text-on-surface-variant">Supports images, text, and PDF logs up to 10MB</p>
                  </div>
                </div>

                {attachments.length > 0 && (
                   <div className="mt-3 space-y-1">
                     {attachments.map((f, i) => {
                       const isImg = f.type?.startsWith('image/');
                       return (
                         <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-xs">
                           <span className="truncate max-w-[240px] text-on-surface font-mono">{f.name}</span>
                           <div className="flex items-center gap-1.5">
                             {isImg && (
                               <button type="button" onClick={() => openImageEditor(i, 'create', 'Edit image before submitting')} className="text-secondary hover:text-primary cursor-pointer">
                                 <span className="material-symbols-outlined text-[16px]">edit</span>
                               </button>
                             )}
                             <button type="button" onClick={() => setAttachments(prev => prev.filter((_,j) => j !== i))}
                               className="text-on-surface-variant hover:text-error cursor-pointer">
                               <span className="material-symbols-outlined text-[16px]">close</span>
                             </button>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 )}
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
                <button 
                  onClick={() => {
                    setTicketTitle(''); setTicketDesc(''); setTicketCategory('');
                    setTicketPriority('MEDIUM'); setAttachments([]); setAiSuggestions([]);
                    setActiveTab('kb');
                  }} 
                  className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors text-xs font-medium cursor-pointer" 
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  disabled={submittingTicket}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-[#5a52f0] transition-all text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                  type="submit"
                >
                  {submittingTicket ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Ticket
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* AI Deflection Sidebar */}
          <div className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-4">
            <div className="glass-ai rounded-xl p-5 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <h3 className="font-title-md text-sm font-bold text-secondary">AI Suggestions</h3>
              </div>
              <p className="text-[11px] text-on-surface-variant mb-4 leading-relaxed">Based on your subject, these resources might solve your issue instantly.</p>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {deflectionLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant gap-2">
                    <Loader2 size={18} className="animate-spin text-secondary" />
                    <span className="text-[10px]">Searching resources...</span>
                  </div>
                ) : aiSuggestions.length === 0 ? (
                  <div className="py-8 text-center text-on-surface-variant opacity-60">
                    <span className="material-symbols-outlined text-[28px] mb-1 text-secondary/30">lightbulb</span>
                    <p className="text-[10px] leading-relaxed px-2">Type a descriptive title (e.g. VPN config error) to see quick articles.</p>
                  </div>
                ) : (
                  aiSuggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedArticle({ title: s.title, content: s.description || s.content, categoryName: s.categoryName || 'Match', createdAt: s.createdAt || new Date(), authorName: 'System' })}
                      className="block bg-surface-container-low/50 hover:bg-surface-container border border-outline-variant/30 rounded-lg p-3 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                          {s.title}
                        </h4>
                        <span className="material-symbols-outlined text-on-surface-variant text-[14px]">open_in_new</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant line-clamp-2 leading-relaxed mb-2">
                        {s.description || s.content}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase tracking-wider text-secondary px-1.5 py-0.5 rounded bg-secondary-container/10 border border-secondary/20">
                          {s.score ? `${Math.round(s.score * 100)}% Match` : 'Article'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MY TICKETS TAB ─────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="flex-1 flex gap-5 overflow-hidden anim-fade-in h-full">

          {/* Left panel: tickets list */}
          <div className="w-80 shrink-0 flex flex-col bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30 bg-surface-container-high/30">
              <span className="text-sm font-semibold text-on-surface">My Tickets</span>
              <button onClick={fetchMyTickets} className="p-1 rounded-md text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>

            <div className="p-3 space-y-2 border-b border-outline-variant/30 bg-surface-container-lowest/40">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/50">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">search</span>
                <input
                  className="flex-1 bg-transparent outline-none text-[11px] text-on-surface placeholder:text-on-surface-variant/50"
                  placeholder="Search ID or title..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect
                  options={[{ value: '', label: 'All Statuses' }, ...Object.entries(statusConfig).map(([value, cfg]) => ({ value, label: cfg.label }))]}
                  value={historyStatus}
                  onChange={setHistoryStatus}
                  triggerClassName="py-1.5 px-2 text-[10px]"
                />
                <CustomSelect
                  options={[{ value: '', label: 'All Priorities' }, ...Object.entries(priorityConfig).map(([value, cfg]) => ({ value, label: cfg.label }))]}
                  value={historyPriority}
                  onChange={setHistoryPriority}
                  triggerClassName="py-1.5 px-2 text-[10px]"
                />
              </div>
              <CustomSelect
                options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                value={historyCategory}
                onChange={setHistoryCategory}
                triggerClassName="py-1.5 px-2 text-[10px]"
              />
            </div>

            <div className="flex-grow overflow-y-auto p-2 space-y-1 bg-surface-container-lowest/30">
              {ticketsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-on-surface-variant">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span className="text-xs">Loading history...</span>
                </div>
              ) : myTickets.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] opacity-40 mb-1">confirmation_number</span>
                  <p className="text-xs">No submitted tickets.</p>
                </div>
              ) : (
                myTickets.map(t => {
                  const isActive = selectedTicket?.id === t.id;
                  const scfg = statusConfig[t.status] || statusConfig.OPEN;
                  
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
                      onClick={() => selectTicketForChat(t)}
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
                          {formatDate(t.createdAt)} · {t.assignedToName ? `Agent: ${t.assignedToName}` : 'Awaiting assignment'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Active Chat Thread */}
          <div className="flex-grow bg-surface-container-low border border-outline-variant/30 rounded-xl flex flex-col overflow-hidden h-full">
            {selectedTicket ? (
              <>
                {/* Chat details header */}
                <div className="px-5 py-4 border-b border-outline-variant/30 bg-surface-container flex justify-between items-start shrink-0">
                  <div className="min-w-0 flex-1 mr-4">
                    <h3 className="text-sm font-semibold text-on-surface truncate">{selectedTicket.title}</h3>
                    <p className="text-[10px] text-on-surface-variant mt-1 flex items-center gap-1.5">
                      <span className="font-mono text-primary">{getTicketNumber(selectedTicket)}</span>
                      <span>•</span>
                      <span>{selectedTicket.categoryName || 'General Category'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/40 text-on-surface-variant uppercase">
                      {selectedTicket.priority} Priority
                    </span>
                    <StatusBadge status={selectedTicket.status} />
                  </div>
                </div>

                {/* Messages feed */}
                <div className="flex-grow overflow-y-auto p-5 space-y-4">
                  
                  {/* Original Description Container */}
                  <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/50 shadow-sm mb-6">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2 mb-3 text-[10px] text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">description</span>
                        <span>Submitted by <strong className="text-on-surface font-semibold">{selectedTicket.createdByName}</strong></span>
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
                      const isCustomer = rep.senderRole === 'USER';
                      const hasAttachments = Array.isArray(rep.attachments) && rep.attachments.length > 0;

                      let bubbleClass = "p-4 rounded-xl shadow-sm text-xs leading-relaxed ";
                      let headerTextClass;
                      let avatarBgClass;
                      let borderClass = isMe ? "rounded-br-none" : "rounded-bl-none";

                      if (isAi) {
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
                            {/* Message Header */}
                            <div className="flex items-center gap-1.5 mb-2 border-b border-outline-variant/10 pb-1 text-[10px]">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${avatarBgClass}`}>
                                {isAi ? <span className="material-symbols-outlined text-[10px] icon-fill">auto_awesome</span> : getInitials(rep.senderName)}
                              </div>
                              <span className={`font-semibold uppercase tracking-wider ${headerTextClass}`}>
                                {rep.senderName}{isAi ? ' (AI Copilot)' : ''}
                              </span>
                              <span className="text-on-surface-variant opacity-75">•</span>
                              <span className="text-on-surface-variant opacity-75">{formatTime(rep.createdAt)}</span>
                            </div>
                            
                            {/* Message Message */}
                            {rep.message && rep.message.trim().length > 0 ? (
                              <FormattedMessage content={rep.message} className="font-body-md" />
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
                  <div ref={repliesEndRef} />
                </div>

                {/* Bottom interactive action card for RESOLVED/CLOSED tickets */}
                {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                  <div className="p-4 border-t border-outline-variant/30 bg-surface-container shrink-0 space-y-3">
                    
                    {/* Bot Resolution Dialog Confirmation buttons */}
                    {selectedTicket.status === 'RESOLVED' && selectedTicket.aiResolved && (
                      <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20 space-y-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                          <span className="font-semibold text-on-surface">
                            AI Assistant solved this ticket. Did this resolve your issue?
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={handleConfirmAiResolution} 
                            className="bg-primary hover:bg-[#5a52f0] text-white py-1.5 px-4 rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-primary transition-all active:scale-[0.98]"
                          >
                            <span className="material-symbols-outlined text-[14px]">check_circle</span> Yes, close ticket
                          </button>
                          <button 
                            type="button" 
                            onClick={handleRejectAiResolution} 
                            className="bg-error/10 hover:bg-error/20 border border-error/30 text-error py-1.5 px-4 rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span> No, I still need help
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedTicket.status === 'RESOLVED' && !selectedTicket.aiResolved && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs">
                        <span className="text-on-surface-variant font-medium">Was this resolution helpful?</span>
                        <button 
                          onClick={handleReopenTicket} 
                          className="bg-transparent hover:bg-surface-container border border-outline-variant rounded-md px-3 py-1 text-on-surface flex items-center gap-1 text-[11px] cursor-pointer transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px]">history</span> Reopen Ticket
                        </button>
                      </div>
                    )}

                    {/* CSAT ratings feedback form */}
                    {existingRating ? (
                      <div className="p-3 bg-primary-container/5 border border-primary/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="material-symbols-outlined text-primary text-[18px] icon-fill">star</span>
                          <span className="text-xs font-semibold text-primary">Feedback Submitted</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className="material-symbols-outlined text-[16px]" style={{ color: s <= existingRating.score ? '#facc15' : 'var(--text-disabled)', fontVariationSettings: s <= existingRating.score ? "'FILL' 1" : "'FILL' 0" }}>
                              star
                            </span>
                          ))}
                        </div>
                        {existingRating.comment && <p className="text-[10px] mt-1.5 text-on-surface-variant italic font-serif">"{existingRating.comment}"</p>}
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitCsat} className="space-y-2">
                        <p className="text-xs font-semibold text-on-surface">Rate your support experience:</p>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => (
                            <button type="button" key={s} onClick={() => setCsatScore(s)} className="cursor-pointer p-0.5">
                              <span className="material-symbols-outlined text-[20px] transition-colors hover:text-[#facc15]" style={{ color: s <= csatScore ? '#facc15' : 'var(--text-disabled)', fontVariationSettings: s <= csatScore ? "'FILL' 1" : "'FILL' 0" }}>
                                star
                              </span>
                            </button>
                          ))}
                        </div>
                        {csatScore > 0 && (
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary placeholder:text-on-surface-variant/40" 
                              placeholder="Add an optional comment..." 
                              value={csatComment} 
                              onChange={e => setCsatComment(e.target.value)} 
                            />
                            <button 
                              type="submit" 
                              disabled={submittingCsat} 
                              className="px-4 py-1.5 bg-primary text-on-primary hover:bg-[#5a52f0] rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                              {submittingCsat ? <Loader2 size={13} className="animate-spin" /> : 'Submit'}
                            </button>
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                )}

                {/* Reply Composer box for active tickets */}
                {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                  <form onSubmit={handleSendReply} className="space-y-3 p-4 border-t border-outline-variant/30 bg-surface-container shrink-0">
                    <div className="flex gap-2.5 items-stretch">
                      <textarea 
                        ref={newReplyRef}
                        rows={2}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/40 resize-none max-h-48 overflow-y-auto"
                        placeholder="Type your message to the support team or attach files..."
                        value={newReply} 
                        onChange={e => setNewReply(e.target.value)} 
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(e);
                          }
                        }}
                        style={{ maxHeight: '192px' }}
                      />
                      <div className="flex flex-col gap-2 shrink-0">
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
                          className="px-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                        >
                          Attach
                        </button>
                        <button 
                          type="submit" 
                          disabled={sendingReply || (!newReply.trim() && replyAttachments.length === 0)} 
                          className="px-4 py-2 bg-primary text-on-primary hover:bg-[#5a52f0] rounded-lg text-xs font-semibold flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {sendingReply ? <Loader2 size={13} className="animate-spin" /> : <span className="material-symbols-outlined text-[16px]">send</span>}
                        </button>
                      </div>
                    </div>

                    {replyAttachments.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {replyAttachments.map((item) => {
                          const isImg = item.file.type?.startsWith('image/');
                          return (
                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-outline-variant bg-background/60 px-3 py-2 text-xs">
                              <span className="flex min-w-0 items-center gap-1.5 text-on-surface">
                                <span className="material-symbols-outlined text-[14px]">{isImg ? 'image' : 'attachment'}</span>
                                <span className="truncate">{item.name}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isImg && (
                                  <button type="button" onClick={() => openImageEditor(item.id, 'compose', 'Edit image before sending')} className="text-secondary hover:text-primary cursor-pointer">
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
                )}

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
                              className="max-h-[70vh] w-auto rounded-lg object-contain transition-all group-hover:scale-[1.01]"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-white text-[24px]">edit</span>
                              <span className="text-white text-xs font-semibold">Click to edit image</span>
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
              <div className="flex-grow flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface-container-lowest/30">
                <span className="material-symbols-outlined text-[48px] opacity-25">chat</span>
                <p className="text-xs">Select a ticket from the sidebar queue to view conversation.</p>
              </div>
            )}

            <ImageMarkupEditor
              open={imageEditorOpen}
              file={previewEditFile || (editingImageMode === 'create' ? attachments[editingAttachmentId] : (replyAttachments.find((item) => item.id === editingAttachmentId)?.file || null))}
              onClose={closeImageEditor}
              onSave={handleEditedImage}
              actionLabel={editingImageMode === 'resend' ? 'Send edited image' : 'Save edited image'}
              title={editingImageMode === 'resend' ? 'Edit received image' : editingImageTitle}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
