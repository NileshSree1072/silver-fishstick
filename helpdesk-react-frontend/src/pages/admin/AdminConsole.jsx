import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import CustomSelect from '../../components/CustomSelect';
import { createPortal } from 'react-dom';
import SLAConfig from './SLAConfig';
import LiveActivityFeed from '../../components/admin/LiveActivityFeed';
import ConfirmModal from '../../components/ConfirmModal';
import AgentPerformance from './AgentPerformance';
import UserPerformance from './UserPerformance';
import TicketAuditLog from './TicketAuditLog';
import BreachLog from './BreachLog';
import TransferLog from './TransferLog';
import AgentManagementTab from './AgentManagementTab';
import {
  Users, Sliders, CheckSquare, LayoutDashboard, Sparkles, RefreshCw,
  TrendingUp, Award, UserPlus, Trash2, Edit2,
  FolderKanban, Plus, ShieldAlert, Check, X, Shield, Eye,
  Loader2, Activity, ToggleLeft, ToggleRight, BookOpen, Tag,
  Clock, FileText, BarChart2, UserCog, Ticket, Search,
  ArrowRightLeft, ChevronDown, AlertCircle, CheckCircle2, Inbox
} from 'lucide-react';

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?';
const formatDate  = (d) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
const getTicketNumber = (ticket) => ticket?.ticketNumber || `HD-${ticket?.id?.slice(0, 8) || 'UNKNOWN'}`;

const EMAIL_TEMPLATE_OPTIONS = [
  { value: 'TICKET_CREATED', label: 'Ticket Created', description: 'Receipt email sent when a ticket is submitted.' },
  { value: 'AGENT_REPLIED', label: 'Agent Replied', description: 'Customer notification when support replies.' },
  { value: 'TICKET_RESOLVED', label: 'Ticket Resolved', description: 'Customer notification when a ticket is resolved.' },
  { value: 'SLA_BREACH', label: 'SLA Breach', description: 'Escalation email sent to admins on SLA breach.' },
];

const EMAIL_TEMPLATE_PLACEHOLDERS = [
  '{{recipientName}}',
  '{{ticketTitle}}',
  '{{ticketId}}',
  '{{priority}}',
  '{{createdAt}}',
];

const AGENT_AVAILABILITY_OPTIONS = [
  { value: 'ONLINE', label: 'Online', description: 'Can receive new tickets.' },
  { value: 'AWAY', label: 'Away', description: 'Temporarily unavailable.' },
  { value: 'BUSY', label: 'Busy', description: 'Working, no new tickets.' },
  { value: 'ON_BREAK', label: 'On Break', description: 'Paused for break.' },
  { value: 'IN_MEETING', label: 'In Meeting', description: 'Unavailable in meeting.' },
  { value: 'TRAINING', label: 'Training', description: 'Unavailable for queue work.' },
  { value: 'IDLE', label: 'Idle', description: 'Inactive recently.' },
  { value: 'OFFLINE', label: 'Offline', description: 'Not working now.' },
];

const availabilityMeta = {
  ONLINE: { label: 'Online', color: 'var(--brand)' },
  AWAY: { label: 'Away', color: '#f59e0b' },
  BUSY: { label: 'Busy', color: '#ef4444' },
  ON_BREAK: { label: 'On Break', color: '#38bdf8' },
  IN_MEETING: { label: 'In Meeting', color: '#a78bfa' },
  TRAINING: { label: 'Training', color: '#818cf8' },
  IDLE: { label: 'Idle', color: '#94a3b8' },
  OFFLINE: { label: 'Offline', color: '#6b7280' },
};

const getAvailabilityMeta = (status, isActive = true) => {
  if (!isActive) return { label: 'Inactive', color: '#6b7280' };
  return availabilityMeta[status] || availabilityMeta.OFFLINE;
};

const getAgentLoad = (agent) => (agent.openTickets || 0) + (agent.inProgressTickets || 0);

