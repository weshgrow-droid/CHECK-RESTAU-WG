// ============================================================================
// CONFIGURATION — à adapter avant le premier déploiement
// ============================================================================

const CONFIG = {
  // Client ID OAuth 2.0 créé dans Google Cloud Console
  // (Identifiants > Créer des identifiants > ID client OAuth > Application Web)
  GOOGLE_CLIENT_ID: "930336176315-nstjh090aro6a4h14iomo1usodva888s.apps.googleusercontent.com",

  // ID du Google Sheet source (déjà identifié)
  SPREADSHEET_ID: "1yM6U-RJxDb6qRk5yVIY6hvoxFIF5-fJfw40MtScUrds",

  // Nom exact de l'onglet contenant les commandes. Confirmé.
  ORDERS_SHEET_TAB: "Export_CSV",

  // Nom de l'onglet où seront écrits les "check OK".
  // Il sera créé automatiquement au premier lancement s'il n'existe pas.
  CHECKS_SHEET_TAB: "Checks",

  // URL de déploiement Apps Script (se termine par /exec) qui déclenche
  // syncVentes() à la demande, et clé secrète associée (doivent correspondre
  // exactement à ce qui est dans le script Apps Script).
  SYNC_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbz0CXd7fnTE5wpdHYRzAFtx3YnQUxCzFDLrvMxFQX1_bWZef-xs8nezpLlwznhFVJO8/exec",
  SYNC_SECRET: "wn6seOWXBXT6eTXdUITNLri4qPy7YKlB",

  // Domaine autorisé à se connecter (laisser vide "" pour n'importe quel compte Google
  // ayant accès au Sheet). Recommandé : mettez votre domaine Workspace, ex "weshgrow.com"
  ALLOWED_HOSTED_DOMAIN: "",

  // Clients à exclure car ce sont des grossistes / fournisseurs / usage interne,
  // pas des restaurants. Comparaison insensible à la casse et aux accents.
  // Ajoutez ici toute nouvelle entrée constatée dans l'app sous "Clients non classés".
  EXCLUDED_CLIENTS: [
    "Berjac",
    "Bermudes",
    "Cultures Food",
    "D Food BV",
    "Dalloyau",
    "Divers courses Wesh Grow",
    "École des Arts Culinaires Lenôtre",
    "Halles de Murat",
    "Les Halles de Murat", // variante orthographique constatée dans le Sheet
    "Halles Prestige",
    "Halles Tropéziennes",
    "Halles Trottemant",
    "Les Halles Trottemant", // variante orthographique constatée dans le Sheet
    "Laurance Primeur",
    "Laurance Primeurs", // variante orthographique constatée dans le Sheet
    "Laurent Primeurs Ramatuelle",
    "Leslie Fruits",
    "M. Charraire",
    "Maison Colom",
    "Maison Emali",
    "Maison EMALI chez BC Prime", // variante constatée dans le Sheet
    "Maison Leclaire",
    "METRO Trappes",
    "METRO Vitry",
    "Natoora",
    "Pomona TerreAzur",
    "Prim'Fruits",
    "Primeur Passion",
    "Producteurs Réunis",
    "Restaurant La Madeleine à Sens",
    "Salade de Fruits",
    "Saveur Verte Hydroponique Phocéenne",
    "Sodilib Buc",
    "Solanes",
    "Terre de Savoie",
    "Vergers de Boulogne",
    "Vergers St Eustache",
    "Les Vergers St Eustache", // signalé par l'équipe comme grossiste, pas restaurant
    "VSE", // ⚠️ ne matche qu'un nom de client EXACTEMENT égal à "VSE",
           // ne matche PAS "L'Espadon - Le Ritz par VSE" (comparaison exacte, pas "contient")
    // — Ajoutés depuis l'export officiel des membres "grossistes" (GROSREG) du 01/09/2026
    "ANA DISTRI",
    "Biovor",
    "Primeurs Passion",
    "Les Halles Paris Sud",
    "DAUMESNIL PRIMEURS",
    "Les Halles Tropeziennes (depuis Paris)",
    "Andrade Distribution",
    "Butet",
    "Broko",
    "M.Charraire",
    "PVM",
    "Primeur Mondial",
    "Prim'Fruit",
    "Léguromat",
    "Mooréa",
    "MK Distribution",
    "LA TOUR D'ARGENT EMALI",
    "Les Vergers Saint- Eustache - Terre de Savoie",
    "Paris Gastronomy",
    "Les Vergers Saint Eustache - Terre de Normandie",
    "Les Vergers de Boulogne",
    "SALADE DE FRUITS (depuis Paris)",
    "Laurent Primeurs Ramatuelle (depuis Paris)",
    "POMONA TERREAZUR ILE DE FRANCE RUNGIS",
    "D-FOOD FOR CHEFS BV",
    "POMONA TERREAZUR PAYS DE LOIRE NANTES",
    "Restaurant LA MADELEINE (VIA LEDELAS RUNGIS)",
    "SAPAM STRASBOURG SAS",
    "SAVEUR VERTE",
    "Wesh Grow Caverne",
  ],
};
