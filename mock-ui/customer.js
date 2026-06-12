// Aegis Helpdesk Customer Portal Controller

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
// MOCK DATA STORE (LOCALSTORAGE SYNCED)
// ────────────────────────────────────────────────────────
let mockCategories = [];
let mockArticles = [];
let mockTickets = [];
let mockCSATRatings = [];

function loadState() {
    mockCategories = JSON.parse(localStorage.getItem('aegis_categories')) || [
        { id: 'c-1', name: 'Tech Support', desc: 'Hardware failures, server timeouts, database crashes.', ticketCount: 13 },
        { id: 'c-2', name: 'Billing', desc: 'Subscription tiers, license audits, refunds, corporate invoices.', ticketCount: 8 },
        { id: 'c-3', name: 'Bug Reports', desc: 'Frontend glitches, API routing errors, code regressions.', ticketCount: 19 },
        { id: 'c-4', name: 'Security', desc: 'Penetration tests, JWT validation leaks, access logs audits.', ticketCount: 5 },
        { id: 'c-5', name: 'General', desc: 'SLA questions, feature requests, marketing queries.', ticketCount: 4 }
    ];
    
    mockArticles = JSON.parse(localStorage.getItem('aegis_articles')) || [
        { id: 'kb-501', title: 'Resolving flyway timestamp zone conflicts', category: 'Tech Support', content: 'Database deadlocks or migration crashes on flyway timestamp columns occur because of server timezone conflicts. In your application.properties configuration, change spring.datasource.url parameter and add ?serverTimezone=Asia/Kolkata, or match the PostgreSQL timezone directly in the database configuration console.', score: 0.94, vectorStatus: 'Synced', updated: '2026-05-22 09:30', published: true },
        { id: 'kb-502', title: 'Azure Blob Storage attachments return 403 Forbidden', category: 'Tech Support', content: 'Attachments failing with 403 errors are caused by expired Azure Storage Shared Access Signature (SAS) tokens. Regenerate SAS tokens with "Read" and "List" privileges checked in your Azure Storage Explorer Console, and update the azure.storage.sas-token key in your Spring Boot application properties file.', score: 0.92, vectorStatus: 'Synced', updated: '2026-05-21 14:15', published: true },
        { id: 'kb-503', title: 'Configuring custom JWT token expiration parameters', category: 'Security', content: 'To prolong your active session token life in Aegis helpdesk, navigate to the config folder and locate application.properties. Edit the value for app.jwt.expiration. The default is 3600000 (1 Hour). Set it to 86400000 (24 Hours) to decrease logout rates.', score: 0.89, vectorStatus: 'Synced', updated: '2026-05-20 11:00', published: true },
        { id: 'kb-504', title: 'Upgrading license quotas via the Customer Portal', category: 'Billing', content: 'Customers can upgrade active license seats directly by navigating to Admin Settings inside the subscription tab, clicking Upgrade seats, and checking out via Stripe. Seats propagate immediately.', score: 0.74, vectorStatus: 'Pending Embedding', updated: '2026-05-22 13:02', published: false }
    ];
    
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
        }
    ];

    mockCSATRatings = JSON.parse(localStorage.getItem('aegis_ratings')) || [
        { id: 'r-901', ticketId: 't-101', customer: 'Nilesh Dev', rating: 5, comment: 'AI instantly solved my timezone conflict! Incredible response time.' }
    ];
}

function saveState() {
    localStorage.setItem('aegis_categories', JSON.stringify(mockCategories));
    localStorage.setItem('aegis_articles', JSON.stringify(mockArticles));
    localStorage.setItem('aegis_tickets', JSON.stringify(mockTickets));
    localStorage.setItem('aegis_ratings', JSON.stringify(mockCSATRatings));
}

let selectedTicketId = null;
let selectedRatingScore = 0;

