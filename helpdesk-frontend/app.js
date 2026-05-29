// Mock Initial Data Store
let mockCategories = [
    { id: '1', name: 'Database', description: 'PostgreSQL, Flyway migrations and performance issues' },
    { id: '2', name: 'Authentication', description: 'JWT tokens, Login/Signup, Spring Security locks' },
    { id: '3', name: 'Billing', description: 'Payments, invoice issues and account upgrades' },
    { id: '4', name: 'AI Services', description: 'OpenAI Embeddings, prompt timeouts, pgvector search failures' }
];

const mockKnowledgeBase = [
    {
        id: 'kb-1',
        title: 'Fixing JWT "SignatureException" on token validation',
        content: 'If you encounter SignatureException, ensure your JWT_SECRET in the .env file is exactly 256-bit (32 bytes) long and encoded using Base64. Check that WebMvcConfig matches the signing key algorithm.',
        category: 'Authentication'
    },
    {
        id: 'kb-2',
        title: 'How to enable pgvector extension in Postgres',
        content: 'Run "CREATE EXTENSION IF NOT EXISTS vector;" in your migration file or directly in the database console. Note: you must use PostgreSQL 15+ and have pgvector installed on the server host.',
        category: 'Database'
    },
    {
        id: 'kb-3',
        title: 'Avoiding Azure Blob Storage upload timeouts',
        content: 'Check the connection string parameters. Ensure the timeout block is set on BlobClientBuilder and verify that file size does not exceed the multipart limit (10MB default in application.properties).',
        category: 'Database'
    }
];

let mockTickets = [
    {
        id: 't-101',
        title: 'FATAL: invalid value for parameter "TimeZone": "Asia/Calcutta"',
        description: 'The flyway database migration fails on startup with FATAL: invalid value for TimeZone. Using Spring Boot 3.5 and local PostgreSQL.',
        status: 'RESOLVED',
        priority: 'high',
        category: 'Database',
        createdBy: 'Nilesh Dev',
        createdAt: '2026-05-21 14:05',
        replies: [
            { sender: 'Nilesh Dev', role: 'USER', message: 'I cannot launch the application due to flywayInitializer failing.', time: '14:05' },
            { sender: 'AI Assistant', role: 'AI', message: 'Hi Nilesh! This occurs because PostgreSQL does not recognize "Asia/Calcutta". Go to application.properties and change the time zone options in the datasource URL to Asia/Kolkata, or change the <app.timezone> setting in your pom.xml.', time: '14:06' },
            { sender: 'Nilesh Dev', role: 'USER', message: 'That worked! The context loaded successfully now. Thanks!', time: '14:15' }
        ],
        aiResolved: true
    },
    {
        id: 't-102',
        title: 'Cannot retrieve attachments uploaded to Azure Storage container',
        description: 'We are getting a 403 Forbidden error whenever a customer clicks the download link for a ticket attachment.',
        status: 'OPEN',
        priority: 'medium',
        category: 'Database',
        createdBy: 'Alice Miller',
        createdAt: '2026-05-22 09:30',
        replies: [
            { sender: 'Alice Miller', role: 'USER', message: 'Please assist, clients cannot download invoices from the ticket portal.', time: '09:30' }
        ],
        aiResolved: false
    },
    {
        id: 't-103',
        title: 'JWT tokens expire too quickly for active administrators',
        description: 'Admin users are getting kicked out after only 1 hour even when they are active. We need a rolling session or longer expiry.',
        status: 'IN_PROGRESS',
        priority: 'high',
        category: 'Authentication',
        createdBy: 'Bob Manager',
        createdAt: '2026-05-22 11:15',
        replies: [
            { sender: 'Bob Manager', role: 'USER', message: 'Is it possible to increase app.jwt.expiration in application.properties?', time: '11:15' },
            { sender: 'Agent Sarah', role: 'AGENT', message: 'Hello Bob, I am looking into this. We can increase expiration to 86400000 ms (24 hours).', time: '11:30' }
        ],
        aiResolved: false
    }
];

