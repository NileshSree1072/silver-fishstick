// Aegis Helpdesk Admin Console Controller

function escapeHtml(str) {
    if (typeof str !== 'string') {
        if (str === null || str === undefined) return '';
        str = String(str);
    }
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ────────────────────────────────────────────────────────
// MOCK DATA REGISTRY
// ────────────────────────────────────────────────────────
let mockAgents = [];
let mockCategories = [];
let mockArticles = [];
let mockCSATRatings = [];
let mockSlaBreaches = [];
let mockTickets = [];
let systemLogs = [
    { type: 'success', msg: 'System initialization completed. Spring Boot 3.5 nodes fully synchronized.' },
    { type: 'info', msg: 'pgvector Cosine Similarity indices initialized successfully.' },
    { type: 'info', msg: 'Azure Blob Client bound to container /attachments.' },
    { type: 'info', msg: 'WebSocket channel connected on port 8080 topic /topic/notifications.' },
    { type: 'warn', msg: 'SLA Breach event triggered on high priority ticket t-102.' }
];

function loadState() {
    // Categories
    mockCategories = JSON.parse(localStorage.getItem('aegis_categories')) || [
        { id: 'c-1', name: 'Tech Support', desc: 'Hardware failures, server timeouts, database crashes.', ticketCount: 13 },
        { id: 'c-2', name: 'Billing', desc: 'Subscription tiers, license audits, refunds, corporate invoices.', ticketCount: 8 },
        { id: 'c-3', name: 'Bug Reports', desc: 'Frontend glitches, API routing errors, code regressions.', ticketCount: 19 },
        { id: 'c-4', name: 'Security', desc: 'Penetration tests, JWT validation leaks, access logs audits.', ticketCount: 5 },
        { id: 'c-5', name: 'General', desc: 'SLA questions, feature requests, marketing queries.', ticketCount: 4 }
    ];
    
    // Articles
    mockArticles = JSON.parse(localStorage.getItem('aegis_articles')) || [
        { id: 'kb-501', title: 'Resolving flyway timestamp zone conflicts', category: 'Tech Support', content: 'Database deadlocks or migration crashes on flyway timestamp columns occur because of server timezone conflicts. In your application.properties configuration, change spring.datasource.url parameter and add ?serverTimezone=Asia/Kolkata, or match the PostgreSQL timezone directly in the database configuration console.', score: 0.94, vectorStatus: 'Synced', updated: '2026-05-22 09:30', published: true },
        { id: 'kb-502', title: 'Azure Blob Storage attachments return 403 Forbidden', category: 'Tech Support', content: 'Attachments failing with 403 errors are caused by expired Azure Storage Shared Access Signature (SAS) tokens. Regenerate SAS tokens with "Read" and "List" privileges checked in your Azure Storage Explorer Console, and update the azure.storage.sas-token key in your Spring Boot application properties file.', score: 0.92, vectorStatus: 'Synced', updated: '2026-05-21 14:15', published: true },
        { id: 'kb-503', title: 'Configuring custom JWT token expiration parameters', category: 'Security', content: 'To prolong your active session token life in Aegis helpdesk, navigate to the config folder and locate application.properties. Edit the value for app.jwt.expiration. The default is 3600000 (1 Hour). Set it to 86400000 (24 Hours) to decrease logout rates.', score: 0.89, vectorStatus: 'Synced', updated: '2026-05-20 11:00', published: true },
        { id: 'kb-504', title: 'Upgrading license quotas via the Customer Portal', category: 'Billing', content: 'Customers can upgrade active license seats directly by navigating to Admin Settings inside the subscription tab, clicking Upgrade seats, and checking out via Stripe. Seats propagate immediately.', score: 0.74, vectorStatus: 'Pending Embedding', updated: '2026-05-22 13:02', published: false },
        { id: 'kb-505', title: 'Clearing cookies and local cache on Chrome', category: 'General', content: 'If the Aegis client UI fails to refresh config schemas, perform a hard refresh via Ctrl+F5 or manually clear cache and cookies under Chrome settings tab to reload dynamic service bundles.', score: 0.65, vectorStatus: 'Synced', updated: '2026-05-18 16:45', published: true }
    ];
    
    // Agents
    mockAgents = JSON.parse(localStorage.getItem('aegis_agents')) || [
        { id: 'u-201', name: 'Sarah Jenkins', email: 'sarah.j@aegis.com', role: 'AGENT', categories: ['Tech Support', 'Security'], active: true },
        { id: 'u-202', name: 'Alex Carter', email: 'alex.c@aegis.com', role: 'AGENT', categories: ['Billing', 'General'], active: true },
        { id: 'u-203', name: 'Michael Chang', email: 'michael.c@aegis.com', role: 'AGENT', categories: ['Tech Support'], active: false },
        { id: 'u-204', name: 'Sophia Lopez', email: 'sophia.l@aegis.com', role: 'AGENT', categories: ['Bug Reports', 'Security'], active: true },
        { id: 'u-205', name: 'Nilesh Dev', email: 'nilesh.dev@aegis.com', role: 'ADMIN', categories: ['All Domains'], active: true }
    ];
    
    // CSAT Ratings
    mockCSATRatings = JSON.parse(localStorage.getItem('aegis_ratings')) || [
        { id: 'r-901', ticketId: 't-101', customer: 'Nilesh Dev', rating: 5, comment: 'AI instantly solved my timezone conflict! Incredible response time.' },
        { id: 'r-902', ticketId: 't-88', customer: 'David Vance', rating: 4, comment: 'Sarah Jenkins fixed our DB deadlock quickly. Responsive help.' },
        { id: 'r-903', ticketId: 't-92', customer: 'Emily Watson', rating: 2, comment: 'Billing mismatch took 3 days to fix. Response SLA was not met.' },
        { id: 'r-904', ticketId: 't-99', customer: 'John Doe', rating: 5, comment: 'Great service. Dynamic modal helped resolve RAG deflection quickly.' }
    ];
    
    // Tickets
    mockTickets = JSON.parse(localStorage.getItem('aegis_tickets')) || [
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

    // Compute active ticket counts per category dynamically from mockTickets
    mockCategories.forEach(cat => {
        let baseline = 0;
        if (cat.name === 'Tech Support') baseline = 11;
        else if (cat.name === 'Billing') baseline = 7;
        else if (cat.name === 'Bug Reports') baseline = 19;
        else if (cat.name === 'Security') baseline = 5;
        else if (cat.name === 'General') baseline = 4;
        
        const activeCount = mockTickets.filter(t => t.category === cat.name && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')).length;
        cat.ticketCount = baseline + activeCount;
    });

    // Compute SLA breaches dynamically from mockTickets
    const activeTickets = mockTickets.filter(t => (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && (t.priority === 'high' || t.priority === 'medium'));
    mockSlaBreaches = activeTickets.map(t => {
        let breachTime = 'Overdue by 1.5 hours';
        if (t.priority === 'high') {
            breachTime = 'Overdue by 4.2 hours';
        } else if (t.priority === 'medium') {
            breachTime = 'Overdue by 1.8 hours';
        }
        return {
            ticketId: t.id,
            title: t.title,
            assignee: t.assignee,
            breachTime: breachTime,
            priority: t.priority
        };
    });
}

function saveState() {
    localStorage.setItem('aegis_categories', JSON.stringify(mockCategories));
    localStorage.setItem('aegis_articles', JSON.stringify(mockArticles));
    localStorage.setItem('aegis_agents', JSON.stringify(mockAgents));
    localStorage.setItem('aegis_ratings', JSON.stringify(mockCSATRatings));
    localStorage.setItem('aegis_tickets', JSON.stringify(mockTickets));
}



// ────────────────────────────────────────────────────────
// STATE MANAGEMENT & ROUTER
// ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initTheme();
    initRouter();
    renderAllViews();
    initSettingsListeners();
    startLiveLogStream();
});

// Router navigation logic
function initRouter() {
    const menuItems = document.querySelectorAll('.menu-list .menu-item');
    const tabs = document.querySelectorAll('.workspace-content .tab-content');
    const viewTitle = document.getElementById('currentViewTitle');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Toggle active menu class
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Show active section
            const activeTabId = item.getAttribute('data-tab');
            tabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === activeTabId) {
                    tab.classList.add('active');
                }
            });

            // Update title
            viewTitle.textContent = item.querySelector('a').textContent.trim();
        });
    });
}

