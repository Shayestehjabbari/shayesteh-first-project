// ---------- Form configurations per operation type ----------
const FORM_CONFIGS = {
  deposit: {
    fields: [
      { id: 'phoneNumber', label: 'Phone Number', placeholder: 'e.g. 260763456789' },
      { id: 'amount', label: 'Amount', placeholder: 'e.g. 15' },
    ],
    buttonLabel: 'Send Deposit',
  },
  payout: {
    fields: [
      { id: 'phoneNumber', label: 'Phone Number', placeholder: 'e.g. 260763456789' },
      { id: 'amount', label: 'Amount', placeholder: 'e.g. 100' },
    ],
    buttonLabel: 'Send Payout',
  },
  refund: {
    fields: [
      { id: 'depositId', label: 'Deposit ID', placeholder: 'UUID of the deposit to refund' },
      { id: 'amount', label: 'Amount (optional, leave blank for full refund)', placeholder: 'e.g. 5' },
    ],
    buttonLabel: 'Send Refund',
  },
  'check-status': {
    fields: [
      {
        id: 'statusType',
        label: 'Status Type',
        type: 'select',
        options: [
          { value: 'deposit', label: 'Deposit' },
          { value: 'payout', label: 'Payout' },
          { value: 'refund', label: 'Refund' },
        ],
      },
      { id: 'transactionId', label: 'Transaction ID', placeholder: 'UUID of the transaction' },
    ],
    buttonLabel: 'Check Status',
  },
};

// ---------- DOM references ----------
const opTypeSelect = document.getElementById('op-type');
const dynamicForm = document.getElementById('dynamic-form');
const submitBtn = document.getElementById('submit-btn');
const opResult = document.getElementById('op-result');

// ---------- Dynamic form rendering ----------
function renderForm(opType) {
  const config = FORM_CONFIGS[opType];
  if (!config) return;
  dynamicForm.innerHTML = '';
  opResult.classList.add('hidden');
  opResult.innerHTML = '';

  for (const field of config.fields) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.setAttribute('for', field.id);
    label.textContent = field.label;
    group.appendChild(label);

    if (field.type === 'select') {
      const select = document.createElement('select');
      select.id = field.id;
      for (const opt of field.options) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
      }
      group.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = field.id;
      input.placeholder = field.placeholder || '';
      group.appendChild(input);
    }

    dynamicForm.appendChild(group);
  }

  submitBtn.textContent = config.buttonLabel;
}

opTypeSelect.addEventListener('change', () => renderForm(opTypeSelect.value));
renderForm(opTypeSelect.value);

// ---------- Submit handler ----------
submitBtn.addEventListener('click', handleSubmit);

async function handleSubmit() {
  const opType = opTypeSelect.value;
  opResult.classList.add('hidden');
  opResult.innerHTML = '';

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span>Processing...';

  try {
    let res;
    if (opType === 'deposit' || opType === 'payout') {
      const phoneNumber = getVal('phoneNumber');
      const amount = getVal('amount');
      if (!phoneNumber) return showError('Please enter a phone number');
      if (!amount || isNaN(amount) || Number(amount) <= 0) return showError('Please enter a valid positive amount');

      res = await fetchJSON(`/api/${opType}`, 'POST', { phoneNumber, amount });
      renderTransactionResult(res, opType);
    } else if (opType === 'refund') {
      const depositId = getVal('depositId');
      if (!depositId) return showError('Please enter a deposit ID');
      const amount = getVal('amount');
      const body = { depositId };
      if (amount) {
        if (isNaN(amount) || Number(amount) <= 0) return showError('Amount must be a valid positive number');
        body.amount = amount;
      }
      res = await fetchJSON('/api/refund', 'POST', body);
      renderRefundResult(res);
    } else if (opType === 'check-status') {
      const statusType = getVal('statusType');
      const transactionId = getVal('transactionId');
      if (!transactionId) return showError('Please enter a transaction ID');
      res = await fetchJSON(`/api/${statusType}-status/${encodeURIComponent(transactionId)}`);
      renderStatusResult(res, statusType);
    }
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = FORM_CONFIGS[opType].buttonLabel;
  }
}