// Active State
let currentActiveRole = 'USER';
let selectedTicketId = 't-102';

// DOM Elements & Routing
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupTheme();
});

function initApp() {
    // Populate Category selectors
    initCategorySelectors();

    // Handle sidebar navigation item clicks
    const menuItems = document.querySelectorAll('.menu-list .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            const tab = item.dataset.tab;
            let role = 'USER';
            if (tab === 'agentWorkspace') role = 'AGENT';
            if (tab === 'adminAnalytics') role = 'ADMIN';
            
            // Sync dropdown selection
            const roleSelect = document.getElementById('roleSelect');
            if (roleSelect) roleSelect.value = role;
            
            switchRole(role);
        });
    });

    // Handle view mode dropdown change
    const roleSelect = document.getElementById('roleSelect');
    if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
            const role = e.target.value;
            let targetTab = 'customerPortal';
            if (role === 'AGENT') targetTab = 'agentWorkspace';
            if (role === 'ADMIN') targetTab = 'adminAnalytics';
            
            // Sync menu item selection
            menuItems.forEach(mi => {
                mi.classList.remove('active');
                if (mi.dataset.tab === targetTab) {
                    mi.classList.add('active');
                }
            });
            
            switchRole(role);
        });
    }

    // Theme toggle
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

    // Close Modal Button binds
    document.getElementById('modalCloseBtn').onclick = closeModal;
    document.getElementById('customModal').onclick = (e) => {
        if (e.target.id === 'customModal') {
            closeModal();
        }
    };

    // Setup forms and interactive event handlers
    setupCustomerHandlers();
    setupAgentHandlers();
    setupAdminHandlers();

    // Initial render
    renderTicketsList();
    initAutoExpandingTextarea();
}

function initCategorySelectors() {
    const catSelectors = document.querySelectorAll('.category-dropdown');
    catSelectors.forEach(select => {
        select.innerHTML = mockCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    });
}

// Switch view tabs
function switchRole(role) {
    currentActiveRole = role;
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    const titleElement = document.getElementById('currentViewTitle');
    const roleBadge = document.getElementById('userBadgeRole');
    const userAvatar = document.getElementById('userAvatar');
    
    if (role === 'USER') {
        document.getElementById('customerPortal').classList.add('active');
        if (titleElement) titleElement.textContent = 'Customer Support Portal';
        if (roleBadge) roleBadge.textContent = 'Customer';
        if (userAvatar) userAvatar.textContent = 'ND';
    } else if (role === 'AGENT') {
        document.getElementById('agentWorkspace').classList.add('active');
        if (titleElement) titleElement.textContent = 'Agent Workspace Console';
        if (roleBadge) roleBadge.textContent = 'Support Agent';
        if (userAvatar) userAvatar.textContent = 'AS';
        renderTicketsList();
        loadTicketInChat(selectedTicketId);
    } else if (role === 'ADMIN') {
        document.getElementById('adminAnalytics').classList.add('active');
        if (titleElement) titleElement.textContent = 'System Administration & Analytics';
        if (roleBadge) roleBadge.textContent = 'System Admin';
        if (userAvatar) userAvatar.textContent = 'AA';
        loadAdminStats();
    }
}

// Light / Dark Theme toggle
function setupTheme() {
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
    showToast(`Switched to ${newTheme} mode.`, 'info');
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggleBtn i');
    if (icon) {
        if (theme === 'light') {
            icon.className = 'fas fa-moon';
        } else {
            icon.className = 'fas fa-sun';
        }
    }
}

/* ────────────────────────────────────────────────────────
   CUSTOMER PORTAL LOGIC
   ──────────────────────────────────────────────────────── */
