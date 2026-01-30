
// app.js

/* ========= App State & Constants ========= */
const USERS = {
  'admin':   { password: 'admin123',   displayName: 'Admin',   isAdmin: true  },
  'onkar':   { password: 'onkar123',   displayName: 'Onkar',   isAdmin: false },
  'goraksha':{ password: 'goraksha123',displayName: 'Goraksha',isAdmin: false },
  'sachin':  { password: 'sachin123',  displayName: 'Sachin',  isAdmin: false },
  'rajesh':  { password: 'rajesh123',  displayName: 'Rajesh',  isAdmin: false }
};

const PRODUCT_ASSIGNMENT = {
  'Solar Pump':       'Onkar',
  'Submersible Pump': 'Goraksha',
  'Energy Storage':   'Sachin',
  'Solar Rooftop':    'Rajesh'
};

const TEAM_MEMBERS = ['Onkar', 'Goraksha', 'Sachin', 'Rajesh'];
const STORAGE_KEY = 'cdlm_leads_v17';

let currentUser = null;
let allLeads = [];
let registeredPhones = new Set();
let rawCSVData = [];
let fileHeaders = [];
let columnMapping = {};
let currentFilteredLeads = [];

let liveUnsubscribe = null; // 🔔 real-time listener handle

const COMMON_DOMAINS = [
  'gmail.com','yahoo.com','outlook.com','hotmail.com','live.com',
  'aol.com','icloud.com','proton.me','rediffmail.com','rotomag.com','rotosol.com'
];
const DOMAIN_FIX_MAP = {
  'mail.com':'gmail.com','gmal.com':'gmail.com','gmial.com':'gmail.com',
  'gmail.co':'gmail.com','gmail.con':'gmail.com',
  'yahooo.com':'yahoo.com','yahho.com':'yahoo.com','yaho.com':'yahoo.com',
  'hotmai.com':'hotmail.com','hotmail.co':'hotmail.com',
  'outlok.com':'outlook.com','outlook.co':'outlook.com',
  'proton.com':'proton.me','redifmail.com':'rediffmail.com'
};

const dbFieldPatterns = {
  'full_name':   ['name','full name','full_name','first name','customer','exhibitor'],
  'phone_number':['phone','mobile','contact number','phone_number','contact','tel'],
  'email':       ['email','e-mail','mail','email id','email_id'],
  'who_you_are': ['who you are','who_you_are','designation','role','position'],
  'city':        ['city','location','state','region','address'],
  'product':     ['product','interested in','interested_in','solution'],
  'reference':   ['reference','referral','ref by','referred','reference name','who referred']
};

/* ========= Utilities ========= */
function addDebugLog(msg, type = 'info') {
  const box = document.getElementById('debugLog');
  if (!box) return;
  const div = document.createElement('div');
  div.className = 'log-entry ' + type;
  const t = new Date().toLocaleTimeString();
  div.textContent = '[' + t + '] ' + msg;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function showMessage(text, type) {
  const c = document.getElementById('messageContainer');
  if (!c) return;
  const div = document.createElement('div');
  div.className = 'message message-' + type + ' show';
  div.textContent = text;
  c.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

function toggleSidebar() {
  const el = document.querySelector('.sidebar');
  if (el) el.classList.toggle('open');
}

/* ========= Auth ========= */
function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value.trim();
  if (USERS[u] && USERS[u].password === p) {
    currentUser = {
      username: u,
      displayName: USERS[u].displayName,
      isAdmin: USERS[u].isAdmin
    };
    localStorage.setItem('cdlm_current_user', JSON.stringify(currentUser));
    showDashboard();
  } else {
    alert('Invalid credentials');
  }
}

function handleLogout() {
  if (!confirm('Logout?')) return;
  currentUser = null;
  localStorage.removeItem('cdlm_current_user');
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('loginPage').style.display = 'flex';
}

function showDashboard() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appShell').classList.remove('hidden');
  document.getElementById('headerUsername').textContent = currentUser.displayName;
  document.getElementById('headerUserRole').textContent = currentUser.isAdmin ? 'Admin' : 'Team';
  loadData();
  renderTable(allLeads);
  updateMetrics();
  updateAssignedPeopleSection();
  currentFilteredLeads = [...allLeads];
  addDebugLog('✅ Dashboard loaded', 'success');
}

