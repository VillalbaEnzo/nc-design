/* =========================================================================
   Maquette front-end sans backend — toutes les données sont statiques
   (voir data.js). Aucune action ne persiste réellement : les boutons
   simulent le comportement attendu de l'application cible.
   ========================================================================= */

const TODAY_ISO = "2026-09-03";

const state = {
  page: "mail",
  mail: { folder: "inbox", selected: "m1" },
  validation: { selected: "m2", overrides: {} }, // overrides[mailId] = badge forcé par l'utilisateur
  suivi: { tab: "en_cours", modalNc: null },
};

const $app = document.getElementById("app");

// ---------------------------------------------------------------------------
// Helpers de formatage / composants
// ---------------------------------------------------------------------------

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function chipBadge(badgeKey) {
  const b = BADGE_INFO[badgeKey];
  if (!b) return "";
  return `<span class="chip" style="background:${b.bg};color:${b.color}">${b.label}</span>`;
}

function chipMissingVerif() {
  return `<span class="chip warn">⚠ Vérification humaine manquante</span>`;
}

function confidenceMeter(value) {
  const color = value >= 85 ? "#2e7d32" : value >= 65 ? "#ef6c00" : "#c62828";
  return `<span class="confidence">
      <span class="confidence-bar"><span style="width:${value}%;background:${color}"></span></span>
      Indice IA : ${value}%
    </span>`;
}

function statusDot(statusKey) {
  const s = STATUT_COULEUR[statusKey];
  return `<span class="status-dot" style="background:${s.color}" title="${s.label}"></span>`;
}

function getMail(id) { return MAILS.find((m) => m.id === id); }

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function avatar(name, size) {
  return `<span class="avatar ${size === "lg" ? "lg" : ""}">${initials(name)}</span>`;
}

function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.style.cssText =
      "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#242424;color:#fff;" +
      "padding:10px 18px;border-radius:6px;font-size:13px;z-index:999;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:0;transition:opacity .15s;";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.opacity = "0"), 2200);
}

// ---------------------------------------------------------------------------
// Layout racine
// ---------------------------------------------------------------------------

function render() {
  $app.innerHTML = `
    <div class="topbar">
      <div class="brand"><span class="dot"></span> Transalp Qualité — IA</div>
      <nav>
        ${navBtn("mail", "Mail")}
        ${navBtn("validation", "Validation")}
        ${navBtn("suivi", "Suivi")}
      </nav>
      <span class="env-tag">Maquette — données d'exemple</span>
    </div>
    <div class="page" id="page-root"></div>
  `;
  const root = document.getElementById("page-root");
  if (state.page === "mail") root.innerHTML = renderMailPage();
  if (state.page === "validation") root.innerHTML = renderValidationPage();
  if (state.page === "suivi") root.innerHTML = renderSuiviPage();

  const existingOverlay = document.getElementById("modal-overlay");
  if (existingOverlay) existingOverlay.remove();
  if (state.suivi.modalNc) renderModal(state.suivi.modalNc);

  attachHandlers();
}

function navBtn(key, label) {
  return `<button data-nav="${key}" class="${state.page === key ? "active" : ""}">${label}</button>`;
}

// ---------------------------------------------------------------------------
// PAGE MAIL — vue façon Outlook (lecture seule, pas de suppression possible)
// ---------------------------------------------------------------------------

const FOLDERS = [
  { key: "inbox", label: "Boîte de réception qualité", ico: "📥" },
  { key: "en_cours", label: "En cours", ico: "🔴" },
  { key: "nouveau", label: "Nouveaux", ico: "🔵" },
  { key: "cloture", label: "Clôturés", ico: "🟢" },
  { key: "hors_sujet", label: "Hors sujet / Transférés", ico: "⚪" },
];

function mailsForFolder(folder) {
  if (folder === "inbox") return MAILS;
  return MAILS.filter((m) => m.status === folder);
}