function setupCustomerHandlers() {
    const titleInput = document.getElementById('ticketTitle');
    const deflectionBox = document.getElementById('deflectionBox');
    const deflectionIdle = document.getElementById('deflectionIdle');
    const deflectionResults = document.getElementById('deflectionResults');

    // Live Semantic Search Deflection Simulation
    titleInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 4) {
            deflectionBox.style.display = 'none';
            deflectionIdle.style.display = 'block';
            return;
        }

        // Search KB + resolved tickets
        const kbMatches = mockKnowledgeBase.filter(kb => 
            kb.title.toLowerCase().includes(query) || kb.content.toLowerCase().includes(query)
        );
        const ticketMatches = mockTickets.filter(t => 
            t.status === 'RESOLVED' && 
            (t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query))
        );

        if (kbMatches.length === 0 && ticketMatches.length === 0) {
            deflectionBox.style.display = 'none';
            deflectionIdle.style.display = 'block';
            return;
        }

        deflectionBox.style.display = 'block';
        deflectionIdle.style.display = 'none';
        
        let html = '';
        
        // Render Knowledge suggestions
        kbMatches.forEach(kb => {
            html += `
                <div style="cursor: pointer; background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 0.8rem; border-radius: 0.5rem; transition: border-color 0.2s;" 
                     onmouseover="this.style.borderColor='var(--brand)'" 
                     onmouseout="this.style.borderColor='var(--border-subtle)'"
                     onclick="viewKBArticle('${kb.title}', \`${kb.content}\`)">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; align-items: center;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-heading);">📄 KB: ${kb.title}</span>
                        <span style="font-size: 0.65rem; font-weight: 700; background: var(--status-resolved-bg); color: var(--status-resolved); padding: 0.15rem 0.4rem; border-radius: 0.25rem;">Suggested Fix</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">${kb.content.substring(0, 100)}...</div>
                </div>
            `;
        });

        // Render Resolved ticket matches
        ticketMatches.forEach(t => {
            const solution = t.replies.find(r => r.role === 'AI' || r.role === 'AGENT')?.message || '';
            html += `
                <div style="cursor: pointer; background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 0.8rem; border-radius: 0.5rem; transition: border-color 0.2s;" 
                     onmouseover="this.style.borderColor='var(--brand)'" 
                     onmouseout="this.style.borderColor='var(--border-subtle)'"
                     onclick="viewKBArticle('Ticket: ${t.title}', \`Solution:\\n${solution}\`)">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; align-items: center;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-heading);">🕒 Case: ${t.title}</span>
                        <span style="font-size: 0.65rem; font-weight: 700; background: var(--status-open-bg); color: var(--status-open); padding: 0.15rem 0.4rem; border-radius: 0.25rem;">Solved Case</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">${t.description.substring(0, 100)}...</div>
                </div>
            `;
        });

        deflectionResults.innerHTML = html;
    });

    // Handle ticket submission
    document.getElementById('newTicketForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = titleInput.value.trim();
        const description = document.getElementById('ticketDesc').value.trim();
        const category = document.getElementById('ticketCategory').value;
        const priority = document.getElementById('ticketPriority').value;

        if (!title || !description) return;

        // Create new ticket object
        const newTicket = {
            id: 't-' + (100 + mockTickets.length + 1),
            title,
            description,
            status: 'OPEN',
            priority,
            category,
            createdBy: 'Nilesh Dev',
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            replies: [
                { sender: 'Nilesh Dev', role: 'USER', message: description, time: 'Now' }
            ],
            aiResolved: false
        };

        mockTickets.unshift(newTicket);
        
        // Show success toast
        showToast(`Ticket ${newTicket.id} filed. AI Auto-routing triggered.`, "success");
        
        // Clear form
        document.getElementById('newTicketForm').reset();
        deflectionBox.style.display = 'none';
        deflectionIdle.style.display = 'block';

        // Auto trigger AI resolution in background
        simulateAiResolution(newTicket);
    });
}

function viewKBArticle(title, content) {
    const formattedContent = content.replace(/\n/g, '<br>');
    showModal(title, `<div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-body);">${formattedContent}</div>`, null);
}

