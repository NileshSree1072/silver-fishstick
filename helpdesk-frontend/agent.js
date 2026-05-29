// Aegis Helpdesk Agent Console Controller

// ────────────────────────────────────────────────────────
// STATE MANAGEMENT & SYNC LOGIC
// ────────────────────────────────────────────────────────
let mockCategories = [];
let mockArticles = [];
let mockAgents = [];
let mockCSATRatings = [];
let mockTickets = [];

let selectedTicketId = null;
let currentReplyType = 'public'; // 'public' or 'internal'

document.addEventListener('DOMContentLoaded', () => {
    initializeLocalStorage();
    loadState();
    initTheme();
    initRouter();
    
    // Initial renders
    populateDropdownOptions();
    renderQueue('my');
    renderPerformanceTab();
    renderKbDraftsTab();
    
    // Bind queue filters
    document.getElementById('btnMyQueue').addEventListener('click', () => switchQueueFilter('my'));
    document.getElementById('btnUnassignedQueue').addEventListener('click', () => switchQueueFilter('unassigned'));
    document.getElementById('btnResolvedQueue').addEventListener('click', () => switchQueueFilter('resolved'));
    
    // Bind search
    document.getElementById('queueSearchInput').addEventListener('input', filterQueueList);
    
    // Bind actions
    document.getElementById('btnAgentSendReply').addEventListener('click', postAgentReply);
    document.getElementById('btnSummarizeThread').addEventListener('click', triggerThreadSummarization);
    document.getElementById('btnApplyAiDraft').addEventListener('click', insertAiDraft);
    document.getElementById('btnUpdateProperties').addEventListener('click', applyTicketUpdates);
    
    // Bind KB Draft Form submit
    document.getElementById('agentKbDraftForm').addEventListener('submit', submitKbDraft);
    initAutoExpandingTextarea();
});