function renderMailPage() {
  const list = mailsForFolder(state.mail.folder).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const selected = getMail(state.mail.selected);

  return `
    <div class="mail-page">
      <div class="pane mail-folders">
        <div class="pane-header">Dossiers</div>
        ${FOLDERS.map((f) => `
          <div class="folder ${state.mail.folder === f.key ? "active" : ""}" data-mail-folder="${f.key}">
            <span class="ico">${f.ico}</span>
            <span class="label">${f.label}</span>
            <span class="count">${mailsForFolder(f.key).length}</span>
          </div>
        `).join("")}
        <div class="folder-note">
          Vue de consultation uniquement : le tri et le classement sont réalisés par l'IA.
          Les mails sont conservés 1 mois puis supprimés automatiquement de la boîte.
        </div>
      </div>

      <div class="pane mail-list">
        <div class="pane-header">${list.length} message${list.length > 1 ? "s" : ""}</div>
        ${list.map((m) => renderMailListItem(m)).join("")}
      </div>

      <div class="mail-reading">
        ${selected ? renderMailReading(selected) : `<div class="empty"><span class="big-ico">📬</span>Sélectionnez un mail à consulter</div>`}
      </div>
    </div>
  `;
}

function renderMailListItem(m) {
  const s = STATUT_COULEUR[m.status];
  const selected = state.mail.selected === m.id;
  return `
    <div class="mail-item ${selected ? "selected" : ""}" data-mail-select="${m.id}">
      <div class="bar" style="background:${s.color}"></div>
      ${avatar(m.fromName)}
      <div class="body">
        <div class="row1">
          <span class="from">${m.fromName}</span>
          <span class="date">${formatDateShort(m.date)}</span>
        </div>
        <div class="subject">${m.subject}</div>
        <div class="preview">${m.preview}</div>
        <div class="chips">
          ${chipBadge(m.badge)}
          ${!m.humanVerified ? chipMissingVerif() : ""}
        </div>
      </div>
    </div>
  `;
}

function renderMailReading(m) {
  const s = STATUT_COULEUR[m.status];
  return `
    <div class="reading-header">
      ${avatar(m.fromName, "lg")}
      <div>
      <h2>${m.subject}</h2>
      <div class="reading-meta">
        <div><b>${m.fromName}</b> &lt;${m.from}&gt;</div>
        <div>à ${m.to}</div>
        <div>${formatDate(m.date)}</div>
      </div>
      <div class="reading-chips">
        ${statusDot(m.status)} <span class="small-muted">${s.label}</span>
        ${chipBadge(m.badge)}
        ${confidenceMeter(m.aiConfidence)}
        ${!m.humanVerified ? chipMissingVerif() : ""}
        ${m.ncId ? `<span class="chip" style="background:#eee;color:#333">Rattaché à ${m.ncId}</span>` : ""}
      </div>
      </div>
    </div>
    <div class="reading-body">${m.body}</div>
    ${m.attachments.length ? `
      <div class="reading-attachments">
        ${m.attachments.map((a) => `<div class="attachment-chip"><span class="ico">📎</span>${a.name} <span class="small-muted">(${a.size})</span></div>`).join("")}
      </div>` : ""}
    <div class="retention-note">
      🕒 Conservation : ce mail restera visible dans l'application pendant 1 mois à compter de sa réception, puis sera supprimé de la boîte mail source. Cette page est une vue de consultation — aucune suppression manuelle n'est possible ici.
    </div>
  `;
}

// ---------------------------------------------------------------------------
// PAGE VALIDATION
// ---------------------------------------------------------------------------

// File d'attente de validation : mails nécessitant une décision/relecture humaine
const VALIDATION_QUEUE_IDS = ["m2", "m1", "m6", "m4", "m5", "m9"];

function effectiveBadge(mailId) {
  return state.validation.overrides[mailId] || getMail(mailId).badge;
}

function renderValidationPage() {
  const items = VALIDATION_QUEUE_IDS.map(getMail);
  const selectedId = state.validation.selected;
  const selected = getMail(selectedId);

  return `
    <div class="validation-page">
      <div class="pane validation-list">
        <div class="pane-header">À valider (${items.length})</div>
        ${items.map((m) => renderValidationListItem(m)).join("")}
      </div>
      <div class="validation-detail">
        ${selected ? renderValidationDetail(selected) : `<div class="empty"><span class="big-ico">✅</span>Sélectionnez un mail à valider</div>`}
      </div>
    </div>
  `;
}

