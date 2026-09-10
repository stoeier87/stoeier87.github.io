import { guardPage } from "../shared/gate.js";

/* PLADSHOLDER: spillets logik kommer her. Når det bygges, gemmes
   fremskridt i localStorage under denne nøgle — kun på hendes enhed. */
export const PROGRESS_KEY = "gio_spil_progress";

guardPage();