// Shared state initializer (guarantees local storage is populated)
function initializeLocalStorage() {
    // 1. Categories
    if (!localStorage.getItem('aegis_categories')) {
        const defaultCategories = [
            { id: 'c-1', name: 'Tech Support', desc: 'Hardware failures, server timeouts, database crashes.', ticketCount: 13 },
            { id: 'c-2', name: 'Billing', desc: 'Subscription tiers, license audits, refunds, corporate invoices.', ticketCount: 8 },
            { id: 'c-3', name: 'Bug Reports', desc: 'Frontend glitches, API routing errors, code regressions.', ticketCount: 19 },
            { id: 'c-4', name: 'Security', desc: 'Penetration tests, JWT validation leaks, access logs audits.', ticketCount: 5 },
            { id: 'c-5', name: 'General', desc: 'SLA questions, feature requests, marketing queries.', ticketCount: 4 }
        ];
        localStorage.setItem('aegis_categories', JSON.stringify(defaultCategories));
    }
    
    // 2. Articles
    if (!localStorage.getItem('aegis_articles')) {
        const defaultArticles = [
            { id: 'kb-501', title: 'Resolving flyway timestamp zone conflicts', category: 'Tech Support', content: 'Database deadlocks or migration crashes on flyway timestamp columns occur because of server timezone conflicts. In your application.properties configuration, change spring.datasource.url parameter and add ?serverTimezone=Asia/Kolkata, or match the PostgreSQL timezone directly in the database configuration console.', score: 0.94, vectorStatus: 'Synced', updated: '2026-05-22 09:30', published: true },
            { id: 'kb-502', title: 'Azure Blob Storage attachments return 403 Forbidden', category: 'Tech Support', content: 'Attachments failing with 403 errors are caused by expired Azure Storage Shared Access Signature (SAS) tokens. Regenerate SAS tokens with "Read" and "List" privileges checked in your Azure Storage Explorer Console, and update the azure.storage.sas-token key in your Spring Boot application properties file.', score: 0.92, vectorStatus: 'Synced', updated: '2026-05-21 14:15', published: true },
            { id: 'kb-503', title: 'Configuring custom JWT token expiration parameters', category: 'Security', content: 'To prolong your active session token life in Aegis helpdesk, navigate to the config folder and locate application.properties. Edit the value for app.jwt.expiration. The default is 3600000 (1 Hour). Set it to 86400000 (24 Hours) to decrease logout rates.', score: 0.89, vectorStatus: 'Synced', updated: '2026-05-20 11:00', published: true },
            { id: 'kb-504', title: 'Upgrading license quotas via the Customer Portal', category: 'Billing', content: 'Customers can upgrade active license seats directly by navigating to Admin Settings inside the subscription tab, clicking Upgrade seats, and checking out via Stripe. Seats propagate immediately.', score: 0.74, vectorStatus: 'Pending Embedding', updated: '2026-05-22 13:02', published: false },
            { id: 'kb-505', title: 'Clearing cookies and local cache on Chrome', category: 'General', content: 'If the Aegis client UI fails to refresh config schemas, perform a hard refresh via Ctrl+F5 or manually clear cache and cookies under Chrome settings tab to reload dynamic service bundles.', score: 0.65, vectorStatus: 'Synced', updated: '2026-05-18 16:45', published: true }
        ];
        localStorage.setItem('aegis_articles', JSON.stringify(defaultArticles));
    }

    // 3. Agents
    if (!localStorage.getItem('aegis_agents')) {
        const defaultAgents = [
            { id: 'u-201', name: 'Sarah Jenkins', email: 'sarah.j@aegis.com', role: 'AGENT', categories: ['Tech Support', 'Security'], active: true },
            { id: 'u-202', name: 'Alex Carter', email: 'alex.c@aegis.com', role: 'AGENT', categories: ['Billing', 'General'], active: true },
            { id: 'u-203', name: 'Michael Chang', email: 'michael.c@aegis.com', role: 'AGENT', categories: ['Tech Support'], active: false },
            { id: 'u-204', name: 'Sophia Lopez', email: 'sophia.l@aegis.com', role: 'AGENT', categories: ['Bug Reports', 'Security'], active: true },
            { id: 'u-205', name: 'Nilesh Dev', email: 'nilesh.dev@aegis.com', role: 'ADMIN', categories: ['All Domains'], active: true }
        ];
        localStorage.setItem('aegis_agents', JSON.stringify(defaultAgents));
    }

    // 4. CSAT Ratings
    if (!localStorage.getItem('aegis_ratings')) {
        const defaultRatings = [
            { id: 'r-901', ticketId: 't-101', customer: 'Nilesh Dev', rating: 5, comment: 'AI instantly solved my timezone conflict! Incredible response time.' },
            { id: 'r-902', ticketId: 't-88', customer: 'David Vance', rating: 4, comment: 'Sarah Jenkins fixed our DB deadlock quickly. Responsive help.' },
            { id: 'r-903', ticketId: 't-92', customer: 'Emily Watson', rating: 2, comment: 'Billing mismatch took 3 days to fix. Response SLA was not met.' },
            { id: 'r-904', ticketId: 't-99', customer: 'John Doe', rating: 5, comment: 'Great service. Dynamic modal helped resolve RAG deflection quickly.' }
        ];
        localStorage.setItem('aegis_ratings', JSON.stringify(defaultRatings));
    }

    // 5. Tickets
    if (!localStorage.getItem('aegis_tickets')) {
        const defaultTickets = [
            {
                id: 't-101',
                title: 'Database flyway migration throws time zone deadlock',
                category: 'Tech Support',
                priority: 'medium',
                status: 'RESOLVED',
                assignee: 'AI Auto-Resolved',
                aiResolved: true,
                createdBy: 'Nilesh Dev',
                date: '2026-05-22 09:20',
                rated: true,
                ratingVal: 5,
                replies: [
                    { id: 'rep-1', sender: 'Nilesh Dev', role: 'USER', message: 'Hello, flyway is failing to compile because of timezone deadlocks. Pls check.' },
                    { id: 'rep-2', sender: 'AI Assistant', role: 'AI', message: 'Hi Nilesh, this occurs when Postgres database and local JVM timezone settings mismatch. Based on matching article: [Resolving flyway timestamp zone conflicts], change timezone to "Asia/Kolkata" in application.properties. Ticket auto-resolved.' }
                ]
            },
            {
                id: 't-102',
                title: 'Azure Blob attachments return 403 Forbidden',
                category: 'Tech Support',
                priority: 'high',
                status: 'OPEN',
                assignee: 'Unassigned',
                aiResolved: false,
                createdBy: 'Nilesh Dev',
                date: '2026-05-22 13:00',
                rated: false,
                ratingVal: 0,
                replies: [
                    { id: 'rep-3', sender: 'Nilesh Dev', role: 'USER', message: 'When downloading the PDF invoice attachments, I get 403 Forbidden errors. SAS tokens might be expired.' }
                ]
            },
            {
                id: 't-88',
                title: 'Database connection pools saturated',
                category: 'Tech Support',
                priority: 'high',
                status: 'RESOLVED',
                assignee: 'Sarah Jenkins',
                aiResolved: false,
                createdBy: 'David Vance',
                date: '2026-05-21 11:20',
                rated: true,
                ratingVal: 4,
                replies: [
                    { id: 'rep-88-1', sender: 'David Vance', role: 'USER', message: 'We are hitting max connection limits of 100 on our staging cluster.' },
                    { id: 'rep-88-2', sender: 'Sarah Jenkins', role: 'AGENT', message: 'I have scaled your HikariCP max-pool-size to 250 in your cluster properties. Let me know if it breaches again.' }
                ]
            },
            {
                id: 't-89',
                title: 'Enterprise billing invoice mismatch',
                category: 'Billing',
                priority: 'medium',
                status: 'IN_PROGRESS',
                assignee: 'Alex Carter',
                aiResolved: false,
                createdBy: 'John Doe',
                date: '2026-05-22 10:45',
                rated: false,
                ratingVal: 0,
                replies: [
                    { id: 'rep-89-1', sender: 'John Doe', role: 'USER', message: 'We were billed for 50 seats instead of 40 this billing cycle.' },
                    { id: 'rep-89-2', sender: 'Alex Carter', role: 'AGENT', message: 'Hi John, reviewing the subscription log audit. I see 10 pending invites were accepted on May 15. Let me check the stripe refund details.' }
                ]
            }
        ];
        localStorage.setItem('aegis_tickets', JSON.stringify(defaultTickets));
    }
}

