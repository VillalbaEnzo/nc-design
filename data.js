/* =========================================================================
   DONNÉES D'EXEMPLE — maquette statique, aucune donnée réelle.

   Les champs des NC reprennent le vocabulaire et la structure du tableau
   Excel réel (feuille "BDQ") : N° de NC, Référence produit, N° Commande,
   Client, Type de NC (NCI/NCE/NCF/SAV/Non recevable), Service impacté,
   Cause, Description de l'anomalie, Action, Action curative immédiate,
   Responsable, Niveau indice (Aucun/Mineur/Moyen/Majeur), Date de clôture.

   Certains champs (Description de l'anomalie, Action curative immédiate)
   sont traités comme des journaux à entrées datées qui s'additionnent au
   fil des mails, exactement comme dans l'Excel où ces cellules
   contiennent un historique de lignes datées empilées les unes sur les
   autres — plutôt que comme un champ qu'on écraserait à chaque mise à
   jour.
   ========================================================================= */

// ---- Référentiels (repris des listes de la feuille "BASE LISTE") ----------

const TYPES_NC = ["NCI", "NCE", "NCF", "SAV", "Non recevable"];
const SERVICES_IMPACTES = [
  "Serrurerie", "Peinture", "BE Methode", "BE Com", "BE Créa", "ADV",
  "Commercial", "Poseur", "Transport", "Fournisseur", "Achats / Appro",
  "Transalp", "Expédition / Assemblage Jeux", "Expédition / Assemblage Sport", "HPL",
];
const CAUSES = [
  "Colis perdu", "Défaut de fabrication", "Défaut de montage sur site",
  "Demande d'informations", "Erreur de conception", "Info client incorrecte",
  "Manquants en production", "Manquants sur site", "Manquants en visserie",
  "Mauvaise communication interservice", "Non respect des délais",
  "Notice incorrecte", "Pièce endommagée", "Plan incorrect",
  "Problème d'emballage", "Problème de devis", "Rouille", "Non-conformités d'audit",
];
const ACTIONS = [
  "Achat matériel", "Correction sur le site", "Devis", "Mise à jour conception",
  "Mise à jour documents", "Refabrication", "Renvoi pièces", "Réclamation au fournisseur", "/",
];
const RESPONSABLES = ["Pierre", "Charlotte", "Matthieu", "Laurent", "Dominique", "David", "Vincent", "BE Methode", "BE Com", "Serrurerie", "Achats / Appro", "Hakim"];
// "Responsable commercial" est le champ réellement utilisé (97 % de remplissage
// dans l'Excel réel) — "Responsable" (1,4 %) reste au catalogue mais n'est pas
// mis en avant dans les formulaires. Distinction volontairement non tranchée
// (voir PLAN_TECHNIQUE.md §13 pt.4) : les deux champs coexistent tels quels.
const RESPONSABLES_COMMERCIAUX = ["Pierre", "Charlotte", "Matthieu", "Laurent", "Dominique", "David", "Vincent", "Hakim", "Nadia"];
const NIVEAUX_INDICE = ["Aucun", "Mineur", "Moyen", "Majeur", "Critique"];
const ORIGINES = ["Client", "Fournisseur", "Interne"];

// Sous-critères du bloc "Indice de gravité" (score calculé, pas saisi
// directement) — voir VISION_APP_FINALE.md, section "Champs de la fiche NC".
// Le champ "Equipe" du bloc réel n'est volontairement pas repris ici : jamais
// rempli dans l'Excel (0 %), voir PLAN_TECHNIQUE.md §13 pt.3.
const SOUS_CRITERES_GRAVITE = ["Sécurité", "Utilisateur", "Client", "Impact poseur", "Coût"];
const NIVEAU_SOUS_CRITERE = ["Aucun", "Faible", "Moyen", "Élevé"];

function niveauIndiceStyle(n) {
  return {
    Aucun: { color: "#5c5c5c", bg: "#f0f0f0" },
    Mineur: { color: "#3f7d52", bg: "#edf5ef" },
    Moyen: { color: "#93611a", bg: "#faf1e2" },
    Majeur: { color: "#a3362b", bg: "#fbeeec" },
    Critique: { color: "#ffffff", bg: "#7a1f16" },
  }[n] || { color: "#5c5c5c", bg: "#f0f0f0" };
}

// ---- Listes de référence modifiables (écran d'administration) --------------
// Copie mutable des référentiels ci-dessus : l'administration simule
// l'ajout/suppression de valeurs sans toucher aux constantes sources.
const REF_LISTS = {
  "Type de NC": { items: TYPES_NC.slice(), locked: [] },
  "Service impacté": { items: SERVICES_IMPACTES.slice(), locked: [] },
  "Cause": { items: CAUSES.slice(), locked: [] },
  "Action": { items: ACTIONS.slice(), locked: [] },
  "Responsable commercial": { items: RESPONSABLES_COMMERCIAUX.slice(), locked: [] },
  "Responsable": { items: RESPONSABLES.slice(), locked: [] },
  "Origine du signalement": { items: ORIGINES.slice(), locked: ORIGINES.slice() },
  "Niveau indice": { items: NIVEAUX_INDICE.slice(), locked: NIVEAUX_INDICE.slice() },
};

// ---- Champs personnalisés créés par l'administration ------------------------
// cree_le détermine à partir de quelle version le champ apparaît — les
// versions antérieures restent figées sans lui (voir PLAN_TECHNIQUE.md §3).
const CHAMPS_PERSONNALISES = [
  { cle: "numeroLot", libelle: "Numéro de lot", type: "texte", creeLe: "2026-07-01" },
  { cle: "delaiGarantie", libelle: "Sous garantie", type: "liste", valeurs: ["Oui", "Non", "À vérifier"], creeLe: "2026-08-15" },
];

const STATUT_COULEUR = {
  en_cours: { label: "En cours", color: "#a3362b", bg: "#fbeeec" },
  nouveau: { label: "Nouveau", color: "#33538f", bg: "#eef1f7" },
  cloture: { label: "Clôturé", color: "#3f7d52", bg: "#edf5ef" },
  hors_sujet: { label: "Hors sujet / Transféré", color: "#44474c", bg: "#eeeeef" },
};

const BADGE_INFO = {
  rattachement: { label: "Rattachement NC existante", color: "#5a5a9e", bg: "#eeeefa" },
  nouvelle_nc: { label: "Nouvelle NC", color: "#2f6f63", bg: "#e9f3f0" },
  non_recevable: { label: "Non recevable", color: "#93611a", bg: "#faf1e2" },
  hors_sujet: { label: "Hors sujet / Transfert", color: "#54575c", bg: "#eeeeef" },
};

// ---- Pièces jointes fictives -----------------------------------------------

const ATT = (name, size) => ({ name, size });