function renderValidationListItem(m) {
  const badge = effectiveBadge(m.id);
  const selected = state.validation.selected === m.id;
  return `
    <div class="validation-item ${selected ? "selected" : ""}" data-validation-select="${m.id}">
      <div class="subject">${m.subject}</div>
      <div class="from">${m.fromName} · ${formatDateShort(m.date)}</div>
      <div class="row">
        ${chipBadge(badge)}
        ${confidenceMeter(m.aiConfidence)}
      </div>
    </div>
  `;
}

function renderValidationDetail(m) {
  const badge = effectiveBadge(m.id);
  if (badge === "rattachement") return renderDetailRattachement(m);
  if (badge === "nouvelle_nc") return renderDetailNouvelleNC(m);
  if (badge === "non_recevable") return renderDetailNonRecevable(m);
  if (badge === "hors_sujet") return renderDetailHorsSujet(m);
  return "";
}

function otherTypeOptions(current) {
  return Object.keys(BADGE_INFO).filter((k) => k !== current);
}

function overrideControls(mailId, current) {
  return `
    <select class="btn" data-override-select="${mailId}" style="cursor:pointer">
      <option value="">Reclasser en…</option>
      ${otherTypeOptions(current).map((k) => `<option value="${k}">${BADGE_INFO[k].label}</option>`).join("")}
    </select>
  `;
}

function detailHeader(m, badge) {
  return `
    <div class="detail-top">
      <div>
        <h2>${m.subject}</h2>
        <div class="reading-chips">
          ${chipBadge(badge)}
          ${confidenceMeter(m.aiConfidence)}
          ${!m.humanVerified ? chipMissingVerif() : ""}
        </div>
      </div>
    </div>
  `;
}

function mailMiniView(m) {
  return `
    <div class="mail-mini">
      <div class="from">${m.fromName} <span class="small-muted">&lt;${m.from}&gt;</span></div>
      <div class="subject">${m.subject} — ${formatDate(m.date)}</div>
      <pre>${m.body}</pre>
      ${m.attachments.length ? `<div class="reading-attachments" style="padding:8px 0 0">${m.attachments.map((a) => `<span class="attachment-chip">📎 ${a.name}</span>`).join("")}</div>` : ""}
    </div>
  `;
}

// Historique cumulé d'un champ "journal" (Description de l'anomalie,
// Action curative immédiate...) : chaque version peut ajouter une nouvelle
// entrée datée, les entrées précédentes ne sont jamais écrasées.
function journalHistory(nc, field) {
  return nc.versions
    .filter((v) => v.journal[field])
    .map((v) => ({ date: v.date, mailId: v.mailId, version: v.version, text: v.journal[field] }));
}