// ────────────────────────────────────────────────────────
// STATE ROUTING & THEME SYNC
// ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initTheme();
    initRouter();
    populateFormCategories();
    renderKBCategories();
    renderCustomerTickets();
    initTicketFormDeflection();
    initStarRatingEvents();
    initAutoExpandingTextarea();
});

// Switch active tabs
function initRouter() {
    const menuItems = document.querySelectorAll('.menu-list .menu-item');
    const tabs = document.querySelectorAll('.workspace-content .tab-content');
    const viewTitle = document.getElementById('currentViewTitle');

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

            viewTitle.textContent = item.querySelector('a').textContent.trim();

            // Refresh state and views on navigation
            loadState();
            if (activeTabId === 'searchKb') {
                renderKBCategories();
            } else if (activeTabId === 'submitRequest') {
                populateFormCategories();
            } else if (activeTabId === 'myTickets') {
                renderCustomerTickets();
                if (selectedTicketId) {
                    selectCustomerTicket(selectedTicketId);
                }
            }
        });
    });
}

// ────────────────────────────────────────────────────────
// 1. KNOWLEDGE BASE BROWSER & HERO SEARCH
// ────────────────────────────────────────────────────────
function renderKBCategories() {
    const container = document.getElementById('kbCategoryDirectoryGrid');
    if (!container) return;

    container.innerHTML = mockCategories.map(c => `
        <div class="dashboard-card article-card" onclick="listArticlesByCategory('${escapeHtml(c.name)}')">
            <div class="card-header-row">
                <span class="card-title-text"><i class="fas fa-folder" style="color:var(--brand); margin-right:0.5rem;"></i> ${escapeHtml(c.name)}</span>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; margin-top:0.5rem;">${escapeHtml(c.desc)}</p>
        </div>
    `).join('');
}

// Hero pgvector semantic deflection search simulator
const kbSearchInput = document.getElementById('kbSearchInput');
if (kbSearchInput) {
    kbSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const resultsBox = document.getElementById('searchDeflectionResultsBox');
        const resultsGrid = document.getElementById('kbSearchResultsGrid');
        const defaultSection = document.getElementById('kbCategoryDefaultSection');

        if (!query.trim()) {
            resultsBox.style.display = 'none';
            defaultSection.style.display = 'block';
            return;
        }

        // Filter articles based on query simulation (pgvector RAG deflection matching)
        const matches = mockArticles.filter(art => 
            art.title.toLowerCase().includes(query) || 
            art.content.toLowerCase().includes(query) ||
            art.category.toLowerCase().includes(query)
        );

        defaultSection.style.display = 'none';
        resultsBox.style.display = 'block';

        if (matches.length === 0) {
            resultsGrid.innerHTML = `
                <div style="grid-column: span 3; text-align:center; padding: 2rem; color:var(--text-muted); border: 1px dashed var(--border-subtle); border-radius:0.5rem;">
                    <i class="fas fa-face-frown" style="font-size: 1.5rem; margin-bottom: 0.5rem; display:block;"></i>
                    No matches found. Try queries like "timezone", "Azure", or "JWT".
                </div>
            `;
            return;
        }

        resultsGrid.innerHTML = matches.map(art => `
            <div class="dashboard-card article-card" onclick="viewArticleModal('${escapeHtml(art.id)}')">
                <div class="card-header-row">
                    <span class="card-title-text" style="font-size:0.85rem; color:var(--text-heading);">${escapeHtml(art.title)}</span>
                    <span class="badge badge-resolved" style="font-size:0.6rem;">Match ${(art.score * 100).toFixed(0)}%</span>
                </div>
                <p style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; margin-top:0.5rem; height: 40px; overflow:hidden; text-overflow:ellipsis;">
                    ${escapeHtml(art.content.substring(0, 85))}...
                </p>
                <div style="font-size:0.7rem; color:var(--brand); border-top:1px solid var(--border-subtle); padding-top:0.5rem; margin-top:0.75rem;">
                    Category: ${escapeHtml(art.category)}
                </div>
            </div>
        `).join('');
    });
}