// ---- Mails ------------------------------------------------------------------
// status: en_cours | nouveau | cloture | hors_sujet  -> code couleur Outlook
// badge: rattachement | nouvelle_nc | non_recevable | hors_sujet
// aiConfidence: 0-100 (indice de fiabilité de l'IA)
// humanVerified: vérification humaine effectuée sur la décision de l'IA
// ncId: si rattaché à une NC existante

const MAILS = [
  {
    id: "m1",
    subject: "RE : NC2026-341 – Reprise peinture toboggan TOB-1204",
    from: "j.marchand@camping-des-pins.fr",
    fromName: "Julien Marchand",
    to: "qualite@transalp.fr",
    date: "2026-08-29T09:14:00",
    status: "en_cours",
    badge: "rattachement",
    ncId: "NC2026-341",
    aiConfidence: 92,
    humanVerified: true,
    preview: "Suite à notre échange, voici deux photos supplémentaires de l'écaillage sur le toboggan...",
    body: `Bonjour,

Suite à notre échange téléphonique de la semaine dernière, je vous transmets deux photos supplémentaires de l'écaillage de peinture constaté sur le toboggan TOB-1204.

Le défaut semble s'étendre légèrement depuis notre dernier constat. Merci de me confirmer si une intervention est prévue avant l'ouverture de la structure au public le 15/09.

Cordialement,
Julien Marchand
Camping des Pins`,
    attachments: [ATT("toboggan_zoom1.jpg", "2.1 Mo"), ATT("toboggan_zoom2.jpg", "1.8 Mo")],
  },
  {
    id: "m2",
    subject: "Nouveau signalement : rayure sur panneau HPL à réception",
    from: "reception@recrea-loisirs.fr",
    fromName: "Sophie Delannoy",
    to: "qualite@transalp.fr",
    date: "2026-08-29T08:02:00",
    status: "nouveau",
    badge: "nouvelle_nc",
    aiConfidence: 78,
    humanVerified: false,
    preview: "Nous avons constaté une rayure d'environ 15cm sur un panneau HPL lors de la réception...",
    body: `Bonjour,

Nous avons constaté ce matin, lors de la réception de la commande n°31240, une rayure d'environ 15 cm sur l'un des panneaux HPL. Le module n'a pas encore été assemblé.

Merci de nous indiquer la marche à suivre.

Cordialement,
Sophie Delannoy
Récréa Loisirs SAS – Réception qualité`,
    attachments: [ATT("panneau_HPL_rayure.jpg", "3.4 Mo")],
  },
  {
    id: "m3",
    subject: "RE : NC2026-318 – Portillon révisé, fonctionnement OK",
    from: "technique@espace-detente-nord.fr",
    fromName: "Marc Petit",
    to: "qualite@transalp.fr",
    date: "2026-08-28T16:40:00",
    status: "cloture",
    badge: "rattachement",
    ncId: "NC2026-318",
    aiConfidence: 95,
    humanVerified: true,
    preview: "Confirmation que le portillon réglé fonctionne normalement depuis 2 semaines, on peut clore.",
    body: `Bonjour,

Nous confirmons que le portillon d'accès au portique PORT-118, réglé le 20/08, fonctionne normalement depuis maintenant deux semaines, sans frottement ni jeu constaté.

Vous pouvez clôturer le dossier de notre côté.

Cordialement,
Marc Petit`,
    attachments: [],
  },
  {
    id: "m4",
    subject: "Tache sur toboggan neuf – à vérifier",
    from: "reception@recrea-loisirs.fr",
    fromName: "Élodie Bertin",
    to: "qualite@transalp.fr",
    date: "2026-08-28T11:05:00",
    status: "nouveau",
    badge: "non_recevable",
    aiConfidence: 65,
    humanVerified: false,
    preview: "Une tache est visible sur le toboggan livré hier, couleur légèrement différente selon nous...",
    body: `Bonjour,

Une tache est visible sur le toboggan livré hier, la couleur nous semble légèrement différente par endroits.

Pouvez-vous nous dire si c'est normal ?

Cordialement,
Élodie Bertin`,
    attachments: [ATT("toboggan_tache.jpg", "2.7 Mo")],
    resolutionNote:
      "Après vérification photo, il s'agit de saleté de chantier (poussière/boue projetée lors du terrassement), pas d'un défaut de peinture. Aucune non-conformité produit constatée.",
  },
  {
    id: "m5",
    subject: "TR : Facture fournisseur visserie inox",
    from: "compta@transalp.fr",
    fromName: "Service Comptabilité",
    to: "qualite@transalp.fr",
    date: "2026-08-28T09:30:00",
    status: "hors_sujet",
    badge: "hors_sujet",
    aiConfidence: 88,
    humanVerified: true,
    preview: "Mail transféré par erreur au service qualité, concerne une facture fournisseur.",
    body: `Bonjour,

Merci de traiter cette facture fournisseur pour la visserie inox, réf commande CDE-88213.

Cordialement,
Service Comptabilité`,
    attachments: [ATT("facture_CDE-88213.pdf", "412 Ko")],
    forwardSuggestion: "compta@transalp.fr (service émetteur, mail arrivé par erreur en qualité)",
  },
  {
    id: "m6",
    subject: "RE : NC2026-352 – Jeu persistant portillon, retour client",
    from: "j.leroy@recrea-loisirs.fr",
    fromName: "Jean Leroy",
    to: "qualite@transalp.fr",
    date: "2026-08-27T14:22:00",
    status: "en_cours",
    badge: "rattachement",
    ncId: "NC2026-352",
    aiConfidence: 90,
    humanVerified: false,
    preview: "Le jeu au niveau du portillon persiste malgré le premier réglage effectué...",
    body: `Bonjour,

Le jeu au niveau du portillon d'accès au portique PORT-556 persiste malgré le réglage effectué le 20/08. Le bruit est toujours présent au passage.

Merci de revoir le dossier.

Cordialement,
Jean Leroy`,
    attachments: [ATT("video_bruit_portillon.mp4", "8.9 Mo")],
  },
  {
    id: "m7",
    subject: "Nouveau signalement : grincement anormal des balançoires",
    from: "technique@cordelia-amenagement.fr",
    fromName: "Atelier Cordelia",
    to: "qualite@transalp.fr",
    date: "2026-08-27T08:55:00",
    status: "nouveau",
    badge: "nouvelle_nc",
    aiConfidence: 81,
    humanVerified: true,
    preview: "Un grincement métallique est audible sur les balançoires BAL-210 dès la mise en service...",
    body: `Bonjour,

Nous constatons un grincement métallique audible sur les balançoires BAL-210, dès la mise en service, sur la commande n°31088.

Le bruit est constant à chaque oscillation. Merci de nous indiquer si un contrôle est nécessaire.

Cordialement,
Atelier Cordelia`,
    attachments: [ATT("audio_grincement.mp3", "1.2 Mo")],
  },
  {
    id: "m8",
    subject: "RE : NC2026-320 – Vis remplacées, contrôle OK",
    from: "qualite@village-tilleuls.fr",
    fromName: "Nadia Fontaine",
    to: "qualite@transalp.fr",
    date: "2026-08-26T15:10:00",
    status: "cloture",
    badge: "rattachement",
    ncId: "NC2026-320",
    aiConfidence: 97,
    humanVerified: true,
    preview: "Vis remplacées en atelier le 24/08, contrôle OK, dossier peut être clôturé.",
    body: `Bonjour,

La vis de fixation manquante sur le poteau de la structure STR-090 a été remplacée en atelier le 24/08. Le contrôle post-intervention est OK.

Vous pouvez clôturer le dossier.

Cordialement,
Nadia Fontaine`,
    attachments: [ATT("controle_post_intervention.pdf", "540 Ko")],
  },
  {
    id: "m9",
    subject: "Question générale sur délai de livraison",
    from: "contact@nouveauclient-sas.fr",
    fromName: "Nouveau Client SAS",
    to: "qualite@transalp.fr",
    date: "2026-08-26T10:00:00",
    status: "hors_sujet",
    badge: "hors_sujet",
    aiConfidence: 70,
    humanVerified: false,
    preview: "Bonjour, pouvez-vous me confirmer les délais de livraison habituels pour...",
    body: `Bonjour,

Pouvez-vous me confirmer les délais de livraison habituels pour une commande de 3 structures de jeux ?

Cordialement,
Nouveau Client SAS`,
    attachments: [],
    forwardSuggestion: "commercial@transalp.fr (question commerciale, sans lien avec la qualité)",
  },
  {
    id: "m10",
    subject: "RE : NC2026-341 – Suite peinture toboggan, photos jointes",
    from: "j.marchand@camping-des-pins.fr",
    fromName: "Julien Marchand",
    to: "qualite@transalp.fr",
    date: "2026-08-30T10:47:00",
    status: "en_cours",
    badge: "rattachement",
    ncId: "NC2026-341",
    aiConfidence: 88,
    humanVerified: true,
    preview: "Voici les photos après le passage en atelier de reprise partielle...",
    body: `Bonjour,

Voici les photos après le passage en atelier pour la reprise partielle de peinture sur le toboggan. Le résultat nous semble correct, à valider de votre côté avant clôture définitive.

Cordialement,
Julien Marchand`,
    attachments: [ATT("toboggan_apres_reprise.jpg", "2.4 Mo")],
  },
  {
    id: "m11",
    subject: "Nouveau signalement : odeur plastique persistante sur cabane neuve",
    from: "reception@village-tilleuls.fr",
    fromName: "Sophie Bréant",
    to: "qualite@transalp.fr",
    date: "2026-08-25T13:18:00",
    status: "nouveau",
    badge: "nouvelle_nc",
    aiConfidence: 73,
    humanVerified: false,
    preview: "Une odeur de plastique persiste sur la cabane CAB-402 depuis la livraison...",
    body: `Bonjour,

Une odeur de plastique assez forte persiste sur la cabane CAB-402 depuis sa livraison, notamment en plein soleil.

Merci de nous indiquer si c'est un phénomène connu.

Cordialement,
Sophie Bréant`,
    attachments: [],
  },
  {
    id: "m12",
    subject: "Trace sur structure bois (pas un défaut confirmé)",
    from: "technique@camping-des-pins.fr",
    fromName: "Atelier Camping des Pins",
    to: "qualite@transalp.fr",
    date: "2026-08-24T09:00:00",
    status: "cloture",
    badge: "non_recevable",
    aiConfidence: 84,
    humanVerified: true,
    preview: "Après nettoyage, la trace a disparu, il s'agissait bien de saleté de transport.",
    body: `Bonjour,

Après nettoyage de la structure bois signalée, la trace a totalement disparu. Il s'agissait bien de saleté liée au transport et non d'un défaut matière.

Cordialement,
Atelier Camping des Pins`,
    attachments: [ATT("structure_bois_apres_nettoyage.jpg", "1.5 Mo")],
    resolutionNote: "Trace disparue après nettoyage simple : saleté de transport, aucun défaut produit.",
  },
];

