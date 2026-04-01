/**
 * Calcul de conformité horaire (section 5.2)
 *
 * Plage normale : [heureDebut, heureFin]
 * Plage étendue : [heureDebut - marge, heureFin + marge]
 *
 * Retourne : 'conforme' | 'hors_marge' | 'incident'
 *
 * Toutes les comparaisons se font en heure Europe/Paris
 * pour être indépendantes du fuseau horaire du serveur (Render = UTC).
 */

const TZ = 'Europe/Paris';

function parseHHMM(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Extrait l'heure et les minutes d'une Date dans le fuseau Europe/Paris.
 * @param {Date} date
 * @returns {number} minutes depuis minuit (heure Paris)
 */
function heureEnMinutesParis(date) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const h = parseInt(parts.find((p) => p.type === 'hour').value);
  const m = parseInt(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
}

/**
 * Retourne le jour ISO (1=Lundi … 7=Dimanche) en heure Paris.
 * @param {Date} date
 * @returns {number}
 */
function jourISOParis(date) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ,
    weekday: 'short',
  }).formatToParts(date);

  // Intl weekday court en fr : lun., mar., mer., jeu., ven., sam., dim.
  const weekday = parts.find((p) => p.type === 'weekday').value.replace('.', '').toLowerCase();
  const map = { lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 7 };
  return map[weekday] ?? 1;
}

/**
 * @param {Date} heureCollecte
 * @param {string} heureDebut    - "HH:MM"
 * @param {string} heureFin      - "HH:MM"
 * @param {number} margeMinutes
 * @returns {'conforme'|'hors_marge'|'incident'}
 */
function calculerStatut(heureCollecte, heureDebut, heureFin, margeMinutes) {
  const hScan = heureEnMinutesParis(heureCollecte);
  const debut = parseHHMM(heureDebut);
  const fin   = parseHHMM(heureFin);
  const marge = parseInt(margeMinutes) || 15;

  if (hScan >= debut && hScan <= fin)                           return 'conforme';
  if (hScan >= (debut - marge) && hScan <= (fin + marge))      return 'hors_marge';
  return 'incident';
}

/**
 * Vérifier si la date tombe sur un jour de collecte autorisé (section 5.3).
 * @param {number[]} joursCollecte - tableau ISO (1=Lundi … 7=Dimanche)
 * @param {Date}     date
 * @returns {boolean}
 */
function estJourCollecte(joursCollecte, date) {
  if (!joursCollecte || joursCollecte.length === 0) return true;
  return joursCollecte.includes(jourISOParis(date));
}

module.exports = { calculerStatut, estJourCollecte, heureEnMinutesParis, jourISOParis };
