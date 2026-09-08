/* =========================================================================
   Maquette front-end sans backend — toutes les données sont statiques
   (voir data.js). Aucune action ne persiste réellement : les boutons
   simulent le comportement attendu de l'application cible.
   ========================================================================= */

const TODAY_ISO = "2026-09-03";

const state = {
  page: "mail",
  mail: { folder: "inbox", selected: "m1" },
  validation: {
    tab: "en_cours",
    sort: "desc", // tri par indice IA : "desc" ou "asc"
    selected: "m1",
    overrides: {}, // overrides[mailId] = badge forcé par l'utilisateur
    prefillOverrides: {}, // prefillOverrides[mailId] = { champ: valeur écrasée depuis une NC similaire }
    comparisonSelected: {}, // comparisonSelected[mailId] = id de la NC similaire affichée en comparaison
    collapsed: {}, // collapsed[sectionKey] = true si la section est repliée
    ncTargetOverride: {}, // ncTargetOverride[mailId] = id de NC choisi pour remplacer le rattachement proposé par l'IA
    changingNc: {}, // changingNc[mailId] = true si le sélecteur "changer la NC rattachée" est ouvert
  },
  suivi: { tab: "en_cours", modalNc: null, dicteeOpen: false, dictee: { ncId: "", transcript: "", genere: false } },
  stats: { periode: "6m", service: "", cause: "", statut: "", type: "", gravite: "", origine: "", recherche: "" },
  admin: { activeList: "Type de NC", newValue: "", newFieldName: "", newFieldType: "texte", confirm: null },
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

// "Date de la demande" et "Date prévue" — champs réels de l'Excel mais très
// rarement remplis (1,4 % chacun, voir VISION_APP_FINALE.md, "Champs peu ou
// jamais renseignés en pratique") : à distinguer explicitement d'une case
// vide, même logique que les coûts non renseignés.
function formatDateField(iso) {
  return iso ? formatDateShort(iso) : `<span class="non-renseigne">non renseigné</span>`;
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
  const color = value >= 85 ? "#3f7d52" : value >= 65 ? "#93611a" : "#a3362b";
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

// Pièces jointes visuelles (photos/vidéos/audios) : point ouvert non tranché
// (PLAN_TECHNIQUE.md §5 / §13 pt.1) — stockage + affichage seul, pas
// d'extraction de contenu pour ce format à ce stade.
const VISUAL_EXT = [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".mp3", ".wav"];
function isVisualAttachment(name) {
  return VISUAL_EXT.some((ext) => name.toLowerCase().endsWith(ext));
}
function attachmentNote(attachments) {
  if (!attachments.some((a) => isVisualAttachment(a.name))) return "";
  return `<div class="visual-note">🖼 Pièce(s) jointe(s) visuelle(s) : stockées et affichées, mais leur contenu n'est pas extrait automatiquement (point ouvert — voir PLAN_TECHNIQUE.md §13).</div>`;
}

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
      "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0a0a0a;color:#fff;" +
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
      <nav class="topbar-secondary">
        ${navBtn("stats", "Statistiques")}
        ${navBtn("admin", "Administration")}
      </nav>
      <span class="env-tag">Maquette v3 — données d'exemple</span>
    </div>
    <div class="page" id="page-root"></div>
  `;
  const root = document.getElementById("page-root");
  if (state.page === "mail") root.innerHTML = renderMailPage();
  if (state.page === "validation") root.innerHTML = renderValidationPage();
  if (state.page === "suivi") root.innerHTML = renderSuiviPage();
  if (state.page === "stats") root.innerHTML = renderStatsPage();
  if (state.page === "admin") root.innerHTML = renderAdminPage();

  const existingOverlay = document.getElementById("modal-overlay");
  if (existingOverlay) existingOverlay.remove();
  if (state.suivi.modalNc) renderModal(state.suivi.modalNc);
  if (state.suivi.dicteeOpen) renderDicteeModal();
  if (state.admin.confirm) renderAdminConfirmModal();

  attachHandlers();
}

function navBtn(key, label) {
  return `<button data-nav="${key}" class="${state.page === key ? "active" : ""}">${label}</button>`;
}

// Barre d'onglets horizontale partagée par les 3 pages (Mail, Validation, Suivi) :
// remplace les anciens panneaux latéraux "Dossiers" pour gagner de la place,
// tout en conservant le code couleur par statut sur chaque onglet.
function renderTabBar(items, activeKey, dataAttr) {
  return `
    <div class="folder-tabs">
      ${items.map((t) => `
        <button class="${activeKey === t.key ? "active" : ""}" data-${dataAttr}="${t.key}">
          <span class="status-dot" style="background:${t.dotColor}"></span>
          <span class="label">${t.label}</span>
          <span class="badge-count">${t.count}</span>
        </button>
      `).join("")}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// PAGE MAIL — vue façon Outlook (lecture seule, pas de suppression possible)
// ---------------------------------------------------------------------------

const FOLDERS = [
  { key: "inbox", label: "Boîte de réception qualité", dotColor: "var(--text-faint)" },
  { key: "en_cours", label: "En cours", dotColor: STATUT_COULEUR.en_cours.color },
  { key: "nouveau", label: "Nouveaux", dotColor: STATUT_COULEUR.nouveau.color },
  { key: "cloture", label: "Clôturés", dotColor: STATUT_COULEUR.cloture.color },
  { key: "hors_sujet", label: "Hors sujet / Transférés", dotColor: STATUT_COULEUR.hors_sujet.color },
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
      ${renderTabBar(
        FOLDERS.map((f) => ({ key: f.key, label: f.label, dotColor: f.dotColor, count: mailsForFolder(f.key).length })),
        state.mail.folder,
        "mail-folder"
      )}
      <div class="folder-note">
        Vue de consultation uniquement : le tri et le classement sont réalisés par l'IA.
        Les mails sont conservés 1 mois puis supprimés automatiquement de la boîte.
      </div>

      <div class="mail-page-body">
        <div class="pane mail-list">
          <div class="pane-header">${list.length} message${list.length > 1 ? "s" : ""}</div>
          ${list.map((m) => renderMailListItem(m)).join("")}
        </div>

        <div class="mail-reading">
          ${selected ? renderMailReading(selected) : `<div class="empty"><span class="big-ico">📬</span>Sélectionnez un mail à consulter</div>`}
        </div>
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
        ${m.ncId ? `<span class="chip" style="background:var(--hover);color:var(--text-muted)">Rattaché à ${m.ncId}</span>` : ""}
      </div>
      </div>
    </div>
    <div class="reading-body">${m.body}</div>
    ${m.attachments.length ? `
      <div class="reading-attachments">
        ${m.attachments.map((a) => `<div class="attachment-chip"><span class="ico">${isVisualAttachment(a.name) ? "🖼" : "📎"}</span>${a.name} <span class="small-muted">(${a.size})</span></div>`).join("")}
      </div>
      ${attachmentNote(m.attachments)}` : ""}
    <div class="retention-note">
      🕒 Conservation : ce mail restera visible dans l'application pendant 1 mois à compter de sa réception, puis sera supprimé de la boîte mail source. Cette page est une vue de consultation — aucune suppression manuelle n'est possible ici.
    </div>
  `;
}

// ---------------------------------------------------------------------------
// PAGE VALIDATION
// ---------------------------------------------------------------------------

const VALIDATION_TABS = [
  { key: "en_cours", label: "En cours", dotColor: STATUT_COULEUR.en_cours.color },
  { key: "nouveau", label: "Nouveaux", dotColor: STATUT_COULEUR.nouveau.color },
  { key: "cloture", label: "Clôturés", dotColor: STATUT_COULEUR.cloture.color },
  { key: "hors_sujet", label: "Hors sujet / Transfert", dotColor: STATUT_COULEUR.hors_sujet.color },
];

function mailsForValidationTab(tab) {
  return MAILS.filter((m) => m.status === tab);
}

function effectiveBadge(mailId) {
  return state.validation.overrides[mailId] || getMail(mailId).badge;
}

function renderValidationPage() {
  const items = mailsForValidationTab(state.validation.tab)
    .slice()
    .sort((a, b) => state.validation.sort === "asc" ? a.aiConfidence - b.aiConfidence : b.aiConfidence - a.aiConfidence);
  if (!items.find((m) => m.id === state.validation.selected)) {
    state.validation.selected = items[0] ? items[0].id : null;
  }
  const selected = getMail(state.validation.selected);

  return `
    <div class="validation-page">
      ${renderTabBar(
        VALIDATION_TABS.map((t) => ({ key: t.key, label: t.label, dotColor: t.dotColor, count: mailsForValidationTab(t.key).length })),
        state.validation.tab,
        "validation-tab"
      )}
      <div class="folder-note">
        Le tri par dossier reprend le statut du mail. Utilisez le tri par indice IA dans la liste pour prioriser les cas les moins fiables.
      </div>

      <div class="validation-page-body">
        <div class="pane validation-list">
          <div class="pane-header with-action">
            <span>${items.length} mail${items.length > 1 ? "s" : ""} à valider</span>
            <button class="btn subtle sort-toggle" data-toggle-sort>
              Indice IA ${state.validation.sort === "asc" ? "↑ croissant" : "↓ décroissant"}
            </button>
          </div>
          ${items.map((m) => renderValidationListItem(m)).join("") || `<div class="small-muted" style="padding:16px">Aucun mail dans cette catégorie.</div>`}
        </div>

        <div class="validation-detail">
          ${selected ? renderValidationDetail(selected) : `<div class="empty"><span class="big-ico">✅</span>Sélectionnez un mail à valider</div>`}
        </div>
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

function isCollapsed(key) {
  return !!state.validation.collapsed[key];
}

function collapsibleSection(key, title, innerHtml) {
  const collapsed = isCollapsed(key);
  return `
    <div class="collapsible ${collapsed ? "is-collapsed" : ""}">
      <button class="collapsible-toggle" data-toggle-collapse="${key}">
        <span class="collapsible-arrow">▾</span> ${title}
      </button>
      <div class="collapsible-body">
        <div class="card">${innerHtml}</div>
      </div>
    </div>
  `;
}

function overrideControls(mailId, current) {
  return `
    <select class="btn" data-override-select="${mailId}" style="cursor:pointer">
      <option value="">Reclasser en…</option>
      ${otherTypeOptions(current).map((k) => `<option value="${k}">${BADGE_INFO[k].label}</option>`).join("")}
    </select>
  `;
}

function detailHeader(m, badge, actionsHtml) {
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
      <div class="detail-actions">${actionsHtml || ""}</div>
    </div>
  `;
}

function mailMiniView(m) {
  return `
    <div class="mail-mini">
      <div class="from">${m.fromName} <span class="small-muted">&lt;${m.from}&gt;</span></div>
      <div class="subject">${m.subject} — ${formatDate(m.date)}</div>
      <pre>${m.body}</pre>
      ${m.attachments.length ? `<div class="reading-attachments" style="padding:8px 0 0">${m.attachments.map((a) => `<span class="attachment-chip">${isVisualAttachment(a.name) ? "🖼" : "📎"} ${a.name}</span>`).join("")}</div>` : ""}
      ${attachmentNote(m.attachments)}
    </div>
  `;
}

// Historique cumulé d'un champ "journal" (Description de l'anomalie,
// Action curative immédiate...) : chaque version peut ajouter une nouvelle
// entrée datée, les entrées précédentes ne sont jamais écrasées.
function journalHistory(nc, field) {
  // Le suivi 1 (ouverture) reste toujours présent, même sans texte pour ce
  // champ précis — sinon un champ resté vide à l'ouverture donne l'impression
  // trompeuse qu'il n'existait pas avant son premier remplissage.
  return nc.versions
    .filter((v, i) => v.journal[field] || i === 0)
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
              ${e.version === latestVersion ? `<span class="chip mono">Nouveau — proposé par l'IA</span>` : ""}
            </div>
            ${e.version === latestVersion
              ? `<textarea rows="3">${e.text || ""}</textarea>`
              : `<div class="journal-text ${!e.text ? "empty" : ""}">${e.text || "Aucune information renseignée à ce suivi pour ce champ."}</div>`}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// --- Bloc "Indice de gravité" (score calculé) & bloc coûts -------------------
// Le champ "Equipe" du bloc réel n'est volontairement pas repris (voir
// PLAN_TECHNIQUE.md §13 pt.3 — jamais rempli dans l'Excel).

function graviteBlock(nc) {
  if (!nc.gravite) return `<div class="small-muted">Non calculé sur cette NC.</div>`;
  const niveau = igToNiveau(nc.gravite.ig);
  const s = niveauIndiceStyle(niveau);
  return `
    <div class="kv" style="grid-template-columns:170px 1fr">
      ${SOUS_CRITERES_GRAVITE.map((c) => `
        <div class="k">${c}</div><div>${nc.gravite.sousCriteres[c] ?? "—"}</div>
      `).join("")}
    </div>
    <div class="ig-result">
      <span class="small-muted">Indicateur IG :</span> <b>${nc.gravite.ig}</b>
      <span class="chip" style="background:${s.bg};color:${s.color}">${niveau}</span>
    </div>
  `;
}

function coutsBlock(nc) {
  const c = nc.couts || {};
  const total = coutTotal(c);
  return `
    <div class="kv">
      <div class="k">Coût réparation</div><div>${formatCout(c.reparation)}</div>
      <div class="k">Coût matériel</div><div>${formatCout(c.materiel)}</div>
      <div class="k">Coût transport</div><div>${formatCout(c.transport)}</div>
      <div class="k">Coût total</div><div><b>${formatCout(total)}</b></div>
      <div class="k">Temps passé (h)</div><div>${c.tempsPasseH ?? `<span class="non-renseigne">non renseigné</span>`}</div>
      <div class="k">Responsable commercial</div><div>${nc.responsableCommercial || `<span class="non-renseigne">non renseigné</span>`}</div>
    </div>
  `;
}

// --- Cas 1 : Rattachement à une NC existante --------------------------------

function renderDetailRattachement(m) {
  const defaultNcId = m.ncId && NCS[m.ncId] ? m.ncId : null;
  const targetNcId = state.validation.ncTargetOverride[m.id] || defaultNcId;

  if (!targetNcId) {
    const actions = `
      <button class="btn primary" data-action="validate" data-mail="${m.id}">✓ Rattacher et valider</button>
      ${overrideControls(m.id, "rattachement")}
    `;
    return `
      ${detailHeader(m, "rattachement", actions)}
      ${mailMiniView(m)}
      <div class="note-box">Ce mail a été reclassé en rattachement. Sélectionnez la non-conformité existante concernée.</div>
      <div class="field" style="max-width:360px">
        <label>Non-conformité à rattacher</label>
        <select data-change-nc-select="${m.id}">
          <option value="">Sélectionner…</option>
          ${Object.values(NCS).map((nc) => `<option value="${nc.id}">${nc.id} — ${nc.referenceProduit} (${nc.client})</option>`).join("")}
        </select>
      </div>
    `;
  }

  const nc = NCS[targetNcId];
  const last = nc.versions[nc.versions.length - 1];
  const changing = !!state.validation.changingNc[m.id];

  const actions = `
    ${changing
      ? `<select data-change-nc-select="${m.id}" class="btn" style="cursor:pointer;font-weight:600">
           <option value="">Choisir une NC…</option>
           ${Object.values(NCS).map((n) => `<option value="${n.id}" ${n.id === targetNcId ? "selected" : ""}>${n.id} — ${n.referenceProduit} (${n.client})</option>`).join("")}
         </select>`
      : `<button class="btn" data-toggle-change-nc="${m.id}">⇄ Changer la NC rattachée</button>`}
    <button class="btn primary" data-action="validate" data-mail="${m.id}">✓ Valider ce suivi</button>
    ${overrideControls(m.id, "rattachement")}
  `;

  const rattachementNote = state.validation.ncTargetOverride[m.id]
    ? `L'IA proposait initialement <b>${defaultNcId || "aucun rattachement"}</b> — vous avez choisi de rattacher ce mail à <b>${nc.id}</b> à la place.`
    : `L'IA propose de rattacher ce mail à la non-conformité <b>${nc.id}</b> — <i>${nc.referenceProduit}, ${nc.client}</i>, et a généré un nouveau suivi (suivi ${last.version}) de la fiche à partir de ce mail.`;

  const changeNcControl = `
    <div class="field" style="max-width:420px">
      <label>NC rattachée</label>
      <div class="mail-mini" style="margin:0;padding:10px 12px"><b>${nc.id}</b> — ${nc.referenceProduit} <span class="small-muted">(${nc.client})</span></div>
    </div>
  `;

  return `
    ${detailHeader(m, "rattachement", actions)}

    <div class="note-box">${rattachementNote} Tous les champs du nouveau suivi ci-dessous sont modifiables, pas seulement ceux proposés par l'IA.</div>

    ${mailMiniView(m)}

    ${changeNcControl}

    <div class="link-inline" data-open-nc="${nc.id}" style="display:inline-block;margin:4px 0 16px">📁 Ouvrir le dossier complet de ${nc.id} (historique des suivis)</div>

    ${collapsibleSection(`rat-fiche-${m.id}`, `Fiche NC — ${nc.id} (identité, non modifiable)`, `
      <div class="kv">
        <div class="k">Référence produit</div><div>${nc.referenceProduit}</div>
        <div class="k">N° Commande</div><div>${nc.numeroCommande}</div>
        <div class="k">Client</div><div>${nc.client}</div>
        <div class="k">Origine du signalement</div><div>${nc.origine || "—"}${nc.origineAuto ? ` <span class="small-muted">(déterminée automatiquement)</span>` : ""}</div>
        <div class="k">Type de NC</div><div>${nc.typeNC}</div>
        <div class="k">Service impacté</div><div>${nc.serviceImpacte}</div>
        <div class="k">Date de détection</div><div>${formatDateShort(nc.dateDetection)}</div>
        <div class="k">Date de la demande</div><div>${formatDateField(nc.dateDemande)}</div>
        <div class="k">Date prévue</div><div>${formatDateField(nc.datePrevue)}</div>
      </div>
    `)}

    ${collapsibleSection(`rat-suivi-${m.id}`, `Nouveau suivi — suivi ${last.version} (tous les champs sont modifiables)`, `
      <div class="two-col">
        <div class="col">
          <div class="field"><label>Cause</label><select>${CAUSES.map((c) => `<option ${c === last.champs.cause ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label>Action</label><select>${ACTIONS.map((a) => `<option ${a === last.champs.action ? "selected" : ""}>${a}</option>`).join("")}</select></div>
          <div class="field"><label>Responsable</label><select>${RESPONSABLES.map((r) => `<option ${r === last.champs.responsable ? "selected" : ""}>${r}</option>`).join("")}</select></div>
          <div class="field"><label>Responsable commercial</label><select>${RESPONSABLES_COMMERCIAUX.map((r) => `<option ${r === nc.responsableCommercial ? "selected" : ""}>${r}</option>`).join("")}</select></div>
          <div class="field"><label>Niveau indice</label><select>${NIVEAUX_INDICE.map((n) => `<option ${n === last.champs.niveauIndice ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        </div>
        <div class="col">
          ${journalBlock("Description de l'anomalie (historique)", journalHistory(nc, "descriptionAnomalie"), last.version)}
          ${journalBlock("Action curative immédiate (historique)", journalHistory(nc, "actionCurativeImmediate"), last.version)}
        </div>
      </div>

      <div class="section-title">Indice de gravité (modifiable)</div>
      <div class="field-grid">
        ${SOUS_CRITERES_GRAVITE.map((c) => `
          <div class="field"><label>${c}</label><select>${NIVEAU_SOUS_CRITERE.map((n) => `<option ${nc.gravite && n === nc.gravite.sousCriteres[c] ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        `).join("")}
      </div>

      <div class="section-title">Coûts (modifiables)</div>
      <div class="two-col">
        <div class="col">
          <div class="field"><label>Coût réparation</label><input type="text" value="${nc.couts && nc.couts.reparation !== null ? nc.couts.reparation : ""}" placeholder="non renseigné" /></div>
          <div class="field"><label>Coût matériel</label><input type="text" value="${nc.couts && nc.couts.materiel !== null ? nc.couts.materiel : ""}" placeholder="non renseigné" /></div>
        </div>
        <div class="col">
          <div class="field"><label>Coût transport</label><input type="text" value="${nc.couts && nc.couts.transport !== null ? nc.couts.transport : ""}" placeholder="non renseigné" /></div>
          <div class="field"><label>Temps passé (h)</label><input type="text" value="${nc.couts && nc.couts.tempsPasseH !== null ? nc.couts.tempsPasseH : ""}" placeholder="non renseigné" /></div>
        </div>
      </div>
    `)}
  `;
}

// --- Cas 2 : Nouvelle NC -----------------------------------------------------

const FIELD_DEFS_NOUVELLE_NC = [
  { key: "referenceProduit", label: "Référence produit", type: "text" },
  { key: "numeroCommande", label: "N° Commande", type: "text" },
  { key: "client", label: "Client", type: "text" },
  { key: "typeNC", label: "Type de NC", type: "select", options: TYPES_NC },
  { key: "origine", label: "Origine (Client / Fournisseur / Interne)", type: "select", options: ORIGINES, auto: true },
  { key: "serviceImpacte", label: "Service impacté", type: "select", options: SERVICES_IMPACTES },
  { key: "dateDetection", label: "Date de détection", type: "date" },
  { key: "dateDemande", label: "Date de la demande", type: "date" },
  { key: "datePrevue", label: "Date prévue", type: "date" },
  { key: "cause", label: "Cause", type: "select", options: CAUSES },
  { key: "action", label: "Action", type: "select", options: ACTIONS },
  { key: "responsableCommercial", label: "Responsable commercial", type: "select", options: RESPONSABLES_COMMERCIAUX },
  { key: "responsable", label: "Responsable", type: "select", options: RESPONSABLES },
  { key: "niveauIndice", label: "Niveau indice (calculé — voir bloc gravité)", type: "select", options: NIVEAUX_INDICE },
  { key: "descriptionAnomalie", label: "Description de l'anomalie", type: "textarea" },
];

function fieldInput(def, value) {
  if (def.type === "select") {
    return `<select>${def.options.map((o) => `<option ${o === value ? "selected" : ""}>${o}</option>`).join("")}</select>`;
  }
  if (def.type === "textarea") {
    return `<textarea rows="4">${value || ""}</textarea>`;
  }
  if (def.type === "date") {
    return `<input type="text" value="${value ? formatDateShort(value) : ""}" />`;
  }
  return `<input type="text" value="${value || ""}" />`;
}

function renderDetailNouvelleNC(m) {
  const similaires = HISTORIQUE_SIMILAIRES[m.id] || [];
  const prefill = PREREMPLISSAGE_NOUVELLE_NC[m.id] || {};
  const overrides = state.validation.prefillOverrides[m.id] || {};
  const effective = { ...prefill };
  Object.keys(overrides).forEach((k) => { effective[k] = overrides[k].value; });
  const comparisonId = state.validation.comparisonSelected[m.id];
  const comparisonNc = comparisonId ? similaires.find((s) => s.id === comparisonId) : null;

  const actions = `
    <button class="btn primary" data-action="validate" data-mail="${m.id}">✓ Créer la nouvelle NC</button>
    ${overrideControls(m.id, "nouvelle_nc")}
  `;

  const prefillCard = collapsibleSection(`nc-prefill-${m.id}`, "Pré-remplissage IA — nouvelle NC (modifiable)", `
    <div class="field"><label>Numéro NC</label><input type="text" value="${prefill.numero || ""}" /></div>
    ${FIELD_DEFS_NOUVELLE_NC.map((def) => `
      <div class="field" data-prefill-field="${def.key}">
        <label>${def.label}</label>
        ${fieldInput(def, effective[def.key])}
        ${def.auto && prefill.origineAuto ? `<div class="diff-hint" style="color:var(--text-muted);font-weight:500">Proposé automatiquement à partir du domaine de l'expéditeur — à confirmer par le vérificateur.</div>` : ""}
        ${overrides[def.key] ? `<div class="diff-hint">Écrasé depuis ${overrides[def.key].from} : « ${prefill[def.key] || "—"} »</div>` : ""}
      </div>
    `).join("")}
  `);

  const comparisonCard = comparisonNc ? collapsibleSection(
    `nc-compare-${m.id}`,
    `Comparaison — Pré-remplissage IA vs ${comparisonNc.id} (${comparisonNc.titre})`,
    `
      <div class="compare-table">
        <div class="compare-row compare-head">
          <div>Champ</div>
          <div>Pré-remplissage IA</div>
          <div></div>
          <div>${comparisonNc.id}</div>
        </div>
        ${FIELD_DEFS_NOUVELLE_NC.map((def) => `
          <div class="compare-row">
            <div class="compare-label">${def.label}</div>
            <div class="compare-value">${effective[def.key] ?? "—"}</div>
            <div class="compare-arrow">
              <button class="btn compare-arrow-btn" data-overwrite-field="${m.id}" data-overwrite-key="${def.key}" data-overwrite-similar="${comparisonNc.id}" title="Écraser la valeur IA avec celle de ${comparisonNc.id}">←</button>
            </div>
            <div class="compare-value compare-value-hist">${comparisonNc.champs[def.key] ?? "—"}</div>
          </div>
        `).join("")}
      </div>
    `
  ) : "";

  const top10Card = collapsibleSection(`nc-top10-${m.id}`, "Top 10 des NC similaires (historique)", `
    <div class="small-muted" style="margin-bottom:10px">Cliquez sur une NC pour la comparer au pré-remplissage IA — jamais utilisée pour pré-remplir automatiquement la fiche.</div>
    <div class="similar-list">
      ${similaires.map((s) => `
        <div class="similar-item ${comparisonId === s.id ? "selected" : ""}" data-similar-mail="${m.id}" data-similar-id="${s.id}">
          <div><span class="id">${s.id}</span><span class="titre">${s.titre}</span></div>
          <span class="similar-score">${s.score}%</span>
        </div>
      `).join("")}
    </div>
  `);

  return `
    ${detailHeader(m, "nouvelle_nc", actions)}

    <div class="two-col">
      <div class="col">
        ${mailMiniView(m)}
        ${comparisonCard}
        ${prefillCard}
      </div>

      <div class="col" style="max-width:360px">
        ${top10Card}
      </div>
    </div>
  `;
}

// --- Cas 3 : Non recevable ----------------------------------------------------

function renderDetailNonRecevable(m) {
  const actions = `
    <button class="btn primary" data-action="validate" data-mail="${m.id}">✓ Confirmer non recevable</button>
    ${overrideControls(m.id, "non_recevable")}
  `;
  return `
    ${detailHeader(m, "non_recevable", actions)}
    ${mailMiniView(m)}
    <div class="section-title">Motif de non-recevabilité (IA)</div>
    <div class="note-box">${m.resolutionNote || "Après analyse, le signalement ne correspond pas à un défaut produit avéré."}</div>
  `;
}

// --- Cas 4 : Hors sujet / Transfert ------------------------------------------

function renderDetailHorsSujet(m) {
  const actions = `
    <button class="btn primary" data-action="forward" data-mail="${m.id}">↪ Transférer</button>
    <button class="btn" data-action="validate" data-mail="${m.id}">✓ Classer sans transfert</button>
    ${overrideControls(m.id, "hors_sujet")}
  `;
  return `
    ${detailHeader(m, "hors_sujet", actions)}
    ${mailMiniView(m)}
    <div class="section-title">Analyse IA</div>
    <div class="note-box">Ce mail ne concerne pas le service qualité.${m.forwardSuggestion ? ` Destinataire suggéré pour transfert : <b>${m.forwardSuggestion}</b>.` : ""}</div>
  `;
}

// ---------------------------------------------------------------------------
// PAGE SUIVI (vue réunion)
// ---------------------------------------------------------------------------

const SUIVI_TABS = [
  { key: "en_cours", label: "En cours", dotColor: STATUT_COULEUR.en_cours.color },
  { key: "nouveau", label: "Nouvelle NC", dotColor: STATUT_COULEUR.nouveau.color },
  { key: "cloture", label: "Clôturé", dotColor: STATUT_COULEUR.cloture.color },
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
      ${renderTabBar(
        SUIVI_TABS.map((t) => ({ key: t.key, label: t.label, dotColor: t.dotColor, count: ncsForStatut(t.key).length })),
        state.suivi.tab,
        "suivi-tab"
      )}
      <div class="folder-note" style="display:flex;justify-content:space-between;align-items:center">
        <span>Revue collective — une carte grisée signale un suivi non encore vérifié, mais toutes les actions (dont la clôture) restent possibles à tout moment : les mails ne sont pas l'unique source d'information.</span>
        <button class="btn" data-open-dictee>🎙 Dicter un mail</button>
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
  let reason = "";
  if (grayed) reason = !ncHasMailUpdate(nc) ? "Aucun nouveau mail depuis l'ouverture" : "En attente de vérification humaine";
  const niveau = nc.gravite ? igToNiveau(nc.gravite.ig) : null;
  const gs = niveau ? niveauIndiceStyle(niveau) : null;
  return `
    <div class="nc-card ${grayed ? "grayed" : ""}" data-open-nc="${nc.id}">
      <div class="id">${nc.id} — suivi ${last.version} · ${nc.typeNC}</div>
      <div class="titre">${nc.referenceProduit}</div>
      <div class="meta">${nc.client} · ${nc.serviceImpacte} · ${nc.origine || "—"}</div>
      ${niveau ? `<span class="chip" style="background:${gs.bg};color:${gs.color}">${niveau}</span>` : ""}
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

  const mailsForNc = nc.versions.filter((v) => v.mailId).map((v) => getMail(v.mailId));

  const isCloture = nc.statut === "cloture";
  const grayed = ncGrayed(nc);
  let grayedReason = "";
  if (grayed) grayedReason = !ncHasMailUpdate(nc) ? "Aucun nouveau mail depuis l'ouverture." : "Le dernier suivi n'a pas encore été vérifié.";

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div>
          <h2>${nc.id} — ${nc.referenceProduit}</h2>
          <div class="small-muted">${nc.client} · ${nc.typeNC} · ${nc.serviceImpacte} · commande n°${nc.numeroCommande} · détectée le ${formatDateShort(nc.dateDetection)}${nc.dateCloture ? ` · clôturée le ${formatDateShort(nc.dateCloture)}` : ""}</div>
        </div>
        <div class="modal-head-actions">
          <button class="btn" data-action="noop" title="Export (à venir)">📄</button>
          ${isCloture
            ? `<span class="chip" style="background:${STATUT_COULEUR.cloture.bg};color:${STATUT_COULEUR.cloture.color}">✓ NC clôturée</span>`
            : `<button class="btn primary" data-close-nc="${nc.id}">✓ Clôturer cette NC</button>`}
          <button class="modal-close" data-close-modal>✕</button>
        </div>
      </div>
      <div class="modal-body">
        ${grayed && !isCloture ? `<div class="note-box">ℹ️ ${grayedReason} La clôture reste possible dès maintenant si vous disposez d'informations complémentaires (téléphone, visite sur site, etc.) — les mails ne sont pas l'unique source de vérité.</div>` : ""}

        ${ficheCompleteCard(nc)}

        <div class="section-title">Mails associés (${mailsForNc.length})</div>
        ${mailsForNc.length ? mailsForNc.map((m) => mailMiniView(m)).join("") : `<div class="small-muted">Aucun mail associé — NC ouverte directement.</div>`}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// Champs "état" (cause, action, responsable, niveauIndice) : une NC n'a
// qu'une seule fiche, ici affichée dans un unique bloc. Seules les valeurs
// qui viennent de changer sont mises en avant (fond vert + badge « Suivi N »
// listant les suivis où le champ a évolué) — un champ jamais modifié depuis
// l'ouverture reste affiché normalement, une seule fois, comme le reste de
// la fiche.
const CHAMPS_ETAT = ["cause", "action", "responsable", "niveauIndice"];

function stableAndChangingFields(nc) {
  const stable = [];
  const changing = [];
  CHAMPS_ETAT.forEach((k) => {
    const vals = nc.versions.map((v) => v.champs[k]);
    (vals.every((v) => v === vals[0]) ? stable : changing).push(k);
  });
  return { stable, changing };
}

// Pour un champ qui a changé au moins une fois, liste les suivis où sa
// valeur a été modifiée par rapport à la version précédente.
// Chaque entrée = un suivi qui a introduit une nouvelle valeur pour ce champ
// (le suivi 1 pose la valeur de départ, les suivis suivants n'apparaissent
// que s'ils l'ont réellement changée) — la chaîne complète reste visible,
// pas seulement la valeur courante.
function fieldValueHistory(nc, key) {
  return nc.versions
    .filter((v, i) => { const prev = nc.versions[i - 1]; return !prev || prev.champs[key] !== v.champs[key]; })
    .map((v) => ({ version: v.version, value: v.champs[key] }));
}

function etatFieldRow(nc) {
  const { stable, changing } = stableAndChangingFields(nc);
  return [...stable, ...changing]
    .sort((a, b) => CHAMPS_ETAT.indexOf(a) - CHAMPS_ETAT.indexOf(b))
    .map((k) => {
      if (stable.includes(k)) {
        return `<div class="k">${labelForField(k)}</div><div>${nc.versions[0].champs[k]}</div>`;
      }
      const hist = fieldValueHistory(nc, k).slice().reverse(); // dernier suivi en premier
      const rows = hist.map((h, i) => `
        <div class="value-history-row ${i === 0 ? "field-new" : "field-old"}">
          <span class="value-history-bullet">–</span> ${h.value} <span class="chip mono">Suivi ${h.version}</span>
        </div>
      `).join("");
      return `<div class="k">${labelForField(k)}</div><div class="value-history">${rows}</div>`;
    })
    .join("");
}

// Historique d'un champ "journal" (texte cumulatif) affiché entièrement à
// l'intérieur de la même fiche — seule l'entrée du suivi courant est mise en
// avant (fond vert), les entrées plus anciennes restent affichées mais en
// sourdine, pour garder toute la traçabilité sans dupliquer les cartes.
function journalInline(nc, field, label) {
  const hist = journalHistory(nc, field).slice().reverse(); // dernier suivi en premier
  if (!hist.length) return "";
  const last = nc.versions[nc.versions.length - 1];
  return `
    <div class="field">
      <label>${label}</label>
      <div class="journal">
        ${hist.map((e) => `
          <div class="journal-entry ${e.version === last.version ? "is-new" : ""}">
            <div class="journal-entry-head">
              <span class="journal-date">${formatDateShort(e.date)}${e.mailId ? " · via mail" : " · ouverture"}</span>
              <span class="chip mono">Suivi ${e.version}</span>
            </div>
            <div class="journal-text ${!e.text ? "empty" : ""}">${e.text || "Aucune information renseignée à ce suivi pour ce champ."}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// Fiche complète de la NC — toutes les informations dans une seule carte :
// indice de gravité, coûts, champs d'état et journaux de texte. Seules les
// lignes concernées par le dernier suivi sont surlignées en vert.
function ficheCompleteCard(nc) {
  const last = nc.versions[nc.versions.length - 1];
  return `
    <div class="card">
      <h3>Fiche NC — suivi ${last.version}</h3>

      <div class="section-title" style="margin-top:0">Dates</div>
      <div class="kv">
        <div class="k">Date de détection</div><div>${formatDateShort(nc.dateDetection)}</div>
        <div class="k">Date de la demande</div><div>${formatDateField(nc.dateDemande)}</div>
        <div class="k">Date prévue</div><div>${formatDateField(nc.datePrevue)}</div>
        <div class="k">Date clôture réelle</div><div>${formatDateField(nc.dateCloture)}</div>
      </div>

      <div class="section-title">Indice de gravité</div>
      ${graviteBlock(nc)}

      <div class="section-title">Coûts et responsables</div>
      ${coutsBlock(nc)}

      <div class="section-title">État de la NC</div>
      <div class="kv">${etatFieldRow(nc)}</div>

      <div class="two-col" style="margin-top:14px">
        <div class="col">${journalInline(nc, "descriptionAnomalie", "Description de l'anomalie")}</div>
        <div class="col">${journalInline(nc, "actionCurativeImmediate", "Action curative immédiate")}</div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// MODALE DICTÉE — intégration de l'outil "Transcriptor" (voir
// VISION_APP_FINALE.md, section "Dictée en réunion")
// ---------------------------------------------------------------------------

function renderDicteeModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "modal-overlay";
  const d = state.suivi.dictee;
  const nc = d.ncId ? NCS[d.ncId] : null;
  const contactsConnus = nc ? [
    ...new Set(nc.versions.filter((v) => v.mailId).map((v) => getMail(v.mailId).from)),
  ] : [];

  overlay.innerHTML = `
    <div class="modal" style="max-width:640px">
      <div class="modal-head">
        <div>
          <h2>🎙 Dicter un mail</h2>
          <div class="small-muted">faster-whisper (local) → mise en forme Gemini (cloud, quota gratuit) → brouillon pré-rempli, jamais d'envoi automatique.</div>
        </div>
        <button class="modal-close" data-close-dictee>✕</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Non-conformité concernée</label>
          <select data-dictee-nc>
            <option value="">Sélectionner une NC…</option>
            ${Object.values(NCS).map((n) => `<option value="${n.id}" ${d.ncId === n.id ? "selected" : ""}>${n.id} — ${n.referenceProduit} (${n.client})</option>`).join("")}
          </select>
        </div>

        ${nc ? `
          <div class="note-box">
            Contact(s) déjà échangé(s) sur cette NC (repris des mails existants) :
            ${contactsConnus.length ? contactsConnus.map((c) => `<b>${c}</b>`).join(", ") : "aucun mail associé pour l'instant"}.
          </div>
        ` : ""}

        <div class="field">
          <label>Dictée (transcription faster-whisper — simulation)</label>
          <textarea rows="4" data-dictee-transcript placeholder="Cliquez sur « Simuler la dictée » ci-dessous…">${d.transcript}</textarea>
        </div>
        <div class="btn-row">
          <button class="btn" data-dictee-simulate>🎙 Simuler la dictée</button>
          <button class="btn primary" data-dictee-generate ${!d.transcript ? "disabled" : ""}>Générer le brouillon (Gemini)</button>
        </div>

        ${d.genere ? `
          <div class="section-title">Brouillon généré</div>
          <div class="card">
            <div class="field"><label>Destinataire</label><input type="text" value="${contactsConnus[0] || "à préciser"}" /></div>
            <div class="field"><label>Objet</label><input type="text" value="RE : ${nc.id} – Point d'avancement" /></div>
            <div class="field"><label>Corps</label><textarea rows="6">Bonjour,\n\nSuite à notre réunion qualité, voici un point d'avancement sur le dossier ${nc.id} (${nc.referenceProduit}).\n\n${d.transcript}\n\nCordialement,</textarea></div>
            <div class="note-box">Ouvre un brouillon pré-rempli dans le client mail par défaut, boîte qualité en copie — rien n'est envoyé automatiquement. Le vérificateur relit et envoie lui-même après la réunion.</div>
            <div class="btn-row"><button class="btn primary" data-dictee-open-draft>✉ Ouvrir le brouillon</button></div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ---------------------------------------------------------------------------
// PAGE STATISTIQUES — reprise du dashboard v1 (NC/web/)
// ---------------------------------------------------------------------------

function barChart(data, max) {
  const m = max || Math.max(...data.map((d) => d.count));
  return `
    <div class="bar-chart">
      ${data.map((d) => `
        <div class="bar-row">
          <span class="bar-label">${d.label || d.mois}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(d.count / m) * 100}%"></div></div>
          <span class="bar-value">${d.count}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderStatsPage() {
  return `
    <div class="stats-page">
      <div class="stats-toolbar">
        <div class="field" style="margin:0"><label>Période</label>
          <select data-stats-filter="periode">
            <option value="6m" ${state.stats.periode === "6m" ? "selected" : ""}>6 derniers mois</option>
            <option value="1y" ${state.stats.periode === "1y" ? "selected" : ""}>Année en cours</option>
            <option value="all" ${state.stats.periode === "all" ? "selected" : ""}>Tout l'historique</option>
          </select>
        </div>
        <div class="field" style="margin:0"><label>Service</label>
          <select data-stats-filter="service"><option value="">Tous</option>${SERVICES_IMPACTES.map((s) => `<option ${state.stats.service === s ? "selected" : ""}>${s}</option>`).join("")}</select>
        </div>
        <div class="field" style="margin:0"><label>Cause</label>
          <select data-stats-filter="cause"><option value="">Toutes</option>${CAUSES.map((c) => `<option ${state.stats.cause === c ? "selected" : ""}>${c}</option>`).join("")}</select>
        </div>
        <div class="field" style="margin:0"><label>Statut</label>
          <select data-stats-filter="statut">
            <option value="">Tous</option>
            <option value="nouveau" ${state.stats.statut === "nouveau" ? "selected" : ""}>Nouveau</option>
            <option value="en_cours" ${state.stats.statut === "en_cours" ? "selected" : ""}>En cours</option>
            <option value="cloture" ${state.stats.statut === "cloture" ? "selected" : ""}>Clôturé</option>
          </select>
        </div>
        <div class="field" style="margin:0"><label>Type de NC</label>
          <select data-stats-filter="type"><option value="">Tous</option>${TYPES_NC.map((t) => `<option ${state.stats.type === t ? "selected" : ""}>${t}</option>`).join("")}</select>
        </div>
        <div class="field" style="margin:0"><label>Gravité</label>
          <select data-stats-filter="gravite"><option value="">Toutes</option>${NIVEAUX_INDICE.map((n) => `<option ${state.stats.gravite === n ? "selected" : ""}>${n}</option>`).join("")}</select>
        </div>
        <div class="field" style="margin:0"><label>Origine</label>
          <select data-stats-filter="origine"><option value="">Toutes</option>${ORIGINES.map((o) => `<option ${state.stats.origine === o ? "selected" : ""}>${o}</option>`).join("")}</select>
        </div>
        <div class="field" style="margin:0;flex:1;min-width:200px">
          <label>Recherche texte</label>
          <input type="text" data-stats-search value="${state.stats.recherche}" placeholder="Réf. produit, client, mot-clé…" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px" />
        </div>
        <button class="btn" data-stats-export style="margin-left:auto">⬇ Export Excel (filtres appliqués)</button>
      </div>

      <div class="stats-body">
        <div class="kpi-row">
          <div class="kpi-card"><div class="kpi-value">${STATS_KPI.ncActives}</div><div class="kpi-label">NC actives</div></div>
          <div class="kpi-card"><div class="kpi-value">${STATS_KPI.scoreIaMoyen}%</div><div class="kpi-label">Score IA moyen</div></div>
          <div class="kpi-card"><div class="kpi-value">${STATS_KPI.tauxResolutionMois}%</div><div class="kpi-label">Taux de résolution (mois)</div></div>
          <div class="kpi-card"><div class="kpi-value">${STATS_KPI.tempsMoyenResolutionJours} j</div><div class="kpi-label">Temps moyen de résolution</div></div>
        </div>

        <div class="two-col">
          <div class="col">
            <div class="card">
              <h3>Évolution du nombre de NC</h3>
              ${barChart(STATS_EVOLUTION_MENSUELLE)}
            </div>
            <div class="card">
              <h3>Répartition par service impacté</h3>
              ${barChart(STATS_PAR_SERVICE)}
            </div>
            <div class="card">
              <h3>Répartition par cause (regroupement « Autres »)</h3>
              ${barChart(STATS_PAR_CAUSE)}
            </div>
            <div class="card">
              <h3>Répartition par indice de gravité</h3>
              ${barChart(STATS_PAR_GRAVITE)}
            </div>
          </div>
          <div class="col" style="max-width:340px">
            <div class="card">
              <h3>Top 3 des causes</h3>
              ${STATS_TOP_CAUSES.map((c, i) => `<div class="top-item"><span class="rank">${i + 1}</span>${c.cause}<span class="small-muted" style="margin-left:auto">${c.count}</span></div>`).join("")}
            </div>
            <div class="card">
              <h3>NC urgentes récentes</h3>
              ${STATS_NC_URGENTES.map((id) => `<div class="link-inline" data-open-nc="${id}" style="display:block;margin-bottom:6px">${id} — ${NCS[id].referenceProduit}</div>`).join("")}
            </div>
            <div class="card">
              <h3>En attente de validation IA</h3>
              ${STATS_NC_ATTENTE_VALIDATION.map((mid) => `<div class="small-muted" style="margin-bottom:6px">${getMail(mid).subject}</div>`).join("")}
            </div>
            <div class="card">
              <h3>⚠ Coûts — non renseigné ≠ 0 €</h3>
              <div class="small-muted" style="line-height:1.6">
                Seules <b>${STATS_PART_COUT_RENSEIGNE}%</b> des NC ont un coût réellement non nul.
                Les autres sont <b>non renseignées</b>, pas à « 0 € » — l'export et les graphiques distinguent explicitement les deux (voir PLAN_TECHNIQUE.md §9).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// PAGE ADMINISTRATION — accès restreint (seule zone distincte du reste de
// l'application, voir VISION_APP_FINALE.md, section "Rôles / accès")
// ---------------------------------------------------------------------------

function renderSyncReportView() {
  return `
    <div class="card">
      <h3>Rapport de synchronisation Excel</h3>
      <div class="note-box">
        Sens unique, hebdomadaire, application → Excel : ce journal trace chaque exécution
        (lignes poussées, échecs éventuels) — un filet de sécurité consultable si un problème
        survient côté application (voir PLAN_TECHNIQUE.md §7).
      </div>
      <div class="sync-report-list">
        ${SYNC_REPORTS.map((r) => `
          <div class="sync-report-row ${r.echecs > 0 ? "has-error" : ""}">
            <div class="sync-report-date">${formatDateShort(r.date)}</div>
            <div class="sync-report-count">${r.lignesPoussees} lignes poussées</div>
            <div class="sync-report-count ${r.echecs > 0 ? "error" : "ok"}">${r.echecs} échec${r.echecs > 1 ? "s" : ""}</div>
            <div class="sync-report-details">${r.details}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderAdminPage() {
  const listNames = Object.keys(REF_LISTS);
  const onSync = state.admin.activeList === "__sync__";
  const active = REF_LISTS[state.admin.activeList];
  return `
    <div class="admin-page">
      <div class="folder-note">🔒 Accès restreint — seule zone de l'application distincte du reste, sans gestion de comptes ailleurs.</div>
      <div class="admin-body">
        <div class="pane admin-lists-nav">
          <div class="pane-header">Listes de référence</div>
          ${listNames.map((name) => `
            <div class="admin-list-item ${state.admin.activeList === name ? "selected" : ""}" data-admin-list="${name}">
              ${name} <span class="badge-count">${REF_LISTS[name].items.length}</span>
            </div>
          `).join("")}
          <div class="pane-header" style="margin-top:8px">Champs personnalisés</div>
          <div style="padding:10px 16px" class="small-muted">${CHAMPS_PERSONNALISES.length} champ(s) créé(s)</div>
          <div class="pane-header" style="margin-top:8px">Synchronisation</div>
          <div class="admin-list-item ${onSync ? "selected" : ""}" data-admin-list="__sync__">
            🔄 Rapport de synchronisation Excel
          </div>
        </div>

        <div class="admin-detail">
          ${onSync ? renderSyncReportView() : `
          <div class="card">
            <h3>${state.admin.activeList}</h3>
            <div class="admin-values">
              ${active.items.map((v) => `
                <span class="admin-value-chip">
                  ${v}
                  ${active.locked.includes(v) ? "" : `<button data-admin-remove="${v}" title="Retirer">✕</button>`}
                </span>
              `).join("")}
            </div>
            ${active.locked.length === active.items.length && active.locked.length ? `<div class="small-muted" style="margin-top:8px">Liste fixe (5 niveaux d'indice ou catégories du process réel) — non modifiable.</div>` : `
              <div class="btn-row">
                <input type="text" data-admin-new-value placeholder="Nouvelle valeur…" value="${state.admin.newValue}" style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px" />
                <button class="btn primary" data-admin-add-value>+ Ajouter</button>
              </div>
            `}
          </div>

          <div class="card">
            <h3>Créer un nouveau champ personnalisé</h3>
            <div class="note-box">
              Le champ devient disponible pour toutes les NC à partir de sa création (comme une nouvelle colonne Excel) — les NC et versions déjà existantes restent vides sur ce champ, sans rattrapage rétroactif.
            </div>
            <div class="two-col">
              <div class="col">
                <div class="field"><label>Libellé du champ</label><input type="text" data-admin-field-name value="${state.admin.newFieldName}" placeholder="ex : Numéro de lot" /></div>
                <div class="field"><label>Type</label>
                  <select data-admin-field-type>
                    <option value="texte" ${state.admin.newFieldType === "texte" ? "selected" : ""}>Texte libre</option>
                    <option value="liste" ${state.admin.newFieldType === "liste" ? "selected" : ""}>Liste de valeurs</option>
                    <option value="date" ${state.admin.newFieldType === "date" ? "selected" : ""}>Date</option>
                    <option value="nombre" ${state.admin.newFieldType === "nombre" ? "selected" : ""}>Nombre</option>
                  </select>
                </div>
              </div>
              <div class="col">
                <div class="small-muted" style="line-height:1.6">
                  Limite à anticiper : sans historique, l'IA proposera une valeur uniquement à partir de la définition du champ et du contenu du mail — confiance naturellement plus faible sur les champs tout juste créés.
                </div>
              </div>
            </div>
            <div class="btn-row"><button class="btn primary" data-admin-create-field">+ Créer le champ</button></div>
          </div>

          <div class="card">
            <h3>Champs personnalisés existants</h3>
            <div class="kv" style="grid-template-columns:200px 1fr">
              ${CHAMPS_PERSONNALISES.map((f) => `
                <div class="k">${f.libelle}</div>
                <div>${f.type}${f.valeurs ? ` (${f.valeurs.join(" / ")})` : ""} — actif depuis le ${formatDateShort(f.creeLe)}</div>
              `).join("")}
            </div>
          </div>
          `}
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// MODALE DE CONFIRMATION — Administration (toute mutation d'un référentiel
// partagé doit être confirmée explicitement avant application)
// ---------------------------------------------------------------------------

function renderAdminConfirmModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "modal-overlay";
  const c = state.admin.confirm;
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-head">
        <div><h2>Confirmer la modification</h2></div>
        <button class="modal-close" data-cancel-admin-confirm>✕</button>
      </div>
      <div class="modal-body">
        <div class="note-box">${c.message}</div>
        <div class="btn-row" style="justify-content:flex-end">
          <button class="btn subtle" data-cancel-admin-confirm>Annuler</button>
          <button class="btn primary" data-confirm-admin>✓ Confirmer</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
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

  $app.querySelectorAll("[data-validation-tab]").forEach((el) =>
    el.addEventListener("click", () => { state.validation.tab = el.dataset.validationTab; render(); })
  );

  $app.querySelectorAll("[data-toggle-sort]").forEach((el) =>
    el.addEventListener("click", () => {
      state.validation.sort = state.validation.sort === "asc" ? "desc" : "asc";
      render();
    })
  );

  $app.querySelectorAll("[data-toggle-change-nc]").forEach((el) =>
    el.addEventListener("click", () => {
      const mailId = el.dataset.toggleChangeNc;
      state.validation.changingNc[mailId] = true;
      render();
    })
  );
  $app.querySelectorAll("[data-change-nc-select]").forEach((el) =>
    el.addEventListener("change", () => {
      const mailId = el.dataset.changeNcSelect;
      if (!el.value) return;
      state.validation.ncTargetOverride[mailId] = el.value;
      state.validation.changingNc[mailId] = false;
      toast(`Mail rattaché à ${el.value} (simulation)`);
      render();
    })
  );

  $app.querySelectorAll("[data-toggle-collapse]").forEach((el) =>
    el.addEventListener("click", () => {
      const key = el.dataset.toggleCollapse;
      state.validation.collapsed[key] = !state.validation.collapsed[key];
      render();
    })
  );

  $app.querySelectorAll("[data-similar-mail]").forEach((el) =>
    el.addEventListener("click", () => {
      const mailId = el.dataset.similarMail;
      const simId = el.dataset.similarId;
      state.validation.comparisonSelected[mailId] = state.validation.comparisonSelected[mailId] === simId ? null : simId;
      render();
    })
  );

  $app.querySelectorAll("[data-overwrite-field]").forEach((el) =>
    el.addEventListener("click", () => {
      const mailId = el.dataset.overwriteField;
      const key = el.dataset.overwriteKey;
      const simId = el.dataset.overwriteSimilar;
      const similaires = HISTORIQUE_SIMILAIRES[mailId] || [];
      const sim = similaires.find((s) => s.id === simId);
      if (!sim) return;
      if (!state.validation.prefillOverrides[mailId]) state.validation.prefillOverrides[mailId] = {};
      state.validation.prefillOverrides[mailId][key] = { value: sim.champs[key], from: simId };
      toast(`Valeur écrasée depuis ${simId} (simulation)`);
      render();
    })
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

  $app.querySelectorAll("[data-open-dictee]").forEach((el) =>
    el.addEventListener("click", () => { state.suivi.dicteeOpen = true; render(); })
  );

  // ---- Statistiques ----
  $app.querySelectorAll("[data-stats-filter]").forEach((el) =>
    el.addEventListener("change", () => { state.stats[el.dataset.statsFilter] = el.value; render(); })
  );
  $app.querySelectorAll("[data-stats-search]").forEach((el) =>
    el.addEventListener("input", () => { state.stats.recherche = el.value; })
  );
  $app.querySelectorAll("[data-stats-export]").forEach((el) =>
    el.addEventListener("click", () => toast("Export Excel généré avec les filtres actuels (simulation)"))
  );

  // ---- Administration ----
  $app.querySelectorAll("[data-admin-list]").forEach((el) =>
    el.addEventListener("click", () => { state.admin.activeList = el.dataset.adminList; state.admin.newValue = ""; render(); })
  );
  $app.querySelectorAll("[data-admin-new-value]").forEach((el) =>
    el.addEventListener("input", () => { state.admin.newValue = el.value; })
  );
  $app.querySelectorAll("[data-admin-add-value]").forEach((el) =>
    el.addEventListener("click", () => {
      const v = state.admin.newValue.trim();
      if (!v) return;
      state.admin.confirm = {
        type: "add",
        payload: { list: state.admin.activeList, value: v },
        message: `Ajouter « ${v} » à la liste « ${state.admin.activeList} » ? Cette liste est partagée par toute l'application.`,
      };
      render();
    })
  );
  $app.querySelectorAll("[data-admin-remove]").forEach((el) =>
    el.addEventListener("click", () => {
      const v = el.dataset.adminRemove;
      state.admin.confirm = {
        type: "remove",
        payload: { list: state.admin.activeList, value: v },
        message: `Retirer « ${v} » de la liste « ${state.admin.activeList} » ? Les NC déjà saisies avec cette valeur la conserveront.`,
      };
      render();
    })
  );
  $app.querySelectorAll("[data-admin-field-name]").forEach((el) =>
    el.addEventListener("input", () => { state.admin.newFieldName = el.value; })
  );
  $app.querySelectorAll("[data-admin-field-type]").forEach((el) =>
    el.addEventListener("change", () => { state.admin.newFieldType = el.value; })
  );
  $app.querySelectorAll("[data-admin-create-field]").forEach((el) =>
    el.addEventListener("click", () => {
      const name = state.admin.newFieldName.trim();
      if (!name) { toast("Donnez un libellé au champ avant de le créer"); return; }
      state.admin.confirm = {
        type: "create-field",
        payload: { name, fieldType: state.admin.newFieldType },
        message: `Créer le champ personnalisé « ${name} » (${state.admin.newFieldType}) ? Il sera disponible pour toutes les NC à partir de leur prochaine version — les versions déjà existantes resteront vides sur ce champ.`,
      };
      render();
    })
  );

  const overlay = document.getElementById("modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) { state.suivi.modalNc = null; state.suivi.dicteeOpen = false; state.admin.confirm = null; render(); }
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

    const closeDicteeBtn = overlay.querySelector("[data-close-dictee]");
    if (closeDicteeBtn) closeDicteeBtn.addEventListener("click", () => { state.suivi.dicteeOpen = false; render(); });

    const dicteeNcSelect = overlay.querySelector("[data-dictee-nc]");
    if (dicteeNcSelect) dicteeNcSelect.addEventListener("change", () => { state.suivi.dictee.ncId = dicteeNcSelect.value; render(); });

    const dicteeTranscript = overlay.querySelector("[data-dictee-transcript]");
    if (dicteeTranscript) dicteeTranscript.addEventListener("input", () => { state.suivi.dictee.transcript = dicteeTranscript.value; });

    const dicteeSimulate = overlay.querySelector("[data-dictee-simulate]");
    if (dicteeSimulate) dicteeSimulate.addEventListener("click", () => {
      state.suivi.dictee.transcript = "Le client confirme que l'intervention réalisée sur site a résolu le défaut signalé, on peut considérer le dossier en bonne voie pour la clôture.";
      render();
    });

    const dicteeGenerate = overlay.querySelector("[data-dictee-generate]");
    if (dicteeGenerate) dicteeGenerate.addEventListener("click", () => {
      if (!state.suivi.dictee.ncId) { toast("Sélectionnez une NC avant de générer le brouillon"); return; }
      state.suivi.dictee.genere = true;
      render();
    });

    const dicteeOpenDraft = overlay.querySelector("[data-dictee-open-draft]");
    if (dicteeOpenDraft) dicteeOpenDraft.addEventListener("click", () => toast("Brouillon ouvert dans le client mail par défaut, qualite@transalp.fr en copie (simulation)"));

    overlay.querySelectorAll("[data-cancel-admin-confirm]").forEach((b) =>
      b.addEventListener("click", () => { state.admin.confirm = null; render(); })
    );
    const confirmAdminBtn = overlay.querySelector("[data-confirm-admin]");
    if (confirmAdminBtn) confirmAdminBtn.addEventListener("click", () => {
      const c = state.admin.confirm;
      if (c.type === "add") {
        REF_LISTS[c.payload.list].items.push(c.payload.value);
        state.admin.newValue = "";
        toast(`« ${c.payload.value} » ajouté à la liste « ${c.payload.list} »`);
      } else if (c.type === "remove") {
        const list = REF_LISTS[c.payload.list];
        list.items = list.items.filter((v) => v !== c.payload.value);
        toast(`« ${c.payload.value} » retiré (les NC déjà saisies conservent l'ancienne valeur)`);
      } else if (c.type === "create-field") {
        CHAMPS_PERSONNALISES.push({ cle: c.payload.name.toLowerCase().replace(/\s+/g, "_"), libelle: c.payload.name, type: c.payload.fieldType, creeLe: TODAY_ISO });
        state.admin.newFieldName = "";
        toast(`Champ « ${c.payload.name} » créé — disponible à partir de la prochaine version de chaque NC`);
      }
      state.admin.confirm = null;
      render();
    });
  }
}

render();