// ---- NC similaires (top 10) pour les nouvelles NC ---------------------------

const HISTORIQUE_SIMILAIRES = {
  m2: [
    { id: "NC2025-441", titre: "Rayure panneau HPL à réception", score: 94, champs: {
      referenceProduit: "HPL-214", numeroCommande: "28810", client: "Aire de Jeux Vallée Verte", typeNC: "NCE", origine: "Client", serviceImpacte: "Expédition / Assemblage Jeux", dateDetection: "2025-06-14",
      cause: "Pièce endommagée", descriptionAnomalie: "Rayure de 12 cm sur panneau HPL constatée à la réception, avant assemblage.", action: "Renvoi pièces", responsable: "Achats / Appro", responsableCommercial: "Pierre", niveauIndice: "Mineur" } },
    { id: "NC2024-198", titre: "Rayure carrosserie module toboggan", score: 89, champs: {
      referenceProduit: "TOB-980", numeroCommande: "26510", client: "Commune de Pradelles", typeNC: "NCE", origine: "Client", serviceImpacte: "Peinture", dateDetection: "2024-05-02",
      cause: "Défaut de fabrication", descriptionAnomalie: "Rayure profonde sur le fût du toboggan, visible dès le déballage.", action: "Refabrication", responsable: "Charlotte", responsableCommercial: "Charlotte", niveauIndice: "Moyen" } },
    { id: "NC2025-312", titre: "Éclat peinture panneau, transport", score: 82, champs: {
      referenceProduit: "HPL-095", numeroCommande: "29120", client: "Camping Les Écureuils", typeNC: "NCF", origine: "Fournisseur", serviceImpacte: "Transport", dateDetection: "2025-03-11",
      cause: "Problème d'emballage", descriptionAnomalie: "Éclats de peinture sur un panneau, emballage insuffisant pour le transport.", action: "Réclamation au fournisseur", responsable: "Vincent", responsableCommercial: "Matthieu", niveauIndice: "Mineur" } },
    { id: "NC2023-076", titre: "Rayure profonde panneau de façade", score: 79, champs: {
      referenceProduit: "HPL-050", numeroCommande: "24310", client: "Mairie de Vergonne", typeNC: "NCE", origine: "Client", serviceImpacte: "Serrurerie", dateDetection: "2023-09-20",
      cause: "Défaut de montage sur site", descriptionAnomalie: "Rayure profonde constatée après montage, origine incertaine.", action: "Correction sur le site", responsable: "Serrurerie", responsableCommercial: "Laurent", niveauIndice: "Moyen" } },
    { id: "NC2025-503", titre: "Rayure superficielle toit de cabane", score: 74, champs: {
      referenceProduit: "CAB-330", numeroCommande: "29650", client: "Village Vacances Beaulieu", typeNC: "Non recevable", origine: "Client", serviceImpacte: "Poseur", dateDetection: "2025-08-02",
      cause: "Info client incorrecte", descriptionAnomalie: "Rayure superficielle signalée, finalement trace de feutre nettoyable.", action: "/", responsable: "Dominique", responsableCommercial: "Dominique", niveauIndice: "Aucun" } },
    { id: "NC2024-390", titre: "Choc léger panneau lors du déchargement", score: 71, champs: {
      referenceProduit: "HPL-140", numeroCommande: "27200", client: "Récré Action Ouest", typeNC: "SAV", origine: "Client", serviceImpacte: "Transport", dateDetection: "2024-10-05",
      cause: "Manquants sur site", descriptionAnomalie: "Choc léger constaté sur un panneau lors du déchargement du camion.", action: "Devis", responsable: "David", responsableCommercial: "David", niveauIndice: "Mineur" } },
    { id: "NC2022-158", titre: "Rayure HPL due à un sanglage serré", score: 68, champs: {
      referenceProduit: "HPL-012", numeroCommande: "21870", client: "Commune de Sainte-Row", typeNC: "NCI", origine: "Interne", serviceImpacte: "Expédition / Assemblage Sport", dateDetection: "2022-11-18",
      cause: "Non respect des délais", descriptionAnomalie: "Marque de sanglage trop serré ayant rayé le panneau pendant le transport.", action: "Mise à jour documents", responsable: "BE Methode", responsableCommercial: "Vincent", niveauIndice: "Mineur" } },
    { id: "NC2025-021", titre: "Marque de frottement porte coulissante", score: 65, champs: {
      referenceProduit: "CAB-410", numeroCommande: "28990", client: "Espace Détente Sud", typeNC: "Non recevable", origine: "Client", serviceImpacte: "Poseur", dateDetection: "2025-01-09",
      cause: "Info client incorrecte", descriptionAnomalie: "Marque de frottement signalée, usage normal de la porte coulissante.", action: "/", responsable: "Laurent", responsableCommercial: "Hakim", niveauIndice: "Aucun" } },
    { id: "NC2024-266", titre: "Éraflure bas de structure", score: 61, champs: {
      referenceProduit: "STR-160", numeroCommande: "27510", client: "Récréa Loisirs SAS", typeNC: "SAV", origine: "Client", serviceImpacte: "Serrurerie", dateDetection: "2024-07-22",
      cause: "Rouille", descriptionAnomalie: "Éraflure en bas de structure ayant favorisé un point de rouille naissant.", action: "Correction sur le site", responsable: "Serrurerie", responsableCommercial: "Nadia", niveauIndice: "Mineur" } },
    { id: "NC2023-410", titre: "Rayure sur panneau arrière module", score: 58, champs: {
      referenceProduit: "HPL-201", numeroCommande: "25430", client: "Groupe Cordelia Aménagement", typeNC: "NCF", origine: "Fournisseur", serviceImpacte: "Fournisseur", dateDetection: "2023-12-01",
      cause: "Pièce endommagée", descriptionAnomalie: "Rayure sur le panneau arrière constatée dès réception du lot fournisseur.", action: "Réclamation au fournisseur", responsable: "Achats / Appro", responsableCommercial: "Pierre", niveauIndice: "Mineur" } },
  ],
  m7: [
    { id: "NC2025-377", titre: "Grincement métallique portique à la mise en service", score: 91, champs: {
      referenceProduit: "PORT-330", numeroCommande: "29010", client: "Commune de Vallonne", typeNC: "NCE", origine: "Client", serviceImpacte: "Serrurerie", dateDetection: "2025-05-19",
      cause: "Défaut de fabrication", descriptionAnomalie: "Grincement métallique constant sur le portique, dès la mise en service.", action: "Réclamation au fournisseur", responsable: "Serrurerie", responsableCommercial: "Charlotte", niveauIndice: "Mineur" } },
    { id: "NC2024-229", titre: "Cliquetis chaîne de balançoire", score: 84, champs: {
      referenceProduit: "BAL-150", numeroCommande: "26980", client: "Espace Détente Nord", typeNC: "SAV", origine: "Client", serviceImpacte: "Serrurerie", dateDetection: "2024-04-11",
      cause: "Manquants en visserie", descriptionAnomalie: "Cliquetis de chaîne dû à une fixation mal serrée.", action: "Correction sur le site", responsable: "Serrurerie", responsableCommercial: "Matthieu", niveauIndice: "Mineur" } },
    { id: "NC2025-140", titre: "Bruit anormal axe de rotation manège", score: 77, champs: {
      referenceProduit: "MAN-090", numeroCommande: "28510", client: "Village Vacances Les Tilleuls", typeNC: "NCI", origine: "Interne", serviceImpacte: "BE Methode", dateDetection: "2025-02-24",
      cause: "Erreur de conception", descriptionAnomalie: "Bruit anormal de l'axe de rotation, jeu mécanique trop important.", action: "Mise à jour conception", responsable: "BE Methode", responsableCommercial: "Laurent", niveauIndice: "Moyen" } },
    { id: "NC2023-355", titre: "Grincement intermittent structure serrurerie", score: 73, champs: {
      referenceProduit: "STR-410", numeroCommande: "24990", client: "Camping des Pins", typeNC: "SAV", origine: "Client", serviceImpacte: "Serrurerie", dateDetection: "2023-08-30",
      cause: "Défaut de montage sur site", descriptionAnomalie: "Grincement intermittent selon la météo, jonctions métalliques à revoir.", action: "Correction sur le site", responsable: "Serrurerie", responsableCommercial: "Dominique", niveauIndice: "Mineur" } },
    { id: "NC2024-088", titre: "Vibration portique par grand vent", score: 69, champs: {
      referenceProduit: "PORT-200", numeroCommande: "26120", client: "Mairie de Vallonne", typeNC: "Non recevable", origine: "Client", serviceImpacte: "Poseur", dateDetection: "2024-01-15",
      cause: "Info client incorrecte", descriptionAnomalie: "Vibration signalée par vent fort, comportement normal de la structure.", action: "/", responsable: "Dominique", responsableCommercial: "David", niveauIndice: "Aucun" } },
    { id: "NC2022-301", titre: "Sifflement toboggan tube métallique", score: 66, champs: {
      referenceProduit: "TOB-075", numeroCommande: "22340", client: "Récréa Loisirs SAS", typeNC: "NCF", origine: "Fournisseur", serviceImpacte: "Fournisseur", dateDetection: "2022-06-08",
      cause: "Défaut de fabrication", descriptionAnomalie: "Sifflement du vent dans le tube métallique du toboggan, ébavurage insuffisant.", action: "Réclamation au fournisseur", responsable: "Achats / Appro", responsableCommercial: "Vincent", niveauIndice: "Mineur" } },
    { id: "NC2025-459", titre: "Claquement fixation balançoire", score: 63, champs: {
      referenceProduit: "BAL-260", numeroCommande: "29380", client: "Groupe Cordelia Aménagement", typeNC: "SAV", origine: "Client", serviceImpacte: "Serrurerie", dateDetection: "2025-07-02",
      cause: "Manquants en visserie", descriptionAnomalie: "Claquement au niveau de la fixation haute de la balançoire.", action: "Achat matériel", responsable: "Serrurerie", responsableCommercial: "Hakim", niveauIndice: "Mineur" } },
    { id: "NC2024-512", titre: "Bruit anormal roulement tourniquet", score: 60, champs: {
      referenceProduit: "TRN-045", numeroCommande: "27860", client: "Village Vacances Beaulieu", typeNC: "NCI", origine: "Interne", serviceImpacte: "BE Methode", dateDetection: "2024-11-27",
      cause: "Défaut de fabrication", descriptionAnomalie: "Bruit de roulement anormal sur le tourniquet, graissage insuffisant en sortie d'atelier.", action: "Mise à jour documents", responsable: "BE Methode", responsableCommercial: "Nadia", niveauIndice: "Mineur" } },
    { id: "NC2023-199", titre: "Grincement portillon accès structure", score: 57, champs: {
      referenceProduit: "PORT-118", numeroCommande: "24010", client: "Espace Détente Nord", typeNC: "SAV", origine: "Client", serviceImpacte: "Serrurerie", dateDetection: "2023-05-14",
      cause: "Défaut de montage sur site", descriptionAnomalie: "Grincement du portillon d'accès, charnières à régler.", action: "Correction sur le site", responsable: "Serrurerie", responsableCommercial: "Pierre", niveauIndice: "Mineur" } },
    { id: "NC2021-233", titre: "Cliquetis chaîne portique", score: 54, champs: {
      referenceProduit: "PORT-060", numeroCommande: "19870", client: "Commune de Sainte-Row", typeNC: "SAV", origine: "Client", serviceImpacte: "Serrurerie", dateDetection: "2021-09-09",
      cause: "Manquants en visserie", descriptionAnomalie: "Cliquetis de chaîne sur portique, resserrage nécessaire.", action: "Correction sur le site", responsable: "Serrurerie", responsableCommercial: "Charlotte", niveauIndice: "Mineur" } },
  ],
  m11: [
    { id: "NC2024-347", titre: "Odeur plastique module rotomoulé neuf", score: 87, champs: {
      referenceProduit: "CAB-310", numeroCommande: "26640", client: "Récréa Loisirs SAS", typeNC: "NCF", origine: "Fournisseur", serviceImpacte: "Fournisseur", dateDetection: "2024-06-21",
      cause: "Défaut de fabrication", descriptionAnomalie: "Odeur de plastique marquée sur un module rotomoulé neuf, atténuée après 3 semaines.", action: "Réclamation au fournisseur", responsable: "Achats / Appro", responsableCommercial: "Matthieu", niveauIndice: "Mineur" } },
    { id: "NC2023-288", titre: "Odeur forte cabane exposée au soleil", score: 75, champs: {
      referenceProduit: "CAB-220", numeroCommande: "24780", client: "Camping des Pins", typeNC: "Non recevable", origine: "Client", serviceImpacte: "Poseur", dateDetection: "2023-07-30",
      cause: "Info client incorrecte", descriptionAnomalie: "Odeur forte en plein soleil, dissipée après aération, non lié à un défaut matière.", action: "/", responsable: "Laurent", responsableCommercial: "Laurent", niveauIndice: "Aucun" } },
    { id: "NC2025-062", titre: "Odeur persistante toboggan plastique", score: 70, champs: {
      referenceProduit: "TOB-410", numeroCommande: "28150", client: "Village Vacances Les Tilleuls", typeNC: "NCF", origine: "Fournisseur", serviceImpacte: "Fournisseur", dateDetection: "2025-01-28",
      cause: "Défaut de fabrication", descriptionAnomalie: "Odeur persistante sur toboggan plastique, matière première suspectée.", action: "Réclamation au fournisseur", responsable: "Achats / Appro", responsableCommercial: "Dominique", niveauIndice: "Mineur" } },
    { id: "NC2022-411", titre: "Odeur matière neuve module de jeu", score: 66, champs: {
      referenceProduit: "STR-330", numeroCommande: "22980", client: "Mairie de Vallonne", typeNC: "Non recevable", origine: "Client", serviceImpacte: "Poseur", dateDetection: "2022-10-14",
      cause: "Info client incorrecte", descriptionAnomalie: "Odeur de matière neuve normale, dissipée après une semaine d'utilisation.", action: "/", responsable: "Dominique", responsableCommercial: "David", niveauIndice: "Aucun" } },
    { id: "NC2024-190", titre: "Odeur résine structure composite", score: 62, champs: {
      referenceProduit: "STR-280", numeroCommande: "26410", client: "Commune de Pradelles", typeNC: "NCI", origine: "Interne", serviceImpacte: "BE Methode", dateDetection: "2024-03-08",
      cause: "Erreur de conception", descriptionAnomalie: "Odeur de résine sur structure composite, formulation à revoir avec le fournisseur.", action: "Mise à jour conception", responsable: "BE Methode", responsableCommercial: "Vincent", niveauIndice: "Moyen" } },
    { id: "NC2023-097", titre: "Odeur colle assemblage panneau", score: 59, champs: {
      referenceProduit: "HPL-160", numeroCommande: "23640", client: "Espace Détente Sud", typeNC: "NCI", origine: "Interne", serviceImpacte: "Expédition / Assemblage Jeux", dateDetection: "2023-02-19",
      cause: "Défaut de fabrication", descriptionAnomalie: "Odeur de colle sur panneau assemblé, séchage insuffisant avant expédition.", action: "Mise à jour documents", responsable: "BE Methode", responsableCommercial: "Hakim", niveauIndice: "Mineur" } },
    { id: "NC2025-233", titre: "Odeur caoutchouc revêtement sol souple", score: 55, champs: {
      referenceProduit: "SOL-090", numeroCommande: "29240", client: "Groupe Cordelia Aménagement", typeNC: "NCF", origine: "Fournisseur", serviceImpacte: "Fournisseur", dateDetection: "2025-04-03",
      cause: "Défaut de fabrication", descriptionAnomalie: "Odeur de caoutchouc marquée sur le revêtement de sol souple livré.", action: "Réclamation au fournisseur", responsable: "Achats / Appro", responsableCommercial: "Nadia", niveauIndice: "Mineur" } },
    { id: "NC2021-176", titre: "Odeur persistante bac à sable plastique", score: 52, champs: {
      referenceProduit: "BAC-040", numeroCommande: "20110", client: "Camping Les Écureuils", typeNC: "Non recevable", origine: "Client", serviceImpacte: "Poseur", dateDetection: "2021-06-25",
      cause: "Info client incorrecte", descriptionAnomalie: "Odeur de plastique neuf sur bac à sable, dissipée naturellement.", action: "/", responsable: "Laurent", responsableCommercial: "Pierre", niveauIndice: "Aucun" } },
    { id: "NC2024-405", titre: "Odeur électrique éclairage structure", score: 49, champs: {
      referenceProduit: "ECL-015", numeroCommande: "27340", client: "Récré Action Ouest", typeNC: "SAV", origine: "Client", serviceImpacte: "Fournisseur", dateDetection: "2024-09-16",
      cause: "Défaut de fabrication", descriptionAnomalie: "Légère odeur électrique au niveau du bloc d'éclairage, composant à remplacer.", action: "Renvoi pièces", responsable: "Achats / Appro", responsableCommercial: "Charlotte", niveauIndice: "Moyen" } },
    { id: "NC2022-064", titre: "Odeur plastique fondu élément toboggan", score: 46, champs: {
      referenceProduit: "TOB-020", numeroCommande: "21430", client: "Village Vacances Beaulieu", typeNC: "NCF", origine: "Fournisseur", serviceImpacte: "Fournisseur", dateDetection: "2022-02-11",
      cause: "Défaut de fabrication", descriptionAnomalie: "Odeur de plastique fondu sur un élément, défaut de moulage suspecté.", action: "Réclamation au fournisseur", responsable: "Achats / Appro", responsableCommercial: "Matthieu", niveauIndice: "Mineur" } },
  ],
};