// Render helper to route all sections
function renderAllViews() {
    renderDashboardMetrics();
    renderDashboardChart();
    renderSystemLogs();
    renderAgentDirectory();
    renderCategoriesGrid();
    renderArticleTable();
    renderCsatRatings();
    renderSlaBreaches();
}

// ────────────────────────────────────────────────────────
// TAB RENDERS
// ────────────────────────────────────────────────────────

// 1. Dashboard Metrics
function renderDashboardMetrics() {
    document.getElementById('metricTotalUsers').textContent = mockAgents.length + 1243; // Mocking customers
    document.getElementById('metricAiDeflections').textContent = '42.5%';
    document.getElementById('metricSlaCompliance').textContent = '94.6%';
    
    // Calculate CSAT dynamically
    const avgCsat = mockCSATRatings.reduce((sum, r) => sum + r.rating, 0) / mockCSATRatings.length;
    document.getElementById('metricAvgCsat').textContent = avgCsat.toFixed(1);
}

// Dashboard Category Chart
function renderDashboardChart() {
    const container = document.getElementById('dashboardChartContainer');
    if (!container) return;

    // Get max ticket count to scale progress bars
    const maxVal = Math.max(...mockCategories.map(c => c.ticketCount));

    container.innerHTML = mockCategories.map(c => {
        const percentage = (c.ticketCount / maxVal) * 100;
        return `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="width: 130px; font-size: 0.85rem; color: var(--text-body); font-weight: 500;">${escapeHtml(c.name)}</span>
                <div style="flex: 1; height: 8px; background-color: var(--border-subtle); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, var(--brand), #2563eb); border-radius: 4px; transition: width 1s ease;"></div>
                </div>
                <span style="width: 30px; text-align: right; font-size: 0.85rem; font-weight: 600; color: var(--text-heading);">${escapeHtml(c.ticketCount)}</span>
            </div>
        `;
    }).join('');
}

