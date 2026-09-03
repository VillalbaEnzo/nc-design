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
const NIVEAUX_INDICE = ["Aucun", "Mineur", "Moyen", "Majeur"];

const STATUT_COULEUR = {
  en_cours: { label: "En cours", color: "#c62828", bg: "#fdecea" },
  nouveau: { label: "Nouveau", color: "#1565c0", bg: "#e8f1fc" },
  cloture: { label: "Clôturé", color: "#2e7d32", bg: "#eaf6ec" },
  hors_sujet: { label: "Hors sujet / Transféré", color: "#212121", bg: "#ececec" },
};

const BADGE_INFO = {
  rattachement: { label: "Rattachement NC existante", color: "#5e35b1", bg: "#efe9fb" },
  nouvelle_nc: { label: "Nouvelle NC", color: "#00695c", bg: "#e3f4f2" },
  non_recevable: { label: "Non recevable", color: "#ef6c00", bg: "#fdf1e3" },
  hors_sujet: { label: "Hors sujet / Transfert", color: "#424242", bg: "#eeeeee" },
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
    { id: "NC2025-441", titre: "Rayure panneau HPL à réception", score: 94 },
    { id: "NC2024-198", titre: "Rayure carrosserie module toboggan", score: 89 },
    { id: "NC2025-312", titre: "Éclat peinture panneau, transport", score: 82 },
    { id: "NC2023-076", titre: "Rayure profonde panneau de façade", score: 79 },
    { id: "NC2025-503", titre: "Rayure superficielle toit de cabane", score: 74 },
    { id: "NC2024-390", titre: "Choc léger panneau lors du déchargement", score: 71 },
    { id: "NC2022-158", titre: "Rayure HPL due à un sanglage serré", score: 68 },
    { id: "NC2025-021", titre: "Marque de frottement porte coulissante", score: 65 },
    { id: "NC2024-266", titre: "Éraflure bas de structure", score: 61 },
    { id: "NC2023-410", titre: "Rayure sur panneau arrière module", score: 58 },
  ],
  m7: [
    { id: "NC2025-377", titre: "Grincement métallique portique à la mise en service", score: 91 },
    { id: "NC2024-229", titre: "Cliquetis chaîne de balançoire", score: 84 },
    { id: "NC2025-140", titre: "Bruit anormal axe de rotation manège", score: 77 },
    { id: "NC2023-355", titre: "Grincement intermittent structure serrurerie", score: 73 },
    { id: "NC2024-088", titre: "Vibration portique par grand vent", score: 69 },
    { id: "NC2022-301", titre: "Sifflement toboggan tube métallique", score: 66 },
    { id: "NC2025-459", titre: "Claquement fixation balançoire", score: 63 },
    { id: "NC2024-512", titre: "Bruit anormal roulement tourniquet", score: 60 },
    { id: "NC2023-199", titre: "Grincement portillon accès structure", score: 57 },
    { id: "NC2021-233", titre: "Cliquetis chaîne portique", score: 54 },
  ],
  m11: [
    { id: "NC2024-347", titre: "Odeur plastique module rotomoulé neuf", score: 87 },
    { id: "NC2023-288", titre: "Odeur forte cabane exposée au soleil", score: 75 },
    { id: "NC2025-062", titre: "Odeur persistante toboggan plastique", score: 70 },
    { id: "NC2022-411", titre: "Odeur matière neuve module de jeu", score: 66 },
    { id: "NC2024-190", titre: "Odeur résine structure composite", score: 62 },
    { id: "NC2023-097", titre: "Odeur colle assemblage panneau", score: 59 },
    { id: "NC2025-233", titre: "Odeur caoutchouc revêtement sol souple", score: 55 },
    { id: "NC2021-176", titre: "Odeur persistante bac à sable plastique", score: 52 },
    { id: "NC2024-405", titre: "Odeur électrique éclairage structure", score: 49 },
    { id: "NC2022-064", titre: "Odeur plastique fondu élément toboggan", score: 46 },
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
    dateDetection: "2026-08-18",
    statut: "en_cours",
    dateCloture: null,
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
    dateDetection: "2026-08-15",
    statut: "en_cours",
    dateCloture: null,
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
        champs: { cause: "Défaut de montage sur site", action: "Correction sur le site", responsable: "Serrurerie", niveauIndice: "Mineur" },
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
    dateDetection: "2026-07-18",
    statut: "en_cours",
    dateCloture: null,
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
    dateDetection: "2026-08-27",
    statut: "nouveau",
    dateCloture: null,
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
    dateDetection: "2026-08-25",
    statut: "nouveau",
    dateCloture: null,
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
    dateDetection: "2026-08-05",
    statut: "cloture",
    dateCloture: "2026-08-28",
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
    dateDetection: "2026-08-10",
    statut: "cloture",
    dateCloture: "2026-08-26",
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
    dateDetection: "2026-07-02",
    statut: "cloture",
    dateCloture: "2026-07-20",
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