// Pré-remplissage IA pour une "Nouvelle NC" — mêmes champs que le tableau Excel
const PREREMPLISSAGE_NOUVELLE_NC = {
  m2: {
    numero: "NC2026-357",
    referenceProduit: "HPL-330",
    numeroCommande: "31240",
    client: "Récréa Loisirs SAS",
    typeNC: "NCE",
    serviceImpacte: "Expédition / Assemblage Jeux",
    origine: "Client",
    origineAuto: true,
    responsableCommercial: "Vincent",
    dateDetection: "2026-08-29",
    cause: "Pièce endommagée",
    descriptionAnomalie:
      "Rayure d'environ 15 cm constatée sur un panneau HPL lors de la réception de la commande n°31240, avant assemblage.",
    action: "Renvoi pièces",
    responsable: "Achats / Appro",
    niveauIndice: "Mineur",
  },
  m7: {
    numero: "NC2026-355",
    referenceProduit: "BAL-210",
    numeroCommande: "31088",
    client: "Groupe Cordelia Aménagement",
    typeNC: "NCE",
    serviceImpacte: "Serrurerie",
    origine: "Client",
    origineAuto: true,
    responsableCommercial: "Vincent",
    dateDetection: "2026-08-27",
    cause: "Défaut de fabrication",
    descriptionAnomalie:
      "Grincement métallique audible sur les balançoires BAL-210 dès la mise en service, constant à chaque oscillation.",
    action: "Réclamation au fournisseur",
    responsable: "Serrurerie",
    niveauIndice: "Mineur",
  },
  m11: {
    numero: "NC2026-356",
    referenceProduit: "CAB-402",
    numeroCommande: "31190",
    client: "Village Vacances Les Tilleuls",
    typeNC: "NCF",
    serviceImpacte: "Fournisseur",
    origine: "Client",
    origineAuto: true,
    responsableCommercial: "Dominique",
    dateDetection: "2026-08-25",
    cause: "Défaut de fabrication",
    descriptionAnomalie:
      "Odeur de plastique persistante signalée sur la cabane CAB-402 livrée récemment, accentuée en plein soleil.",
    action: "Réclamation au fournisseur",
    responsable: "Achats / Appro",
    niveauIndice: "Mineur",
  },
};