// Modal Article Viewer
const modal = document.getElementById('customerModal');
const modalTitle = document.getElementById('custModalTitle');
const modalBody = document.getElementById('custModalBody');
const modalCloseBtn = document.getElementById('custModalCloseBtn');
const modalCloseActionBtn = document.getElementById('custModalCloseActionBtn');

window.viewArticleModal = function(artId) {
    const art = mockArticles.find(a => a.id === artId);
    if (!art) return;

    modalTitle.textContent = art.title;
    modalBody.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:0.5rem;">
                <span class="badge badge-open" style="font-size:0.7rem;">Category: ${escapeHtml(art.category)}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);"><i class="fas fa-shield-halved"></i> pgvector Verified article</span>
            </div>
            <p style="font-size:0.875rem; line-height:1.6; color:var(--text-body);">${escapeHtml(art.content)}</p>
        </div>
    `;

    modalConfirmClose = () => { modal.style.display = 'none'; };
    modalCloseBtn.onclick = modalConfirmClose;
    modalCloseActionBtn.onclick = modalConfirmClose;
    
    modal.style.display = 'flex';
};

window.listArticlesByCategory = function(catName) {
    // Navigate query simulation directly to matching category
    const searchInput = document.getElementById('kbSearchInput');
    if (searchInput) {
        searchInput.value = catName;
        // Trigger synthetic input event
        searchInput.dispatchEvent(new Event('input'));
    }
};

// ────────────────────────────────────────────────────────
// 2. SUBMIT TICKET FORM & REAL-TIME DEFLECTION
// ────────────────────────────────────────────────────────
function populateFormCategories() {
    const select = document.getElementById('ticketCategorySelect');
    if (!select) return;

    select.innerHTML = mockCategories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
}

function initTicketFormDeflection() {
    const titleInput = document.getElementById('ticketTitleInput');
    const idleDiv = document.getElementById('formDeflectionIdle');
    const resultsContainer = document.getElementById('formDeflectionContainer');
    const resultsList = document.getElementById('formDeflectionResults');

    if (!titleInput) return;

    titleInput.addEventListener('input', (e) => {
        const title = e.target.value.toLowerCase();
        
        if (!title.trim()) {
            resultsContainer.style.display = 'none';
            idleDiv.style.display = 'block';
            return;
        }

        // Simulate pgvector similarity scan
        const deflections = mockArticles.filter(art => 
            art.title.toLowerCase().includes(title) || 
            title.includes(art.category.toLowerCase().split(' ')[0])
        );

        idleDiv.style.display = 'none';
        resultsContainer.style.display = 'block';

        if (deflections.length === 0) {
            resultsList.innerHTML = `
                <div style="font-size:0.75rem; color:var(--text-disabled); text-align:center; padding:1rem; border: 1px dashed var(--border-subtle); border-radius:0.375rem;">
                    No immediate auto-resolutions found. File your ticket and our agents will respond.
                </div>
            `;
            return;
        }

        resultsList.innerHTML = deflections.map(art => `
            <div class="copilot-box copilot-box-ai" style="padding:0.75rem; display:flex; flex-direction:column; gap:0.4rem;">
                <div style="font-weight:600; color:var(--text-heading); font-size:0.8rem;">${escapeHtml(art.title)}</div>
                <p style="font-size:0.7rem; color:var(--text-muted); line-height:1.4;">${escapeHtml(art.content.substring(0, 100))}...</p>
                <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
                    <button class="action-btn" style="padding:0.2rem 0.5rem; font-size:0.7rem;" onclick="applyDeflectionResolution('${escapeHtml(art.title)}')">This resolves my issue</button>
                    <button class="action-btn action-btn-outline" style="padding:0.2rem 0.5rem; font-size:0.7rem;" onclick="viewArticleModal('${escapeHtml(art.id)}')">Read Full Article</button>
                </div>
            </div>
        `).join('');
    });
}

// User declares deflection matched resolved their issue
window.applyDeflectionResolution = function(artTitle) {
    document.getElementById('customerTicketForm').reset();
    document.getElementById('formDeflectionContainer').style.display = 'none';
    document.getElementById('formDeflectionIdle').style.display = 'block';
    
    showToast(`Ticket deflected successfully! Thank you for utilizing pgvector self-service.`, 'success');
};

// Handle ticket filing form submit
const ticketForm = document.getElementById('customerTicketForm');
if (ticketForm) {
    ticketForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('ticketTitleInput').value;
        const category = document.getElementById('ticketCategorySelect').value;
        const priority = document.getElementById('ticketPrioritySelect').value;
        const desc = document.getElementById('ticketDescInput').value;

        if (!title || !desc) return;

        // Check if ticket title triggers simulated automatic AI auto-resolution
        // Similarity rules: if title matches keywords "deadlock", "timezone", "403"
        const lowerTitle = title.toLowerCase();
        let triggerAiResolve = false;
        let aiSolution = "";

        if (lowerTitle.includes("deadlock") || lowerTitle.includes("timezone")) {
            triggerAiResolve = true;
            aiSolution = mockArticles.find(a => a.id === 'kb-501').content;
        } else if (lowerTitle.includes("403") || lowerTitle.includes("forbidden") || lowerTitle.includes("sas")) {
            triggerAiResolve = true;
            aiSolution = mockArticles.find(a => a.id === 'kb-502').content;
        }

        const newId = `t-${Date.now().toString().substring(8)}`;
        const newTicket = {
            id: newId,
            title: title,
            category: category,
            priority: priority,
            status: triggerAiResolve ? 'RESOLVED' : 'OPEN',
            assignee: triggerAiResolve ? 'AI Auto-Resolved' : 'Unassigned',
            aiResolved: triggerAiResolve,
            createdBy: 'Nilesh Dev',
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            rated: false,
            ratingVal: 0,
            replies: [
                { id: `rep-f1-${Date.now()}`, sender: 'Nilesh Dev', role: 'USER', message: desc }
            ]
        };

        if (triggerAiResolve) {
            newTicket.replies.push({
                id: `rep-f2-${Date.now()}`,
                sender: 'AI Assistant',
                role: 'AI',
                message: `Hi Nilesh Dev, our pgvector cosine search identified a highly matching historical resolution. Answer: ${aiSolution}. Status marked as resolved.`
            });
        }

        mockTickets.push(newTicket);
        saveState();
        ticketForm.reset();

        // Redirect UI to My Tickets
        document.getElementById('formDeflectionContainer').style.display = 'none';
        document.getElementById('formDeflectionIdle').style.display = 'block';
        
        showToast(triggerAiResolve ? "AI Deflection Triggered: Ticket auto-resolved." : "Support request successfully filed.", triggerAiResolve ? "success" : "info");
        
        renderCustomerTickets();
        
        // Navigate tab to My Tickets
        document.querySelector('.menu-list [data-tab="myTickets"]').click();
        
        // Select newly created ticket
        selectCustomerTicket(newId);
    });
}

// ────────────────────────────────────────────────────────
// 3. MY SUPPORT TICKETS QUEUE & CHATTIMG
// ────────────────────────────────────────────────────────
function renderCustomerTickets() {
    const container = document.getElementById('customerTicketList');
    if (!container) return;

    container.innerHTML = mockTickets.map(t => {
        let badgeClass = 'badge-open';
        if (t.status === 'RESOLVED') badgeClass = 'badge-resolved';
        if (t.status === 'IN_PROGRESS') badgeClass = 'badge-progress';
        if (t.status === 'CLOSED') badgeClass = 'badge-closed';

        const priorityLabelClass = `badge-priority-${t.priority}`;
        const activeClass = t.id === selectedTicketId ? 'active' : '';

        return `
            <div class="queue-item ${activeClass}" onclick="selectCustomerTicket('${escapeHtml(t.id)}')">
                <div class="queue-row">
                    <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">${escapeHtml(t.id)}</span>
                    <span class="badge ${badgeClass}">${escapeHtml(t.status)}</span>
                </div>
                <div class="queue-title">${escapeHtml(t.title)}</div>
                <div class="queue-row" style="margin-top:0.25rem;">
                    <span class="badge ${priorityLabelClass}">${escapeHtml(t.priority)}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(t.date)}</span>
                </div>
            </div>
        `;
    }).join('');
}

window.selectCustomerTicket = function(ticketId) {
    loadState();
    selectedTicketId = ticketId;
    renderCustomerTickets();

    const ticket = mockTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // Header updates
    document.getElementById('chatTicketTitle').textContent = ticket.title;
    document.getElementById('chatTicketMeta').textContent = `Category: ${ticket.category} • Priority: ${ticket.priority.toUpperCase()} • Assignee: ${ticket.assignee}`;

    // Render header rating status
    const ratingHeader = document.getElementById('ticketRatingHeaderStatus');
    if (ticket.rated) {
        ratingHeader.innerHTML = `
            <span class="badge badge-resolved" style="display:inline-flex; align-items:center; gap:0.25rem;">
                <i class="fas fa-star" style="color:#fbbf24;"></i> Rated ${escapeHtml(ticket.ratingVal)}.0 / 5.0
            </span>
        `;
    } else {
        ratingHeader.innerHTML = '';
    }

    // Render timeline
    const timeline = document.getElementById('chatTimeline');
    timeline.innerHTML = ticket.replies.filter(r => r.role !== 'INTERNAL').map(r => {
        let bubbleClass = 'incoming';
        let customStyle = '';
        
        if (r.role === 'USER') {
            bubbleClass = 'outgoing';
        } else if (r.role === 'AI') {
            bubbleClass = 'incoming';
            customStyle = 'background: linear-gradient(135deg, var(--bg-card), var(--brand-glow)); border-color: var(--brand); border-style: dashed; border-width: 1px;';
        }

        let senderIcon = '<i class="fas fa-headset" style="margin-right:0.25rem; color:var(--brand);"></i>';
        if (r.role === 'USER') {
            senderIcon = '<i class="fas fa-user-circle" style="margin-right:0.25rem;"></i>';
        } else if (r.role === 'AI') {
            senderIcon = '<i class="fas fa-robot" style="margin-right:0.25rem; color:var(--brand);"></i>';
        }

        return `
            <div class="chat-bubble ${bubbleClass}" style="${customStyle}">
                <div style="font-size:0.75rem; font-weight:700; color:var(--text-heading); margin-bottom:0.25rem; display:flex; align-items:center;">
                    ${senderIcon} ${escapeHtml(r.sender)}
                </div>
                <div>${escapeHtml(r.message).replace(/\n/g, '<br>')}</div>
                <div class="chat-bubble-meta">
                    <span>${escapeHtml(ticket.date)}</span>
                    <span>Delivered</span>
                </div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    timeline.scrollTop = timeline.scrollHeight;

    // Toggle reply text fields vs rating box
    const ratingBox = document.getElementById('chatRatingBox');
    const inputArea = document.getElementById('chatInputArea');

    if (ticket.status === 'RESOLVED' && !ticket.rated) {
        ratingBox.style.display = 'block';
        inputArea.style.display = 'none';
        resetRatingSubmissionState();
    } else {
        ratingBox.style.display = 'none';
        inputArea.style.display = 'block';
    }
};