const AdminConsole = ({ activeTab }) => {
  const { addToast } = useNotifications();

  // Dashboard
  const [stats, setStats] = useState({ totalTickets:0, openTickets:0, progressTickets:0, resolvedTickets:0, closedTickets:0, averageRating:4.6, totalRatings:0 });
  const [statsLoading, setStatsLoading] = useState(false);


  // Users
  const [usersList, setUsersList]     = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [categories, setCategories]   = useState([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [agentName, setAgentName]     = useState('');
  const [agentEmail, setAgentEmail]   = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [agentCategory, setAgentCategory] = useState('');
  const [submittingAgent, setSubmittingAgent] = useState(false);

  // KB Approvals
  const [pendingArticles, setPendingArticles] = useState([]);
  const [pendingLoading, setPendingLoading]   = useState(false);
  const [previewArticle, setPreviewArticle]   = useState(null);

  // KB Published Articles
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [publishedLoading, setPublishedLoading]   = useState(false);
  const [kbSubView, setKbSubView]                 = useState('pending'); // 'pending' | 'published'
  const [editingArticle, setEditingArticle]       = useState(null);
  const [editTitle, setEditTitle]                 = useState('');
  const [editContent, setEditContent]             = useState('');
  const [savingArticle, setSavingArticle]         = useState(false);

  // Settings
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [catName, setCatName]           = useState('');
  const [catDesc, setCatDesc]           = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [submittingCat, setSubmittingCat] = useState(false);
  const [slaHours, setSlaHours]         = useState(24);
  const [vectorThreshold, setVectorThreshold] = useState(0.85);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [emailTemplatesLoading, setEmailTemplatesLoading] = useState(false);
  const [selectedEmailTemplateType, setSelectedEmailTemplateType] = useState('TICKET_CREATED');
  const [emailTemplateSubject, setEmailTemplateSubject] = useState('');
  const [emailTemplateBody, setEmailTemplateBody] = useState('');
  const [savingEmailTemplate, setSavingEmailTemplate] = useState(false);

  // Agent Management
  const [agentStats, setAgentStats]             = useState([]);
  const [agentStatsLoading, setAgentStatsLoading] = useState(false);
  const [selectedAgentMgmt, setSelectedAgentMgmt] = useState(null);
  const [agentTickets, setAgentTickets]         = useState([]);
  const [agentTicketsLoading, setAgentTicketsLoading] = useState(false);
  const [agentTicketStatus, setAgentTicketStatus] = useState('');
  const [agentTicketSearch, setAgentTicketSearch] = useState('');
  const [agentTicketPriority, setAgentTicketPriority] = useState('');
  const [agentTicketCategory, setAgentTicketCategory] = useState('');
  const [unassignedTickets, setUnassignedTickets] = useState([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [unassignedStatus, setUnassignedStatus] = useState('');
  const [unassignedPriority, setUnassignedPriority] = useState('');
  const [unassignedCategory, setUnassignedCategory] = useState('');
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState([]);
  const [reassignTicketId, setReassignTicketId] = useState(null);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');

  // Reassignment Requests
  const [reassignRequests, setReassignRequests] = useState([]);
  const [reassignRequestsLoading, setReassignRequestsLoading] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState({});

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const openConfirm = (opts) => setConfirmModal({ open: true, ...opts });
  const closeConfirm = () => setConfirmModal({ open: false });

  useEffect(() => {
    if (activeTab === 'dashboard') { fetchDashboardStats(); }
    else if (activeTab === 'users')    { fetchUsers(); loadCategories(); fetchAgentStats(); }
    else if (activeTab === 'articles') { fetchPendingArticles(); fetchPublishedArticles(); }
    else if (activeTab === 'settings') { loadCategories(); fetchEmailTemplates(); }
    else if (activeTab === 'agents')   { loadCategories(); fetchAgentStats(); fetchUnassignedTickets(); fetchReassignRequests(); }
  }, [activeTab]);

  useEffect(() => {
    if (selectedAgentMgmt) fetchAgentTickets(selectedAgentMgmt.agentId);
  }, [agentTicketStatus, agentTicketPriority, agentTicketCategory]);

  useEffect(() => {
    if (!selectedAgentMgmt) return;
    const timer = setTimeout(() => fetchAgentTickets(selectedAgentMgmt.agentId), 300);
    return () => clearTimeout(timer);
  }, [agentTicketSearch]);

  useEffect(() => {
    if (activeTab !== 'agents') return;
    const timer = setTimeout(fetchUnassignedTickets, 300);
    return () => clearTimeout(timer);
  }, [unassignedSearch, unassignedStatus, unassignedPriority, unassignedCategory]);

  // ── DATA FETCHERS ─────────────────────────────────────────
  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const ticketsRes = await api.get('/api/tickets?size=100');
      const list = ticketsRes.data?.content || [];
      const counts = { total: ticketsRes.data?.totalElements || list.length, open: list.filter(t=>t.status==='OPEN').length, progress: list.filter(t=>t.status==='IN_PROGRESS').length, resolved: list.filter(t=>t.status==='RESOLVED').length, closed: list.filter(t=>t.status==='CLOSED').length };
      let ratingSummary = { overallAverage: 4.7, totalRatings: 0 };
      try { const rr = await api.get('/api/admin/ratings/summary'); if(rr.data) ratingSummary = rr.data; } catch {}
      setStats({ totalTickets: counts.total, openTickets: counts.open, progressTickets: counts.progress, resolvedTickets: counts.resolved, closedTickets: counts.closed, averageRating: ratingSummary.overallAverage || 4.7, totalRatings: ratingSummary.totalRatings || 0 });
    } catch {}
    finally { setStatsLoading(false); }
  };



  const fetchUsers = async () => {
    setUsersLoading(true);
    try { const res = await api.get('/api/admin/users?size=50'); setUsersList(res.data?.content || []); }
    catch { addToast('Failed to load users.', 'Error', 'error'); }
    finally { setUsersLoading(false); }
  };

  const loadCategories = async () => {
    try { const res = await api.get('/api/admin/categories'); setCategories(res.data || []); } catch {}
  };

  const syncEmailTemplateForm = (template) => {
    if (!template) return;
    setSelectedEmailTemplateType(template.templateType);
    setEmailTemplateSubject(template.subjectTemplate || '');
    setEmailTemplateBody(template.bodyTemplate || '');
  };

  const fetchEmailTemplates = async () => {
    setEmailTemplatesLoading(true);
    try {
      const res = await api.get('/api/admin/email-templates');
      const list = res.data || [];
      setEmailTemplates(list);
      const nextTemplate = list.find(t => t.templateType === selectedEmailTemplateType) || list[0];
      if (nextTemplate) syncEmailTemplateForm(nextTemplate);
    } catch {
      addToast('Failed to load email templates.', 'Error', 'error');
    } finally {
      setEmailTemplatesLoading(false);
    }
  };

  const handleSelectEmailTemplate = (templateType) => {
    setSelectedEmailTemplateType(templateType);
    const nextTemplate = emailTemplates.find(t => t.templateType === templateType);
    if (nextTemplate) syncEmailTemplateForm(nextTemplate);
  };

  const handleSaveEmailTemplate = async (e) => {
    e.preventDefault();
    if (!selectedEmailTemplateType) return;
    setSavingEmailTemplate(true);
    try {
      await api.put(`/api/admin/email-templates/${selectedEmailTemplateType}`, {
        subjectTemplate: emailTemplateSubject,
        bodyTemplate: emailTemplateBody,
      });
      addToast('Email template updated.', 'Saved', 'success');
      await fetchEmailTemplates();
    } catch {
      addToast('Failed to save email template.', 'Error', 'error');
    } finally {
      setSavingEmailTemplate(false);
    }
  };

  const handleRegisterAgent = async (e) => {
    e.preventDefault();
    if (!agentName || !agentEmail || !agentPassword) return;
    setSubmittingAgent(true);
    try {
      await api.post('/api/admin/agents', { name: agentName, email: agentEmail, password: agentPassword, categoryId: agentCategory || null });
      addToast(`Agent "${agentName}" created.`, 'Agent Created', 'success');
      setAgentName(''); setAgentEmail(''); setAgentPassword(''); setAgentCategory('');
      setShowCreateAgent(false);
      fetchUsers();
    } catch { addToast('Failed to create agent.', 'Error', 'error'); }
    finally { setSubmittingAgent(false); }
  };

  const toggleUserActivation = async (id, isActive) => {
    const usr = usersList.find(u => u.id === id);
    const doToggle = async () => {
      try {
        await api.patch(`/api/admin/users/${id}/${isActive ? 'deactivate' : 'activate'}`);
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, active: !isActive, isActive: !isActive } : u));
        addToast('User status updated.', 'Updated', 'success');
        fetchAgentStats();
      } catch {}
    };
    if (usr && usr.role === 'AGENT' && isActive) {
      const agentStat = agentStats.find(a => a.agentId === id);
      const unresolvedCount = agentStat ? ((agentStat.openTickets || 0) + (agentStat.inProgressTickets || 0)) : 0;
      if (unresolvedCount > 0) {
        openConfirm({
          title: 'Deactivate Agent?',
          message: `This agent has ${unresolvedCount} unresolved ticket${unresolvedCount !== 1 ? 's' : ''} assigned to them. Deactivating will prevent them from working on these tickets. Are you sure you want to proceed?`,
          confirmText: 'Yes, Deactivate',
          cancelText: 'Cancel',
          variant: 'warning',
          onConfirm: async () => { closeConfirm(); await doToggle(); },
        });
        return;
      }
    }
    await doToggle();
  };

  const handleAssignCategory = async (userId, catId) => {
    try {
      const url = catId ? `/api/admin/agents/${userId}/category?categoryId=${catId}` : `/api/admin/agents/${userId}/category`;
      await api.patch(url);
      addToast('Category assigned.', 'Assigned', 'success');
      fetchUsers();
    } catch { addToast('Failed to assign category.', 'Error', 'error'); }
  };

  const handleAgentAvailabilityChange = async (agentId, status) => {
    try {
      const res = await api.patch(`/api/admin/agents/${agentId}/availability`, { status });
      const updated = res.data;
      setAgentStats(prev => prev.map(agent => (
        agent.agentId === agentId
          ? {
              ...agent,
              availabilityStatus: updated.availabilityStatus,
              availabilityUpdatedAt: updated.availabilityUpdatedAt,
              availabilityReason: updated.availabilityReason,
              assignable: updated.assignable,
              maxActiveTickets: updated.maxActiveTickets,
            }
          : agent
      )));
      setSelectedAgentMgmt(prev => (
        prev?.agentId === agentId
          ? {
              ...prev,
              availabilityStatus: updated.availabilityStatus,
              availabilityUpdatedAt: updated.availabilityUpdatedAt,
              availabilityReason: updated.availabilityReason,
              assignable: updated.assignable,
              maxActiveTickets: updated.maxActiveTickets,
            }
          : prev
      ));
      addToast(`Availability set to ${getAvailabilityMeta(status).label}.`, 'Availability Updated', 'success');
    } catch {
      addToast('Failed to update availability.', 'Error', 'error');
    }
  };

  const fetchPendingArticles = async () => {
    setPendingLoading(true);
    try { const res = await api.get('/api/knowledge/pending'); setPendingArticles(res.data || []); } catch {}
    finally { setPendingLoading(false); }
  };

  const fetchPublishedArticles = async () => {
    setPublishedLoading(true);
    try { const res = await api.get('/api/knowledge/all?size=100'); setPublishedArticles((res.data?.content || []).filter(a => a.published)); } catch {}
    finally { setPublishedLoading(false); }
  };

  const handlePublishArticle = async (id) => {
    try {
      await api.patch(`/api/knowledge/${id}/publish`);
      addToast('Article published successfully!', 'Published', 'success');
      setPreviewArticle(null);
      fetchPendingArticles();
      fetchPublishedArticles();
    } catch { addToast('Failed to publish.', 'Error', 'error'); }
  };

  const handleUnpublishArticle = async (id) => {
    try {
      await api.patch(`/api/knowledge/${id}/unpublish`);
      addToast('Article unpublished and moved to drafts.', 'Unpublished', 'success');
      fetchPublishedArticles();
      fetchPendingArticles();
    } catch { addToast('Failed to unpublish.', 'Error', 'error'); }
  };

  const handleDeleteArticle = (id) => {
    openConfirm({
      title: 'Delete Article?',
      message: 'This will permanently remove the article and cannot be undone.',
      confirmText: 'Delete Permanently',
      cancelText: 'Keep Article',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/api/knowledge/${id}`);
          addToast('Article deleted permanently.', 'Deleted', 'success');
          setPreviewArticle(null);
          setEditingArticle(null);
          fetchPendingArticles();
          fetchPublishedArticles();
        } catch {}
      },
    });
  };

  const openEditArticle = (art) => {
    setEditingArticle(art);
    setEditTitle(art.title);
    setEditContent(art.content);
  };

  const handleSaveArticleEdit = async () => {
    if (!editingArticle) return;
    setSavingArticle(true);
    try {
      await api.patch(`/api/knowledge/${editingArticle.id}`, { title: editTitle, content: editContent });
      addToast('Article updated successfully.', 'Saved', 'success');
      setEditingArticle(null);
      fetchPublishedArticles();
    } catch { addToast('Failed to save article.', 'Error', 'error'); }
    finally { setSavingArticle(false); }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName || !catName.trim()) return;
    setSubmittingCat(true);
    try {
      if (editingCategory) {
        await api.patch(`/api/admin/categories/${editingCategory.id}`, { name: catName.trim(), description: (catDesc || '').trim() });
        addToast('Category updated.', 'Updated', 'success');
      } else {
        await api.post('/api/admin/categories', { name: catName.trim(), description: (catDesc || '').trim() });
        addToast('Category created.', 'Created', 'success');
      }
      setCatName(''); setCatDesc(''); setEditingCategory(null); setShowCreateCategory(false);
      loadCategories();
    } catch { addToast('Failed to save category.', 'Error', 'error'); }
    finally { setSubmittingCat(false); }
  };

  const startEditCategory = (cat) => {
    setEditingCategory(cat); setCatName(cat.name || ''); setCatDesc(cat.description || ''); setShowCreateCategory(true);
  };

  const handleDeleteCategory = (id) => {
    openConfirm({
      title: 'Delete Category?',
      message: 'Deleting this category is permanent. It cannot be removed if tickets, agents, or articles are still referencing it.',
      confirmText: 'Delete Category',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/api/admin/categories/${id}`);
          addToast('Category deleted.', 'Deleted', 'success');
          loadCategories();
        } catch { addToast('Cannot delete — items reference this category.', 'Blocked', 'error'); }
      },
    });
  };

  const fetchAgentStats = async () => {
    setAgentStatsLoading(true);
    try { const res = await api.get('/api/admin/agents/stats'); setAgentStats(res.data || []); }
    catch { addToast('Failed to load agent stats.', 'Error', 'error'); }
    finally { setAgentStatsLoading(false); }
  };

  const fetchAgentTickets = async (agentId) => {
    setAgentTicketsLoading(true);
    try {
      const res = await api.get(`/api/admin/agents/${agentId}/tickets`, {
        params: {
          status: agentTicketStatus || null,
          priority: agentTicketPriority || null,
          categoryId: agentTicketCategory || null,
          q: agentTicketSearch || null,
          size: 100,
        }
      });
      setAgentTickets(res.data?.content || []);
    } catch {}
    finally { setAgentTicketsLoading(false); }
  };

  const fetchUnassignedTickets = async () => {
    setUnassignedLoading(true);
    setSelectedUnassignedIds([]);
    try {
      const res = await api.get('/api/admin/tickets/unassigned', {
        params: {
          size: 50,
          q: unassignedSearch || null,
          status: unassignedStatus || null,
          priority: unassignedPriority || null,
          categoryId: unassignedCategory || null,
        }
      });
      setUnassignedTickets(res.data?.content || []);
    } catch {}
    finally { setUnassignedLoading(false); }
  };

  const handleAssignTicket = async (ticketId, agentId) => {
    try {
      await api.patch(`/api/admin/tickets/${ticketId}/assign/${agentId}`);
      addToast('Ticket assigned successfully.', 'Assigned', 'success');
      setReassignTicketId(null);
      fetchUnassignedTickets();
      if (selectedAgentMgmt) fetchAgentTickets(selectedAgentMgmt.agentId);
      fetchAgentStats();
    } catch { addToast('Failed to assign ticket.', 'Error', 'error'); }
  };

  const handleBulkAssign = async (agentId) => {
    if (selectedUnassignedIds.length === 0) return;
    try {
      await api.patch('/api/admin/tickets/bulk-assign', {
        ticketIds: selectedUnassignedIds,
        assignedToId: agentId
      });
      addToast(`Assigned ${selectedUnassignedIds.length} tickets successfully.`, 'Assigned', 'success');
      setSelectedUnassignedIds([]);
      fetchUnassignedTickets();
      if (selectedAgentMgmt) fetchAgentTickets(selectedAgentMgmt.agentId);
      fetchAgentStats();
    } catch { addToast('Failed to bulk assign tickets.', 'Error', 'error'); }
  };

  const selectAgentMgmt = (agent) => {
    setSelectedAgentMgmt(agent);
    setAgentTickets([]);
    setAgentTicketStatus('');
    setAgentTicketSearch('');
    setAgentTicketPriority('');
    setAgentTicketCategory('');
    fetchAgentTickets(agent.agentId);
  };

  const fetchReassignRequests = async () => {
    setReassignRequestsLoading(true);
    try {
      const res = await api.get('/api/admin/reassign-requests');
      setReassignRequests(res.data || []);
    } catch {
      addToast('Failed to load reassignment requests.', 'Error', 'error');
    } finally {
      setReassignRequestsLoading(false);
    }
  };

  const handleResolveReassignRequest = async (requestId, approve, agentId = null) => {
    try {
      await api.patch(`/api/admin/reassign-requests/${requestId}/resolve`, null, {
        params: { approve }
      });
      if (approve && agentId) {
        const reqObj = reassignRequests.find(r => r.id === requestId);
        if (reqObj && reqObj.ticketId) {
          await api.patch(`/api/admin/tickets/${reqObj.ticketId}/assign/${agentId}`);
        }
      }
      addToast(
        approve 
          ? (agentId ? 'Request approved and ticket assigned.' : 'Request approved successfully.') 
          : 'Request rejected successfully.', 
        'Resolved', 
        'success'
      );
      fetchReassignRequests();
      fetchUnassignedTickets();
      fetchAgentStats();
      if (selectedAgentMgmt) fetchAgentTickets(selectedAgentMgmt.agentId);
    } catch {
      addToast('Failed to resolve reassignment request.', 'Error', 'error');
    }
  };

  const roleColors = {
    ADMIN: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' },
    AGENT: { bg: 'rgba(16,185,129,0.12)',  text: '#34d399' },
    USER:  { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
  };

  const logColor = (type) => {
    if (type === 'ai')    return 'var(--accent-purple)';
    if (type === 'event') return 'var(--brand)';
    return 'var(--text-muted)';
  };

  return (
    <div className="h-full w-full overflow-hidden" style={{ padding: '16px 20px' }}>

      {/* ── DASHBOARD ──────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-4 h-full overflow-hidden pr-1 anim-fade-in">
          
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Tickets',  value: stats.totalTickets,    accent: 'var(--brand)',           sub: 'all time' },
              { label: 'Open',           value: stats.openTickets,     accent: 'var(--status-open)',      sub: 'awaiting' },
              { label: 'In Progress',    value: stats.progressTickets, accent: 'var(--status-progress)', sub: 'active agents' },
              { label: 'Resolved',       value: stats.resolvedTickets, accent: 'var(--status-resolved)', sub: 'completed' },
              { label: 'CSAT',           value: `${stats.averageRating.toFixed(1)}/5`, accent: '#facc15', sub: `${stats.totalRatings} reviews` },
            ].map(({ label, value, accent, sub }) => (
              <div key={label} className="card p-4 flex flex-col gap-1.5" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '14px 14px 0 0', opacity: 0.8 }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="text-2xl font-black" style={{ fontFamily: 'var(--font-heading)', color: accent }}>{value}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{sub}</span>
              </div>
            ))}
          </div>

          <LiveActivityFeed className="flex-1 min-h-0" />
        </div>
      )}

      {/* ── USERS TAB ─────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="flex gap-4 h-full overflow-hidden anim-fade-in">
          <div className="flex-1 card flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Users size={15} style={{ color: 'var(--text-heading)' }} />
                <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>
                  User Directory
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {usersList.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchUsers} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => setShowCreateAgent(true)} className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>
                  <UserPlus size={14} /> Add Agent
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {usersLoading ? (
                <div className="flex items-center justify-center gap-2 py-16" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : (
                <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {['User', 'Email', 'Role', 'Category', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-input)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(usr => {
                      const isActive = usr.active !== undefined ? usr.active : usr.isActive;
                      const rc = roleColors[usr.role] || roleColors.USER;
                      return (
                        <tr key={usr.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                style={{ background: rc.bg, color: rc.text }}>
                                {getInitials(usr.name)}
                              </div>
                              <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>{usr.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{usr.email}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: rc.bg, color: rc.text }}>
                              {usr.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {usr.role === 'AGENT' ? (
                              <CustomSelect
                                options={[
                                  { value: '', label: 'Unassigned' },
                                  ...categories.map(c => ({ value: c.id, label: c.name }))
                                ]}
                                value={usr.categoryId || ''}
                                onChange={val => handleAssignCategory(usr.id, val)}
                                placeholder="Unassigned"
                                className="!w-auto"
                                triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-heading)] font-medium py-1 px-2.5 text-[11px] max-w-[150px]"
                              />
                            ) : (
                              <span style={{ color: 'var(--text-disabled)' }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleUserActivation(usr.id, isActive)} className="cursor-pointer">
                              {isActive ? (
                                <ToggleRight size={22} style={{ color: 'var(--brand)' }} />
                              ) : (
                                <ToggleLeft size={22} style={{ color: 'var(--text-disabled)' }} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Create Agent Drawer */}
          {showCreateAgent && createPortal(
            <div className="fixed inset-0 z-[150] flex items-center justify-end"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
              <div className="h-full w-full max-w-sm flex flex-col anim-slide-in-right"
                style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)' }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <UserPlus size={16} style={{ color: 'var(--brand)' }} />
                    <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>Register Agent</h3>
                  </div>
                  <button onClick={() => setShowCreateAgent(false)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                    <X size={17} />
                  </button>
                </div>
                <form onSubmit={handleRegisterAgent} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {[
                    { label: 'Full Name', val: agentName, set: setAgentName, type: 'text', placeholder: 'Sarah Connor' },
                    { label: 'Email', val: agentEmail, set: setAgentEmail, type: 'email', placeholder: 'sarah@helpdesk.com' },
                    { label: 'Password', val: agentPassword, set: setAgentPassword, type: 'password', placeholder: 'At least 8 characters' },
                  ].map(({ label, val, set, type, placeholder }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</label>
                      <input type={type} required className="field" placeholder={placeholder} value={val} onChange={e => set(e.target.value)} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Expertise Category</label>
                    <CustomSelect
                      options={[
                        { value: '', label: 'Select category (optional)' },
                        ...categories.map(c => ({ value: c.id, label: c.name }))
                      ]}
                      value={agentCategory}
                      onChange={val => setAgentCategory(val)}
                      placeholder="Select category (optional)"
                      triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-heading)] rounded-xl px-[14px] py-[10px]"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowCreateAgent(false)}
                      className="btn hover:bg-surface-container-highest flex-1 text-center"
                      style={{ padding: '11px 18px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-body)', fontSize: 12 }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={submittingAgent} 
                      className="btn btn-primary flex-1" 
                      style={{ padding: '11px 18px' }}
                    >
                      {submittingAgent ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <><UserPlus size={14} /> Create Agent</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* ── KB ARTICLES TAB ──────────────────────────────── */}
      {activeTab === 'articles' && (
        <div className="flex flex-col gap-4 h-full overflow-hidden anim-fade-in">

          {/* Sub-view Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl shrink-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
            <button onClick={() => setKbSubView('pending')}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              style={{ background: kbSubView === 'pending' ? 'var(--brand)' : 'transparent', color: kbSubView === 'pending' ? '#fff' : 'var(--text-muted)' }}>
              Pending Approval
              {pendingArticles.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: kbSubView === 'pending' ? 'rgba(255,255,255,0.25)' : 'rgba(245,158,11,0.2)', color: kbSubView === 'pending' ? '#fff' : '#f59e0b' }}>
                  {pendingArticles.length}
                </span>
              )}
            </button>
            <button onClick={() => setKbSubView('published')}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              style={{ background: kbSubView === 'published' ? 'var(--brand)' : 'transparent', color: kbSubView === 'published' ? '#fff' : 'var(--text-muted)' }}>
              Published Articles
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: kbSubView === 'published' ? 'rgba(255,255,255,0.25)' : 'var(--bg-input)', color: kbSubView === 'published' ? '#fff' : 'var(--text-muted)' }}>
                {publishedArticles.length}
              </span>
            </button>
          </div>

          <div className="flex gap-4 flex-1 overflow-hidden">

            {/* ── Pending Approvals ── */}
            {kbSubView === 'pending' && (
              <>
                <div className="flex-1 card flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2">
                      <CheckSquare size={15} style={{ color: 'var(--text-heading)' }} />
                      <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>KB Approval Queue</span>
                    </div>
                    <button onClick={fetchPendingArticles} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {pendingLoading ? (
                      <div className="flex items-center justify-center gap-2 py-16" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 size={18} className="animate-spin" />
                      </div>
                    ) : pendingArticles.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-16" style={{ color: 'var(--text-muted)' }}>
                        <CheckCircle2 size={36} className="opacity-25" style={{ color: 'var(--brand)' }} />
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs">No articles pending review</p>
                      </div>
                    ) : pendingArticles.map(art => (
                      <div key={art.id}
                        className="flex items-center justify-between p-4 rounded-xl transition-all"
                        style={{ background: previewArticle?.id === art.id ? 'var(--brand-dim)' : 'var(--bg-input)', border: `1px solid ${previewArticle?.id === art.id ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}` }}>
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                              {art.categoryName || 'Uncategorized'}
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              by {art.authorName || 'Agent'} · {formatDate(art.createdAt)}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>{art.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => setPreviewArticle(previewArticle?.id === art.id ? null : art)}
                            className="p-2 rounded-lg cursor-pointer transition-colors"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                            <Eye size={14} />
                          </button>
                          <button onClick={() => handlePublishArticle(art.id)}
                            className="p-2 rounded-lg cursor-pointer transition-colors"
                            style={{ background: 'var(--brand-dim)', border: '1px solid rgba(16,185,129,0.25)', color: 'var(--brand)' }}
                            title="Publish article">
                            <Check size={14} />
                          </button>
                          <button onClick={() => handleDeleteArticle(art.id)}
                            className="p-2 rounded-lg cursor-pointer transition-colors"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                            title="Delete draft">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Panel */}
                {previewArticle && (
                  <div className="w-80 shrink-0 card flex flex-col overflow-hidden anim-slide-right">
                    <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>Article Preview</span>
                      <button onClick={() => setPreviewArticle(null)} className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        <X size={15} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)', lineHeight: 1.4 }}>{previewArticle.title}</h3>
                      <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-body)' }}>{previewArticle.content}</p>
                    </div>
                    <div className="p-4 flex gap-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <button onClick={() => handlePublishArticle(previewArticle.id)} className="btn btn-primary flex-1" style={{ padding: '9px 14px', fontSize: 12 }}>
                        <Check size={14} /> Publish
                      </button>
                      <button onClick={() => handleDeleteArticle(previewArticle.id)} className="btn btn-danger flex-1" style={{ padding: '9px 14px', fontSize: 12 }}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Published Articles ── */}
            {kbSubView === 'published' && (
              <>
                <div className="flex-1 card flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2">
                      <BookOpen size={15} style={{ color: 'var(--brand)' }} />
                      <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>Published Articles</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        {publishedArticles.length} live
                      </span>
                    </div>
                    <button onClick={fetchPublishedArticles} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {publishedLoading ? (
                      <div className="flex items-center justify-center gap-2 py-16" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 size={18} className="animate-spin" />
                      </div>
                    ) : publishedArticles.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-16" style={{ color: 'var(--text-muted)' }}>
                        <BookOpen size={36} className="opacity-25" />
                        <p className="text-sm">No published articles yet</p>
                      </div>
                    ) : publishedArticles.map(art => (
                      <div key={art.id}
                        className="flex items-center justify-between p-4 rounded-xl transition-all"
                        style={{ background: editingArticle?.id === art.id ? 'var(--brand-dim)' : 'var(--bg-input)', border: '1px solid ' + (editingArticle?.id === art.id ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)') }}>
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                              {art.categoryName || 'Uncategorized'}
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              by {art.authorName || 'Unknown'} · {formatDate(art.createdAt)}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>{art.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openEditArticle(art)}
                            className="p-2 rounded-lg cursor-pointer transition-colors"
                            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}
                            title="Edit article">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleUnpublishArticle(art.id)}
                            className="p-2 rounded-lg cursor-pointer transition-colors"
                            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
                            title="Unpublish (move to drafts)">
                            <AlertCircle size={14} />
                          </button>
                          <button onClick={() => handleDeleteArticle(art.id)}
                            className="p-2 rounded-lg cursor-pointer transition-colors"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                            title="Delete permanently">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Edit Article Panel */}
                {editingArticle && (
                  <div className="w-96 shrink-0 card flex flex-col overflow-hidden anim-slide-right">
                    <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2">
                        <Edit2 size={14} style={{ color: 'var(--brand)' }} />
                        <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>Edit Article</span>
                      </div>
                      <button onClick={() => setEditingArticle(null)} className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        <X size={15} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Title</label>
                        <input className="field text-xs" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Article title..." />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Content</label>
                        <textarea className="field text-xs" rows={14} value={editContent} onChange={e => setEditContent(e.target.value)}
                          placeholder="Article content..."
                          style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }} />
                      </div>
                    </div>
                    <div className="p-4 flex gap-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <button onClick={handleSaveArticleEdit} disabled={savingArticle} className="btn btn-primary flex-1" style={{ padding: '9px 14px', fontSize: 12 }}>
                        {savingArticle ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Changes</>}
                      </button>
                      <button onClick={() => handleDeleteArticle(editingArticle.id)} className="btn btn-danger" style={{ padding: '9px 12px', fontSize: 12 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}

      {/* ── AGENT MANAGEMENT TAB ─────────────────────────── */}
      {activeTab === 'agents' && (
        <AgentManagementTab
          agentStats={agentStats}
          agentStatsLoading={agentStatsLoading}
          fetchAgentStats={fetchAgentStats}
          selectedAgentMgmt={selectedAgentMgmt}
          selectAgentMgmt={selectAgentMgmt}
          agentTickets={agentTickets}
          agentTicketsLoading={agentTicketsLoading}
          agentTicketStatus={agentTicketStatus}
          setAgentTicketStatus={setAgentTicketStatus}
          agentTicketSearch={agentTicketSearch}
          setAgentTicketSearch={setAgentTicketSearch}
          agentTicketPriority={agentTicketPriority}
          setAgentTicketPriority={setAgentTicketPriority}
          agentTicketCategory={agentTicketCategory}
          setAgentTicketCategory={setAgentTicketCategory}
          unassignedTickets={unassignedTickets}
          unassignedLoading={unassignedLoading}
          fetchUnassignedTickets={fetchUnassignedTickets}
          unassignedSearch={unassignedSearch}
          setUnassignedSearch={setUnassignedSearch}
          unassignedStatus={unassignedStatus}
          setUnassignedStatus={setUnassignedStatus}
          unassignedPriority={unassignedPriority}
          setUnassignedPriority={setUnassignedPriority}
          unassignedCategory={unassignedCategory}
          setUnassignedCategory={setUnassignedCategory}
          selectedUnassignedIds={selectedUnassignedIds}
          setSelectedUnassignedIds={setSelectedUnassignedIds}
          reassignRequests={reassignRequests}
          reassignRequestsLoading={reassignRequestsLoading}
          fetchReassignRequests={fetchReassignRequests}
          selectedAssignees={selectedAssignees}
          setSelectedAssignees={setSelectedAssignees}
          reassignTicketId={reassignTicketId}
          setReassignTicketId={setReassignTicketId}
          agentSearchQuery={agentSearchQuery}
          setAgentSearchQuery={setAgentSearchQuery}
          categories={categories}
          handleAssignTicket={handleAssignTicket}
          handleBulkAssign={handleBulkAssign}
          handleResolveReassignRequest={handleResolveReassignRequest}
          handleAgentAvailabilityChange={handleAgentAvailabilityChange}
          getInitials={getInitials}
          formatDate={formatDate}
          getTicketNumber={getTicketNumber}
          getAgentLoad={getAgentLoad}
          getAvailabilityMeta={getAvailabilityMeta}
        />
      )}

      {/* ── SETTINGS TAB ──────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="flex gap-4 h-full overflow-hidden anim-fade-in">

          {/* Categories list */}
          <div className="flex-1 card flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Tag size={15} style={{ color: 'var(--text-heading)' }} />
                <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>Categories</span>
              </div>
              <button onClick={() => { setEditingCategory(null); setCatName(''); setCatDesc(''); setShowCreateCategory(true); }}
                className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>
                <Plus size={14} /> New Category
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {categories.length === 0 ? (
                <div className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Tag size={28} className="mx-auto mb-2 opacity-25" />
                  <p className="text-xs">No categories configured</p>
                </div>
              ) : categories.map(cat => (
                <div key={cat.id} className="flex items-start justify-between p-4 rounded-xl transition-all"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex-1 min-w-0 mr-4">
                    <h4 className="text-sm font-semibold capitalize mb-1" style={{ color: 'var(--text-heading)' }}>{cat.name}</h4>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{cat.description || 'No description'}</p>
                    <code className="text-[9px] mt-1.5 block" style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>{cat.id}</code>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => startEditCategory(cat)} className="p-2 rounded-lg cursor-pointer"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 rounded-lg cursor-pointer"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings sidebar */}
          <div className="w-96 shrink-0 flex flex-col gap-4 overflow-y-auto">
            {/* Category form */}
            {showCreateCategory && (
              <div className="card p-5 anim-bounce-in">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>
                    {editingCategory ? 'Edit Category' : 'New Category'}
                  </span>
                  <button onClick={() => { setShowCreateCategory(false); setEditingCategory(null); }} className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                    <X size={15} />
                  </button>
                </div>
                <form onSubmit={handleSaveCategory} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Name</label>
                    <input type="text" required className="field" placeholder="e.g. Authentication" value={catName} onChange={e => setCatName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Description</label>
                    <textarea rows={3} className="field" style={{ resize: 'none' }} placeholder="Describe this category's scope..." value={catDesc} onChange={e => setCatDesc(e.target.value)} />
                  </div>
                  <button type="submit" disabled={submittingCat} className="btn btn-primary w-full" style={{ padding: '9px 14px', fontSize: 12 }}>
                    {submittingCat ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : editingCategory ? 'Update Category' : 'Create Category'}
                  </button>
                </form>
              </div>
            )}

            {/* System rules */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Sliders size={14} style={{ color: 'var(--brand)' }} />
                <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>System Rules</span>
              </div>
              <div className="space-y-5">
                {/* SLA */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>SLA Threshold</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--brand)' }}>{slaHours}h</span>
                  </div>
                  <input type="range" min="4" max="72" step="4"
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--brand)', height: 4 }}
                    value={slaHours} onChange={e => setSlaHours(parseInt(e.target.value))} />
                  <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>Triggers alerts for unresolved issues past this duration.</p>
                </div>
                {/* Vector similarity */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>Cosine Similarity</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--brand)' }}>{(vectorThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0.50" max="0.98" step="0.01"
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--brand)', height: 4 }}
                    value={vectorThreshold} onChange={e => setVectorThreshold(parseFloat(e.target.value))} />
                  <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>Controls pgvector cosine similarity threshold for AI deflection.</p>
                </div>
              </div>
            </div>

            {/* Email templates */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Inbox size={14} style={{ color: 'var(--brand)' }} />
                <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>Email Templates</span>
              </div>

              {emailTemplatesLoading ? (
                <div className="flex items-center justify-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleSaveEmailTemplate}>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Template</label>
                    <CustomSelect
                      options={EMAIL_TEMPLATE_OPTIONS}
                      value={selectedEmailTemplateType}
                      onChange={val => handleSelectEmailTemplate(val)}
                      placeholder="Select template..."
                      triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-heading)] rounded-xl px-[14px] py-[10px] text-xs"
                    />
                    <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                      {EMAIL_TEMPLATE_OPTIONS.find(opt => opt.value === selectedEmailTemplateType)?.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Subject</label>
                    <input
                      className="field text-xs"
                      value={emailTemplateSubject}
                      onChange={e => setEmailTemplateSubject(e.target.value)}
                      placeholder="Email subject..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Body</label>
                    <textarea
                      className="field text-xs"
                      rows={10}
                      value={emailTemplateBody}
                      onChange={e => setEmailTemplateBody(e.target.value)}
                      placeholder="Email body HTML..."
                      style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Available placeholders</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EMAIL_TEMPLATE_PLACEHOLDERS.map(token => (
                        <span key={token} className="text-[10px] px-2 py-1 rounded-md" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}>
                          {token}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={savingEmailTemplate} className="btn btn-primary w-full" style={{ padding: '9px 14px', fontSize: 12 }}>
                    {savingEmailTemplate ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><Check size={13} /> Save Template</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sla' && (
        <SLAConfig />
      )}

      {activeTab === 'agent-performance' && <AgentPerformance />}
      {activeTab === 'user-performance' && <UserPerformance />}
      {activeTab === 'audit-log' && <TicketAuditLog />}
      {activeTab === 'breach-log' && <BreachLog />}
      {activeTab === 'transfer-log' && <TransferLog />}

      {/* ── GLOBAL CONFIRM MODAL ──────────────────────── */}
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

export default AdminConsole;