// ---- Non-conformités (historique linéaire de versions) ---------------------
//
// Chaque NC a des champs stables (référence produit, client, type, service,
// date de détection...) et un historique de versions. Deux natures de champs
// dans une version :
//  - "champs" : état courant (cause, action, responsable, niveau d'indice) —
//    remplacé à chaque version, avec un rappel de l'ancienne valeur en cas de
//    changement (comme une case Excel qu'on met à jour).
//  - "journal" : entrées ajoutées par CETTE version aux champs texte longs
//    (Description de l'anomalie, Action curative immédiate). Ces champs sont
//    des journaux à rallonge dans l'Excel réel (plusieurs lignes datées
//    empilées dans la même cellule) : l'ancienne entrée n'est jamais
//    écrasée, la nouvelle vient s'ajouter à la suite, datée.

const NCS = {
  "NC2026-341": {
    id: "NC2026-341",
    referenceProduit: "TOB-1204",
    numeroCommande: "30822",
    client: "Camping des Pins",
    typeNC: "NCE",
    serviceImpacte: "Peinture",
    origine: "Client",
    origineAuto: true,
    dateDetection: "2026-08-18",
    statut: "en_cours",
    dateCloture: null,
    responsableCommercial: "Charlotte",
    couts: { reparation: null, materiel: null, transport: 145, tempsPasseH: null },
    gravite: {
      sousCriteres: { "Sécurité": "Aucun", "Utilisateur": "Faible", "Client": "Moyen", "Impact poseur": "Faible", "Coût": "Faible" },
      ig: 22,
    },
    versions: [
      {
        version: 1,
        date: "2026-08-18",
        mailId: null,
        verified: true,
        champs: { cause: "Défaut de fabrication", action: "Correction sur le site", responsable: "Charlotte", niveauIndice: "Mineur" },
        journal: {
          descriptionAnomalie: "Défaut de peinture constaté à la livraison sur le toboggan TOB-1204 (écaillage local).",
          actionCurativeImmediate: null,
        },
      },
      {
        version: 2,
        date: "2026-08-29",
        mailId: "m1",
        verified: true,
        champs: { cause: "Défaut de fabrication", action: "Correction sur le site", responsable: "Charlotte", niveauIndice: "Mineur" },
        journal: {
          descriptionAnomalie: "Le client signale une extension légère de l'écaillage depuis le constat initial ; photos complémentaires transmises.",
          actionCurativeImmediate: "Passage en atelier prévu avant l'ouverture au public du 15/09 pour reprise partielle de peinture.",
        },
      },
      {
        version: 3,
        date: "2026-08-30",
        mailId: "m10",
        verified: true,
        champs: { cause: "Défaut de fabrication", action: "Correction sur le site", responsable: "Charlotte", niveauIndice: "Mineur" },
        journal: {
          descriptionAnomalie: null,
          actionCurativeImmediate: "Reprise partielle de peinture effectuée en atelier. Photos après reprise reçues, résultat jugé correct par le client. En attente de validation qualité avant clôture.",
        },
      },
    ],
  },
  "NC2026-352": {
    id: "NC2026-352",
    referenceProduit: "PORT-556",
    numeroCommande: "30990",
    client: "Récréa Loisirs SAS",
    typeNC: "SAV",
    serviceImpacte: "Serrurerie",
    origine: "Client",
    origineAuto: true,
    dateDetection: "2026-08-15",
    statut: "en_cours",
    dateCloture: null,
    responsableCommercial: "Matthieu",
    couts: { reparation: null, materiel: null, transport: null, tempsPasseH: null },
    gravite: {
      sousCriteres: { "Sécurité": "Faible", "Utilisateur": "Moyen", "Client": "Moyen", "Impact poseur": "Faible", "Coût": "Aucun" },
      ig: 18,
    },
    versions: [
      {
        version: 1,
        date: "2026-08-15",
        mailId: null,
        verified: true,
        champs: { cause: "Défaut de montage sur site", action: "Correction sur le site", responsable: "Serrurerie", niveauIndice: "Mineur" },
        journal: {
          descriptionAnomalie: "Jeu anormal constaté au niveau du portillon d'accès au portique PORT-556, bruit au passage.",
          actionCurativeImmediate: null,
        },
      },
      {
        version: 2,
        date: "2026-08-27",
        mailId: "m6",
        verified: false,
        champs: { cause: "Défaut de montage sur site", action: "Correction sur le site", responsable: "Serrurerie", niveauIndice: "Moyen" },
        journal: {
          descriptionAnomalie: "Le client signale que le jeu persiste malgré un premier réglage effectué le 20/08.",
          actionCurativeImmediate: "Nouvelle intervention à planifier pour resserrage complet des charnières.",
        },
      },
    ],
  },
  "NC2026-330": {
    id: "NC2026-330",
    referenceProduit: "STR-220",
    numeroCommande: "30510",
    client: "Mairie de Vallonne",
    typeNC: "NCI",
    serviceImpacte: "BE Methode",
    origine: "Interne",
    origineAuto: false,
    dateDetection: "2026-07-18",
    statut: "en_cours",
    dateCloture: null,
    responsableCommercial: null,
    couts: { reparation: null, materiel: null, transport: null, tempsPasseH: null },
    gravite: {
      sousCriteres: { "Sécurité": "Aucun", "Utilisateur": "Faible", "Client": "Aucun", "Impact poseur": "Aucun", "Coût": "Aucun" },
      ig: 6,
    },
    versions: [
      {
        version: 1,
        date: "2026-07-18",
        mailId: null,
        verified: true,
        champs: { cause: "Erreur de conception", action: "Mise à jour conception", responsable: "BE Methode", niveauIndice: "Moyen" },
        journal: {
          descriptionAnomalie: "Grincement anormal signalé sur la structure jeu STR-220 lors des contrôles internes.",
          actionCurativeImmediate: null,
        },
      },
    ],
  },
  "NC2026-355": {
    id: "NC2026-355",
    referenceProduit: "BAL-210",
    numeroCommande: "31088",
    client: "Groupe Cordelia Aménagement",
    typeNC: "NCE",
    serviceImpacte: "Serrurerie",
    origine: "Client",
    origineAuto: true,
    dateDetection: "2026-08-27",
    statut: "nouveau",
    dateCloture: null,
    responsableCommercial: "Vincent",
    couts: { reparation: null, materiel: null, transport: null, tempsPasseH: null },
    gravite: {
      sousCriteres: { "Sécurité": "Faible", "Utilisateur": "Moyen", "Client": "Faible", "Impact poseur": "Aucun", "Coût": "Faible" },
      ig: 15,
    },
    versions: [
      {
        version: 1,
        date: "2026-08-27",
        mailId: "m7",
        verified: true,
        champs: { cause: "Défaut de fabrication", action: "Réclamation au fournisseur", responsable: "Serrurerie", niveauIndice: "Mineur" },
        journal: {
          descriptionAnomalie: "Grincement métallique audible sur les balançoires BAL-210 dès la mise en service, constant à chaque oscillation.",
          actionCurativeImmediate: null,
        },
      },
    ],
  },
  "NC2026-356": {
    id: "NC2026-356",
    referenceProduit: "CAB-402",
    numeroCommande: "31190",
    client: "Village Vacances Les Tilleuls",
    typeNC: "NCF",
    serviceImpacte: "Fournisseur",
    origine: "Fournisseur",
    origineAuto: true,
    dateDetection: "2026-08-25",
    statut: "nouveau",
    dateCloture: null,
    responsableCommercial: "Dominique",
    couts: { reparation: null, materiel: null, transport: null, tempsPasseH: null },
    gravite: {
      sousCriteres: { "Sécurité": "Aucun", "Utilisateur": "Faible", "Client": "Faible", "Impact poseur": "Aucun", "Coût": "Aucun" },
      ig: 8,
    },
    versions: [
      {
        version: 1,
        date: "2026-08-25",
        mailId: "m11",
        verified: false,
        champs: { cause: "Défaut de fabrication", action: "Réclamation au fournisseur", responsable: "Achats / Appro", niveauIndice: "Mineur" },
        journal: {
          descriptionAnomalie: "Odeur de plastique persistante signalée sur la cabane CAB-402 livrée récemment, accentuée en plein soleil.",
          actionCurativeImmediate: null,
        },
      },
    ],
  },
  "NC2026-318": {
    id: "NC2026-318",
    referenceProduit: "PORT-118",
    numeroCommande: "30340",
    client: "Espace Détente Nord",
    typeNC: "SAV",
    serviceImpacte: "Serrurerie",
    origine: "Client",
    origineAuto: true,
    dateDetection: "2026-08-05",
    statut: "cloture",
    dateCloture: "2026-08-28",
    responsableCommercial: "Laurent",
    couts: { reparation: null, materiel: null, transport: null, tempsPasseH: null },
    gravite: {
      sousCriteres: { "Sécurité": "Faible", "Utilisateur": "Moyen", "Client": "Moyen", "Impact poseur": "Faible", "Coût": "Aucun" },
      ig: 19,
    },
    versions: [
      {
        version: 1,
        date: "2026-08-05",
        mailId: null,
        verified: true,
        champs: { cause: "Défaut de montage sur site", action: "Correction sur le site", responsable: "Serrurerie", niveauIndice: "Moyen" },
        journal: {
          descriptionAnomalie: "Portillon d'accès du portique PORT-118 mal ajusté, frottement important signalé.",
          actionCurativeImmediate: null,
        },
      },
      {
        version: 2,
        date: "2026-08-28",
        mailId: "m3",
        verified: true,
        champs: { cause: "Défaut de montage sur site", action: "Correction sur le site", responsable: "Serrurerie", niveauIndice: "Moyen" },
        journal: {
          descriptionAnomalie: null,
          actionCurativeImmediate: "Réglage complet réalisé sur site le 20/08. Le client confirme un fonctionnement normal après deux semaines d'utilisation.",
        },
      },
    ],
  },
  "NC2026-320": {
    id: "NC2026-320",
    referenceProduit: "STR-090",
    numeroCommande: "30288",
    client: "Village Vacances Les Tilleuls",
    typeNC: "NCI",
    serviceImpacte: "Serrurerie",
    origine: "Interne",
    origineAuto: false,
    dateDetection: "2026-08-10",
    statut: "cloture",
    dateCloture: "2026-08-26",
    responsableCommercial: "Nadia",
    couts: { reparation: null, materiel: null, transport: 62, tempsPasseH: 1.5 },
    gravite: {
      sousCriteres: { "Sécurité": "Aucun", "Utilisateur": "Faible", "Client": "Aucun", "Impact poseur": "Aucun", "Coût": "Faible" },
      ig: 7,
    },
    versions: [
      {
        version: 1,
        date: "2026-08-10",
        mailId: null,
        verified: true,
        champs: { cause: "Manquants en visserie", action: "Achat matériel", responsable: "Serrurerie", niveauIndice: "Mineur" },
        journal: {
          descriptionAnomalie: "Vis de fixation manquante constatée sur le poteau de la structure STR-090.",
          actionCurativeImmediate: null,
        },
      },
      {
        version: 2,
        date: "2026-08-26",
        mailId: "m8",
        verified: true,
        champs: { cause: "Manquants en visserie", action: "Achat matériel", responsable: "Serrurerie", niveauIndice: "Mineur" },
        journal: {
          descriptionAnomalie: null,
          actionCurativeImmediate: "Vis remplacée en atelier le 24/08. Contrôle post-intervention réalisé et conforme.",
        },
      },
    ],
  },
  "NC2026-289": {
    id: "NC2026-289",
    referenceProduit: "HPL-118",
    numeroCommande: "29765",
    client: "Commune de Sainte-Row",
    typeNC: "NCF",
    serviceImpacte: "Fournisseur",
    origine: "Fournisseur",
    origineAuto: true,
    dateDetection: "2026-07-02",
    statut: "cloture",
    dateCloture: "2026-07-20",
    responsableCommercial: "Vincent",
    couts: { reparation: 210, materiel: null, transport: 90, tempsPasseH: 3 },
    gravite: {
      sousCriteres: { "Sécurité": "Aucun", "Utilisateur": "Moyen", "Client": "Moyen", "Impact poseur": "Faible", "Coût": "Moyen" },
      ig: 26,
    },
    versions: [
      {
        version: 1,
        date: "2026-07-02",
        mailId: null,
        verified: true,
        champs: { cause: "Pièce endommagée", action: "Renvoi pièces", responsable: "Vincent", niveauIndice: "Moyen" },
        journal: {
          descriptionAnomalie: "Fissure constatée sur un panneau HPL-118 à la réception.",
          actionCurativeImmediate: null,
        },
      },
      {
        version: 2,
        date: "2026-07-20",
        mailId: null,
        verified: true,
        champs: { cause: "Pièce endommagée", action: "Renvoi pièces", responsable: "Vincent", niveauIndice: "Moyen" },
        journal: {
          descriptionAnomalie: null,
          actionCurativeImmediate: "Panneau remplacé par le fournisseur, contrôle réception conforme.",
        },
      },
    ],
  },
};

