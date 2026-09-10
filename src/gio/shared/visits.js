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

      /* sidenavn + miljø, så stage-afprøvninger ikke ligner hendes besøg —
         tekst-sammenligning på pathname, ikke en route */
      const onStage = location.pathname.includes("/stage/"); // guard:allow-absolute
      const seg = location.pathname.match(/gio\/([a-z-]+)/);
      const page = (onStage ? "stage:" : "") + (seg ? seg[1] : "index");

      const entry = { t: Date.now(), p: page };
      try {
        if (localStorage.getItem(OWNER_KEY) === "1") entry.o = true;
      } catch {
        /* uden storage sendes pinget bare uden ejer-flag */
      }
      await rtdb.push(rtdb.ref(rtdb.getDatabase(app), "gio/visits"), entry);
    } catch {
      /* pinget må aldrig vælte en side — stilhed er hele kontrakten her */
    }
  })();
}