// ────────────────────────────────────────────────────────
// 4. CSAT STARS RATING EVENTS
// ────────────────────────────────────────────────────────
function initStarRatingEvents() {
    const stars = document.querySelectorAll('.rating-star-interactive');
    const label = document.getElementById('ratingScoreLabel');
    const submitBtn = document.getElementById('btnSubmitTicketRating');

    stars.forEach(star => {
        star.addEventListener('mouseenter', (e) => {
            const val = parseInt(e.target.getAttribute('data-star'));
            highlightStars(val);
        });

        star.addEventListener('mouseleave', () => {
            highlightStars(selectedRatingScore);
        });

        star.addEventListener('click', (e) => {
            selectedRatingScore = parseInt(e.target.getAttribute('data-star'));
            highlightStars(selectedRatingScore);
            label.textContent = `Score: ${selectedRatingScore}.0 / 5.0`;
            label.style.color = selectedRatingScore >= 4 ? 'var(--status-resolved)' : 'var(--status-progress)';
        });
    });

    if (submitBtn) {
        submitBtn.addEventListener('click', submitTicketRating);
    }
}

function highlightStars(val) {
    const stars = document.querySelectorAll('.rating-star-interactive');
    stars.forEach(star => {
        const starVal = parseInt(star.getAttribute('data-star'));
        if (starVal <= val) {
            star.className = 'fas fa-star rating-star-interactive selected';
        } else {
            star.className = 'far fa-star rating-star-interactive';
        }
    });
}

