// ============================================================================
// Wesh Grow — Contrôle préparation restaurants
// App statique : aucune dépendance de build, aucun backend.
// L'accès aux données est appliqué par le partage du Google Sheet lui-même,
// pas par ce code : un compte non autorisé sur le Sheet ne pourra rien lire.
// ============================================================================

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
let accessToken = null;
let tokenClient = null;
let currentUser = null;

const els = {
  gate: document.getElementById("gate"),
  app: document.getElementById("app"),
  signinBtn: document.getElementById("signin-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  syncBtn: document.getElementById("sync-btn"),
  userbox: document.getElementById("userbox"),
  status: document.getElementById("status"),
  progress: document.getElementById("progress"),
  tickets: document.getElementById("tickets"),
  empty: document.getElementById("empty"),
  unclassified: document.getElementById("unclassified"),
  unclassifiedList: document.getElementById("unclassified-list"),
  todayLabel: document.getElementById("today-label"),
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function todayDDMMYYYY() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function normalize(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève les accents
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const EXCLUDED_NORMALIZED = new Set(CONFIG.EXCLUDED_CLIENTS.map(normalize));

function isExcluded(client) {
  return EXCLUDED_NORMALIZED.has(normalize(client));
}

// Signale un client non exclu mais dont le nom recoupe partiellement une
// entrée de la liste d'exclusion (sécurité contre les faux positifs/négatifs
// dus à des variantes orthographiques non anticipées).
function isSuspicious(client) {
  const n = normalize(client);
  if (EXCLUDED_NORMALIZED.has(n)) return false;
  for (const ex of EXCLUDED_NORMALIZED) {
    if (ex.length < 5) continue; // évite les faux positifs sur des sigles courts
    if (n.includes(ex) || ex.includes(n)) return true;
  }
  return false;
}

function showStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.className = isError ? "err" : "";
}

// ---------------------------------------------------------------------------
// Authentification (Google Identity Services)
// ---------------------------------------------------------------------------

window.addEventListener("load", () => {
  els.todayLabel.textContent = todayDDMMYYYY();

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: SCOPE,
    callback: async (resp) => {
      if (resp.error) {
        showStatus("Connexion refusée : " + resp.error, true);
        return;
      }
      accessToken = resp.access_token;
      await onSignedIn();
    },
  });

  els.signinBtn.addEventListener("click", () => {
    tokenClient.requestAccessToken({ prompt: "consent" });
  });

  els.refreshBtn.addEventListener("click", loadOrders);
  els.syncBtn.addEventListener("click", forceSync);
});

async function onSignedIn() {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Impossible de récupérer le profil Google.");
    currentUser = await res.json();

    if (CONFIG.ALLOWED_HOSTED_DOMAIN) {
      const domain = (currentUser.email || "").split("@")[1];
      if (domain !== CONFIG.ALLOWED_HOSTED_DOMAIN) {
        showStatus(
          `Ce compte (${currentUser.email}) n'appartient pas au domaine autorisé (${CONFIG.ALLOWED_HOSTED_DOMAIN}).`,
          true
        );
        accessToken = null;
        return;
      }
    }

    els.gate.style.display = "none";
    els.app.style.display = "block";
    renderUserbox();
    await loadOrders();
  } catch (e) {
    showStatus(e.message, true);
  }
}

function renderUserbox() {
  els.userbox.innerHTML = "";
  const img = document.createElement("img");
  img.src = currentUser.picture || "";
  const email = document.createElement("span");
  email.className = "email";
  email.textContent = currentUser.email || "";
  const signout = document.createElement("button");
  signout.className = "ghost";
  signout.textContent = "Déconnexion";
  signout.onclick = () => {
    google.accounts.oauth2.revoke(accessToken, () => location.reload());
  };
  els.userbox.append(img, email, signout);
}

// ---------------------------------------------------------------------------
// Appels Google Sheets API
// ---------------------------------------------------------------------------

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

async function sheetsFetch(path, options = {}) {
  const res = await fetch(`${SHEETS_BASE}/${CONFIG.SPREADSHEET_ID}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erreur Google Sheets (${res.status}) : ${body}`);
  }
  return res.json();
}

async function ensureChecksTabExists() {
  const meta = await sheetsFetch("");
  const exists = meta.sheets.some(
    (s) => s.properties.title === CONFIG.CHECKS_SHEET_TAB
  );
  if (exists) return;

  await sheetsFetch(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        { addSheet: { properties: { title: CONFIG.CHECKS_SHEET_TAB } } },
      ],
    }),
  });

  await sheetsFetch(
    `/values/${encodeURIComponent(CONFIG.CHECKS_SHEET_TAB)}!A1:E1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({
        values: [["Client", "Date", "Statut", "Coché par", "Horodatage"]],
      }),
    }
  );
}

async function fetchOrders() {
  const data = await sheetsFetch(
    `/values/${encodeURIComponent(CONFIG.ORDERS_SHEET_TAB)}`
  );
  const [header, ...rows] = data.values || [];
  if (!header) return [];
  const idx = {
    ref: header.indexOf("Référence produit"),
    date: header.indexOf("Date de livraison"),
    qty: header.indexOf("Unités livrées"),
    client: header.indexOf("Client"),
  };
  return rows
    .filter((r) => r.length)
    .map((r) => ({
      ref: r[idx.ref] || "",
      date: r[idx.date] || "",
      qty: r[idx.qty] || "",
      client: r[idx.client] || "",
    }));
}

async function fetchChecks() {
  const data = await sheetsFetch(
    `/values/${encodeURIComponent(CONFIG.CHECKS_SHEET_TAB)}`
  );
  const [, ...rows] = data.values || [];
  // Dernier statut par clé "client|date" (les lignes sont un journal, on garde le plus récent)
  const map = new Map();
  for (const r of rows) {
    const [client, date, statut, by, at] = r;
    if (!client || !date) continue;
    map.set(`${normalize(client)}|${date}`, { statut, by, at });
  }
  return map;
}

async function appendCheck(client, date, statut) {
  await sheetsFetch(
    `/values/${encodeURIComponent(CONFIG.CHECKS_SHEET_TAB)}!A:E:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      body: JSON.stringify({
        values: [[client, date, statut, currentUser.email, new Date().toISOString()]],
      }),
    }
  );
}

