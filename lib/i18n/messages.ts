/** All UI chrome translations, for every supported language, in one file.
 *
 * To add a language: add its entry to LOCALES below, then add its block to
 * `messages`. A partially-translated language silently falls back to English
 * (see t.ts) so you can add a locale and fill in keys incrementally.
 *
 * To add a string: add the key to `en` first (it's the source of truth for
 * which keys exist), then add the same key to every other locale block.
 */

export const LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";

const en = {
  "nav.templates": "Templates",
  "nav.history": "History",
  "nav.settings": "Settings",
  "nav.logout": "Logout",

  "home.title": "Create Proposal",
  "home.subtitle": "Pick a template to build a proposal from form input, providers, and AI.",

  "templates.loading": "Loading templates…",
  "templates.error": "Error: {message}",
  "templates.empty": "No templates found.",
  "templates.cta": "Create proposal →",
  "templates.filter.all": "All",

  "sidebar.back": "← Templates",
  "sidebar.new": "New proposal",
  "sidebar.history": "History",
  "sidebar.admin": "Manage data",

  "history.title": "History",
  "history.subtitle": "All proposals generated across every template.",
  "history.loading": "Loading…",
  "history.error": "Error: {message}",
  "history.empty": "No proposals yet.",
  "history.count": "{count} proposal",
  "history.count.plural": "{count} proposals",
  "history.column.name": "Name",
  "history.column.template": "Template",
  "history.column.created": "Created",
  "history.column.updated": "Updated",
  "history.untitled": "Untitled — {date}",
  "history.open": "Open",
  "history.delete": "Delete",
  "history.deleteConfirm": "Delete this proposal? This cannot be undone.",
  "history.deleteFailed": "Delete failed",
  "history.loadFailed": "Failed to load history",

  "settings.loading": "Loading...",
  "settings.title": "Admin Settings",
  "settings.loggedInAs": "Logged in as: {email}",
  "settings.password.title": "Change Password",
  "settings.password.current": "Current Password",
  "settings.password.new": "New Password",
  "settings.password.confirm": "Confirm New Password",
  "settings.password.mismatch": "New passwords do not match",
  "settings.password.submit": "Change Password",
  "settings.password.submitting": "Changing...",
  "settings.password.success": "Password changed successfully!",
  "settings.password.failed": "Failed to change password",
  "settings.email.title": "Change Email",
  "settings.email.new": "New Email",
  "settings.email.confirmPassword": "Password (to confirm)",
  "settings.email.submit": "Change Email",
  "settings.email.submitting": "Changing...",
  "settings.email.success": "Email changed successfully! Please log in again.",
  "settings.email.failed": "Failed to change email",
} as const;

export type MessageKey = keyof typeof en;

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  fr: {
    "nav.templates": "Modèles",
    "nav.history": "Historique",
    "nav.settings": "Paramètres",
    "nav.logout": "Déconnexion",

    "home.title": "Créer une proposition",
    "home.subtitle": "Choisissez un modèle pour générer une proposition à partir du formulaire, des fournisseurs et de l'IA.",

    "templates.loading": "Chargement des modèles…",
    "templates.error": "Erreur : {message}",
    "templates.empty": "Aucun modèle trouvé.",
    "templates.cta": "Créer une proposition →",
    "templates.filter.all": "Tous",

    "sidebar.back": "← Modèles",
    "sidebar.new": "Nouvelle proposition",
    "sidebar.history": "Historique",
    "sidebar.admin": "Gérer les données",

    "history.title": "Historique",
    "history.subtitle": "Toutes les propositions générées, tous modèles confondus.",
    "history.loading": "Chargement…",
    "history.error": "Erreur : {message}",
    "history.empty": "Aucune proposition pour le moment.",
    "history.count": "{count} proposition",
    "history.count.plural": "{count} propositions",
    "history.column.name": "Nom",
    "history.column.template": "Modèle",
    "history.column.created": "Créée",
    "history.column.updated": "Modifiée",
    "history.untitled": "Sans titre — {date}",
    "history.open": "Ouvrir",
    "history.delete": "Supprimer",
    "history.deleteConfirm": "Supprimer cette proposition ? Cette action est irréversible.",
    "history.deleteFailed": "Échec de la suppression",
    "history.loadFailed": "Échec du chargement de l'historique",

    "settings.loading": "Chargement...",
    "settings.title": "Paramètres du compte",
    "settings.loggedInAs": "Connecté en tant que : {email}",
    "settings.password.title": "Changer le mot de passe",
    "settings.password.current": "Mot de passe actuel",
    "settings.password.new": "Nouveau mot de passe",
    "settings.password.confirm": "Confirmer le nouveau mot de passe",
    "settings.password.mismatch": "Les nouveaux mots de passe ne correspondent pas",
    "settings.password.submit": "Changer le mot de passe",
    "settings.password.submitting": "Modification...",
    "settings.password.success": "Mot de passe modifié avec succès !",
    "settings.password.failed": "Échec de la modification du mot de passe",
    "settings.email.title": "Changer l'e-mail",
    "settings.email.new": "Nouvel e-mail",
    "settings.email.confirmPassword": "Mot de passe (pour confirmer)",
    "settings.email.submit": "Changer l'e-mail",
    "settings.email.submitting": "Modification...",
    "settings.email.success": "E-mail modifié avec succès ! Veuillez vous reconnecter.",
    "settings.email.failed": "Échec de la modification de l'e-mail",
  },
};