// ---- Helpers coûts / gravité -------------------------------------------------
//
// Piège identifié dans l'analyse de l'Excel réel : "Coût total" ne doit
// JAMAIS être un simple 0 par défaut. Tant qu'aucun sous-coût n'est renseigné,
// le total est "non renseigné" — distinct d'un total réellement nul.

function coutTotal(couts) {
  if (!couts) return null;
  const vals = [couts.reparation, couts.materiel, couts.transport].filter((v) => v !== null && v !== undefined);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0);
}
function formatCout(v) {
  return v === null || v === undefined ? `<span class="non-renseigne">non renseigné</span>` : `${v} €`;
}

function igToNiveau(ig) {
  if (ig >= 25) return "Critique";
  if (ig >= 18) return "Majeur";
  if (ig >= 10) return "Moyen";
  if (ig >= 3) return "Mineur";
  return "Aucun";
}

// ---- Statistiques (reprise du dashboard v1, NC/web/) ------------------------

const STATS_KPI = {
  ncActives: 14,
  scoreIaMoyen: 83,
  tauxResolutionMois: 68,
  tempsMoyenResolutionJours: 11.4,
};

const STATS_TOP_CAUSES = [
  { cause: "Défaut de fabrication", count: 62 },
  { cause: "Pièce endommagée", count: 41 },
  { cause: "Défaut de montage sur site", count: 33 },
];

