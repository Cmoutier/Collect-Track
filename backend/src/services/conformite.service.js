/**
 * Calcul de conformité horaire (section 5.2)
 *
 * Plage normale : [heureDebut, heureFin]
 * Plage étendue : [heureDebut - marge, heureFin + marge]
 *
 * Retourne : 'conforme' | 'hors_marge' | 'incident'
 */

function parseHHMM(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function heureEnMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * @param {Date} heureCollecte
 * @param {string} heureDebut - "HH:MM"
 * @param {string} heureFin   - "HH:MM"
 * @param {number} margeMinutes
 * @returns {'conforme'|'hors_marge'|'incident'}
 */
function calculerStatut(heureCollecte, heureDebut, heureFin, margeMinutes) {
  const hScan = heureEnMinutes(heureCollecte);
  const debut = parseHHMM(heureDebut);
  const fin = parseHHMM(heureFin);
  const marge = parseInt(margeMinutes) || 15;

  // Dans la plage normale
  if (hScan >= debut && hScan <= fin) return 'conforme';

  // Dans la marge étendue
  if (hScan >= (debut - marge) && hScan <= (fin + marge)) return 'hors_marge';

  // Hors de la plage étendue
  return 'incident';
}

/**
 * Vérifier si aujourd'hui est un jour de collecte autorisé (section 5.3)
 * @param {number[]} joursCollecte - tableau ISO (1=Lundi ... 7=Dimanche)
 * @param {Date} date
 * @returns {boolean}
 */
function estJourCollecte(joursCollecte, date) {
  if (!joursCollecte || joursCollecte.length === 0) return true; // Pas de restriction
  // getDay() : 0=Dimanche, 1=Lundi... Convertir en ISO
  const jourJS = date.getDay();
  const jourISO = jourJS === 0 ? 7 : jourJS;
  return joursCollecte.includes(jourISO);
}

module.exports = { calculerStatut, estJourCollecte };