// Load arrays from localStorage
function loadState() {
    mockCategories = JSON.parse(localStorage.getItem('aegis_categories')) || [];
    mockArticles = JSON.parse(localStorage.getItem('aegis_articles')) || [];
    mockAgents = JSON.parse(localStorage.getItem('aegis_agents')) || [];
    mockCSATRatings = JSON.parse(localStorage.getItem('aegis_ratings')) || [];
    mockTickets = JSON.parse(localStorage.getItem('aegis_tickets')) || [];
}

// Save tickets back to localStorage
function saveTicketsState() {
    localStorage.setItem('aegis_tickets', JSON.stringify(mockTickets));
}

// Save ratings back to localStorage (synced with telemetry)
function saveRatingsState() {
    localStorage.setItem('aegis_ratings', JSON.stringify(mockCSATRatings));
}

// Save articles back to localStorage
function saveArticlesState() {
    localStorage.setItem('aegis_articles', JSON.stringify(mockArticles));
}

// ────────────────────────────────────────────────────────
// ROUTING
// ────────────────────────────────────────────────────────
function initRouter() {
    const menuItems = document.querySelectorAll('.menu-list .menu-item');
    const tabs = document.querySelectorAll('.workspace-content .tab-content');
    const viewTitle = document.getElementById('currentViewTitle');
    const workspaceContent = document.querySelector('.workspace-content');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const activeTabId = item.getAttribute('data-tab');
            tabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === activeTabId) {
                    tab.classList.add('active');
                }
            });

            const labelText = item.querySelector('a').textContent.trim();
            viewTitle.textContent = labelText;

            // Manage padding/scroll styles based on tab selection
            if (activeTabId === 'ticketsTab') {
                workspaceContent.classList.add('no-padding');
                loadState(); // reload state in case of updates from customer
                renderQueue(activeQueueFilter);
            } else {
                workspaceContent.classList.remove('no-padding');
                loadState();
                if (activeTabId === 'reportsTab') {
                    renderPerformanceTab();
                } else if (activeTabId === 'draftsTab') {
                    renderKbDraftsTab();
                }
            }
        });
    });
}

// ────────────────────────────────────────────────────────
// 1. TICKET QUEUE ENGINE
// ────────────────────────────────────────────────────────
let activeQueueFilter = 'my'; // 'my' (assigned to Sarah Jenkins), 'unassigned', 'resolved'

function switchQueueFilter(filter) {
    activeQueueFilter = filter;
    
    // Toggle active style on buttons
    const btnMy = document.getElementById('btnMyQueue');
    const btnUn = document.getElementById('btnUnassignedQueue');
    const btnRes = document.getElementById('btnResolvedQueue');
    
    btnMy.className = 'action-btn action-btn-outline';
    btnUn.className = 'action-btn action-btn-outline';
    btnRes.className = 'action-btn action-btn-outline';
    
    if (filter === 'my') btnMy.className = 'action-btn';
    if (filter === 'unassigned') btnUn.className = 'action-btn';
    if (filter === 'resolved') btnRes.className = 'action-btn';
    
    renderQueue(filter);
}