// ---------------------------------------------------------------------------
// Chargement + rendu
// ---------------------------------------------------------------------------

async function forceSync() {
  els.syncBtn.disabled = true;
  const original = els.syncBtn.innerHTML;
  els.syncBtn.innerHTML = `<span class="spinner"></span> Synchro en cours…`;
  showStatus("Synchronisation des ventes depuis la source…");

  const url = `${CONFIG.SYNC_WEBAPP_URL}?secret=${encodeURIComponent(CONFIG.SYNC_SECRET)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Échec de la synchronisation.");
    showStatus("Synchro terminée, actualisation des commandes…");
  } catch (e) {
    // Les Web Apps Apps Script ne renvoient pas toujours les en-têtes CORS
    // attendus par le navigateur : le navigateur peut bloquer la lecture de
    // la réponse même si la synchro s'est bien exécutée côté Google.
    // On ne bloque donc pas l'utilisateur : on attend quelques secondes et
    // on recharge quand même, avec un message d'avertissement.
    showStatus(
      "Synchro déclenchée, mais impossible de confirmer le résultat depuis le navigateur (limitation technique connue). Actualisation dans quelques secondes…",
      true
    );
    await new Promise((r) => setTimeout(r, 4000));
  } finally {
    els.syncBtn.disabled = false;
    els.syncBtn.innerHTML = original;
  }

  await loadOrders();
}

async function loadOrders() {
  showStatus("Chargement des commandes…");
  els.refreshBtn.disabled = true;
  try {
    await ensureChecksTabExists();
    const [orders, checks] = await Promise.all([fetchOrders(), fetchChecks()]);

    const today = todayDDMMYYYY();
    const todays = orders.filter((o) => o.date === today);

    const suspiciousClients = new Set();
    const byClient = new Map();
    for (const o of todays) {
      if (isExcluded(o.client)) continue;
      if (isSuspicious(o.client)) suspiciousClients.add(o.client);
      if (!byClient.has(o.client)) byClient.set(o.client, []);
      byClient.get(o.client).push(o);
    }

    renderTickets(byClient, checks, today);
    renderUnclassified(suspiciousClients);
    showStatus(`Mis à jour à ${new Date().toLocaleTimeString("fr-FR")}`);
  } catch (e) {
    showStatus(e.message, true);
  } finally {
    els.refreshBtn.disabled = false;
  }
}

function renderTickets(byClient, checks, today) {
  els.tickets.innerHTML = "";
  const clients = [...byClient.keys()].sort((a, b) => a.localeCompare(b, "fr"));

  els.empty.style.display = clients.length ? "none" : "block";

  let doneCount = 0;

  for (const client of clients) {
    const lines = byClient.get(client);
    const key = `${normalize(client)}|${today}`;
    const state = checks.get(key);
    const isDone = state && state.statut === "OK";
    if (isDone) doneCount++;

    const ticket = document.createElement("div");
    ticket.className = "ticket" + (isDone ? " done" : "");

    const totalQty = lines.reduce((sum, l) => sum + (parseFloat(l.qty.replace(",", ".")) || 0), 0);
    const estimatedColis = Math.ceil(totalQty / 8);

    const head = document.createElement("div");
    head.className = "ticket-head";
    head.innerHTML = `<span class="client">${escapeHtml(client)}</span>`;

    const body = document.createElement("div");
    body.className = "ticket-stats";
    body.innerHTML = `
      <div class="stat"><span class="value">${totalQty}</span><span class="label">produit${totalQty > 1 ? "s" : ""}</span></div>
      <div class="stat"><span class="value">${estimatedColis}</span><span class="label">colis estimé${estimatedColis > 1 ? "s" : ""}</span></div>
    `;

    const foot = document.createElement("div");
    foot.className = "ticket-foot";
    const btn = document.createElement("button");
    btn.className = "check-btn" + (isDone ? " checked" : "");
    btn.innerHTML = isDone
      ? `✓ Prêt <span class="meta">${escapeHtml(state.by || "")}</span>`
      : "Marquer comme prêt";
    btn.onclick = () => toggleCheck(client, today, isDone, btn, ticket);
    foot.appendChild(btn);

    ticket.append(head, body, foot);
    els.tickets.appendChild(ticket);
  }

  els.progress.innerHTML = `<b>${doneCount}</b> / ${clients.length} clients prêts`;
}

function renderUnclassified(set) {
  if (!set.size) {
    els.unclassified.style.display = "none";
    return;
  }
  els.unclassified.style.display = "block";
  els.unclassifiedList.innerHTML = "";
  for (const c of set) {
    const li = document.createElement("li");
    li.textContent = c + " — nom proche d'une entrée de la liste des grossistes, vérifiez le classement dans config.js";
    els.unclassifiedList.appendChild(li);
  }
}

async function toggleCheck(client, date, isCurrentlyDone, btn, ticketEl) {
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span>`;
  try {
    await appendCheck(client, date, isCurrentlyDone ? "ANNULE" : "OK");
    await loadOrders(); // recharge pour rester cohérent avec le journal du Sheet
  } catch (e) {
    showStatus(e.message, true);
    btn.innerHTML = original;
  } finally {
    btn.disabled = false;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}