function resetRatingSubmissionState() {
    selectedRatingScore = 0;
    highlightStars(0);
    document.getElementById('ratingScoreLabel').textContent = 'Select Score';
    document.getElementById('ratingScoreLabel').style.color = 'var(--brand)';
    document.getElementById('ratingCommentInput').value = '';
}

function submitTicketRating() {
    if (selectedRatingScore === 0) {
        showToast('Please select a star rating score before submitting.', 'warning');
        return;
    }

    const ticket = mockTickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;

    const comment = document.getElementById('ratingCommentInput').value;

    ticket.rated = true;
    ticket.ratingVal = selectedRatingScore;
    
    // Push the rating feedback to mockCSATRatings
    const newRating = {
        id: `r-${Date.now().toString().substring(8)}`,
        ticketId: selectedTicketId,
        customer: ticket.createdBy || 'Nilesh Dev',
        rating: selectedRatingScore,
        comment: comment || 'No comment provided'
    };
    mockCSATRatings.push(newRating);
    
    saveState();
    
    showToast(`Feedback submitted! Rating: ${selectedRatingScore}/5. Thank you.`, 'success');
    
    // Refresh conversation view to update headers and hide rating box
    selectCustomerTicket(selectedTicketId);
}

// Handle message replies
const replyBtn = document.getElementById('btnSendReply');
if (replyBtn) {
    replyBtn.addEventListener('click', postCustomerReply);
}