// Background simulation of AIService.processNewTicket
function simulateAiResolution(ticket) {
    const hasKnownFix = ticket.title.toLowerCase().includes('timezone') || ticket.title.toLowerCase().includes('calcutta') || ticket.description.toLowerCase().includes('timezone');
    
    if (hasKnownFix) {
        setTimeout(() => {
            const aiMessage = "AI Auto-Response: This matches a known timezone issue. We detected your target timezone is 'Asia/Calcutta' which fails on default PostgreSQL installations. Changing your setting in application.properties to 'Asia/Kolkata' resolved this in our historical cases. The ticket has been marked RESOLVED.";
            ticket.replies.push({
                sender: 'AI Assistant',
                role: 'AI',
                message: aiMessage,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            ticket.status = 'RESOLVED';
            ticket.aiResolved = true;
            
            // If viewing this ticket in Agent space, refresh
            if (currentActiveRole === 'AGENT') {
                renderTicketsList();
                if (selectedTicketId === ticket.id) {
                    loadTicketInChat(ticket.id);
                }
            }
            showToast(`🤖 AI Engine auto-resolved Ticket ${ticket.id} using semantic matching!`, "ai");
        }, 3000);
    }
}

/* ────────────────────────────────────────────────────────
   AGENT WORKSPACE LOGIC
   ──────────────────────────────────────────────────────── */
function setupAgentHandlers() {
    // Quick search filtering in agent sidebar
    document.getElementById('agentSearch').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        renderTicketsList(query);
    });

    // Chat reply box send button
    document.getElementById('agentSendBtn').addEventListener('click', sendAgentReply);
    document.getElementById('replyTextInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAgentReply();
        }
    });

    // AI suggestions draft button
    document.getElementById('btnAiDraft').addEventListener('click', suggestAiReply);
    
    // AI summarizer thread button
    document.getElementById('btnAiSummarize').addEventListener('click', summarizeThread);
}

function renderTicketsList(filterText = '') {
    const listContainer = document.getElementById('sidebarTicketList');
    if (!listContainer) return;

    let tickets = mockTickets;
    if (filterText) {
        tickets = mockTickets.filter(t => 
            t.title.toLowerCase().includes(filterText) || 
            t.id.toLowerCase().includes(filterText) ||
            t.category.toLowerCase().includes(filterText)
        );
    }

    // Update queue count
    const countBadge = document.getElementById('queueCount');
    if (countBadge) {
        countBadge.textContent = `${tickets.length} tickets`;
    }

    listContainer.innerHTML = tickets.map(t => {
        const activeClass = t.id === selectedTicketId ? 'active' : '';
        const statusBadgeClass = `badge-${t.status.toLowerCase()}`;
        const priorityBadgeClass = `badge-priority-${t.priority.toLowerCase()}`;
        
        return `
            <div class="queue-item ${activeClass}" onclick="selectTicket('${t.id}')">
                <div class="queue-row">
                    <span class="queue-title" title="${t.title}">${t.title}</span>
                    <span class="badge ${priorityBadgeClass}">${t.priority}</span>
                </div>
                <div class="queue-row" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
                    <span>${t.id} • ${t.category}</span>
                </div>
                <div class="queue-row" style="margin-top: 0.35rem; font-size: 0.7rem; color: var(--text-muted);">
                    <span>${t.createdAt}</span>
                    <span class="badge ${statusBadgeClass}">${t.status.replace('_', ' ')}</span>
                </div>
            </div>
        `;
    }).join('');
}

function selectTicket(id) {
    selectedTicketId = id;
    renderTicketsList();
    loadTicketInChat(id);
}

