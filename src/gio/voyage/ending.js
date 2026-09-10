/**
 * ════════════════════════════════════════════════════════════════════
 *  SLUTBESKEDEN — RET TEKSTEN HER, OG KUN HER.
 * ════════════════════════════════════════════════════════════════════
 * Denne fil importeres DYNAMISK af voyage.js, først i det øjeblik hele
 * rejsen er fuldført. Vite splitter den derfor i sin egen lille chunk:
 * teksten står hverken i sidens HTML eller i spillets bundle, så et
 * casual "vis kilde" afslører ingenting før slutningen. En ihærdig
 * person kan stadig finde chunk-filen — det er accepteret.
 *
 * Tomme linjer bliver til afsnit på skærmen. Teksten skrives langsomt
 * frem, uden knap og uden timer.
 */
const ENDING_MESSAGE = `Te Necesito, Mi Gio`;

export function getEndingMessage() {
  return ENDING_MESSAGE;
}