function postCustomerReply() {
    const textInput = document.getElementById('chatReplyText');
    const msg = textInput.value;
    if (!msg.trim() || !selectedTicketId) return;

    loadState();
    const ticket = mockTickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;

    ticket.replies.push({
        id: `rep-usr-${Date.now()}`,
        sender: 'Nilesh Dev',
        role: 'USER',
        message: msg
    });
    saveState();

    textInput.value = '';
    textInput.dispatchEvent(new Event('input'));
    showToast("Message posted successfully.", "success");
    selectCustomerTicket(selectedTicketId);

    // Simulate Agent response trigger after 4 seconds
    setTimeout(() => {
        loadState();
        const currentTicket = mockTickets.find(t => t.id === ticket.id);
        if (currentTicket) {
            currentTicket.replies.push({
                id: `rep-agent-${Date.now()}`,
                sender: 'Sarah Jenkins',
                role: 'AGENT',
                message: `Hi Nilesh, thank you for the update. I have reviewed your message and applied configuration revisions. Let me know if that functions correctly.`
            });
            // Auto update status to IN_PROGRESS if it was OPEN and agent replies
            if (currentTicket.status === 'OPEN') {
                currentTicket.status = 'IN_PROGRESS';
            }
            saveState();
            if (selectedTicketId === currentTicket.id) {
                selectCustomerTicket(selectedTicketId);
                showToast("New response from agent Sarah Jenkins.", "info");
            }
        }
    }, 4000);
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