// System Logs
function renderSystemLogs() {
    const terminal = document.getElementById('systemTerminalLogs');
    if (!terminal) return;

    terminal.innerHTML = systemLogs.map(log => {
        let tagClass = 'log-tag-info';
        if (log.type === 'warn') tagClass = 'log-tag-warn';
        if (log.type === 'err') tagClass = 'log-tag-err';
        if (log.type === 'success') tagClass = 'log-tag-success';

        const timestamp = new Date().toLocaleTimeString();

        return `
            <div class="system-log-entry">
                <span class="log-time">[${escapeHtml(timestamp)}]</span>
                <span class="${tagClass}">[${escapeHtml(log.type.toUpperCase())}]</span>
                <span>${escapeHtml(log.msg)}</span>
            </div>
        `;
    }).join('');

    terminal.scrollTop = terminal.scrollHeight;
}

// Live Server Log Simulation
function startLiveLogStream() {
    const mockEvents = [
        { type: 'info', msg: 'WebSocket incoming request: user connection ping accepted.' },
        { type: 'success', msg: 'Azure Blob client attachment t-104 uploaded successfully to container.' },
        { type: 'info', msg: 'pgvector query: computing similarity mapping for ticket "deadlock in flyway migrate".' },
        { type: 'success', msg: 'AI pgvector deflection triggered. Cosine similarity 0.91 exceeded threshold. Auto-resolved ticket t-104.' },
        { type: 'info', msg: 'Transactional SLA audit checks completed. Next scan scheduled in 10 minutes.' },
        { type: 'warn', msg: 'Azure OpenAI endpoint delay: latency spike detected (1.4s response delay).' }
    ];

    setInterval(() => {
        const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
        systemLogs.push(randomEvent);
        if (systemLogs.length > 50) systemLogs.shift(); // Keep logs lean
        renderSystemLogs();
    }, 6000);
}