function loadTicketInChat(id) {
    const ticket = mockTickets.find(t => t.id === id);
    if (!ticket) return;

    // Header info
    document.getElementById('chatTicketTitle').textContent = `#${ticket.id}: ${ticket.title}`;
    document.getElementById('chatTicketMeta').textContent = `Created by ${ticket.createdBy} in [${ticket.category}] • Priority: ${ticket.priority.toUpperCase()}`;
    
    // Status Dropdown initialization
    const statusSelect = document.getElementById('chatStatusDropdown');
    statusSelect.innerHTML = `
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
    `;
    statusSelect.value = ticket.status;
    
    // Class name adjustment
    statusSelect.className = 'text-input ' + (
        ticket.status === 'RESOLVED' ? 'status-resolved' : 
        ticket.status === 'IN_PROGRESS' ? 'status-inprogress' : 
        ticket.status === 'OPEN' ? 'status-open' : 'status-closed'
    );
    
    statusSelect.onchange = (e) => {
        const oldStatus = ticket.status;
        ticket.status = e.target.value;
        showToast(`Ticket status updated from ${oldStatus} to ${ticket.status}.`, 'info');
        selectTicket(id);
    };

    // Render Messages
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.innerHTML = ticket.replies.map(r => {
        let bubbleClass = 'incoming';
        let customStyle = '';
        let isInternal = r.isInternal || false;
        
        if (isInternal) {
            bubbleClass = 'internal';
        } else if (r.role === 'AI') {
            bubbleClass = 'incoming';
            customStyle = 'background: linear-gradient(135deg, var(--bg-card), var(--brand-glow)); border-color: var(--brand); border-style: dashed; border-width: 1px;';
        } else if (r.role === 'AGENT') {
            bubbleClass = 'outgoing';
        }
        
        let senderHtml = r.sender;
        if (r.role === 'AI') {
            senderHtml = `<i class="fas fa-robot" style="color: var(--brand); margin-right: 0.25rem;"></i> AI Assistant`;
        } else if (r.role === 'AGENT') {
            senderHtml = `<i class="fas fa-headset" style="color: rgba(255,255,255,0.7); margin-right: 0.25rem;"></i> ${r.sender}`;
        } else {
            senderHtml = `<i class="fas fa-user-circle" style="color: var(--text-muted); margin-right: 0.25rem;"></i> ${r.sender}`;
        }
        
        if (isInternal) {
            senderHtml = `<i class="fas fa-lock" style="color: var(--status-progress); margin-right: 0.25rem;"></i> Agent Note`;
        }
        
        return `
            <div class="chat-bubble ${bubbleClass}" style="${customStyle}">
                <div style="word-break: break-word;">${r.message.replace(/\n/g, '<br>')}</div>
                <div class="chat-bubble-meta">
                    <span>${senderHtml}</span>
                    <span>${r.time}</span>
                </div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Hide AI Draft indicator on ticket load
    document.getElementById('aiDraftAlert').style.display = 'none';

    // Update Copilot Metadata Box
    document.getElementById('metaCreator').textContent = ticket.createdBy;
    document.getElementById('metaCreated').textContent = ticket.createdAt;
    document.getElementById('metaCategory').textContent = ticket.category;
    document.getElementById('metaPriority').textContent = ticket.priority.toUpperCase();
    
    const priorityColor = ticket.priority === 'high' ? 'var(--priority-high)' : ticket.priority === 'medium' ? 'var(--priority-medium)' : 'var(--priority-low)';
    document.getElementById('metaPriority').style.color = priorityColor;
    
    // Determine workload assignment
    let assignee = "Unassigned";
    if (ticket.status === 'IN_PROGRESS') {
        assignee = "Sarah Jenkins";
    } else if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        assignee = ticket.aiResolved ? "AI Auto-Resolved" : "Sarah Jenkins";
    }
    const metaAssign = document.getElementById('metaAssignment');
    metaAssign.textContent = assignee;
    metaAssign.style.color = assignee.includes("AI") ? "var(--brand)" : (assignee === "Unassigned" ? "var(--text-disabled)" : "var(--status-progress)");
    
    // Reset summary widget
    const summaryBox = document.getElementById('copilotSummaryBox');
    summaryBox.innerHTML = `
        <div style="text-align: center; padding: 0.5rem 0;">
            <button class="action-btn" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="summarizeThread()">
                <i class="fas fa-list-check"></i> Generate AI Summary
            </button>
        </div>
    `;
    
    // Populate resolution hints based on category
    const kbBox = document.getElementById('copilotKBBox');
    const matchedKBs = mockKnowledgeBase.filter(kb => kb.category === ticket.category);
    if (matchedKBs.length > 0) {
        kbBox.innerHTML = `
            <div style="font-weight:600; margin-bottom: 0.5rem; color: var(--text-heading); font-size: 0.75rem;">Category matches (${matchedKBs.length}):</div>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
                ${matchedKBs.map(kb => `
                    <div style="cursor:pointer; background: rgba(0,0,0,0.15); border: 1px solid var(--border-subtle); padding: 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; transition: border-color 0.2s;" 
                         onmouseover="this.style.borderColor='var(--brand)'" 
                         onmouseout="this.style.borderColor='var(--border-subtle)'"
                         onclick="viewKBArticle('${kb.title}', \`${kb.content}\`)">
                        <i class="fas fa-file-lines" style="color: var(--brand); margin-right:0.25rem;"></i> <strong>${kb.title}</strong>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        kbBox.innerHTML = `
            <span style="color: var(--text-muted); font-size: 0.75rem;">No KB resolution articles found matching [${ticket.category}].</span>
        `;
    }
}

function sendAgentReply() {
    const input = document.getElementById('replyTextInput');
    const msg = input.value.trim();
    if (!msg) return;

    const ticket = mockTickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;

    const isInternal = document.getElementById('replyIsInternal').checked;

    ticket.replies.push({
        sender: 'Agent Sarah',
        role: 'AGENT',
        message: msg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isInternal: isInternal
    });

    if (ticket.status === 'OPEN' && !isInternal) {
        ticket.status = 'IN_PROGRESS';
    }

    input.value = '';
    input.dispatchEvent(new Event('input'));
    document.getElementById('replyIsInternal').checked = false;
    
    // Refresh
    loadTicketInChat(selectedTicketId);
    renderTicketsList();
    
    showToast(isInternal ? "Internal note posted." : "Reply sent to customer.", "success");
}

// Simulate AI Draft Suggestion
function suggestAiReply() {
    const draftAlert = document.getElementById('aiDraftAlert');
    const draftText = document.getElementById('aiDraftText');
    
    if (!draftAlert || !draftText) return;
    
    draftAlert.style.display = 'flex';
    draftText.innerHTML = `
        <div style="display:flex; align-items:center; gap: 0.5rem;">
            <i class="fas fa-spinner fa-spin" style="color: var(--brand);"></i>
            <span style="font-size:0.8rem; color:var(--text-muted);">AI scanning similar resolved cases...</span>
        </div>
    `;

    setTimeout(() => {
        const ticket = mockTickets.find(t => t.id === selectedTicketId);
        if (!ticket) return;
        let suggestedResponse = "";

        if (ticket.id === 't-101') {
            suggestedResponse = "Hi Nilesh, this occurs when Postgres timezone settings mismatch. Change 'Asia/Calcutta' to 'Asia/Kolkata' in your application.properties configuration.";
        } else if (ticket.id === 't-102') {
            suggestedResponse = "Hi Alice, We found a matching issue in the database category regarding Azure Blob Storage permission limits. Please verify your Azure SAS container tokens and ensure read privileges are toggled on.";
        } else if (ticket.id === 't-103') {
            suggestedResponse = "Hello Bob, Sure, we can update the JWT token expiration config. Please navigate to application.properties and look for app.jwt.expiration. Set it to 86400000 (24 Hours) to increase the active session duration.";
        } else {
            suggestedResponse = `Dear ${ticket.createdBy}, I would recommend reviewing past resolved issues in category [${ticket.category}] to address your issue. Our systems are currently analyzing standard resolution logs.`;
        }

        draftText.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.25rem;">
                <div style="font-size: 0.75rem; color: var(--brand); font-weight: 700;"><i class="fas fa-bolt"></i> AI Suggested Draft:</div>
                <div style="font-size: 0.85rem; font-style: italic; color: var(--text-heading); margin-bottom: 0.5rem;">"${suggestedResponse}"</div>
                <div>
                    <button class="action-btn" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="applyDraft(\`${suggestedResponse.replace(/"/g, '\\"')}\`)">Apply Suggested Reply</button>
                    <button class="action-btn action-btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; margin-left:0.5rem;" onclick="document.getElementById('aiDraftAlert').style.display='none'">Dismiss</button>
                </div>
            </div>
        `;
        showToast("AI suggested draft ready.", "success");
    }, 1200);
}

window.applyDraft = function(text) {
    const input = document.getElementById('replyTextInput');
    if (input) {
        input.value = text;
        input.dispatchEvent(new Event('input'));
    }
    document.getElementById('aiDraftAlert').style.display = 'none';
    showToast("AI reply draft applied to input.", "info");
};

// Simulate Thread Summarizer
function summarizeThread() {
    const ticket = mockTickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;

    const summaryBox = document.getElementById('copilotSummaryBox');
    summaryBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-spinner fa-spin" style="color: var(--brand);"></i>
            <span>GPT analyzing conversation...</span>
        </div>
    `;

    setTimeout(() => {
        let summaryText = "";
        if (ticket.id === 't-101') {
            summaryText = "• Client Nilesh Dev reported time zone conflict during database flyway initialization.<br>• AI auto-suggested changing setting in application.properties to Asia/Kolkata.<br>• Client verified fix, ticket was successfully resolved in 10 minutes.";
        } else if (ticket.id === 't-102') {
            summaryText = "• Client Alice Miller complains that attachments on Azure storage return 403 Forbidden.<br>• No action taken yet. Ticket is currently unassigned/Open.<br>• Root cause matches Azure SAS permissions block.";
        } else if (ticket.id === 't-103') {
            summaryText = "• Admin Bob Manager requested longer JWT session expiration configs.<br>• Agent Sarah Jenkins suggested changing app.jwt.expiration to 24 hours.<br>• Ticket is IN_PROGRESS pending deploy verification.";
        } else {
            summaryText = `• Ticket raised by ${ticket.createdBy} regarding: ${ticket.title}.<br>• The thread currently contains ${ticket.replies.length} replies.<br>• Status is currently marked as ${ticket.status}.`;
        }

        summaryBox.innerHTML = `
            <div style="background: var(--brand-glow); border: 1px solid var(--border-subtle); padding: 0.75rem; border-radius: 0.375rem; color: var(--text-body);">
                <div style="font-weight: 600; color: var(--text-heading); margin-bottom: 0.4rem; font-size: 0.75rem;"><i class="fas fa-bolt" style="color:var(--brand);"></i> AI Copilot Summary:</div>
                <div style="font-size:0.75rem; line-height: 1.4;">${summaryText}</div>
            </div>
        `;
        showToast("Conversation thread summarized by AI.", "success");
    }, 1000);
}

/* ────────────────────────────────────────────────────────
   ADMIN ANALYTICS LOGIC
   ──────────────────────────────────────────────────────── */
function setupAdminHandlers() {
    // Add Category button
    const addBtn = document.getElementById('addCategoryBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const bodyHtml = `
                <div class="form-layout">
                    <div class="field-group">
                        <label for="newCatName">Category Name</label>
                        <input type="text" id="newCatName" class="text-input" placeholder="e.g. Cloud API" required>
                    </div>
                    <div class="field-group">
                        <label for="newCatDesc">Description</label>
                        <textarea id="newCatDesc" class="text-input" placeholder="e.g. Azure functions and deployment pipelines" style="min-height: 80px;"></textarea>
                    </div>
                </div>
            `;
            showModal('Add New Category', bodyHtml, () => {
                const name = document.getElementById('newCatName').value.trim();
                const desc = document.getElementById('newCatDesc').value.trim();
                if (name) {
                    const newId = (mockCategories.length + 1).toString();
                    mockCategories.push({ id: newId, name, description: desc });
                    showToast(`Category "${name}" created successfully.`, 'success');
                    initCategorySelectors();
                    renderAdminCategories();
                } else {
                    showToast('Category name cannot be empty.', 'error');
                }
            }, 'Create');
        });
    }

    renderAdminCategories();
}

function renderAdminCategories() {
    const catList = document.getElementById('adminCategoriesList');
    if (!catList) return;

    catList.innerHTML = mockCategories.map(c => `
        <div class="category-card">
            <div class="category-details">
                <strong style="color: var(--text-heading); font-size: 0.95rem;">${c.name}</strong>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${c.description}</span>
            </div>
            <button class="action-btn action-btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="manageCategory('${c.id}')">Manage</button>
        </div>
    `).join('');
}

window.manageCategory = function(id) {
    const cat = mockCategories.find(c => c.id === id);
    if (!cat) return;
    
    const bodyHtml = `
        <div style="font-size: 0.9rem; line-height: 1.6;">
            <p><strong>ID:</strong> ${cat.id}</p>
            <p><strong>Name:</strong> ${cat.name}</p>
            <p><strong>Description:</strong> ${cat.description}</p>
            <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.8rem;">
                <i class="fas fa-circle-info"></i> In the live backend database, this maps to direct REST API calls at <code>/api/admin/categories/${cat.id}</code>.
            </p>
        </div>
    `;
    showModal(`Manage: ${cat.name}`, bodyHtml, () => {
        mockCategories.splice(mockCategories.findIndex(c => c.id === id), 1);
        showToast(`Category "${cat.name}" has been removed.`, 'warning');
        initCategorySelectors();
        renderAdminCategories();
    }, 'Delete Category');
};

function loadAdminStats() {
    // Animate mock bar charts
    setTimeout(() => {
        const fills = document.querySelectorAll('.bar-fill');
        fills.forEach(fill => {
            fill.style.width = fill.dataset.w + '%';
        });
    }, 200);
}

// ────────────────────────────────────────────────────────
// PREMIUM TOAST NOTIFICATION SYSTEM
// ────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon based on type
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
    } else if (type === 'ai') {
        iconClass = 'fa-robot';
        iconColor = 'var(--brand)';
        toast.style.borderColor = 'var(--brand)';
        toast.style.background = 'linear-gradient(135deg, var(--bg-card), var(--brand-glow))';
    }

    toast.innerHTML = `
        <i class="fas ${iconClass}" style="color: ${iconColor}; font-size: 1.1rem; flex-shrink: 0;"></i>
        <div style="font-size: 0.85rem; color: var(--text-heading); font-weight: 500; line-height: 1.4; flex-grow: 1;">${message}</div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.95rem; padding: 0.25rem;"><i class="fas fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s forwards reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// ────────────────────────────────────────────────────────
// PREMIUM GLASSMORPHIC MODAL SYSTEM
// ────────────────────────────────────────────────────────
function showModal(title, bodyHtml, confirmCallback = null, confirmText = 'Confirm') {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    
    // Configure footer buttons
    if (confirmCallback) {
        modalFooter.style.display = 'flex';
        modalFooter.innerHTML = `
            <button class="action-btn action-btn-outline" id="modalCancelBtn">Cancel</button>
            <button class="action-btn" id="modalConfirmBtn">${confirmText}</button>
        `;
        document.getElementById('modalCancelBtn').onclick = () => closeModal();
        document.getElementById('modalConfirmBtn').onclick = () => {
            confirmCallback();
            closeModal();
        };
    } else {
        // Just show close button
        modalFooter.style.display = 'flex';
        modalFooter.innerHTML = `
            <button class="action-btn" id="modalCloseBtnOk">Close</button>
        `;
        document.getElementById('modalCloseBtnOk').onclick = () => closeModal();
    }
    
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('customModal');
    modal.style.display = 'none';
}

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