function renderQueue(filter = 'my') {
    const listContainer = document.getElementById('agentTicketList');
    if (!listContainer) return;
    
    // Refresh queue counts
    const myCount = mockTickets.filter(t => t.assignee === 'Sarah Jenkins' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const unCount = mockTickets.filter(t => t.assignee === 'Unassigned' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const resCount = mockTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    
    document.getElementById('countMyQueue').textContent = myCount;
    document.getElementById('countUnassignedQueue').textContent = unCount;
    document.getElementById('countResolvedQueue').textContent = resCount;
    
    // Apply filters
    let filtered = [];
    if (filter === 'my') {
        filtered = mockTickets.filter(t => t.assignee === 'Sarah Jenkins' && t.status !== 'RESOLVED' && t.status !== 'CLOSED');
    } else if (filter === 'unassigned') {
        filtered = mockTickets.filter(t => t.assignee === 'Unassigned' && t.status !== 'RESOLVED' && t.status !== 'CLOSED');
    } else if (filter === 'resolved') {
        filtered = mockTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
    }
    
    // Apply search filter if there's text
    const searchVal = document.getElementById('queueSearchInput').value.trim().toLowerCase();
    if (searchVal) {
        filtered = filtered.filter(t => 
            t.title.toLowerCase().includes(searchVal) || 
            t.id.toLowerCase().includes(searchVal) ||
            t.createdBy.toLowerCase().includes(searchVal) ||
            t.category.toLowerCase().includes(searchVal)
        );
    }
    
    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; color: var(--text-disabled); font-size: 0.8rem; padding: 3rem 1rem;">
                <i class="fas fa-folder-open" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                No tickets in this queue.
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = filtered.map(t => {
        let statusBadgeClass = 'badge-open';
        if (t.status === 'RESOLVED') statusBadgeClass = 'badge-resolved';
        if (t.status === 'IN_PROGRESS') statusBadgeClass = 'badge-progress';
        if (t.status === 'CLOSED') statusBadgeClass = 'badge-closed';
        
        let priorityBadgeClass = `badge-priority-${t.priority}`;
        let activeClass = t.id === selectedTicketId ? 'active' : '';
        
        return `
            <div class="queue-item ${activeClass}" onclick="selectAgentTicket('${t.id}')">
                <div class="queue-row">
                    <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted);">${t.id}</span>
                    <span class="badge ${statusBadgeClass}">${t.status}</span>
                </div>
                <div class="queue-title">${t.title}</div>
                <div class="queue-row" style="margin-top: 0.25rem;">
                    <span class="badge ${priorityBadgeClass}">${t.priority}</span>
                    <span style="font-size: 0.7rem; color: var(--text-muted);"><i class="fas fa-user" style="font-size:0.65rem;"></i> ${t.createdBy}</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterQueueList() {
    renderQueue(activeQueueFilter);
}

// ────────────────────────────────────────────────────────
// 2. CONVERSATION VIEWPORT & CHAT TIMELINE
// ────────────────────────────────────────────────────────
window.selectAgentTicket = function(ticketId) {
    loadState();
    selectedTicketId = ticketId;
    renderQueue(activeQueueFilter);
    
    const ticket = mockTickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    // Header
    document.getElementById('currentTicketTitle').textContent = ticket.title;
    document.getElementById('currentTicketSubtitle').textContent = `Client: ${ticket.createdBy} • Category: ${ticket.category} • Assignee: ${ticket.assignee}`;
    
    let priorityBadgeClass = `badge-priority-${ticket.priority}`;
    document.getElementById('ticketPriorityBadgeContainer').innerHTML = `
        <span class="badge ${priorityBadgeClass}">${ticket.priority}</span>
    `;
    
    // Enable Copilot Pane
    const copilotSidebar = document.getElementById('copilotSidebar');
    copilotSidebar.style.opacity = '1';
    copilotSidebar.style.pointerEvents = 'auto';
    
    // Populate Properties fields
    document.getElementById('propStatus').value = ticket.status;
    document.getElementById('propPriority').value = ticket.priority;
    document.getElementById('propAssignee').value = ticket.assignee;
    
    // Render timeline
    renderTimeline(ticket);
    
    // Show input console if not CLOSED
    const inputConsole = document.getElementById('agentInputConsole');
    if (ticket.status === 'CLOSED') {
        inputConsole.style.display = 'none';
    } else {
        inputConsole.style.display = 'block';
    }
    
    // Reset inputs
    const agentReplyText = document.getElementById('agentReplyText');
    if (agentReplyText) {
        agentReplyText.value = '';
        agentReplyText.dispatchEvent(new Event('input'));
    }
    
    // Trigger AI suggestion simulator
    simulateAiSuggestedReply(ticket);
    
    // Load pgvector match recommendations in copilot
    loadPgvectorMatches(ticket);
};

function renderTimeline(ticket) {
    const timeline = document.getElementById('agentChatTimeline');
    if (!timeline) return;
    
    if (ticket.replies.length === 0) {
        timeline.innerHTML = `
            <div style="text-align: center; color: var(--text-disabled); padding: 4rem 1rem;">
                No messages filed yet.
            </div>
        `;
        return;
    }
    
    timeline.innerHTML = ticket.replies.map(r => {
        let bubbleClass = 'incoming';
        let customStyle = '';
        
        if (r.role === 'AGENT') {
            bubbleClass = 'outgoing';
        } else if (r.role === 'AI') {
            bubbleClass = 'incoming';
            customStyle = 'background: linear-gradient(135deg, var(--bg-card), var(--brand-glow)); border-color: var(--brand); border-style: dashed; border-width: 1px;';
        } else if (r.role === 'INTERNAL') {
            bubbleClass = 'internal';
        }
        
        let icon = '<i class="fas fa-user-circle"></i>';
        if (r.role === 'AGENT') {
            icon = '<i class="fas fa-headset" style="color: rgba(255,255,255,0.7);"></i>';
        } else if (r.role === 'AI') {
            icon = '<i class="fas fa-robot" style="color: var(--brand);"></i>';
        } else if (r.role === 'INTERNAL') {
            icon = '<i class="fas fa-lock" style="color: var(--status-progress);"></i>';
        }
        
        const senderName = r.role === 'INTERNAL' ? `${r.sender} (Internal Note)` : r.sender;
        
        return `
            <div class="chat-bubble ${bubbleClass}" style="${customStyle}">
                <div style="font-size:0.75rem; font-weight:700; color:var(--text-heading); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.25rem;">
                    ${icon} ${senderName}
                </div>
                <div style="font-size:0.9rem;">${r.message}</div>
                <div class="chat-bubble-meta">
                    <span>${ticket.date}</span>
                    <span>${r.role === 'INTERNAL' ? 'Confidential' : 'Delivered'}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Scroll timeline to bottom
    timeline.scrollTop = timeline.scrollHeight;
}

// ────────────────────────────────────────────────────────
// 3. REPLY SUBMISSIONS
// ────────────────────────────────────────────────────────
window.setReplyType = function(type) {
    currentReplyType = type;
    
    const optPublic = document.getElementById('optPublicReply');
    const optInternal = document.getElementById('optInternalNote');
    const replyText = document.getElementById('agentReplyText');
    
    optPublic.classList.remove('active');
    optInternal.classList.remove('active');
    
    if (type === 'public') {
        optPublic.classList.add('active');
        replyText.placeholder = "Type public response to the user... (Use Shift+Enter for new line)";
        replyText.style.borderColor = '';
    } else {
        optInternal.classList.add('active');
        replyText.placeholder = "Type confidential internal note... (Visible only to Aegis Agents)";
        replyText.style.borderColor = 'var(--status-progress)';
    }
};

function postAgentReply() {
    const textInput = document.getElementById('agentReplyText');
    const msg = textInput.value;
    if (!msg.trim() || !selectedTicketId) return;
    
    const ticket = mockTickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;
    
    const newReply = {
        id: `rep-agt-${Date.now()}`,
        sender: 'Sarah Jenkins',
        role: currentReplyType === 'public' ? 'AGENT' : 'INTERNAL',
        message: msg
    };
    
    ticket.replies.push(newReply);
    
    // Auto update status to IN_PROGRESS if it was OPEN and we responded publicly
    if (ticket.status === 'OPEN' && currentReplyType === 'public') {
        ticket.status = 'IN_PROGRESS';
    }
    
    saveTicketsState();
    
    // Clean textbox
    textInput.value = '';
    textInput.dispatchEvent(new Event('input'));
    
    showToast(currentReplyType === 'public' ? "Public reply dispatched." : "Internal note saved.", "success");
    
    // Re-render conversation & queue
    renderTimeline(ticket);
    renderQueue(activeQueueFilter);
}

// ────────────────────────────────────────────────────────
// 4. AI COPILOT SIMULATORS
// ────────────────────────────────────────────────────────
let currentSuggestedDraft = "";

function simulateAiSuggestedReply(ticket) {
    const draftStatus = document.getElementById('aiDraftStatusArea');
    const draftBox = document.getElementById('copilotDraftBox');
    const applyBtn = document.getElementById('btnApplyAiDraft');
    
    // Reset and hide suggestions initially
    draftStatus.style.display = 'none';
    draftBox.textContent = "Analyzing conversation thread...";
    applyBtn.disabled = true;
    
    setTimeout(() => {
        if (selectedTicketId !== ticket.id) return;
        
        draftStatus.style.display = 'block';
        
        const lowerTitle = ticket.title.toLowerCase();
        let suggestion = "";
        
        if (lowerTitle.includes("flyway") || lowerTitle.includes("timezone") || lowerTitle.includes("deadlock")) {
            suggestion = "Hi Nilesh,\n\nWe see that Flyway timezone deadlock occurs due to discrepancy between database server timezone setting and local Spring JVM datasource parameters. In application.properties, update spring.datasource.url by appending ?serverTimezone=Asia/Kolkata. If issues persist, please let us know.";
        } else if (lowerTitle.includes("403") || lowerTitle.includes("blob") || lowerTitle.includes("forbidden")) {
            suggestion = "Hello Nilesh,\n\nThe 403 Forbidden on Azure Blob Storage attachments typically means the active Shared Access Signature (SAS) token on the container has expired. Please log into the Azure Portal, generate a new SAS token with appropriate permissions, and update your configuration key azure.storage.sas-token.";
        } else if (lowerTitle.includes("connection pool")) {
            suggestion = "Hi David,\n\nI have reviewed the pool metrics. Saturated pools of size 100 are common during scale events. We recommend bumping spring.datasource.hikari.maximum-pool-size to 250 in your cluster properties. Let me know if that clears the deadlocks.";
        } else {
            suggestion = `Hi ${ticket.createdBy},\n\nThank you for reaching out regarding "${ticket.title}". I am currently investigating the core logs. Could you please share the application properties metadata files and verify if there are any specific exception details?`;
        }
        
        currentSuggestedDraft = suggestion;
        draftBox.innerHTML = suggestion.replace(/\n/g, '<br>');
        applyBtn.disabled = false;
    }, 1200);
}

function insertAiDraft() {
    const textInput = document.getElementById('agentReplyText');
    if (textInput && currentSuggestedDraft) {
        textInput.value = currentSuggestedDraft;
        textInput.dispatchEvent(new Event('input'));
        showToast("AI Draft inserted into editor.", "info");
    }
}

function triggerThreadSummarization() {
    if (!selectedTicketId) return;
    const summaryBox = document.getElementById('aiThreadSummaryBox');
    const ticket = mockTickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;
    
    summaryBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.5rem; color:var(--brand);">
            <i class="fas fa-spinner fa-spin"></i> Generative GPT Summarizer running...
        </div>
    `;
    
    setTimeout(() => {
        if (selectedTicketId !== ticket.id) return;
        
        // Custom summaries based on ticket
        let summary = "";
        if (ticket.id === 't-101') {
            summary = "1. Customer filed timezone deadlock issues compiling Flyway migrations.<br>2. AI Copilot instantly matched cosine values with article 501 suggesting spring.datasource url updates.<br>3. Ticket auto-resolved with 5.0 CSAT review satisfaction rating.";
        } else if (ticket.id === 't-102') {
            summary = "1. Customer reported 403 Forbidden crashes on Azure storage invoice attachments.<br>2. Support Representative Jenkins scheduled SAS token regeneration checks.<br>3. SLA breach warning active due to 4+ hours of initial response delay.";
        } else if (ticket.id === 't-88') {
            summary = "1. Customer David Vance hit database pool saturation limits of 100 on staging.<br>2. Agent Sarah Jenkins updated maximum HikariCP pool parameters to 250.<br>3. Ticket successfully resolved with 4-star review.";
        } else {
            summary = `1. Customer reported support inquiry: "${ticket.title}".<br>2. Conversation history contains ${ticket.replies.length} replies from participants.<br>3. Awaiting resolution steps or documentation matching.`;
        }
        
        summaryBox.innerHTML = summary;
        showToast("GPT Summary generated.", "success");
    }, 1500);
}

function loadPgvectorMatches(ticket) {
    const container = document.getElementById('copilotKbMatches');
    if (!container) return;
    
    // Simulate finding match score
    const matches = mockArticles.filter(art => 
        art.title.toLowerCase().includes(ticket.category.toLowerCase().split(' ')[0]) ||
        ticket.title.toLowerCase().includes(art.category.toLowerCase().split(' ')[0]) ||
        art.category === ticket.category
    );
    
    if (matches.length === 0) {
        container.innerHTML = `
            <div class="copilot-box" style="font-size: 0.8rem; color: var(--text-disabled); text-align: center;">
                No matching KB articles.
            </div>
        `;
        return;
    }
    
    container.innerHTML = matches.map(art => `
        <div class="copilot-box" style="padding:0.75rem;">
            <div class="copilot-suggested-title" style="display:flex; justify-content:space-between; font-size:0.8rem;">
                <span>${art.title}</span>
                <span class="badge badge-resolved" style="font-size:0.6rem;">${(art.score || 0.85 * 100).toFixed(0)}%</span>
            </div>
            <p style="font-size: 0.7rem; color:var(--text-muted); line-height:1.3; margin-top:0.25rem;">
                ${art.content ? art.content.substring(0, 80) : 'Resolution parameters loaded.'}...
            </p>
            <div style="display:flex; gap:0.5rem; margin-top:0.4rem;">
                <button class="action-btn action-btn-outline" style="padding:0.15rem 0.4rem; font-size:0.65rem;" onclick="viewKbArticleInCopilot('${art.id}')">View full article</button>
            </div>
        </div>
    `).join('');
}

window.viewKbArticleInCopilot = function(artId) {
    const art = mockArticles.find(a => a.id === artId);
    if (!art) return;
    
    const modal = document.getElementById('agentModal');
    const modalTitle = document.getElementById('agentModalTitle');
    const modalBody = document.getElementById('agentModalBody');
    const modalClose = document.getElementById('agentModalCloseBtn');
    const modalActionClose = document.getElementById('agentModalCloseActionBtn');
    
    modalTitle.textContent = art.title;
    modalBody.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:0.5rem;">
                <span class="badge badge-open">Category: ${art.category}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">pgvector Cosine Synced</span>
            </div>
            <p style="font-size:0.85rem; line-height:1.5; color:var(--text-body);">${art.content}</p>
        </div>
    `;
    
    const closeFn = () => { modal.style.display = 'none'; };
    modalClose.onclick = closeFn;
    modalActionClose.onclick = closeFn;
    
    modal.style.display = 'flex';
};

// ────────────────────────────────────────────────────────
// 5. UPDATE TICKET PROPERTIES
// ────────────────────────────────────────────────────────
function populateDropdownOptions() {
    const assigneeSelect = document.getElementById('propAssignee');
    if (!assigneeSelect) return;
    
    assigneeSelect.innerHTML = `
        <option value="Unassigned">Unassigned</option>
        ${mockAgents.map(a => `<option value="${a.name}">${a.name}</option>`).join('')}
    `;
    
    const draftCat = document.getElementById('draftCategorySelect');
    if (draftCat) {
        draftCat.innerHTML = mockCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
}

function applyTicketUpdates() {
    if (!selectedTicketId) return;
    
    const ticket = mockTickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;
    
    const status = document.getElementById('propStatus').value;
    const priority = document.getElementById('propPriority').value;
    const assignee = document.getElementById('propAssignee').value;
    
    ticket.status = status;
    ticket.priority = priority;
    ticket.assignee = assignee;
    
    saveTicketsState();
    showToast(`Properties for ${ticket.id} updated successfully.`, "success");
    
    // Refresh UI
    selectAgentTicket(ticket.id);
    renderQueue(activeQueueFilter);
}

// ────────────────────────────────────────────────────────
// 6. PERFORMANCE REPORTS VIEWPORT
// ────────────────────────────────────────────────────────
function renderPerformanceTab() {
    const reviewsList = document.getElementById('agentCsatReviewsContainer');
    const hazardsList = document.getElementById('agentSlaHazardsContainer');
    
    // Calculations
    const sarahTickets = mockTickets.filter(t => t.assignee === 'Sarah Jenkins');
    const resolvedCount = sarahTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    document.getElementById('metricResolvedToday').textContent = resolvedCount + 3; // mock + base
    
    // CSAT calculation
    const ratedTickets = sarahTickets.filter(t => t.rated);
    let avg = 4.8; // default fallback if none
    if (ratedTickets.length > 0) {
        const sum = ratedTickets.reduce((acc, t) => acc + t.ratingVal, 0);
        avg = sum / ratedTickets.length;
    }
    document.getElementById('metricCsatScore').textContent = avg.toFixed(1);
    
    // Render Reviews
    // Gather all ratings linked to Sarah Jenkins resolved tickets, or default mock ratings
    const sarahReviews = mockCSATRatings.filter(r => {
        const t = mockTickets.find(ticket => ticket.id === r.ticketId);
        return t && (t.assignee === 'Sarah Jenkins' || t.assignee === 'AI Auto-Resolved'); // showing agent's or AI resolved ratings
    });
    
    if (reviewsList) {
        if (sarahReviews.length === 0) {
            reviewsList.innerHTML = `
                <div style="font-size:0.8rem; color:var(--text-disabled); text-align:center; padding:2rem; border:1px dashed var(--border-subtle); border-radius:0.5rem;">
                    No reviews registered. Resolved tickets will trigger survey prompts.
                </div>
            `;
        } else {
            reviewsList.innerHTML = sarahReviews.map(r => {
                let stars = '';
                for (let i = 1; i <= 5; i++) {
                    stars += `<i class="${i <= r.rating ? 'fas' : 'far'} fa-star" style="color: #fbbf24; font-size:0.8rem; margin-right:0.15rem;"></i>`;
                }
                return `
                    <div style="padding:1rem; border: 1px solid var(--border-subtle); border-radius:0.5rem; background-color: rgba(255,255,255,0.01);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <strong style="font-size:0.85rem; color:var(--text-heading);">${r.customer}</strong>
                            <div>${stars}</div>
                        </div>
                        <p style="font-size:0.75rem; color:var(--text-body); font-style:italic;">"${r.comment}"</p>
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.5rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:0.25rem;">
                            Ticket Ref: <strong style="color:var(--brand);">${r.ticketId}</strong>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    // Render SLA Hazards
    if (hazardsList) {
        // High priority open tickets are hazards
        const openHigh = mockTickets.filter(t => t.status === 'OPEN' && t.priority === 'high');
        
        if (openHigh.length === 0) {
            hazardsList.innerHTML = `
                <div style="padding:1.5rem; text-align:center; border:1px dashed var(--border-subtle); border-radius:0.5rem; color:var(--status-resolved);">
                    <i class="fas fa-check-circle" style="font-size:1.5rem; display:block; margin-bottom:0.4rem;"></i>
                    <span style="font-size:0.75rem; font-weight:600;">No SLA breaches pending. Excellent!</span>
                </div>
            `;
        } else {
            hazardsList.innerHTML = openHigh.map(t => `
                <div style="padding:0.75rem; border: 1px solid rgba(239, 68, 68, 0.2); border-radius:0.5rem; background-color: rgba(239, 68, 68, 0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="badge badge-priority-high" style="font-size:0.6rem;">Urgent response SLA</span>
                        <span style="font-size:0.7rem; color:var(--priority-high); font-weight:700;">Overdue by 4.2h</span>
                    </div>
                    <strong style="font-size:0.8rem; color:var(--text-heading); display:block; margin-top:0.25rem;">${t.title}</strong>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:var(--text-muted); margin-top:0.4rem;">
                        <span>Ref: ${t.id}</span>
                        <span>Assignee: <strong style="color:var(--status-progress);">${t.assignee}</strong></span>
                    </div>
                </div>
            `).join('');
        }
    }
}

// ────────────────────────────────────────────────────────
// 7. KB DRAFTS PORTAL VIEWPORT
// ────────────────────────────────────────────────────────
function renderKbDraftsTab() {
    const listContainer = document.getElementById('agentDraftsListContainer');
    if (!listContainer) return;
    
    // Get drafted/unpublished articles
    const drafts = mockArticles.filter(art => !art.published || art.vectorStatus === 'Pending Embedding');
    
    if (drafts.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 2rem; text-align:center; color: var(--text-disabled); font-size: 0.8rem;">
                No active drafts in verification queue.
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = drafts.map(art => {
        const isSynced = art.vectorStatus === 'Synced';
        let statusBadge = `<span class="badge badge-progress"><i class="fas fa-hourglass-start"></i> Admin review</span>`;
        if (isSynced && !art.published) {
            statusBadge = `<span class="badge badge-open"><i class="fas fa-microchip"></i> Synced, Unpub</span>`;
        }
        
        return `
            <div class="draft-list-item">
                <div style="flex:1; padding-right:1rem;">
                    <strong style="font-size:0.85rem; color:var(--text-heading); display:block;">${art.title}</strong>
                    <span style="font-size:0.7rem; color:var(--text-muted);">Category: ${art.category} • Updated: ${art.updated}</span>
                </div>
                <div>
                    ${statusBadge}
                </div>
            </div>
        `;
    }).join('');
}

function submitKbDraft(e) {
    e.preventDefault();
    
    const title = document.getElementById('draftTitleInput').value;
    const category = document.getElementById('draftCategorySelect').value;
    const content = document.getElementById('draftBodyInput').value;
    
    if (!title || !content) return;
    
    const newDraft = {
        id: `kb-${Date.now().toString().substring(8)}`,
        title: title,
        category: category,
        content: content,
        vectorStatus: 'Pending Embedding',
        updated: new Date().toISOString().replace('T', ' ').substring(0, 16),
        published: false
    };
    
    mockArticles.push(newDraft);
    saveArticlesState();
    
    // Reset form
    document.getElementById('agentKbDraftForm').reset();
    populateDropdownOptions(); // refresh selects
    
    showToast("KB Article draft submitted to administrator review.", "success");
    
    // Re-render
    renderKbDraftsTab();
    
    // Simulate Admin review & vectoring process
    setTimeout(() => {
        const found = mockArticles.find(a => a.id === newDraft.id);
        if (found) {
            found.vectorStatus = 'Synced';
            saveArticlesState();
            renderKbDraftsTab();
            showToast(`pgvector generated embeddings for draft "${found.title}".`, "success");
        }
    }, 6000);
}

// ────────────────────────────────────────────────────────
// THEME SYNC
// ────────────────────────────────────────────────────────
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Obsidian Dark' : 'Ice Mint Light'} mode.`, 'info');
}

function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'light') {
        icon.className = 'fas fa-moon';
    } else {
        icon.className = 'fas fa-sun';
    }
}

// ────────────────────────────────────────────────────────
// TOASTS
// ────────────────────────────────────────────────────────
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    let iconClass = 'fa-circle-info';
    let iconColor = 'var(--brand)';

    if (type === 'success') {
        iconClass = 'fa-circle-check';
        iconColor = 'var(--status-resolved)';
    } else if (type === 'warning') {
        iconClass = 'fa-triangle-exclamation';
        iconColor = 'var(--status-progress)';
    } else if (type === 'error') {
        iconClass = 'fa-circle-xmark';
        iconColor = 'var(--priority-high)';
    }

    toast.innerHTML = `
        <i class="fas ${iconClass}" style="color: ${iconColor}; font-size: 1.1rem; flex-shrink: 0;"></i>
        <div style="font-size: 0.85rem; color: var(--text-heading); font-weight: 500; line-height: 1.4; flex-grow: 1;">${message}</div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.95rem; padding: 0.25rem;"><i class="fas fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s forwards reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
};

function initAutoExpandingTextarea() {
    const textareas = document.querySelectorAll('.chat-textarea');
    textareas.forEach(textarea => {
        const adjustHeight = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            textarea.style.overflowY = textarea.scrollHeight > 120 ? 'auto' : 'hidden';
        };
        textarea.addEventListener('input', adjustHeight);
        textarea.addEventListener('change', adjustHeight);
        adjustHeight();
    });
}