/* ========= File Import & CSV Parsing ========= */
function handleFileSelect(e) {
  if (e.target.files[0]) {
    addDebugLog('📁 File: ' + e.target.files[0].name, 'info');
    document.getElementById('processBtn').disabled = false;
  }
}
function clearImport() {
  document.getElementById('csvFile').value = '';
  document.getElementById('processBtn').disabled = true;
}

async function uploadAndParseCSV() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return;
  try {
    addDebugLog('⏳ Parsing CSV...', 'info');
    const text = await file.text();
    rawCSVData = parseCSV(text);
    if (rawCSVData.length === 0) {
      showMessage('No data in CSV', 'error');
      return;
    }
    fileHeaders = Object.keys(rawCSVData[0]);
    addDebugLog('📋 ' + rawCSVData.length + ' rows, ' + fileHeaders.length + ' columns', 'info');
    autoDetectColumns(fileHeaders);
    addDebugLog('✅ Auto-detected column mapping', 'success');
    openMappingModal();
  } catch (err) {
    showMessage('Error: ' + err.message, 'error');
    addDebugLog('❌ ' + err.message, 'error');
  }
}

function parseCSV(text) {
  const lines = text.trim().split('
');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ? cells[idx].trim() : '';
    });
    if (Object.values(row).some(v => v !== '')) rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
    else if (char === '"') { insideQuotes = !insideQuotes; }
    else if (char === ',' && !insideQuotes) { cells.push(current); current = ''; }
    else { current += char; }
  }
  cells.push(current);
  return cells;
}

/* ========= Mapping Modal ========= */
function autoDetectColumns(headers) {
  columnMapping = {};
  Object.keys(dbFieldPatterns).forEach(dbField => {
    const patterns = dbFieldPatterns[dbField];
    let matched = null;
    for (const header of headers) {
      const headerLower = header.toLowerCase();
      for (const pattern of patterns) {
        if (headerLower.includes(pattern)) { matched = header; break; }
      }
      if (matched) break;
    }
    columnMapping[dbField] = matched || '';
  });
  return columnMapping;
}

function renderMappingModal() {
  const container = document.getElementById('mappingFieldsContainer');
  let html = '';
  Object.keys(dbFieldPatterns).forEach(dbField => {
    const currentMapping = columnMapping[dbField] || '';
    const isDetected = currentMapping !== '';
    html += `
      <div class="mapping-item">
        <div class="mapping-label">
          🔹 ${dbField.toUpperCase()} ${isDetected ? '<span class="mapping-detected">✓</span>' : ''}
        </div>
        <select class="mapping-select" id="map_${dbField}">
          <option value="">-- Skip --</option>`;
    fileHeaders.forEach(header => {
      const selected = currentMapping === header ? 'selected' : '';
      html += `<option value="${header}" ${selected}>${header}</option>`;
    });
    html += `</select><div class="mapping-hint">${dbFieldPatterns[dbField].join(', ')}</div></div>`;
  });
  container.innerHTML = html;
}

function openMappingModal() { renderMappingModal(); document.getElementById('mappingModal').classList.add('show'); }
function closeMappingModal() { document.getElementById('mappingModal').classList.remove('show'); }

function confirmAndCleanData() {
  Object.keys(columnMapping).forEach(dbField => {
    columnMapping[dbField] = document.getElementById('map_' + dbField).value;
  });
  addDebugLog('✅ Mapping confirmed', 'success');
  closeMappingModal();
  processAndCleanData();
}

/* ========= Cleaning Helpers ========= */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function bestCommonDomain(d) {
  let best = { domain: d, distance: Infinity };
  for (const known of COMMON_DOMAINS) {
    const dist = levenshtein(d, known);
    if (dist < best.distance) best = { domain: known, distance: dist };
  }
  return best;
}

function fixEmailDomain(domainRaw) {
  let d = (domainRaw || '').trim().toLowerCase();
  if (DOMAIN_FIX_MAP[d]) return { domain: DOMAIN_FIX_MAP[d], corrected: true };
  if (!/\.[a-z]{2,}$/.test(d)) {
    const candidate = d + '.com';
    const best = bestCommonDomain(candidate);
    if (best.distance <= 2) return { domain: best.domain, corrected: true };
    return { domain: candidate, corrected: true };
  }
  const best = bestCommonDomain(d);
  if (best.distance <= 2) return { domain: best.domain, corrected: true };
  return { domain: d, corrected: false };
}

