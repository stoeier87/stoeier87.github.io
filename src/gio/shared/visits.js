import { ARCADE_FIREBASE_CONFIG } from "../../arcade/shared/firebase-config.js";

/**
 * Besøgs-pinget — det ene signal: har hun været her, og hvornår?
 *
 * Skriver { t, p, o? } til gio/visits i samme Realtime Database som
 * arkadens scores, med samme App Check-opsætning (reglerne kræver ægte
 * tidsstempel og kort sidenavn; ".read" er false, så loggen kan KUN
 * læses i Firebase-konsollen — Realtime Database → Data → gio/visits).
 *
 * ?soy=yo én gang på en enhed markerer den som ejerens: alle pings fra
 * den enhed bærer o: true og kan filtreres fra hendes. Parametret
 * fjerner sig selv fra adresselinjen, ligesom ?lock.
 *
 * Fire-and-forget hele vejen: Firebase hentes først (fra CDN) når
 * pinget affyres, og ALT er pakket ind — et blokeret CDN, manglende
 * App Check-token (dev) eller en afvist skrivning må aldrig kunne
 * mærkes på siden.
 */

const OWNER_KEY = "gio_owner";

/* Loggen bor under en hemmelig gren-nøgle: reglerne nægter at LISTE
   gio/visits, men tillader læsning af præcis denne undergren — så kun
   den, der kender stien (dvs. denne bundle), kan læse den. Samme
   "en ihærdig person kan finde den"-niveau som slutbeskeden; accepteret. */
const VISITS_KEY = "f49bf6347784875cce2fa1787c4bcbd56f4958c5";

let dbPromise = null;
function firebaseDb() {
  dbPromise ??= (async () => {
    const [{ initializeApp }, appCheck, rtdb] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-check.js"),
      import("https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js"),
    ]);
    // Samme forbehold som score-submit.js: localhost skal bruge debug-token,
    // og App Checks loader forventer et Node `process`-global.
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    window.process ??= { env: {} };
    const app = initializeApp(ARCADE_FIREBASE_CONFIG, "gio-visits");
    appCheck.initializeAppCheck(app, {
      provider: new appCheck.ReCaptchaV3Provider(ARCADE_FIREBASE_CONFIG.appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    return { rtdb, db: rtdb.getDatabase(app) };
  })();
  return dbPromise;
}

export function isOwnerDevice() {
  try {
    return localStorage.getItem(OWNER_KEY) === "1";
  } catch {
    return false;
  }
}

if (new URLSearchParams(location.search).has("soy")) {
  try {
    localStorage.setItem(OWNER_KEY, "1");
  } catch {
    /* uden storage kan enheden ikke huskes som ejerens — pinget sendes bare uden flag */
  }
  history.replaceState(null, "", location.pathname);
}

export function pingVisit() {
  (async () => {
    try {
      const { rtdb, db } = await firebaseDb();

      /* sidenavn + miljø, så stage-afprøvninger ikke ligner hendes besøg —
         tekst-sammenligning på pathname, ikke en route */
      const onStage = location.pathname.includes("/stage/"); // guard:allow-absolute
      const seg = location.pathname.match(/gio\/([a-z-]+)/);
      const page = (onStage ? "stage:" : "") + (seg ? seg[1] : "index");

      const entry = { t: Date.now(), p: page };
      if (isOwnerDevice()) entry.o = true;
      await rtdb.push(rtdb.ref(db, `gio/visits/${VISITS_KEY}`), entry);
    } catch {
      /* pinget må aldrig vælte en side — stilhed er hele kontrakten her */
    }
  })();
}

/**
 * Ejerens aflæsning: de seneste besøg, nyeste først. Returnerer [] ved
 * enhver fejl — visningen ovenpå skal kunne leve med stilhed.
 */
export async function readVisits(limit = 2000) {
  try {
    const { rtdb, db } = await firebaseDb();
    const snap = await rtdb.get(
      rtdb.query(rtdb.ref(db, `gio/visits/${VISITS_KEY}`), rtdb.limitToLast(limit)),
    );
    const list = [];
    snap.forEach((child) => {
      const v = child.val();
      if (v && typeof v.t === "number") list.push(v);
    });
    return list.sort((a, b) => b.t - a.t);
  } catch {
    return [];
  }
}
