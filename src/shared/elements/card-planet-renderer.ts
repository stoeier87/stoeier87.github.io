/**
 * CardPlanetRenderer — one WebGL context for all card planet icons.
 *
 * Renders each planet into the shared Three.js canvas in sequence and blits
 * the result into the card's own <canvas> via drawImage. Same PlanetBody
 * class as <st-planet-field>, so the visual is identical.
 *
 * The arcade page has exactly one WebGL renderer for the background
 * (<st-planet-field>) and this one for the cards — two contexts total,
 * never nine.
 */

import {
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { glowTexture } from "./planet-textures.ts";
import { PlanetBody, type PlanetSpec } from "./planet-field.ts";

interface CardEntry {
  body: PlanetBody;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

export class CardPlanetRenderer {
  readonly #renderer: WebGLRenderer;
  readonly #scene: Scene;
  readonly #camera: OrthographicCamera;
  readonly #glow: CanvasTexture;
  #cards: CardEntry[] = [];
  #elapsed = 0;

  constructor(size = 120) {
    const dpr = Math.min(devicePixelRatio, 2);

    this.#renderer = new WebGLRenderer({
      canvas: document.createElement("canvas"),
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    this.#renderer.setClearColor(0, 0);
    this.#renderer.setPixelRatio(dpr);
    // updateStyle=false: the canvas is offscreen, we don't need CSS dimensions.
    this.#renderer.setSize(size, size, false);

    this.#scene = new Scene();

    // ±2.5 units: planet at unit radius, glow sprite at scale=4 (radius 2).
    this.#camera = new OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.1, 1000);
    this.#camera.position.z = 5;

    const key = new DirectionalLight(0xffffff, 2.4);
    key.position.set(-0.55, 0.5, 1);
    this.#scene.add(key);
    this.#scene.add(new AmbientLight(0xffffff, 0.35));

    this.#glow = glowTexture();
  }

  /** Register a planet spec paired with the <canvas> element it should paint. */
  add(spec: PlanetSpec, cardCanvas: HTMLCanvasElement): void {
    const ctx = cardCanvas.getContext("2d");
    if (!ctx) return;
    const body = new PlanetBody(spec, this.#cards.length, this.#glow);
    body.place(0, 0, 1, 0);
    this.#cards.push({ body, ctx, w: cardCanvas.width, h: cardCanvas.height });
  }

  /**
   * Advance and render all card planets.
   *
   * Only one planet lives in the scene at a time — it is added before its
   * render and removed after, so the renderer never sees more than one planet
   * and the context never accumulates objects.
   */
  tick(dt: number): void {
    this.#elapsed += dt;
    for (const { body, ctx, w, h } of this.#cards) {
      body.advance(dt, this.#elapsed);
      this.#scene.add(body.group);
      this.#renderer.render(this.#scene, this.#camera);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(this.#renderer.domElement, 0, 0, w, h);
      body.group.removeFromParent();
    }
  }

  dispose(): void {
    for (const { body } of this.#cards) body.dispose();
    this.#cards = [];
    this.#glow.dispose();
    this.#renderer.dispose();
  }
}