// 2. Agent Directory
function renderAgentDirectory() {
    const tableBody = document.getElementById('agentTableBody');
    if (!tableBody) return;

    const searchTerm = document.getElementById('agentSearchInput').value.toLowerCase();

    const filteredAgents = mockAgents.filter(a => 
        a.name.toLowerCase().includes(searchTerm) || 
        a.email.toLowerCase().includes(searchTerm) ||
        a.categories.some(c => c.toLowerCase().includes(searchTerm))
    );

    tableBody.innerHTML = filteredAgents.map(a => {
        const catBadges = a.categories.map(c => `<span class="expert-badge">${escapeHtml(c)}</span>`).join('');
        const statusChecked = a.active ? 'checked' : '';

        return `
            <tr id="agent-row-${escapeHtml(a.id)}">
                <td style="font-weight:600; color:var(--text-heading);">${escapeHtml(a.name)}</td>
                <td>${escapeHtml(a.email)}</td>
                <td><span class="badge ${a.role === 'ADMIN' ? 'badge-priority-high' : 'badge-open'}">${escapeHtml(a.role)}</span></td>
                <td>${catBadges}</td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${statusChecked} onchange="toggleAgentActive('${escapeHtml(a.id)}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <button class="action-btn action-btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="openEditAgentModal('${escapeHtml(a.id)}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn action-btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem; color:var(--priority-high); border-color:rgba(239,68,68,0.2);" onclick="deleteAgent('${escapeHtml(a.id)}')"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Bind search listener to Agent Directory
document.getElementById('agentSearchInput').addEventListener('input', renderAgentDirectory);

// 3. Categories Grid
function renderCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    grid.innerHTML = mockCategories.map(c => `
        <div class="dashboard-card" id="category-card-${escapeHtml(c.id)}" style="display:flex; flex-direction:column; justify-content:space-between; min-height:160px;">
            <div>
                <div class="card-header-row">
                    <span class="card-title-text" style="font-size:0.95rem;">${escapeHtml(c.name)}</span>
                    <span class="badge badge-open" style="font-size:0.65rem;">${escapeHtml(c.ticketCount)} Open Tickets</span>
                </div>
                <p style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; margin-top:0.5rem;">${escapeHtml(c.desc)}</p>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-subtle); padding-top:0.75rem; margin-top:1rem;">
                <span style="font-size:0.75rem; color:var(--text-body); font-weight:500;">
                    <i class="fas fa-headset" style="color:var(--brand); margin-right:0.25rem;"></i>
                    ${escapeHtml(getAgentCountByCategory(c.name))} Assigned Agents
                </span>
                <button class="action-btn action-btn-outline" style="padding:0.2rem 0.5rem; font-size:0.7rem;" onclick="deleteCategory('${escapeHtml(c.id)}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function getAgentCountByCategory(catName) {
    return mockAgents.filter(a => a.categories.includes(catName) || a.categories.includes('All Domains')).length;
}

// 4. Knowledge Base Table
function renderArticleTable() {
    const tableBody = document.getElementById('articleTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = mockArticles.map(art => {
        const vectorBadgeClass = art.vectorStatus === 'Synced' ? 'badge-resolved' : 'badge-progress';
        const statusChecked = art.published ? 'checked' : '';

        return `
            <tr id="article-row-${escapeHtml(art.id)}">
                <td style="font-weight:600; color:var(--text-heading);">${escapeHtml(art.title)}</td>
                <td><span class="expert-badge">${escapeHtml(art.category)}</span></td>
                <td>
                    <span class="badge ${vectorBadgeClass}" style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.65rem;">
                        <span style="width:5px; height:5px; border-radius:50%; background-color:currentColor;"></span>
                        ${escapeHtml(art.vectorStatus)}
                    </span>
                </td>
                <td style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(art.updated)}</td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${statusChecked} onchange="toggleArticlePublish('${escapeHtml(art.id)}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <button class="action-btn action-btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="openEditArticleModal('${escapeHtml(art.id)}')"><i class="fas fa-edit"></i> Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 5. AI Settings Console Sliders
function initSettingsListeners() {
    const slider = document.getElementById('cosineSlider');
    const cosineVal = document.getElementById('cosineVal');
    
    if (slider && cosineVal) {
        slider.addEventListener('input', (e) => {
            cosineVal.textContent = parseFloat(e.target.value).toFixed(2);
        });
    }

    const saveBtn = document.getElementById('btnSaveAiSettings');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            showToast('AI Engine configurations saved successfully.', 'success');
        });
    }
}

// Test Integrations Connection
window.testConnection = function(provider) {
    showToast(`Pinging ${provider} API server endpoint...`, 'info');
    setTimeout(() => {
        showToast(`${provider} Connection validated. Status: Active (Latency 22ms).`, 'success');
    }, 1200);
};

// 6. SLA & Ratings Dashboard
function renderCsatRatings() {
    const container = document.getElementById('csatRatingsList');
    if (!container) return;

    container.innerHTML = mockCSATRatings.map(r => {
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<i class="${i <= r.rating ? 'fas' : 'far'} fa-star"></i>`;
        }

        return `
            <div class="rating-review-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:600; color:var(--text-heading); font-size:0.85rem;">${escapeHtml(r.customer)}</div>
                    <div class="rating-stars">${starsHtml}</div>
                </div>
                <p style="font-size:0.75rem; color:var(--text-body); line-height:1.4;">"${escapeHtml(r.comment)}"</p>
                <div style="font-size:0.7rem; color:var(--text-muted); border-top:1px solid var(--border-subtle); padding-top:0.35rem; display:flex; justify-content:space-between;">
                    <span>Ticket Ref: <strong style="color:var(--brand);">${escapeHtml(r.ticketId)}</strong></span>
                    <span>Verified Solution</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderSlaBreaches() {
    const container = document.getElementById('slaBreachesList');
    if (!container) return;

    container.innerHTML = mockSlaBreaches.map(b => `
        <div class="sla-breach-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="badge badge-priority-high" style="font-size:0.65rem;">SLA Breach</span>
                <span style="font-size:0.75rem; font-weight:700; color:var(--priority-high);">${escapeHtml(b.breachTime)}</span>
            </div>
            <strong style="font-size:0.8rem; color:var(--text-heading); display:block; margin:0.25rem 0;">${escapeHtml(b.title)}</strong>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:var(--text-muted); border-top:1px dashed rgba(239, 68, 68, 0.2); padding-top:0.35rem;">
                <span>Ref: ${escapeHtml(b.ticketId)}</span>
                <span>Assignee: <strong style="color:var(--status-progress);">${escapeHtml(b.assignee)}</strong></span>
            </div>
        </div>
    `).join('');
}

// ────────────────────────────────────────────────────────
// ADMINISTRATIVE SYSTEM ACTIONS
// ────────────────────────────────────────────────────────

// Toggle active status
window.toggleAgentActive = function(agentId, checked) {
    const agent = mockAgents.find(a => a.id === agentId);
    if (agent) {
        agent.active = checked;
        saveState();
        showToast(`${agent.name} status updated to ${checked ? 'Active' : 'Inactive'}.`, 'success');
        systemLogs.push({ type: 'info', msg: `User status update: ${agent.name} toggled to ${checked ? 'ACTIVE' : 'INACTIVE'}.` });
        renderDashboardMetrics();
    }
};

window.toggleArticlePublish = function(artId, checked) {
    const art = mockArticles.find(a => a.id === artId);
    if (art) {
        art.published = checked;
        saveState();
        showToast(`Article "${art.title}" is now ${checked ? 'published' : 'unpublished'}.`, 'success');
        systemLogs.push({ type: 'info', msg: `KB Article publish toggle: "${art.title}" set to ${checked ? 'PUBLISHED' : 'DRAFT'}.` });
    }
};

// Delete agent
window.deleteAgent = function(agentId) {
    const index = mockAgents.findIndex(a => a.id === agentId);
    if (index !== -1) {
        const name = mockAgents[index].name;
        mockAgents.splice(index, 1);
        saveState();
        showToast(`${name} has been removed from the directory.`, 'success');
        systemLogs.push({ type: 'warn', msg: `Security Event: User account ${name} removed from registry.` });
        renderDashboardMetrics();
        renderAgentDirectory();
    }
};

// Delete category
window.deleteCategory = function(catId) {
    const index = mockCategories.findIndex(c => c.id === catId);
    if (index !== -1) {
        const name = mockCategories[index].name;
        mockCategories.splice(index, 1);
        saveState();
        showToast(`Category ${name} has been deleted.`, 'success');
        renderCategoriesGrid();
        renderDashboardChart();
    }
};

// ────────────────────────────────────────────────────────
// MODAL FORMS MANAGEMENT
// ────────────────────────────────────────────────────────
const modal = document.getElementById('adminModal');
const modalTitle = document.getElementById('adminModalTitle');
const modalBody = document.getElementById('adminModalBody');
const modalConfirmBtn = document.getElementById('adminModalConfirmBtn');
const modalCancelBtn = document.getElementById('adminModalCancelBtn');
const modalCloseBtn = document.getElementById('adminModalCloseBtn');

function openModal(title, bodyHtml, confirmCallback) {
    if (!modal) return;
    
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    
    // Reset listeners
    modalConfirmBtn.onclick = () => {
        confirmCallback();
        closeModal();
    };

    modalCancelBtn.onclick = closeModal;
    modalCloseBtn.onclick = closeModal;
    
    modal.style.display = 'flex';
}

function closeModal() {
    if (modal) modal.style.display = 'none';
}

// 1. Register Agent Modal
const btnRegisterAgent = document.getElementById('btnRegisterAgent');
if (btnRegisterAgent) {
    btnRegisterAgent.addEventListener('click', () => {
        const catsCheckboxes = mockCategories.map(c => `
            <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:var(--text-body);">
                <input type="checkbox" name="agentCats" value="${escapeHtml(c.name)}"> ${escapeHtml(c.name)}
            </label>
        `).join('');

        const formHtml = `
            <div class="form-layout">
                <div class="field-group">
                    <label for="newAgentName">Full Name</label>
                    <input type="text" id="newAgentName" class="text-input" placeholder="e.g. David Miller" required>
                </div>
                <div class="field-group">
                    <label for="newAgentEmail">Email Address</label>
                    <input type="email" id="newAgentEmail" class="text-input" placeholder="e.g. david.m@aegis.com" required>
                </div>
                <div class="field-group">
                    <label>Expertise Categories (Assigned Ticket Routing)</label>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-top:0.25rem;">
                        ${catsCheckboxes}
                    </div>
                </div>
            </div>
        `;

        openModal('Register New Helpdesk Agent', formHtml, () => {
            const name = document.getElementById('newAgentName').value;
            const email = document.getElementById('newAgentEmail').value;
            
            const selectedCats = [];
            document.querySelectorAll('input[name="agentCats"]:checked').forEach(cb => {
                selectedCats.push(cb.value);
            });

            if (!name || !email) {
                showToast('Name and email are required fields.', 'error');
                return;
            }

            const newAgent = {
                id: `u-${Date.now()}`,
                name: name,
                email: email,
                role: 'AGENT',
                categories: selectedCats.length > 0 ? selectedCats : ['General'],
                active: true
            };

            mockAgents.push(newAgent);
            saveState();
            showToast(`${name} registered successfully. Credentials dispatched.`, 'success');
            systemLogs.push({ type: 'success', msg: `User Registration: Agent account created for ${name} (${email}).` });
            renderDashboardMetrics();
            renderAgentDirectory();
        });
    });
}

// 2. Create Category Modal
const btnCreateCategory = document.getElementById('btnCreateCategory');
if (btnCreateCategory) {
    btnCreateCategory.addEventListener('click', () => {
        const formHtml = `
            <div class="form-layout">
                <div class="field-group">
                    <label for="newCatName">Category Name</label>
                    <input type="text" id="newCatName" class="text-input" placeholder="e.g. HR Inquiries" required>
                </div>
                <div class="field-group">
                    <label for="newCatDesc">Description & Scope</label>
                    <textarea id="newCatDesc" class="text-input" placeholder="Define ticket scope parameters..." style="min-height:80px;" required></textarea>
                </div>
            </div>
        `;

        openModal('Create Ticket Category', formHtml, () => {
            const name = document.getElementById('newCatName').value;
            const desc = document.getElementById('newCatDesc').value;

            if (!name || !desc) {
                showToast('All fields are required.', 'error');
                return;
            }

            const newCat = {
                id: `c-${Date.now()}`,
                name: name,
                desc: desc,
                ticketCount: 0
            };

            mockCategories.push(newCat);
            saveState();
            showToast(`New category [${name}] created.`, 'success');
            systemLogs.push({ type: 'success', msg: `Database Schema: Created category [${name}] for automatic routing.` });
            renderCategoriesGrid();
            renderDashboardChart();
        });
    });
}

// 3. Write KB Article Modal
const btnWriteArticle = document.getElementById('btnWriteArticle');
if (btnWriteArticle) {
    btnWriteArticle.addEventListener('click', () => {
        const catOptions = mockCategories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
        
        const formHtml = `
            <div class="form-layout">
                <div class="field-group">
                    <label for="newArtTitle">Article Title</label>
                    <input type="text" id="newArtTitle" class="text-input" placeholder="e.g. Resolving SMTP authentication failure" required>
                </div>
                <div class="field-group">
                    <label for="newArtCat">Topic Category</label>
                    <select id="newArtCat" class="text-input">${catOptions}</select>
                </div>
                <div class="field-group">
                    <label for="newArtBody">Article Content (Markdown Support)</label>
                    <textarea id="newArtBody" class="text-input" placeholder="Provide a resolution steps guide..." style="min-height:150px; font-size:0.85rem;" required></textarea>
                </div>
            </div>
        `;

        openModal('Write Knowledge Base Article', formHtml, () => {
            const title = document.getElementById('newArtTitle').value;
            const cat = document.getElementById('newArtCat').value;
            const body = document.getElementById('newArtBody').value;

            if (!title || !body) {
                showToast('Article title and body are required.', 'error');
                return;
            }

            const newArt = {
                id: `kb-${Date.now()}`,
                title: title,
                category: cat,
                vectorStatus: 'Pending Embedding',
                updated: new Date().toISOString().replace('T', ' ').substring(0, 16),
                published: false
            };

            mockArticles.push(newArt);
            saveState();
            showToast(`Article "${title}" drafted successfully.`, 'success');
            systemLogs.push({ type: 'info', msg: `KB Article Draft: Created "${title}" under category [${cat}].` });
            
            renderArticleTable();

            // Simulate automatic embedding generation in background
            setTimeout(() => {
                const articleRef = mockArticles.find(a => a.id === newArt.id);
                if (articleRef) {
                    articleRef.vectorStatus = 'Synced';
                    saveState();
                    renderArticleTable();
                    showToast(`pgvector embeddings generated for "${title}". (Cosine similarity indexes loaded).`, 'success');
                    systemLogs.push({ type: 'success', msg: `AI Embeddings: Vector values (1536 dimensions) generated for KB article "${title}".` });
                }
            }, 5000);
        });
    });
}

// ────────────────────────────────────────────────────────
// LIGHT & DARK THEME ENGINE SYNC
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
// TOAST NOTIFICATIONS
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
        <div style="font-size: 0.85rem; color: var(--text-heading); font-weight: 500; line-height: 1.4; flex-grow: 1;">${escapeHtml(message)}</div>
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