const STATS_EVOLUTION_MENSUELLE = [
  { mois: "Avr", count: 21 }, { mois: "Mai", count: 27 }, { mois: "Juin", count: 24 },
  { mois: "Juil", count: 19 }, { mois: "Août", count: 31 }, { mois: "Sept", count: 12 },
];

const STATS_PAR_SERVICE = [
  { label: "Serrurerie", count: 58 }, { label: "Peinture", count: 44 }, { label: "Fournisseur", count: 39 },
  { label: "Transport", count: 27 }, { label: "BE Methode", count: 21 }, { label: "Poseur", count: 18 },
  { label: "Autres", count: 33 },
];

const STATS_PAR_CAUSE = [
  { label: "Défaut de fabrication", count: 62 }, { label: "Pièce endommagée", count: 41 },
  { label: "Défaut de montage sur site", count: 33 }, { label: "Problème d'emballage", count: 24 },
  { label: "Info client incorrecte", count: 19 }, { label: "Autres", count: 61 },
];

const STATS_PAR_GRAVITE = [
  { label: "Aucun", count: 71 }, { label: "Mineur", count: 118 }, { label: "Moyen", count: 64 },
  { label: "Majeur", count: 29 }, { label: "Critique", count: 6 },
];

const STATS_PART_COUT_RENSEIGNE = 38; // % de NC avec un coût réellement non nul (vs ~62 % "0 €" trompeur)

const STATS_NC_URGENTES = ["NC2026-341", "NC2026-352"];
const STATS_NC_ATTENTE_VALIDATION = ["m2", "m11", "m7"];