// ---------- Result renderers ----------
function renderTransactionResult(data, type) {
  let html = '';
  if (data.success) {
    const status = data.response?.status || 'UNKNOWN';
    html += `<span class="badge ${badgeClass(status)}">${esc(status)}</span>`;
  } else {
    html += `<span class="badge error">FAILED at ${esc(data.step || 'unknown')}</span>`;
  }

  if (data.predictedProvider) {
    html += `<div class="info-row"><strong>Provider:</strong> ${esc(data.predictedProvider.provider)} (${esc(data.predictedProvider.country)})</div>`;
    html += `<div class="info-row"><strong>Phone:</strong> ${esc(data.predictedProvider.phoneNumber)}</div>`;
  }
  if (data.resolvedCurrency) {
    html += `<div class="info-row"><strong>Currency:</strong> ${esc(data.resolvedCurrency)}</div>`;
  }
  if (data.requestSent) {
    html += `<details><summary>Request Sent</summary><pre>${esc(JSON.stringify(data.requestSent, null, 2))}</pre></details>`;
  }
  if (data.response) {
    html += `<details open><summary>Response</summary><pre>${esc(JSON.stringify(data.response, null, 2))}</pre></details>`;
  }
  if (data.error) {
    html += `<details open><summary>Error</summary><pre>${esc(JSON.stringify(data.error, null, 2))}</pre></details>`;
  }

  opResult.innerHTML = html;
  opResult.classList.remove('hidden');
  loadTransactionHistory();
}

function renderRefundResult(data) {
  let html = '';
  if (data.success) {
    const status = data.response?.status || 'UNKNOWN';
    html += `<span class="badge ${badgeClass(status)}">${esc(status)}</span>`;
  } else {
    html += `<span class="badge error">FAILED</span>`;
  }

  if (data.requestSent) {
    html += `<details><summary>Request Sent</summary><pre>${esc(JSON.stringify(data.requestSent, null, 2))}</pre></details>`;
  }
  if (data.response) {
    html += `<details open><summary>Response</summary><pre>${esc(JSON.stringify(data.response, null, 2))}</pre></details>`;
  }
  if (data.error) {
    html += `<details open><summary>Error</summary><pre>${esc(JSON.stringify(data.error, null, 2))}</pre></details>`;
  }

  opResult.innerHTML = html;
  opResult.classList.remove('hidden');
  loadTransactionHistory();
}

function renderStatusResult(data, statusType) {
  let html = '';
  if (data.success) {
    html += `<span class="badge accepted">FOUND</span>`;
    html += `<details open><summary>${esc(statusType)} Details</summary><pre>${esc(JSON.stringify(data.data, null, 2))}</pre></details>`;
  } else {
    html += `<span class="badge error">ERROR</span>`;
    html += `<details open><summary>Error</summary><pre>${esc(JSON.stringify(data.error, null, 2))}</pre></details>`;
  }

  opResult.innerHTML = html;
  opResult.classList.remove('hidden');
}

// ---------- Active Configuration ----------
document.getElementById('load-conf-btn').addEventListener('click', loadActiveConfig);

async function loadActiveConfig() {
  const container = document.getElementById('conf-content');
  const btn = document.getElementById('load-conf-btn');
  btn.disabled = true;
  btn.textContent = 'Loading...';
  container.innerHTML = '';

  try {
    const data = await fetchJSON('/api/active-conf');
    if (!data.success) {
      container.innerHTML = `<p class="error-text">Failed to load: ${esc(JSON.stringify(data.error))}</p>`;
      return;
    }

    const conf = data.data;
    const countries = conf.countries || [];
    if (countries.length === 0) {
      container.innerHTML = '<p class="muted">No countries configured.</p>';
      return;
    }

    let html = '';
    for (const country of countries) {
      html += `<div class="config-country">`;
      html += `<h3>${esc(country.country)}</h3>`;
      html += `<div class="providers-grid">`;
      for (const provider of country.providers || []) {
        html += `<div class="provider-card">`;
        html += `<strong>${esc(provider.provider)}</strong>`;
        for (const curr of provider.currencies || []) {
          const ops = curr.operationTypes ? Object.keys(curr.operationTypes) : [];
          html += `<div class="info-row">${esc(curr.currency)}: ${ops.map(o => `<span class="badge-sm">${esc(o)}</span>`).join(' ')}</div>`;
        }
        html += `</div>`;
      }
      html += `</div></div>`;
    }
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p class="error-text">${esc(err.message)}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Load Configuration';
  }
}