function normalizeEmail(raw) {
  if (!raw) return { email: '', corrected: false };
  let e = String(raw).trim().replace(/\s+/g, '').toLowerCase();
  e = e.replace(/\(at\)/g, '@').replace(/\[at\]/g, '@');
  if (!e.includes('@')) return { email: '', corrected: false };
  const parts = e.split('@');
  if (parts.length !== 2 || !parts[0]) return { email: '', corrected: false };
  const { domain, corrected } = fixEmailDomain(parts[1]);
  return { email: `${parts[0]}@${domain}`, corrected };
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  return '+91-' + last10.slice(0,5) + '-' + last10.slice(5);
}

function parseProducts(productRaw) {
  if (!productRaw) return [];
  const delimiters = [';', ',', '|'];
  let products = [productRaw];
  for (const delim of delimiters) {
    if (productRaw.includes(delim)) {
      products = productRaw.split(delim).map(p => p.trim()).filter(p => p !== '');
      break;
    }
  }
  return products;
}

function determineSegment(city) {
  if (!city) return 'Maharashtra';
  const c = city.toLowerCase();
  if (c.includes('pune') || c.includes('dharashiv')) return 'Pune';
  if (c.includes('ahmedabad') || c.includes('jalgaon')) return 'Ahmedabad';
  if (c.includes('bangalore')) return 'Bangalore';
  return 'Maharashtra';
}

function determineAssignmentByProduct(product) {
  if (!product) return 'Onkar';
  for (const [prod, team] of Object.entries(PRODUCT_ASSIGNMENT)) {
    if (product.toLowerCase().includes(prod.toLowerCase())) {
      return team;
    }
  }
  return 'Rajesh';
}

function cleanReferenceValue(refRaw) {
  if (refRaw == null) return '-';
  const v = String(refRaw).trim();
  if (v === '') return '-';
  const upper = v.toUpperCase();
  if (upper === '#NA' || upper === '#N/A' || upper === 'NA' || upper === 'N/A') {
    return '-';
  }
  return v;
}

function processAndCleanData() {
  const cleaned = [];
  let skipped = 0;

  rawCSVData.forEach(row => {
    const name = row[columnMapping.full_name] || '';
    let phone = row[columnMapping.phone_number] || '';
    const city = row[columnMapping.city] || '';
    const productRaw = row[columnMapping.product] || '';
    const emailRaw = row[columnMapping.email] || '';
    const whoYouAre = row[columnMapping.who_you_are] || '';
    const referenceRaw = columnMapping.reference ? row[columnMapping.reference] || '' : '';

    if (!name || !phone) { skipped++; return; }
    phone = cleanPhoneNumber(phone);
    if (!phone) { skipped++; return; }
    if (registeredPhones.has(phone)) {
      addDebugLog('🚫 Duplicate: ' + phone, 'warning');
      skipped++; return;
    }

    registeredPhones.add(phone);
    const emailInfo = normalizeEmail(emailRaw);
    const products = parseProducts(productRaw);
    const primaryProduct = products.length > 0 ? products[0] : 'General';
    if (emailInfo.corrected) {
      addDebugLog('✉️ Email fixed: ' + emailRaw + ' → ' + emailInfo.email, 'success');
    }

    const cleanedReference = cleanReferenceValue(referenceRaw);

    cleaned.push({
      full_name: name,
      phone_number: phone,
      email: emailInfo.email,
      who_you_are: whoYouAre,
      product: primaryProduct,
      products_list: products,
      city: city,
      category: '',
      reference: cleanedReference,
      segment: determineSegment(city),
      assign_to: determineAssignmentByProduct(primaryProduct),
      status: 'Open Lead',
      campaign_enabled: 'No',
      date_added: new Date().toISOString().split('T')[0]
    });
  });

  addDebugLog('✅ Cleaned ' + cleaned.length + ' leads (Default: Open Lead)', 'success');
  if (skipped > 0) addDebugLog('⚠️ Skipped ' + skipped, 'warning');
  addLeadsToDatabase(cleaned);
  renderTable(allLeads);
  updateMetrics();
  updateAssignedPeopleSection();
  currentFilteredLeads = [...allLeads];
  showMessage('✅ Imported ' + cleaned.length + ' leads (Status: Open Lead)', 'success');
  clearImport();
}