function journalBlock(label, entries, latestVersion) {
  if (!entries.length) return "";
  return `
    <div class="field">
      <label>${label}</label>
      <div class="journal">
        ${entries.map((e) => `
          <div class="journal-entry ${e.version === latestVersion ? "is-new" : ""}">
            <div class="journal-entry-head">
              <span class="journal-date">${formatDateShort(e.date)}${e.mailId ? " · via mail" : " · ouverture"}</span>
              ${e.version === latestVersion ? `<span class="chip" style="background:#e3f4f2;color:#00695c">Nouveau — proposé par l'IA</span>` : ""}
            </div>
            ${e.version === latestVersion
              ? `<textarea rows="3">${e.text}</textarea>`
              : `<div class="journal-text">${e.text}</div>`}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// --- Cas 1 : Rattachement à une NC existante --------------------------------

function renderDetailRattachement(m) {
  const validNcId = m.ncId && NCS[m.ncId] ? m.ncId : null;
  if (!validNcId) {
    return `
      ${detailHeader(m, "rattachement")}
      ${mailMiniView(m)}
      <div class="note-box">Ce mail a été reclassé en rattachement. Sélectionnez la non-conformité existante concernée.</div>
      <div class="field" style="max-width:360px">
        <label>Non-conformité à rattacher</label>
        <select>
          ${Object.values(NCS).map((nc) => `<option value="${nc.id}">${nc.id} — ${nc.referenceProduit} (${nc.client})</option>`).join("")}
        </select>
      </div>
      <div class="btn-row">
        <button class="btn primary" data-action="validate" data-mail="${m.id}">✓ Rattacher et valider</button>
        ${overrideControls(m.id, "rattachement")}
      </div>
    `;
  }
  const nc = NCS[validNcId];
  const last = nc.versions[nc.versions.length - 1];
  const prev = nc.versions.length > 1 ? nc.versions[nc.versions.length - 2] : null;
  const champs = last.champs;

  const champDiff = (key) => (prev && prev.champs[key] !== champs[key]
    ? `<div class="diff-hint">Modifié depuis v${prev.version} : « ${prev.champs[key]} »</div>` : "");

  return `
    ${detailHeader(m, "rattachement")}

    <div class="note-box">
      L'IA propose de rattacher ce mail à la non-conformité <b>${nc.id}</b> — <i>${nc.referenceProduit}, ${nc.client}</i>, et a généré une nouvelle version (v${last.version}) de la fiche à partir de ce mail. Vous pouvez modifier chaque champ avant validation.
    </div>

    ${mailMiniView(m)}

    <div class="link-inline" data-open-nc="${nc.id}" style="display:inline-block;margin:4px 0 16px">📁 Ouvrir le dossier complet de ${nc.id} (historique des versions)</div>

    <div class="section-title">Fiche NC — ${nc.id} (identité, stable)</div>
    <div class="card">
      <div class="two-col">
        <div class="col">
          <div class="field"><label>Référence produit</label><input type="text" value="${nc.referenceProduit}" /></div>
          <div class="field"><label>N° Commande</label><input type="text" value="${nc.numeroCommande}" /></div>
          <div class="field"><label>Client</label><input type="text" value="${nc.client}" /></div>
        </div>
        <div class="col">
          <div class="field"><label>Type de NC</label><select>${TYPES_NC.map((t) => `<option ${t === nc.typeNC ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div class="field"><label>Service impacté</label><select>${SERVICES_IMPACTES.map((s) => `<option ${s === nc.serviceImpacte ? "selected" : ""}>${s}</option>`).join("")}</select></div>
          <div class="field"><label>Date de détection</label><input type="text" value="${formatDateShort(nc.dateDetection)}" /></div>
        </div>
      </div>
    </div>

    <div class="section-title">Nouvelle version proposée par l'IA (v${last.version})</div>
    <div class="card">
      <div class="two-col">
        <div class="col">
          <div class="field">
            <label>Cause</label>
            <select>${CAUSES.map((c) => `<option ${c === champs.cause ? "selected" : ""}>${c}</option>`).join("")}</select>
            ${champDiff("cause")}
          </div>
          <div class="field">
            <label>Action</label>
            <select>${ACTIONS.map((a) => `<option ${a === champs.action ? "selected" : ""}>${a}</option>`).join("")}</select>
            ${champDiff("action")}
          </div>
          <div class="field">
            <label>Responsable</label>
            <select>${RESPONSABLES.map((r) => `<option ${r === champs.responsable ? "selected" : ""}>${r}</option>`).join("")}</select>
            ${champDiff("responsable")}
          </div>
          <div class="field">
            <label>Niveau indice</label>
            <select>${NIVEAUX_INDICE.map((n) => `<option ${n === champs.niveauIndice ? "selected" : ""}>${n}</option>`).join("")}</select>
            ${champDiff("niveauIndice")}
          </div>
        </div>
        <div class="col">
          ${journalBlock("Description de l'anomalie (historique)", journalHistory(nc, "descriptionAnomalie"), last.version)}
          ${journalBlock("Action curative immédiate (historique)", journalHistory(nc, "actionCurativeImmediate"), last.version)}
        </div>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn primary" data-action="validate" data-mail="${m.id}">✓ Valider cette version</button>
      <button class="btn" data-action="edit-more" data-mail="${m.id}">Modifier puis valider</button>
      ${overrideControls(m.id, "rattachement")}
    </div>
  `;
}

// --- Cas 2 : Nouvelle NC -----------------------------------------------------

function renderDetailNouvelleNC(m) {
  const similaires = HISTORIQUE_SIMILAIRES[m.id] || [];
  const prefill = PREREMPLISSAGE_NOUVELLE_NC[m.id] || {};

  return `
    ${detailHeader(m, "nouvelle_nc")}

    <div class="two-col">
      <div class="col">
        ${mailMiniView(m)}

        <div class="section-title">Pré-remplissage IA — nouvelle NC (modifiable)</div>
        <div class="card">
          <div class="field"><label>Numéro NC</label><input type="text" value="${prefill.numero || ""}" /></div>
          <div class="field"><label>Référence produit</label><input type="text" value="${prefill.referenceProduit || ""}" /></div>
          <div class="field"><label>N° Commande</label><input type="text" value="${prefill.numeroCommande || ""}" /></div>
          <div class="field"><label>Client</label><input type="text" value="${prefill.client || ""}" /></div>
          <div class="field"><label>Type de NC</label><select>${TYPES_NC.map((t) => `<option ${t === prefill.typeNC ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div class="field"><label>Service impacté</label><select>${SERVICES_IMPACTES.map((s) => `<option ${s === prefill.serviceImpacte ? "selected" : ""}>${s}</option>`).join("")}</select></div>
          <div class="field"><label>Date de détection</label><input type="text" value="${prefill.dateDetection ? formatDateShort(prefill.dateDetection) : ""}" /></div>
          <div class="field"><label>Cause</label><select>${CAUSES.map((c) => `<option ${c === prefill.cause ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label>Action</label><select>${ACTIONS.map((a) => `<option ${a === prefill.action ? "selected" : ""}>${a}</option>`).join("")}</select></div>
          <div class="field"><label>Responsable</label><select>${RESPONSABLES.map((r) => `<option ${r === prefill.responsable ? "selected" : ""}>${r}</option>`).join("")}</select></div>
          <div class="field"><label>Niveau indice</label><select>${NIVEAUX_INDICE.map((n) => `<option ${n === prefill.niveauIndice ? "selected" : ""}>${n}</option>`).join("")}</select></div>
          <div class="field"><label>Description de l'anomalie</label><textarea rows="4">${prefill.descriptionAnomalie || ""}</textarea></div>
        </div>

        <div class="btn-row">
          <button class="btn primary" data-action="validate" data-mail="${m.id}">✓ Créer la nouvelle NC</button>
          ${overrideControls(m.id, "nouvelle_nc")}
        </div>
      </div>

      <div class="col" style="max-width:340px">
        <div class="section-title">Top 10 des NC similaires (historique)</div>
        <div class="card">
          <div class="small-muted" style="margin-bottom:10px">Affichage informatif — n'est jamais utilisé pour pré-remplir automatiquement la fiche.</div>
          <div class="similar-list">
            ${similaires.map((s) => `
              <div class="similar-item">
                <div><span class="id">${s.id}</span><span class="titre">${s.titre}</span></div>
                <span class="similar-score">${s.score}%</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Cas 3 : Non recevable ----------------------------------------------------

function renderDetailNonRecevable(m) {
  return `
    ${detailHeader(m, "non_recevable")}
    ${mailMiniView(m)}
    <div class="section-title">Motif de non-recevabilité (IA)</div>
    <div class="note-box">${m.resolutionNote || "Après analyse, le signalement ne correspond pas à un défaut produit avéré."}</div>
    <div class="btn-row">
      <button class="btn primary" data-action="validate" data-mail="${m.id}">✓ Confirmer non recevable (classer sans suite)</button>
      ${overrideControls(m.id, "non_recevable")}
    </div>
  `;
}

// --- Cas 4 : Hors sujet / Transfert ------------------------------------------

function renderDetailHorsSujet(m) {
  return `
    ${detailHeader(m, "hors_sujet")}
    ${mailMiniView(m)}
    <div class="section-title">Analyse IA</div>
    <div class="note-box">Ce mail ne concerne pas le service qualité.${m.forwardSuggestion ? ` Destinataire suggéré pour transfert : <b>${m.forwardSuggestion}</b>.` : ""}</div>
    <div class="btn-row">
      <button class="btn primary" data-action="forward" data-mail="${m.id}">↪ Transférer au bon correspondant</button>
      <button class="btn" data-action="validate" data-mail="${m.id}">✓ Classer sans transfert</button>
      ${overrideControls(m.id, "hors_sujet")}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// PAGE SUIVI (vue réunion)
// ---------------------------------------------------------------------------

const SUIVI_TABS = [
  { key: "en_cours", label: "En cours" },
  { key: "nouveau", label: "Nouvelle NC" },
  { key: "cloture", label: "Clôturé" },
];

function ncsForStatut(statut) {
  return Object.values(NCS).filter((nc) => nc.statut === statut);
}

function ncHasMailUpdate(nc) { return nc.versions.some((v) => v.mailId); }
function ncLastVerified(nc) { return nc.versions[nc.versions.length - 1].verified; }
function ncGrayed(nc) { return !ncHasMailUpdate(nc) || !ncLastVerified(nc); }

function renderSuiviPage() {
  const ncs = ncsForStatut(state.suivi.tab).slice().sort((a, b) => new Date(b.dateDetection) - new Date(a.dateDetection));
  return `
    <div class="suivi-page">
      <div class="suivi-tabs">
        ${SUIVI_TABS.map((t) => `
          <button class="${state.suivi.tab === t.key ? "active" : ""}" data-suivi-tab="${t.key}">
            ${t.label} <span class="badge-count">${ncsForStatut(t.key).length}</span>
          </button>
        `).join("")}
      </div>
      <div class="suivi-body">
        ${ncs.map((nc) => renderNcCard(nc)).join("") || `<div class="small-muted" style="padding:20px">Aucune NC dans cette catégorie.</div>`}
      </div>
    </div>
  `;
}

function renderNcCard(nc) {
  const grayed = ncGrayed(nc);
  const last = nc.versions[nc.versions.length - 1];
  const s = STATUT_COULEUR[nc.statut === "nouveau" ? "nouveau" : nc.statut === "cloture" ? "cloture" : "en_cours"];
  let reason = "";
  if (grayed) reason = !ncHasMailUpdate(nc) ? "Aucun nouveau mail depuis l'ouverture" : "En attente de vérification humaine";
  return `
    <div class="nc-card ${grayed ? "grayed" : ""}" ${grayed ? "" : `data-open-nc="${nc.id}"`}>
      <div class="id">${nc.id} — v${last.version} · ${nc.typeNC}</div>
      <div class="titre">${nc.referenceProduit}</div>
      <div class="meta">${nc.client} · ${nc.serviceImpacte}</div>
      <div class="foot">
        <span class="status-line">${statusDot(nc.statut === "nouveau" ? "nouveau" : nc.statut === "cloture" ? "cloture" : "en_cours")} ${formatDateShort(last.date)}</span>
        ${grayed ? `<span class="no-update">${reason}</span>` : `<span class="link-inline">Voir le suivi →</span>`}
      </div>
    </div>
  `;
}

function renderModal(ncId) {
  const nc = NCS[ncId];
  if (!nc) return;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "modal-overlay";

  const versions = nc.versions.slice().reverse();
  const mailsForNc = nc.versions.filter((v) => v.mailId).map((v) => getMail(v.mailId));

  const isCloture = nc.statut === "cloture";

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div>
          <h2>${nc.id} — ${nc.referenceProduit}</h2>
          <div class="small-muted">${nc.client} · ${nc.typeNC} · ${nc.serviceImpacte} · commande n°${nc.numeroCommande} · détectée le ${formatDateShort(nc.dateDetection)}${nc.dateCloture ? ` · clôturée le ${formatDateShort(nc.dateCloture)}` : ""}</div>
        </div>
        <div class="modal-head-actions">
          ${isCloture
            ? `<span class="chip" style="background:${STATUT_COULEUR.cloture.bg};color:${STATUT_COULEUR.cloture.color}">✓ NC clôturée</span>`
            : `<button class="btn primary" data-close-nc="${nc.id}">✓ Clôturer cette NC</button>`}
          <button class="modal-close" data-close-modal>✕</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="section-title">Historique des versions (dernière en premier)</div>
        <div class="timeline">
          ${versions.map((v, i) => renderVersionCard(v, versions[i + 1])).join("")}
        </div>

        <div class="section-title">Mails associés (${mailsForNc.length})</div>
        ${mailsForNc.length ? mailsForNc.map((m) => mailMiniView(m)).join("") : `<div class="small-muted">Aucun mail associé — NC ouverte directement.</div>`}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function renderVersionCard(v, prev) {
  const diffKeys = prev ? Object.keys(v.champs).filter((k) => v.champs[k] !== prev.champs[k]) : [];
  const isLatestUnverified = !v.verified;
  const journalFields = ["descriptionAnomalie", "actionCurativeImmediate"].filter((f) => v.journal[f]);
  return `
    <div class="version-card ${!prev ? "" : ""}">
      <div class="vhead">
        <span class="vnum">Version ${v.version} ${!prev ? "(initiale)" : ""}</span>
        <span class="vdate">${formatDateShort(v.date)} ${v.mailId ? "· via mail" : "· ouverture manuelle"} ${isLatestUnverified ? "· ⚠ non vérifiée" : "· ✓ vérifiée"}</span>
      </div>
      <div class="kv">
        ${Object.entries(v.champs).map(([k, val]) => `
          <div class="k">${labelForField(k)}</div>
          <div class="${diffKeys.includes(k) ? "changed" : ""}">${val}</div>
        `).join("")}
      </div>
      ${journalFields.map((f) => `
        <div class="kv" style="grid-template-columns:1fr">
          <div class="k" style="margin-top:6px">${labelForField(f)} — nouvelle entrée</div>
          <div class="changed">${v.journal[f]}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function labelForField(k) {
  return {
    cause: "Cause", action: "Action", responsable: "Responsable", niveauIndice: "Niveau indice",
    descriptionAnomalie: "Description de l'anomalie", actionCurativeImmediate: "Action curative immédiate",
  }[k] || k;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function attachHandlers() {
  $app.querySelectorAll("[data-nav]").forEach((el) =>
    el.addEventListener("click", () => { state.page = el.dataset.nav; render(); })
  );

  $app.querySelectorAll("[data-mail-folder]").forEach((el) =>
    el.addEventListener("click", () => {
      state.mail.folder = el.dataset.mailFolder;
      const list = mailsForFolder(state.mail.folder);
      if (!list.find((m) => m.id === state.mail.selected)) {
        state.mail.selected = list[0] ? list[0].id : null;
      }
      render();
    })
  );
  $app.querySelectorAll("[data-mail-select]").forEach((el) =>
    el.addEventListener("click", () => { state.mail.selected = el.dataset.mailSelect; render(); })
  );

  $app.querySelectorAll("[data-validation-select]").forEach((el) =>
    el.addEventListener("click", () => { state.validation.selected = el.dataset.validationSelect; render(); })
  );

  $app.querySelectorAll("[data-override-select]").forEach((el) =>
    el.addEventListener("change", () => {
      if (el.value) {
        state.validation.overrides[el.dataset.overrideSelect] = el.value;
        toast(`Mail reclassé en « ${BADGE_INFO[el.value].label} » (simulation)`);
        render();
      }
    })
  );

  $app.querySelectorAll("[data-action='validate']").forEach((el) =>
    el.addEventListener("click", () => toast("Validation enregistrée (simulation — aucune donnée réelle modifiée)"))
  );
  $app.querySelectorAll("[data-action='edit-more']").forEach((el) =>
    el.addEventListener("click", () => toast("Modifiez les champs ci-dessus puis validez (simulation)"))
  );
  $app.querySelectorAll("[data-action='forward']").forEach((el) =>
    el.addEventListener("click", () => toast("Mail transféré au bon correspondant (simulation)"))
  );

  $app.querySelectorAll("[data-open-nc]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      state.suivi.modalNc = el.dataset.openNc;
      render();
    })
  );

  $app.querySelectorAll("[data-suivi-tab]").forEach((el) =>
    el.addEventListener("click", () => { state.suivi.tab = el.dataset.suiviTab; render(); })
  );

  const overlay = document.getElementById("modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) { state.suivi.modalNc = null; render(); }
    });
    const closeBtn = overlay.querySelector("[data-close-modal]");
    if (closeBtn) closeBtn.addEventListener("click", () => { state.suivi.modalNc = null; render(); });

    const closeNcBtn = overlay.querySelector("[data-close-nc]");
    if (closeNcBtn) closeNcBtn.addEventListener("click", () => {
      const nc = NCS[closeNcBtn.dataset.closeNc];
      nc.statut = "cloture";
      nc.dateCloture = TODAY_ISO;
      toast(`${nc.id} clôturée (simulation)`);
      state.suivi.tab = "cloture";
      state.suivi.modalNc = null;
      render();
    });
  }
}

render();