// ---------- Wallet Balances ----------
document.getElementById('load-balances-btn').addEventListener('click', loadWalletBalances);

async function loadWalletBalances() {
  const container = document.getElementById('balances-content');
  const btn = document.getElementById('load-balances-btn');
  btn.disabled = true;
  btn.textContent = 'Loading...';
  container.innerHTML = '';

  try {
    const data = await fetchJSON('/api/wallet-balances');
    if (!data.success) {
      container.innerHTML = `<p class="error-text">Failed to load: ${esc(JSON.stringify(data.error))}</p>`;
      return;
    }

    const balances = Array.isArray(data.data) ? data.data : [];
    if (balances.length === 0) {
      container.innerHTML = '<p class="muted">No wallet balances found.</p>';
      return;
    }

    let html = '<table><thead><tr><th>Country</th><th>Currency</th><th>Balance</th></tr></thead><tbody>';
    for (const b of balances) {
      html += `<tr><td>${esc(b.country || '-')}</td><td>${esc(b.currency || '-')}</td><td>${esc(b.balance ?? '-')}</td></tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p class="error-text">${esc(err.message)}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Load Balances';
  }
}

// ---------- Transaction History ----------
document.getElementById('load-history-btn').addEventListener('click', loadTransactionHistory);

async function loadTransactionHistory() {
  const container = document.getElementById('history-content');

  try {
    const data = await fetchJSON('/api/transactions');
    if (!data.success || !data.data.length) {
      container.innerHTML = '<p class="muted">No transactions yet. Submit a deposit or payout to get started.</p>';
      return;
    }

    // Store transactions for detail view
    window._historyTransactions = data.data;

    let html = '<table><thead><tr><th>Time</th><th>Type</th><th>ID</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
    for (let i = 0; i < data.data.length; i++) {
      const t = data.data[i];
      const id = t.depositId || t.payoutId || t.refundId || '-';
      const shortId = id.length > 12 ? id.slice(0, 8) + '...' : id;
      html += `<tr class="clickable-row" onclick="showTxDetail(${i})">`;
      html += `<td>${esc(formatTime(t.timestamp))}</td>`;
      html += `<td><span class="badge-sm ${esc(t.type)}">${esc(t.type)}</span></td>`;
      html += `<td title="${esc(id)}">${esc(shortId)}</td>`;
      html += `<td>${esc(t.amount || '-')} ${esc(t.currency || '')}</td>`;
      html += `<td><span class="badge-sm ${badgeClass(t.status)}">${esc(t.status)}</span></td>`;
      html += `</tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p class="error-text">${esc(err.message)}</p>`;
  }
}

// ---------- Check Status from History ----------
function checkStatusFromHistory(type, id) {
  switchToPanel('panel-operations');

  opTypeSelect.value = 'check-status';
  renderForm('check-status');

  const statusTypeSelect = document.getElementById('statusType');
  if (statusTypeSelect) statusTypeSelect.value = type;

  const txIdInput = document.getElementById('transactionId');
  if (txIdInput) txIdInput.value = id;
}

// ---------- Transaction Detail View ----------
function showTxDetail(index) {
  const txs = window._historyTransactions;
  if (!txs || !txs[index]) return;
  const t = txs[index];
  const detail = document.getElementById('tx-detail');
  const txId = t.depositId || t.payoutId || t.refundId || '-';

  // Highlight selected row
  const rows = document.querySelectorAll('#history-content tbody tr');
  rows.forEach(r => r.classList.remove('selected-row'));
  if (rows[index]) rows[index].classList.add('selected-row');

  const fields = [
    { label: 'Type', value: t.type },
    { label: 'Status', value: t.status, badge: true },
    { label: 'Amount', value: t.amount ? `${t.amount} ${t.currency || ''}` : '-' },
    { label: 'Phone Number', value: t.phoneNumber || '-' },
    { label: 'Provider', value: t.provider || '-' },
    { label: 'Country', value: t.country || '-' },
    { label: 'Deposit ID', value: t.depositId || '-' },
    { label: 'Payout ID', value: t.payoutId || '-' },
    { label: 'Refund ID', value: t.refundId || '-' },
    { label: 'Timestamp', value: t.timestamp ? new Date(t.timestamp).toLocaleString() : '-' },
  ];

  let html = `<div class="tx-detail-header">`;
  html += `<h3>Transaction Details</h3>`;
  html += `<button class="tx-detail-close" onclick="closeTxDetail()">&times;</button>`;
  html += `</div>`;

  html += `<div class="tx-detail-grid">`;
  for (const f of fields) {
    html += `<div class="tx-detail-field">`;
    html += `<div class="field-label">${esc(f.label)}</div>`;
    if (f.badge) {
      html += `<div class="field-value"><span class="badge-sm ${badgeClass(f.value)}">${esc(f.value || '-')}</span></div>`;
    } else {
      html += `<div class="field-value">${esc(f.value)}</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  if (txId !== '-') {
    html += `<div class="tx-detail-actions">`;
    html += `<button class="btn-sm" onclick="checkLiveStatus('${esc(t.type)}','${esc(txId)}')">Check Live Status from pawaPay</button>`;
    html += `</div>`;
  }

  html += `<div id="tx-live-status" class="tx-live-status"></div>`;

  detail.innerHTML = html;
  detail.classList.remove('hidden');
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeTxDetail() {
  const detail = document.getElementById('tx-detail');
  detail.classList.add('hidden');
  detail.innerHTML = '';
  const rows = document.querySelectorAll('#history-content tbody tr');
  rows.forEach(r => r.classList.remove('selected-row'));
}

async function checkLiveStatus(type, id) {
  const container = document.getElementById('tx-live-status');
  container.innerHTML = '<p class="muted"><span class="spinner" style="border-color:#4a6cf7;border-top-color:transparent;"></span> Checking live status...</p>';

  try {
    const data = await fetchJSON(`/api/${encodeURIComponent(type)}-status/${encodeURIComponent(id)}`);
    if (data.success) {
      const status = data.data?.status || data.data?.[0]?.status || 'UNKNOWN';
      container.innerHTML = `<span class="badge ${badgeClass(status)}">${esc(status)}</span>`;
    } else {
      container.innerHTML = `<span class="badge error">ERROR</span>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="error-text">${esc(err.message)}</p>`;
  }
}

window.showTxDetail = showTxDetail;
window.closeTxDetail = closeTxDetail;
window.checkLiveStatus = checkLiveStatus;

// ---------- Navigation ----------
function initNavigation() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger-btn');
  const contentTitle = document.getElementById('content-title');
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });

  overlay.addEventListener('click', closeSidebar);

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const panelId = item.dataset.panel;
      const title = item.dataset.title;

      // Update active nav item
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Update active panel
      viewPanels.forEach(p => p.classList.remove('active'));
      const target = document.getElementById(panelId);
      if (target) target.classList.add('active');

      // Update content header title
      if (contentTitle && title) contentTitle.textContent = title;

      closeSidebar();
    });
  });
}