/* ========= Local DB ========= */
function addLeadsToDatabase(leads) {
  leads.forEach((l, idx) => {
    const leadId = 'LEAD-' + String(allLeads.length + idx + 1).padStart(4, '0');
    allLeads.push({ lead_id: leadId, ...l });
  });
  saveData();
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    allLeads = stored ? JSON.parse(stored) : [];
    registeredPhones = new Set();
    allLeads.forEach(l => registeredPhones.add(l.phone_number));
    addDebugLog('📂 Loaded ' + allLeads.length + ' leads', 'success');
  } catch (e) {
    allLeads = [];
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLeads));
  } catch (e) {
    addDebugLog('Save error', 'error');
  }
}

/* ========= Firestore: Sync / Pull / Live / Update / Delete ========= */
// ☁️ Push local → Firestore (upsert all)
async function syncToFirestore() {
  if (!fbInitialized || !db) {
    showMessage('Connect Firebase first', 'error');
    return;
  }
  if (allLeads.length === 0) {
    showMessage('No leads to sync', 'error');
    return;
  }
  try {
    addDebugLog('⏳ Syncing to Firestore...', 'info');
    const batch = db.batch();
    const leadsRef = db.collection('leads');
    allLeads.forEach(lead => {
      const docRef = leadsRef.doc(lead.lead_id);
      batch.set(docRef, {
        ...lead,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        sync_time: new Date().toISOString()
      }, { merge: true });
    });
    await batch.commit();
    addDebugLog('✅ Synced ' + allLeads.length + ' leads', 'success');
    showMessage('✅ Synced to Firestore!', 'success');
  } catch (err) {
    addDebugLog('❌ ' + err.message, 'error');
    showMessage('Sync error: ' + err.message, 'error');
  }
}

// ⬇ Pull Firestore → Local (replace local list with remote)
async function pullFromFirestore() {
  if (!fbInitialized || !db) {
    showMessage('Connect Firebase first', 'error');
    return;
  }
  try {
    addDebugLog('⏳ Pulling from Firestore...', 'info');
    const snap = await db.collection('leads').get();
    const pulled = [];
    snap.forEach(doc => {
      const d = doc.data();
      pulled.push({
        lead_id: d.lead_id || doc.id,
        full_name: d.full_name || '',
        phone_number: d.phone_number || '',
        email: d.email || '',
        who_you_are: d.who_you_are || '',
        product: d.product || '',
        products_list: d.products_list || (d.product ? [d.product] : []),
        city: d.city || '',
        category: d.category || '',
        reference: d.reference || '-',
        segment: d.segment || 'Maharashtra',
        assign_to: d.assign_to || 'Onkar',
        status: d.status || 'Open Lead',
        campaign_enabled: d.campaign_enabled || 'No',
        date_added: d.date_added || new Date().toISOString().split('T')[0]
      });
    });
    // Replace local DB
    allLeads = pulled.sort((a, b) => (a.lead_id || '').localeCompare(b.lead_id || ''));
    registeredPhones = new Set(allLeads.map(x => x.phone_number));
    saveData();
    renderTable(allLeads);
    updateMetrics();
    updateAssignedPeopleSection();
    currentFilteredLeads = [...allLeads];
    addDebugLog('✅ Pulled ' + allLeads.length + ' leads from Firestore', 'success');
    showMessage('✅ Pulled from Firestore', 'success');
  } catch (err) {
    addDebugLog('❌ ' + err.message, 'error');
    showMessage('Pull error: ' + err.message, 'error');
  }
}

