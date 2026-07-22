(() => {
  const USERS_KEY = 'nexapay_users';
  const SESSION_KEY = 'nexapay_session';
  const TRANSACTIONS_KEY = 'nexapay_transactions';
  const PROFILE_KEY = 'nexapay_profile';
  const THEME_KEY = 'nexapay_theme';

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const session = readJson(SESSION_KEY, null);
  const users = readJson(USERS_KEY, []);
  const currentUser = users.find((user) => user.id === session?.userId);

  if (!session || !currentUser) {
    window.location.replace('login.html');
    return;
  }

  const transactionKey = `${TRANSACTIONS_KEY}_${currentUser.id}`;
  const profileKey = `${PROFILE_KEY}_${currentUser.id}`;
  const pageContent = document.getElementById('pageContent');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalContent = document.getElementById('modalContent');

  const state = {
    user: currentUser,
    profile: readJson(profileKey, {
      name: currentUser.name,
      email: currentUser.email,
      mobile: currentUser.mobile,
      address: '',
      city: '',
      country: 'India',
      payoutMethod: 'UPI',
      payoutId: '',
      kycStatus: 'Not Submitted'
    }),
    transactions: readJson(transactionKey, []),
    page: 'home'
  };

  const seedDemoTransactions = () => {
    if (state.user.id !== 'USR-DEMO' || state.transactions.length) return;
    const now = Date.now();
    state.transactions = [
      { id: 'TRX-10624', type: 'Deposit', amount: 25000, method: 'UPI', status: 'Completed', date: new Date(now - 86400000 * 4).toISOString(), note: 'Opening balance' },
      { id: 'TRX-10625', type: 'Transfer', amount: 2800, method: 'Internal', status: 'Completed', date: new Date(now - 86400000 * 3).toISOString(), note: 'To Raj Kumar' },
      { id: 'TRX-10626', type: 'Deposit', amount: 8000, method: 'Bank Transfer', status: 'Completed', date: new Date(now - 86400000 * 2).toISOString(), note: 'Monthly top-up' },
      { id: 'TRX-10627', type: 'Withdraw', amount: 3500, method: 'UPI', status: 'Completed', date: new Date(now - 86400000).toISOString(), note: 'Personal withdrawal' }
    ];
    persistTransactions();
  };

  const persistTransactions = () => writeJson(transactionKey, state.transactions);
  const persistProfile = () => writeJson(profileKey, state.profile);
  const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
  const formatDate = (value) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'NP';

  const getBalance = () => state.transactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount) || 0;
    if (transaction.status === 'Rejected') return total;
    return transaction.type === 'Deposit' ? total + amount : total - amount;
  }, 0);

  const getTotals = () => {
    const completed = state.transactions.filter((item) => item.status !== 'Rejected');
    return {
      deposits: completed.filter((item) => item.type === 'Deposit').reduce((sum, item) => sum + Number(item.amount), 0),
      withdrawals: completed.filter((item) => item.type === 'Withdraw').reduce((sum, item) => sum + Number(item.amount), 0),
      transfers: completed.filter((item) => item.type === 'Transfer').reduce((sum, item) => sum + Number(item.amount), 0),
      pending: state.transactions.filter((item) => item.status === 'Pending').length
    };
  };

  const toast = (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = message;
    container.appendChild(item);
    setTimeout(() => item.remove(), 3000);
  };

  const statusBadge = (status) => `<span class="status-badge ${status.toLowerCase().replaceAll(' ', '-')}">${escapeHtml(status)}</span>`;
  const typeIcon = (type) => ({ Deposit: '↓', Withdraw: '↑', Transfer: '⇄' }[type] || '•');

  const tableRows = (transactions) => {
    if (!transactions.length) {
      return `<tr><td colspan="6"><div class="empty-state compact"><span>∅</span><strong>No records found</strong><small>Your transactions will appear here.</small></div></td></tr>`;
    }
    return transactions.map((item) => `
      <tr>
        <td><div class="table-type"><span class="transaction-icon ${item.type.toLowerCase()}">${typeIcon(item.type)}</span><div><strong>${escapeHtml(item.type)}</strong><small>${escapeHtml(item.note || item.method)}</small></div></div></td>
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.method)}</td>
        <td>${formatDate(item.date)}</td>
        <td class="amount-cell ${item.type === 'Deposit' ? 'positive' : 'negative'}">${item.type === 'Deposit' ? '+' : '-'}${formatMoney(item.amount)}</td>
        <td>${statusBadge(item.status)}</td>
      </tr>`).join('');
  };

  const updateChrome = () => {
    document.getElementById('topUserName').textContent = state.profile.name;
    document.getElementById('topUserEmail').textContent = state.profile.email;
    document.getElementById('topAvatar').textContent = initials(state.profile.name);
    document.getElementById('sidebarBalance').textContent = formatMoney(getBalance());
  };

  const pageMeta = {
    home: ['Overview', 'Home'],
    deposit: ['Add funds', 'Deposit'],
    withdraw: ['Cash out', 'Withdraw'],
    trs: ['All activity', 'TRS'],
    tr: ['Transfers', 'TR'],
    profile: ['Account settings', 'Profile']
  };

  const renderHome = () => {
    const totals = getTotals();
    const recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const chartData = [36, 54, 42, 68, 57, 84, 72];
    pageContent.innerHTML = `
      <div class="welcome-banner">
        <div>
          <span class="eyebrow light">Welcome back, ${escapeHtml(state.profile.name.split(' ')[0])}</span>
          <h2>Here is your financial overview.</h2>
          <p>Manage your funds and review recent activity from one place.</p>
        </div>
        <div class="welcome-actions">
          <a class="btn btn-light" href="#deposit" data-page="deposit">+ Deposit</a>
          <a class="btn btn-outline-light" href="#withdraw" data-page="withdraw">Withdraw</a>
        </div>
      </div>

      <div class="stats-grid">
        <article class="stat-card featured"><div class="stat-head"><span>Available Balance</span><span class="stat-icon">₹</span></div><strong>${formatMoney(getBalance())}</strong><small>Live demo balance</small></article>
        <article class="stat-card"><div class="stat-head"><span>Total Deposits</span><span class="stat-icon green">↓</span></div><strong>${formatMoney(totals.deposits)}</strong><small>${state.transactions.filter((x) => x.type === 'Deposit').length} deposit records</small></article>
        <article class="stat-card"><div class="stat-head"><span>Total Withdrawals</span><span class="stat-icon orange">↑</span></div><strong>${formatMoney(totals.withdrawals)}</strong><small>${totals.pending} pending requests</small></article>
        <article class="stat-card"><div class="stat-head"><span>Total Transfers</span><span class="stat-icon blue">⇄</span></div><strong>${formatMoney(totals.transfers)}</strong><small>Internal transfer records</small></article>
      </div>

      <div class="dashboard-grid">
        <article class="panel chart-panel">
          <div class="panel-head"><div><span class="panel-kicker">Weekly overview</span><h3>Transaction activity</h3></div><span class="soft-pill">Last 7 days</span></div>
          <div class="large-chart">
            ${chartData.map((height, index) => `<div class="chart-column"><div class="bar-wrap"><span style="height:${height}%"></span></div><small>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][index]}</small></div>`).join('')}
          </div>
        </article>
        <article class="panel quick-panel">
          <div class="panel-head"><div><span class="panel-kicker">Shortcuts</span><h3>Quick actions</h3></div></div>
          <div class="quick-grid">
            <a href="#deposit" data-page="deposit"><span>↓</span><strong>Deposit</strong><small>Add funds</small></a>
            <a href="#withdraw" data-page="withdraw"><span>↑</span><strong>Withdraw</strong><small>Cash out</small></a>
            <a href="#tr" data-page="tr"><span>⇄</span><strong>Transfer</strong><small>Send money</small></a>
            <a href="#profile" data-page="profile"><span>◎</span><strong>Profile</strong><small>Edit details</small></a>
          </div>
        </article>
      </div>

      <article class="panel">
        <div class="panel-head"><div><span class="panel-kicker">Latest records</span><h3>Recent transactions</h3></div><a class="text-link" href="#trs" data-page="trs">View all →</a></div>
        <div class="table-wrap"><table><thead><tr><th>Type</th><th>Transaction ID</th><th>Method</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${tableRows(recent)}</tbody></table></div>
      </article>`;
  };

  const renderDeposit = () => {
    const deposits = [...state.transactions].filter((item) => item.type === 'Deposit').sort((a, b) => new Date(b.date) - new Date(a.date));
    pageContent.innerHTML = `
      <div class="content-grid form-page-grid">
        <article class="panel form-panel">
          <div class="panel-head"><div><span class="panel-kicker">Add money</span><h3>New deposit</h3></div><span class="balance-chip">Balance: ${formatMoney(getBalance())}</span></div>
          <form id="depositForm" class="dashboard-form">
            <label class="field"><span>Deposit amount</span><div class="money-input"><span>₹</span><input type="number" id="depositAmount" min="100" step="1" placeholder="Enter amount" required></div><small>Minimum deposit: ₹100</small></label>
            <label class="field"><span>Payment method</span><select id="depositMethod" required><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option><option value="Card">Debit / Credit Card</option><option value="Crypto Wallet">Crypto Wallet</option></select></label>
            <label class="field"><span>Transaction reference</span><input type="text" id="depositReference" placeholder="Example: UPI123456" required></label>
            <label class="field"><span>Note <small>(optional)</small></span><textarea id="depositNote" rows="4" placeholder="Add a short note"></textarea></label>
            <button class="btn btn-primary btn-large btn-block" type="submit">Confirm Deposit</button>
          </form>
        </article>
        <aside class="side-stack">
          <article class="info-card gradient-card"><span class="feature-icon">↓</span><h3>Fast demo deposit</h3><p>Your demo balance updates immediately after submission.</p></article>
          <article class="panel help-panel"><h3>Deposit guide</h3><ol><li>Enter an amount.</li><li>Select a payment method.</li><li>Add a reference number.</li><li>Confirm the deposit.</li></ol></article>
        </aside>
      </div>
      <article class="panel"><div class="panel-head"><div><span class="panel-kicker">History</span><h3>Deposit records</h3></div><span class="soft-pill">${deposits.length} records</span></div><div class="table-wrap"><table><thead><tr><th>Type</th><th>Transaction ID</th><th>Method</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${tableRows(deposits)}</tbody></table></div></article>`;

    document.getElementById('depositForm').addEventListener('submit', handleDeposit);
  };

  const handleDeposit = (event) => {
    event.preventDefault();
    const amount = Number(document.getElementById('depositAmount').value);
    const method = document.getElementById('depositMethod').value;
    const reference = document.getElementById('depositReference').value.trim();
    const note = document.getElementById('depositNote').value.trim();
    if (amount < 100) return toast('Minimum deposit amount is ₹100.', 'error');
    if (!reference) return toast('Please add a transaction reference.', 'error');
    state.transactions.push({ id: `DEP-${Date.now().toString().slice(-8)}`, type: 'Deposit', amount, method, status: 'Completed', date: new Date().toISOString(), note: note || reference });
    persistTransactions();
    updateChrome();
    toast('Deposit added successfully.');
    renderDeposit();
  };

  const renderWithdraw = () => {
    const withdrawals = [...state.transactions].filter((item) => item.type === 'Withdraw').sort((a, b) => new Date(b.date) - new Date(a.date));
    pageContent.innerHTML = `
      <div class="content-grid form-page-grid">
        <article class="panel form-panel">
          <div class="panel-head"><div><span class="panel-kicker">Cash out</span><h3>New withdrawal</h3></div><span class="balance-chip">Available: ${formatMoney(getBalance())}</span></div>
          <form id="withdrawForm" class="dashboard-form">
            <label class="field"><span>Withdrawal amount</span><div class="money-input"><span>₹</span><input type="number" id="withdrawAmount" min="500" step="1" placeholder="Enter amount" required></div><small>Minimum withdrawal: ₹500 • Demo fee: 1%</small></label>
            <label class="field"><span>Payout method</span><select id="withdrawMethod" required><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option><option value="Crypto Wallet">Crypto Wallet</option></select></label>
            <label class="field"><span>Account / UPI / Wallet ID</span><input type="text" id="withdrawDestination" value="${escapeHtml(state.profile.payoutId)}" placeholder="Enter payout destination" required></label>
            <div class="summary-box"><div><span>Requested amount</span><strong id="withdrawSummary">₹0.00</strong></div><div><span>Fee</span><strong id="feeSummary">₹0.00</strong></div><div class="total"><span>You receive</span><strong id="receiveSummary">₹0.00</strong></div></div>
            <button class="btn btn-primary btn-large btn-block" type="submit">Request Withdrawal</button>
          </form>
        </article>
        <aside class="side-stack">
          <article class="info-card dark-card"><span class="feature-icon">↑</span><h3>Withdrawal validation</h3><p>The request is checked against your available demo balance before it is created.</p></article>
          <article class="panel help-panel"><h3>Important</h3><ul><li>Verify payout details.</li><li>Keep enough balance for fees.</li><li>Production withdrawals need OTP and backend approval.</li></ul></article>
        </aside>
      </div>
      <article class="panel"><div class="panel-head"><div><span class="panel-kicker">History</span><h3>Withdrawal records</h3></div><span class="soft-pill">${withdrawals.length} records</span></div><div class="table-wrap"><table><thead><tr><th>Type</th><th>Transaction ID</th><th>Method</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${tableRows(withdrawals)}</tbody></table></div></article>`;

    const amountInput = document.getElementById('withdrawAmount');
    amountInput.addEventListener('input', updateWithdrawSummary);
    document.getElementById('withdrawForm').addEventListener('submit', handleWithdraw);
  };

  const updateWithdrawSummary = () => {
    const amount = Number(document.getElementById('withdrawAmount').value) || 0;
    const fee = amount * 0.01;
    document.getElementById('withdrawSummary').textContent = formatMoney(amount);
    document.getElementById('feeSummary').textContent = formatMoney(fee);
    document.getElementById('receiveSummary').textContent = formatMoney(Math.max(0, amount - fee));
  };

  const handleWithdraw = (event) => {
    event.preventDefault();
    const amount = Number(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const destination = document.getElementById('withdrawDestination').value.trim();
    if (amount < 500) return toast('Minimum withdrawal amount is ₹500.', 'error');
    if (amount > getBalance()) return toast('Insufficient balance for this withdrawal.', 'error');
    if (!destination) return toast('Please enter payout details.', 'error');
    state.transactions.push({ id: `WDR-${Date.now().toString().slice(-8)}`, type: 'Withdraw', amount, method, status: 'Pending', date: new Date().toISOString(), note: `To ${destination}` });
    persistTransactions();
    updateChrome();
    toast('Withdrawal request created.');
    renderWithdraw();
  };

  const renderTrs = () => {
    const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    pageContent.innerHTML = `
      <article class="panel">
        <div class="panel-head responsive-head"><div><span class="panel-kicker">Transaction Record Summary</span><h3>TRS records</h3></div><div class="filter-row"><input class="table-search" id="trsSearch" type="search" placeholder="Search records"><select id="trsFilter"><option value="all">All types</option><option value="Deposit">Deposits</option><option value="Withdraw">Withdrawals</option><option value="Transfer">Transfers</option></select></div></div>
        <div class="summary-strip"><div><span>Total records</span><strong>${sorted.length}</strong></div><div><span>Completed</span><strong>${sorted.filter((x) => x.status === 'Completed').length}</strong></div><div><span>Pending</span><strong>${sorted.filter((x) => x.status === 'Pending').length}</strong></div><div><span>Rejected</span><strong>${sorted.filter((x) => x.status === 'Rejected').length}</strong></div></div>
        <div class="table-wrap"><table><thead><tr><th>Type</th><th>Transaction ID</th><th>Method</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody id="trsTableBody">${tableRows(sorted)}</tbody></table></div>
      </article>`;

    const applyFilter = () => {
      const query = document.getElementById('trsSearch').value.trim().toLowerCase();
      const type = document.getElementById('trsFilter').value;
      const filtered = sorted.filter((item) => {
        const matchesType = type === 'all' || item.type === type;
        const haystack = `${item.id} ${item.type} ${item.method} ${item.status} ${item.note}`.toLowerCase();
        return matchesType && haystack.includes(query);
      });
      document.getElementById('trsTableBody').innerHTML = tableRows(filtered);
    };
    document.getElementById('trsSearch').addEventListener('input', applyFilter);
    document.getElementById('trsFilter').addEventListener('change', applyFilter);
  };

  const renderTr = () => {
    const transfers = [...state.transactions].filter((item) => item.type === 'Transfer').sort((a, b) => new Date(b.date) - new Date(a.date));
    pageContent.innerHTML = `
      <div class="section-toolbar"><div><p>Create and review internal transfer records.</p></div><button class="btn btn-primary" id="newTransferButton">+ New Transfer</button></div>
      <div class="stats-grid compact-stats"><article class="stat-card"><div class="stat-head"><span>Transfer count</span><span class="stat-icon blue">⇄</span></div><strong>${transfers.length}</strong><small>Total TR records</small></article><article class="stat-card"><div class="stat-head"><span>Transferred amount</span><span class="stat-icon orange">₹</span></div><strong>${formatMoney(transfers.reduce((sum, item) => sum + Number(item.amount), 0))}</strong><small>Across all transfers</small></article><article class="stat-card"><div class="stat-head"><span>Available balance</span><span class="stat-icon green">✓</span></div><strong>${formatMoney(getBalance())}</strong><small>Ready to transfer</small></article></div>
      <article class="panel"><div class="panel-head"><div><span class="panel-kicker">Transfer Records</span><h3>TR history</h3></div><span class="soft-pill">${transfers.length} records</span></div><div class="table-wrap"><table><thead><tr><th>Type</th><th>Transaction ID</th><th>Method</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${tableRows(transfers)}</tbody></table></div></article>`;
    document.getElementById('newTransferButton').addEventListener('click', openTransferModal);
  };

  const openTransferModal = () => {
    modalContent.innerHTML = `
      <div class="modal-heading"><span class="panel-kicker">Internal TR</span><h2 id="modalTitle">Create transfer</h2><p>Send demo funds to another user record.</p></div>
      <form id="transferForm" class="dashboard-form">
        <label class="field"><span>Recipient name or ID</span><input type="text" id="transferRecipient" placeholder="Example: Raj Kumar" required></label>
        <label class="field"><span>Transfer amount</span><div class="money-input"><span>₹</span><input type="number" id="transferAmount" min="100" placeholder="Enter amount" required></div><small>Available: ${formatMoney(getBalance())}</small></label>
        <label class="field"><span>Note <small>(optional)</small></span><textarea id="transferNote" rows="3" placeholder="Reason for transfer"></textarea></label>
        <button class="btn btn-primary btn-large btn-block" type="submit">Complete Transfer</button>
      </form>`;
    modalBackdrop.classList.remove('hidden');
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
  };

  const handleTransfer = (event) => {
    event.preventDefault();
    const recipient = document.getElementById('transferRecipient').value.trim();
    const amount = Number(document.getElementById('transferAmount').value);
    const note = document.getElementById('transferNote').value.trim();
    if (!recipient) return toast('Please enter a recipient.', 'error');
    if (amount < 100) return toast('Minimum transfer amount is ₹100.', 'error');
    if (amount > getBalance()) return toast('Insufficient balance for this transfer.', 'error');
    state.transactions.push({ id: `TR-${Date.now().toString().slice(-8)}`, type: 'Transfer', amount, method: 'Internal', status: 'Completed', date: new Date().toISOString(), note: note ? `${recipient} — ${note}` : `To ${recipient}` });
    persistTransactions();
    closeModal();
    updateChrome();
    toast('Transfer completed successfully.');
    renderTr();
  };

  const renderProfile = () => {
    pageContent.innerHTML = `
      <div class="profile-layout">
        <aside class="panel profile-card">
          <div class="large-avatar">${initials(state.profile.name)}</div>
          <h2>${escapeHtml(state.profile.name)}</h2>
          <p>${escapeHtml(state.profile.email)}</p>
          <span class="status-badge ${state.profile.kycStatus === 'Verified' ? 'completed' : 'pending'}">KYC: ${escapeHtml(state.profile.kycStatus)}</span>
          <div class="profile-meta"><div><span>User ID</span><strong>${escapeHtml(state.user.id)}</strong></div><div><span>Member since</span><strong>${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(state.user.createdAt))}</strong></div></div>
        </aside>
        <article class="panel form-panel">
          <div class="panel-head"><div><span class="panel-kicker">Personal settings</span><h3>Edit profile</h3></div><span class="soft-pill">Auto saved locally</span></div>
          <form id="profileForm" class="dashboard-form">
            <div class="form-grid two"><label class="field"><span>Full name</span><input type="text" id="profileName" value="${escapeHtml(state.profile.name)}" required></label><label class="field"><span>Mobile number</span><input type="tel" id="profileMobile" value="${escapeHtml(state.profile.mobile)}" required></label></div>
            <label class="field"><span>Email address</span><input type="email" id="profileEmail" value="${escapeHtml(state.profile.email)}" readonly><small>Email is linked to your login account.</small></label>
            <label class="field"><span>Address</span><input type="text" id="profileAddress" value="${escapeHtml(state.profile.address)}" placeholder="House, street or area"></label>
            <div class="form-grid two"><label class="field"><span>City</span><input type="text" id="profileCity" value="${escapeHtml(state.profile.city)}" placeholder="Your city"></label><label class="field"><span>Country</span><input type="text" id="profileCountry" value="${escapeHtml(state.profile.country)}"></label></div>
            <div class="form-grid two"><label class="field"><span>Payout method</span><select id="profilePayout"><option ${state.profile.payoutMethod === 'UPI' ? 'selected' : ''}>UPI</option><option ${state.profile.payoutMethod === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option><option ${state.profile.payoutMethod === 'Crypto Wallet' ? 'selected' : ''}>Crypto Wallet</option></select></label><label class="field"><span>Payout ID</span><input type="text" id="profilePayoutId" value="${escapeHtml(state.profile.payoutId)}" placeholder="UPI, bank or wallet ID"></label></div>
            <button class="btn btn-primary btn-large" type="submit">Save Profile</button>
          </form>
        </article>
      </div>`;
    document.getElementById('profileForm').addEventListener('submit', handleProfileSave);
  };

  const handleProfileSave = (event) => {
    event.preventDefault();
    const name = document.getElementById('profileName').value.trim();
    const mobile = document.getElementById('profileMobile').value.trim();
    if (name.length < 2 || mobile.length < 8) return toast('Please enter valid profile details.', 'error');
    state.profile = {
      ...state.profile,
      name,
      mobile,
      address: document.getElementById('profileAddress').value.trim(),
      city: document.getElementById('profileCity').value.trim(),
      country: document.getElementById('profileCountry').value.trim(),
      payoutMethod: document.getElementById('profilePayout').value,
      payoutId: document.getElementById('profilePayoutId').value.trim()
    };
    persistProfile();
    updateChrome();
    toast('Profile updated successfully.');
    renderProfile();
  };

  const renderPage = (page) => {
    state.page = pageMeta[page] ? page : 'home';
    const [kicker, title] = pageMeta[state.page];
    document.getElementById('pageKicker').textContent = kicker;
    document.getElementById('pageTitle').textContent = title;
    document.title = `${title} — NexaPay`;
    document.querySelectorAll('[data-page]').forEach((link) => link.classList.toggle('active', link.dataset.page === state.page));
    ({ home: renderHome, deposit: renderDeposit, withdraw: renderWithdraw, trs: renderTrs, tr: renderTr, profile: renderProfile }[state.page])();
    bindDynamicNavigation();
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const bindDynamicNavigation = () => {
    pageContent.querySelectorAll('[data-page]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.hash = link.dataset.page;
      });
    });
  };

  const openSidebar = () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
  };
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  };
  const closeModal = () => modalBackdrop.classList.add('hidden');

  document.querySelectorAll('.sidebar-nav [data-page], .sidebar-card [data-page]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.hash = link.dataset.page;
    });
  });
  document.getElementById('sidebarOpen').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) closeModal();
  });
  document.getElementById('profileShortcut').addEventListener('click', () => { window.location.hash = 'profile'; });
  document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.replace('login.html');
  });
  document.getElementById('themeToggle').addEventListener('click', () => {
    const dark = document.body.classList.toggle('dark-mode');
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  });
  window.addEventListener('hashchange', () => renderPage(window.location.hash.replace('#', '') || 'home'));

  if (localStorage.getItem(THEME_KEY) === 'dark') document.body.classList.add('dark-mode');
  seedDemoTransactions();
  updateChrome();
  renderPage(window.location.hash.replace('#', '') || 'home');
})();