function switchToPanel(panelId) {
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const contentTitle = document.getElementById('content-title');

  // Find the matching nav item
  const matchingNav = document.querySelector(`.nav-item[data-panel="${panelId}"]`);

  // Update active nav item
  navItems.forEach(n => n.classList.remove('active'));
  if (matchingNav) matchingNav.classList.add('active');

  // Update active panel
  viewPanels.forEach(p => p.classList.remove('active'));
  const target = document.getElementById(panelId);
  if (target) target.classList.add('active');

  // Update title
  if (contentTitle && matchingNav) {
    contentTitle.textContent = matchingNav.dataset.title;
  }
}

// Expose for cross-panel navigation
window.switchToPanel = switchToPanel;

initNavigation();

// ---------- Database Viewer ----------
let dbAutoRefreshInterval = null;

document.getElementById('load-db-btn').addEventListener('click', loadDatabase);
document.getElementById('db-auto-refresh').addEventListener('change', (e) => {
  if (e.target.checked) {
    loadDatabase();
    dbAutoRefreshInterval = setInterval(loadDatabase, 10000);
  } else {
    if (dbAutoRefreshInterval) {
      clearInterval(dbAutoRefreshInterval);
      dbAutoRefreshInterval = null;
    }
  }
});

async function loadDatabase() {
  const container = document.getElementById('db-content');

  try {
    const data = await fetchJSON('/api/transactions');
    if (!data.success || !data.data.length) {
      container.innerHTML = '<p class="muted">No transactions in the database.</p>';
      return;
    }

    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'type', label: 'Type' },
      { key: 'depositId', label: 'Deposit ID' },
      { key: 'payoutId', label: 'Payout ID' },
      { key: 'refundId', label: 'Refund ID' },
      { key: 'amount', label: 'Amount' },
      { key: 'currency', label: 'Currency' },
      { key: 'phoneNumber', label: 'Phone' },
      { key: 'provider', label: 'Provider' },
      { key: 'country', label: 'Country' },
      { key: 'status', label: 'Status' },
      { key: 'timestamp', label: 'Timestamp' },
    ];

    let html = '<div class="db-table-wrap"><table><thead><tr>';
    for (const col of columns) {
      html += `<th>${esc(col.label)}</th>`;
    }
    html += '<th>Action</th></tr></thead><tbody>';

    for (const row of data.data) {
      html += '<tr>';
      for (const col of columns) {
        let val = row[col.key];
        if (col.key === 'timestamp') {
          val = val ? new Date(val).toLocaleString() : '-';
        } else if (col.key === 'status') {
          html += `<td><span class="badge-sm ${badgeClass(val)}">${esc(val || '-')}</span></td>`;
          continue;
        } else if (col.key === 'type') {
          html += `<td><span class="badge-sm ${esc(val || '')}">${esc(val || '-')}</span></td>`;
          continue;
        }
        html += `<td>${esc(val != null ? val : '-')}</td>`;
      }
      // Action column: Check button
      const txType = row.type || 'deposit';
      const txId = row.depositId || row.payoutId || row.refundId || '';
      if (txId) {
        html += `<td><button class="btn-xs" onclick="checkStatusFromHistory('${esc(txType)}','${esc(txId)}')">Check</button></td>`;
      } else {
        html += '<td>-</td>';
      }
      html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p class="error-text">${esc(err.message)}</p>`;
  }
}

// ---------- Helpers ----------
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

async function fetchJSON(url, method, body) {
  const opts = { method: method || 'GET', headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  return res.json();
}

function showError(msg) {
  opResult.innerHTML = `<span class="badge error">ERROR</span><p>${esc(msg)}</p>`;
  opResult.classList.remove('hidden');
}

function badgeClass(status) {
  if (!status) return '';
  const s = status.toUpperCase();
  if (s === 'ACCEPTED' || s === 'COMPLETED' || s === 'FOUND') return 'accepted';
  if (s === 'DUPLICATE_IGNORED') return 'duplicate';
  if (s === 'REJECTED' || s === 'FAILED') return 'rejected';
  if (s === 'SUBMITTED' || s === 'ENQUEUED') return 'pending-status';
  return '';
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