// 🔔 Start/Stop realtime updates
function toggleLiveSync() {
  const btn = document.getElementById('liveBtn');
  if (!fbInitialized || !db) {
    showMessage('Connect Firebase first', 'error');
    return;
  }
  if (liveUnsubscribe) {
    // stop
    liveUnsubscribe();
    liveUnsubscribe = null;
    btn.textContent = '🔔 Live: Off';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
    addDebugLog('🔕 Live sync stopped', 'info');
    return;
  }
  // start
  const leadsRef = db.collection('leads');
  liveUnsubscribe = leadsRef.onSnapshot(snapshot => {
    const remote = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      remote.push({
        lead_id: d.lead_id || doc.id,
        full_name: d.full_name || '',
        phone_number: d.phone_number || '',
        email: d.email || '',
        who_you_are: d.who_you_are || '',
        product: d.product || '',
        products_list: d.products_list || (d.product ? [d.product] : []),
        city: d.city || '',
        category: d.category || '',
        reference: d.reference || '-',
        segment: d.segment || 'Maharashtra',
        assign_to: d.assign_to || 'Onkar',
        status: d.status || 'Open Lead',
        campaign_enabled: d.campaign_enabled || 'No',
        date_added: d.date_added || new Date().toISOString().split('T')[0]
      });
    });
    allLeads = remote.sort((a, b) => (a.lead_id || '').localeCompare(b.lead_id || ''));
    registeredPhones = new Set(allLeads.map(x => x.phone_number));
    saveData();
    applyFilters(); // reapply current filters
    updateMetrics();
    updateAssignedPeopleSection();
    addDebugLog('🔔 Live update applied (' + allLeads.length + ')', 'success');
  }, err => {
    addDebugLog('❌ Live error: ' + err.message, 'error');
    showMessage('Live error: ' + err.message, 'error');
  });
  btn.textContent = '🔔 Live: On';
  btn.classList.remove('btn-secondary');
  btn.classList.add('btn-primary');
  addDebugLog('🔔 Live sync started', 'info');
}

// 🔧 Update a field → Local + Firestore (if connected)
function updateField(leadId, field, val) {
  const l = allLeads.find(x => x.lead_id === leadId);
  if (l) {
    l[field] = val;
    saveData();
    applyFilters();
    updateMetrics();
    updateAssignedPeopleSection();
    addDebugLog('Updated ' + leadId + ' → ' + field, 'success');
    // Push to Firestore (single doc)
    if (fbInitialized && db) {
      db.collection('leads').doc(leadId).set(
        { ...l, sync_time: new Date().toISOString() },
        { merge: true }
      ).then(() => {
        addDebugLog('☁️ Firestore updated: ' + leadId, 'success');
      }).catch(err => {
        addDebugLog('❌ Firestore update error: ' + err.message, 'error');
      });
    }
  }
}

// 🗑️ Delete → Local + Firestore
function deleteLead(leadId) {
  if (!confirm('Delete?')) return;
  allLeads = allLeads.filter(x => x.lead_id !== leadId);
  saveData();
  applyFilters();
  updateMetrics();
  updateAssignedPeopleSection();
  addDebugLog('🗑️ Deleted ' + leadId, 'success');

  if (fbInitialized && db) {
    db.collection('leads').doc(leadId).delete()
      .then(() => addDebugLog('🗑️ Firestore doc deleted: ' + leadId, 'success'))
      .catch(err => addDebugLog('❌ Firestore delete error: ' + err.message, 'error'));
  }
}

/* ========= UI Rendering & Filters ========= */
function renderTable(leads) {
  const tb = document.getElementById('tableBody');
  if (!leads.length) {
    tb.innerHTML = '<tr><td colspan="14"><div class="empty-state">📁 No leads</div></td></tr>';
    return;
  }
  tb.innerHTML = leads.map(l => `
    <tr>
      <td><strong>${l.lead_id}</strong></td>
      <td>${l.full_name}</td>
      <td><span style="font-family:monospace;font-size:10px;">${l.phone_number}</span></td>
      <td>${l.email || '-'}</td>
      <td><span class="badge">${l.who_you_are || '-'}</span></td>
      <td>${l.products_list ? l.products_list.join(' | ') : '-'}</td>
      <td>${l.city || ''}</td>
      <td><span class="badge">${l.segment}</span></td>
      <td>
        <select onchange="updateField('${l.lead_id}','assign_to',this.value)" style="font-size:10px;">
          <option value="Onkar" ${l.assign_to === 'Onkar' ? 'selected':''}>Onkar</option>
          <option value="Goraksha" ${l.assign_to === 'Goraksha' ? 'selected':''}>Goraksha</option>
          <option value="Sachin" ${l.assign_to === 'Sachin' ? 'selected':''}>Sachin</option>
          <option value="Rajesh" ${l.assign_to === 'Rajesh' ? 'selected':''}>Rajesh</option>
        </select>
      </td>
      <td>
        <select onchange="updateField('${l.lead_id}','category',this.value)" style="font-size:10px;">
          <option value="">-- Select Category --</option>
          <option value="Request Call Back" ${l.category === 'Request Call Back' ? 'selected':''}>📞 Request Call Back</option>
          <option value="Meet Senior Person" ${l.category === 'Meet Senior Person' ? 'selected':''}>👥 Meet Senior Person</option>
          <option value="Interested in Quote" ${l.category === 'Interested in Quote' ? 'selected':''}>💰 Interested in Quote</option>
          <option value="Send Product Details" ${l.category === 'Send Product Details' ? 'selected':''}>📄 Send Product Details</option>
          <option value="Requesting Demo" ${l.category === 'Requesting Demo' ? 'selected':''}>🎬 Requesting Demo</option>
        </select>
      </td>
      <td style="max-width:150px;">${l.reference || '-'}</td>
      <td>
        <select onchange="updateField('${l.lead_id}','status',this.value)" style="font-size:10px;">
          <option value="Open Lead" ${l.status === 'Open Lead' ? 'selected':''}>📂 Open Lead</option>
          <option value="Follow-up" ${l.status === 'Follow-up' ? 'selected':''}>📞 Follow-up</option>
          <option value="Assigned" ${l.status === 'Assigned' ? 'selected':''}>📌 Assigned</option>
          <option value="Qualified" ${l.status === 'Qualified' ? 'selected':''}>✅ Qualified</option>
          <option value="Converted" ${l.status === 'Converted' ? 'selected':''}>🎉 Converted</option>
        </select>
      </td>
      <td>
        <select onchange="updateField('${l.lead_id}','campaign_enabled',this.value)" style="font-size:10px;">
          <option value="No" ${l.campaign_enabled === 'No' ? 'selected':''}>No</option>
          <option value="Yes" ${l.campaign_enabled === 'Yes' ? 'selected':''}>Yes</option>
        </select>
      </td>
      <td>
        <button class="btn-danger" onclick="deleteLead('${l.lead_id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function applyFilters() {
  const name = document.getElementById('searchName').value.toLowerCase();
  const seg = document.getElementById('filterSegment').value;
  const assignTo = document.getElementById('filterAssignTo').value;
  const st = document.getElementById('filterStatus').value;

  const filtered = allLeads.filter(l =>
    (name === '' || l.full_name.toLowerCase().includes(name)) &&
    (seg === '' || l.segment === seg) &&
    (assignTo === '' || l.assign_to === assignTo) &&
    (st === '' || l.status === st)
  );
  currentFilteredLeads = filtered;
  renderTable(filtered);
}

function clearFilters() {
  document.getElementById('searchName').value = '';
  document.getElementById('filterSegment').value = '';
  document.getElementById('filterAssignTo').value = '';
  document.getElementById('filterStatus').value = '';
  currentFilteredLeads = [...allLeads];
  renderTable(allLeads);
}

function updateMetrics() {
  document.getElementById('kpiTotal').textContent = allLeads.length;
  document.getElementById('kpiAssigned').textContent = allLeads.length; // (all stored)
  document.getElementById('kpiQualified').textContent =
    allLeads.filter(l => l.status === 'Qualified' || l.status === 'Converted').length;
  document.getElementById('kpiCampaign').textContent =
    allLeads.filter(l => l.campaign_enabled === 'Yes').length;
  document.getElementById('sidebarTotalLeads').textContent = allLeads.length;
}

/* ========= Assigned People Summary ========= */
function updateAssignedPeopleSection() {
  const cont = document.getElementById('assignedPeopleContainer');
  const stats = {};
  TEAM_MEMBERS.forEach(n => stats[n] = { count: 0, qualified: 0 });
  allLeads.forEach(l => {
    if (l.assign_to && stats[l.assign_to]) {
      stats[l.assign_to].count++;
      if (l.status === 'Qualified' || l.status === 'Converted') stats[l.assign_to].qualified++;
    }
  });
  let html = '';
  TEAM_MEMBERS.forEach(n => {
    if (stats[n].count > 0) {
      html += `
        <div class="assigned-person">
          <div class="assigned-person-name">👤 ${n}</div>
          <div class="assigned-stats">
            <div class="stat-item"><span>Leads:</span><span>${stats[n].count}</span></div>
            <div class="stat-item"><span>Qual:</span><span>${stats[n].qualified}</span></div>
          </div>
        </div>`;
    }
  });
  cont.innerHTML = html || '<div style="font-size:11px;color:var(--text-soft);text-align:center;">No assignments</div>';
}

/* ========= Startup ========= */
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('cdlm_current_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showDashboard();
  }
});
