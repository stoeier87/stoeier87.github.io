/**
 * <st-planet-field> — the sky, as a native custom element.
 *
 * Issue #61: "the background should be a native web component light DOM, with
 * properties, so we can modify the 9 planets." This is that element, and it is
 * the first one in the repo under DECISIONS.md ADR-023 — plain
 * `class extends HTMLElement`, **light DOM, no shadow root**, no base class.
 *
 * It replaces the starfield/planet half of `script.js`, which drew everything
 * into one Canvas 2D context. What it does not replace, and must never touch,
 * is the headline: "Bogstav-rejsen" — the letters that assemble into TOBIAS
 * FULLERTON STØIER — is pure DOM in `.journey > .stage` and stays exactly
 * where it was.
 *
 * ## The one design decision everything else follows from
 *
 * The camera is an **OrthographicCamera in CSS pixel space**: left 0, right W,
 * top 0, bottom -H. A sphere of radius `r` at world (x, -y) therefore lands on
 * screen pixel (x, y) with radius `r` — so every placement formula from the old
 * `drawPlanets()` (script.js:363-389) carries over unchanged rather than being
 * re-derived, and "the planets did not move" is a claim before/after
 * screenshots can actually support.
 *
 * ## Contract notes
 *
 * - **One rAF loop per page** (standards.json `one-raf-loop`, fatal). The
 *   homepage already owns a loop, so it sets the `driven` attribute and calls
 *   `tick(time)` itself. Without `driven` the element runs its own loop, which
 *   is what lets it stand alone on the arcade lobby.
 * - **prefers-reduced-motion is the only motion fallback** (fatal). Under
 *   `reduce` the element renders one static frame and stops. Never a width
 *   gate. This also closes a gap the 2D version had: `frame()` called
 *   `drawStars()` unconditionally, so stars twinkled and the ISS kept orbiting
 *   for users who had asked for none of it.
 * - **No URLs live in here.** Planets carry whatever `link` the host page
 *   passes and the element only emits events, so relative paths stay the host's
 *   business and `relative-paths` cannot be violated from this file.
 */

import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  EllipseCurve,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  Points,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  WebGLRenderer,
} from "three";

import {
  cloudTexture,
  glowTexture,
  rand,
  ringTexture,
  streakTexture,
  surfaceTexture,
} from "./planet-textures.ts";
import type { SurfaceSpec } from "./planet-textures.ts";
import { SkyTraffic } from "./sky-traffic.ts";

/* ============ Public shapes ============ */

export interface PlanetSpec extends SurfaceSpec {
  /** Display name. Danish on the homepage — MERKUR, JORDEN, NEPTUN. */
  name: string;
  /** Radius as a fraction of `min(width, height)`. */
  r: number;
  /** Position along the journey, 0..1. */
  s0: number;
  /** Horizontal position as a fraction of width. */
  px: number;
  /** Parallax factor. The homepage set spans 0.42–0.62. */
  pf: number;
  /** Draw a ring system. */
  ring?: boolean;
  /** Moon and ISS orbit. */
  earth?: boolean;
  /** Radians per second about the polar axis. Defaults to 0.05. */
  spin?: number;
  /** Where a click goes. Relative, always — the host page owns this. */
  link?: string;
}

export interface StarLayer {
  /** Viewport area per star. Lower is denser. */
  density: number;
  sizeMin: number;
  sizeMax: number;
  parallax: number;
  alpha: number;
}

/** The homepage's three layers, script.js:13-17, unchanged. */
export const DEFAULT_STAR_LAYERS: StarLayer[] = [
  { density: 22000, sizeMin: 0.5, sizeMax: 1.0, parallax: 0.12, alpha: 0.5 },
  { density: 14000, sizeMin: 1.0, sizeMax: 1.7, parallax: 0.3, alpha: 0.7 },
  { density: 26000, sizeMin: 1.7, sizeMax: 2.5, parallax: 0.55, alpha: 0.9 },
];

export interface PlanetEventDetail {
  index: number;
  planet: PlanetSpec;
}

/* ============ Star shader ============ */

/**
 * Per-star size and twinkle, computed on the GPU.
 *
 * The 2D version recomputed a sine per star per frame on the CPU and issued one
 * arc() fill each. Moving phase and speed into vertex attributes makes the
 * whole layer one draw call with no per-frame CPU work, which is most of why
 * this is cheaper than what it replaces despite doing more.
 */
const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uDpr;
  uniform float uAlpha;
  uniform float uTwinkle;
  varying float vAlpha;
  void main() {
    vAlpha = uAlpha * (1.0 - uTwinkle + uTwinkle * (0.65 + 0.35 * sin(uTime * aSpeed + aPhase)));
    gl_PointSize = aSize * uDpr * 2.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STAR_FRAG = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float dist = dot(d, d);
    if (dist > 0.25) discard;
    // Soften the rim so a 1px star does not read as a square.
    float edge = smoothstep(0.25, 0.10, dist);
    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * edge);
  }
`;

/* ============ Element ============ */

const DEG = Math.PI / 180;

export class PlanetFieldElement extends HTMLElement {
  /* --- host-facing state --- */
  #planets: PlanetSpec[] = [];
  #starLayers: StarLayer[] = DEFAULT_STAR_LAYERS;
  #scroll = 0;
  /** 0 means "never set", which resolves to the viewport height — see #updatePlanets. */
  #journeyEnd = 0;
  #drift = 0;

  /* --- three.js --- */
  #canvas: HTMLCanvasElement | null = null;
  #renderer: WebGLRenderer | null = null;
  #scene: Scene | null = null;
  #camera: OrthographicCamera | null = null;
  #starGroups: Group[] = [];
  #starMaterials: ShaderMaterial[] = [];
  #bodies: PlanetBody[] = [];
  #traffic: SkyTraffic | null = null;
  #glow: CanvasTexture | null = null;
  #streak: CanvasTexture | null = null;
  #raycaster = new Raycaster();
  #pointer = new Vector2(-10, -10);
  #pointerInside = false;
  #hovered = -1;

  /* --- lifecycle --- */
  #w = 0;
  #h = 0;
  #dpr = 1;
  #raf = 0;
  #last = 0;
  #elapsed = 0;
  #failed = false;
  #motionQuery: MediaQueryList | null = null;
  #reduced = false;

  /* ---------- properties ---------- */

  /** The whole planet set. Assigning rebuilds the scene. */
  get planets(): PlanetSpec[] {
    return this.#planets;
  }
  set planets(value: PlanetSpec[]) {
    this.#planets = Array.isArray(value) ? value : [];
    if (this.#scene) this.#buildPlanets();
    this.#requestStaticFrame();
  }

  get starLayers(): StarLayer[] {
    return this.#starLayers;
  }
  set starLayers(value: StarLayer[]) {
    this.#starLayers = Array.isArray(value) && value.length ? value : DEFAULT_STAR_LAYERS;
    if (this.#scene) this.#buildStars();
    this.#requestStaticFrame();
  }

  /**
   * Scroll offset in pixels. The element never reads window.scrollY itself.
   *
   * Named `scrollOffset` and not `scroll` because `HTMLElement.scroll()` is
   * already a method — shadowing it with a number property compiles to a class
   * that is not a valid `CustomElementConstructor`, and `customElements.define`
   * rejects it.
   */
  get scrollOffset(): number {
    return this.#scroll;
  }
  set scrollOffset(value: number) {
    this.#scroll = Number.isFinite(value) ? value : 0;
  }

  /**
   * Height of the scroll journey in pixels; the denominator planets ride on.
   *
   * Left unset it resolves to the viewport height, so `s0` still spreads a set
   * of planets down one screen. Defaulting it to 1 instead — which is what the
   * first version did — collapsed `s0 * journeyEnd * pf` to nothing and stacked
   * every planet at the same 55% height.
   */
  get journeyEnd(): number {
    return this.#journeyEnd;
  }
  set journeyEnd(value: number) {
    this.#journeyEnd = Number.isFinite(value) && value > 0 ? value : 0;
  }

  /**
   * Pixels per second of automatic drift, for pages with no scroll journey.
   * The arcade lobby's stars fell downward at a constant rate; this is that.
   */
  get drift(): number {
    return this.#drift;
  }
  set drift(value: number) {
    this.#drift = Number.isFinite(value) ? value : 0;
  }

  /** True when the host page drives the loop and calls tick() itself. */
  get driven(): boolean {
    return this.hasAttribute("driven");
  }

  /** True when planets respond to hover and click. */
  get interactive(): boolean {
    return this.hasAttribute("interactive");
  }

  /**
   * How many drifting satellites to fly, and whether shooting stars appear.
   * `0` disables both. The homepage's five is the default when the attribute
   * is present without a value.
   */
  get satellites(): number {
    if (!this.hasAttribute("satellites")) return 0;
    const raw = Number.parseInt(this.getAttribute("satellites") ?? "", 10);
    return Number.isFinite(raw) ? Math.max(0, raw) : 5;
  }

  /** True when WebGL was unavailable and nothing is being rendered. */
  get failed(): boolean {
    return this.#failed;
  }

  static get observedAttributes(): string[] {
    return ["planets", "star-layers", "drift"];
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (value === null) return;
    try {
      if (name === "planets") this.planets = JSON.parse(value) as PlanetSpec[];
      else if (name === "star-layers") this.starLayers = JSON.parse(value) as StarLayer[];
      else if (name === "drift") this.drift = Number.parseFloat(value);
    } catch {
      // A malformed attribute must not take the page down with it. The element
      // keeps whatever it had, which is a visible sky rather than a blank one.
    }
  }

  /* ---------- lifecycle ---------- */

  connectedCallback(): void {
    if (this.#canvas) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "block h-full w-full";
    this.append(canvas);
    this.#canvas = canvas;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      // No WebGL. Leave the page as it is rather than half-render; the host can
      // read `failed` or listen for this event and keep its own backdrop.
      this.#failed = true;
      canvas.remove();
      this.#canvas = null;
      this.dispatchEvent(new CustomEvent("planet-field-failed", { bubbles: true }));
      return;
    }

    renderer.setClearColor(0x000000, 0);
    this.#renderer = renderer;
    this.#scene = new Scene();
    this.#camera = new OrthographicCamera(0, 1, 0, -1, 0.1, 4000);
    this.#camera.position.z = 1000;
    this.#glow = glowTexture();

    // Light from the upper left, reproducing the highlight the 2D gradient
    // faked by offsetting its centre to (x - 0.35r, y - 0.35r).
    const key = new DirectionalLight(0xffffff, 2.4);
    key.position.set(-0.55, 0.5, 1);
    this.#scene.add(key);
    this.#scene.add(new AmbientLight(0xffffff, 0.35));

    this.#motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.#reduced = this.#motionQuery.matches;
    this.#motionQuery.addEventListener("change", this.#onMotionChange);

    if (this.satellites > 0 || this.hasAttribute("shooting-stars")) {
      this.#streak = streakTexture();
      this.#traffic = new SkyTraffic(this.#streak, this.#glow, this.satellites);
      this.#traffic.addTo(this.#scene);
    }

    this.#measure();
    this.#buildStars();
    this.#buildPlanets();
    this.#traffic?.resize(this.#w, this.#h, performance.now());

    window.addEventListener("resize", this.#onResize, { passive: true });
    if (this.interactive) {
      document.addEventListener("pointermove", this.#onPointerMove, { passive: true });
      document.addEventListener("pointerleave", this.#onPointerLeave, { passive: true });
      document.addEventListener("click", this.#onClick);
    }

    if (this.driven || this.#reduced) this.#renderOnce();
    else this.#start();
  }

  disconnectedCallback(): void {
    this.#stop();
    window.removeEventListener("resize", this.#onResize);
    document.removeEventListener("pointermove", this.#onPointerMove);
    document.removeEventListener("pointerleave", this.#onPointerLeave);
    document.removeEventListener("click", this.#onClick);
    this.#motionQuery?.removeEventListener("change", this.#onMotionChange);
    this.#motionQuery = null;

    this.#disposeStars();
    this.#disposePlanets();
    this.#traffic?.dispose();
    this.#traffic = null;
    this.#glow?.dispose();
    this.#glow = null;
    this.#streak?.dispose();
    this.#streak = null;
    this.#renderer?.dispose();
    this.#renderer = null;
    this.#scene = null;
    this.#camera = null;
    this.#canvas?.remove();
    this.#canvas = null;
  }

  /* ---------- public methods ---------- */

  /**
   * Advance and draw one frame. `time` is a rAF timestamp in milliseconds.
   *
   * Called by the host page when `driven` is set; called by the element's own
   * loop otherwise. Under reduced motion it draws but does not advance.
   */
  tick(time: number): void {
    if (!this.#renderer || !this.#scene || !this.#camera) return;

    // Clamped exactly as the canvas contract requires: an unclamped dt explodes
    // the first time a frame drops or the tab comes back from the background.
    const dt = this.#last ? Math.min(33, time - this.#last) * 0.001 : 0;
    this.#last = time;
    if (!this.#reduced) this.#elapsed += dt;

    const scroll = this.#scroll + this.#drift * this.#elapsed;
    this.#updateStars(scroll);
    this.#updatePlanets(scroll, dt);
    if (!this.#reduced) this.#traffic?.update(dt, this.#elapsed, time);
    if (this.interactive) this.#updateHover();

    this.#renderer.render(this.#scene, this.#camera);
  }

  /** Re-measure and redraw. Called on window resize; safe to call by hand. */
  resize(): void {
    this.#measure();
    this.#buildStars();
    this.#traffic?.resize(this.#w, this.#h, performance.now());
    this.#requestStaticFrame();
  }

  /* ---------- internals ---------- */

  #measure(): void {
    if (!this.#renderer || !this.#camera) return;
    this.#dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.#w = this.clientWidth || window.innerWidth;
    this.#h = this.clientHeight || window.innerHeight;

    this.#renderer.setPixelRatio(this.#dpr);
    this.#renderer.setSize(this.#w, this.#h, false);

    // Pixel space: (x, -y) in world is (x, y) on screen.
    this.#camera.left = 0;
    this.#camera.right = this.#w;
    this.#camera.top = 0;
    this.#camera.bottom = -this.#h;
    this.#camera.updateProjectionMatrix();

    for (const m of this.#starMaterials) m.uniforms.uDpr!.value = this.#dpr;
  }

  #start(): void {
    if (this.#raf) return;
    const loop = (time: number): void => {
      this.tick(time);
      this.#raf = requestAnimationFrame(loop);
    };
    this.#raf = requestAnimationFrame(loop);
  }

  #stop(): void {
    if (this.#raf) cancelAnimationFrame(this.#raf);
    this.#raf = 0;
  }

  /** Draw a single frame — the reduced-motion path, and every rebuild. */
  #renderOnce(): void {
    this.#last = 0;
    this.tick(performance.now());
  }

  /** Redraw after a state change, but only when nothing else will. */
  #requestStaticFrame(): void {
    if (this.#renderer && (this.#reduced || this.driven)) this.#renderOnce();
  }

  #onResize = (): void => {
    this.resize();
  };

  #onMotionChange = (event: MediaQueryListEvent): void => {
    this.#reduced = event.matches;
    if (this.#reduced) {
      this.#stop();
      this.#renderOnce();
    } else if (!this.driven) {
      this.#start();
    }
  };

  #onPointerMove = (event: PointerEvent): void => {
    this.#pointerInside = true;
    this.#pointer.set(
      (event.clientX / Math.max(1, this.#w)) * 2 - 1,
      -(event.clientY / Math.max(1, this.#h)) * 2 + 1,
    );
    // Under reduced motion there is no loop to pick the move up.
    if (this.#reduced && this.interactive) this.#updateHover();
  };

  #onPointerLeave = (): void => {
    this.#pointerInside = false;
    this.#setHovered(-1);
  };

  #onClick = (): void => {
    if (this.#hovered < 0) return;
    const planet = this.#planets[this.#hovered];
    if (!planet) return;
    this.dispatchEvent(
      new CustomEvent<PlanetEventDetail>("planet-activate", {
        bubbles: true,
        detail: { index: this.#hovered, planet },
      }),
    );
  };

  /* ---------- stars ---------- */

  #disposeStars(): void {
    for (const group of this.#starGroups) {
      group.removeFromParent();
      for (const child of group.children) {
        if (child instanceof Points) child.geometry.dispose();
      }
    }
    for (const m of this.#starMaterials) m.dispose();
    this.#starGroups = [];
    this.#starMaterials = [];
  }

  #buildStars(): void {
    if (!this.#scene) return;
    this.#disposeStars();

    const W = this.#w;
    const H = this.#h;

    this.#starLayers.forEach((def, li) => {
      const count = Math.max(20, Math.round((W * H) / def.density));
      const position = new Float32Array(count * 3);
      const size = new Float32Array(count);
      const phase = new Float32Array(count);
      const speed = new Float32Array(count);

      // Same seeding arithmetic as buildStars() in script.js:24-40, so the sky
      // is the same sky — identical on every visit, which was deliberate.
      for (let i = 0; i < count; i++) {
        const s = li * 10000 + i * 7;
        position[i * 3] = rand(s + 1) * W;
        position[i * 3 + 1] = -rand(s + 2) * H;
        position[i * 3 + 2] = -10;
        size[i] = def.sizeMin + rand(s + 3) * (def.sizeMax - def.sizeMin);
        phase[i] = rand(s + 4) * Math.PI * 2;
        speed[i] = 0.5 + rand(s + 5) * 1.2;
      }

      const material = new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDpr: { value: this.#dpr },
          uAlpha: { value: def.alpha },
          uTwinkle: { value: this.#reduced ? 0 : 1 },
        },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthWrite: false,
      });
      this.#starMaterials.push(material);

      // Two copies, one directly below the other, so the infinite vertical wrap
      // is a group translation instead of a per-star modulo every frame.
      const group = new Group();
      for (const offset of [0, -H]) {
        const geometry = new BufferGeometry();
        geometry.setAttribute("position", new BufferAttribute(position.slice(), 3));
        geometry.setAttribute("aSize", new BufferAttribute(size.slice(), 1));
        geometry.setAttribute("aPhase", new BufferAttribute(phase.slice(), 1));
        geometry.setAttribute("aSpeed", new BufferAttribute(speed.slice(), 1));
        const points = new Points(geometry, material);
        points.position.y = offset;
        points.frustumCulled = false;
        group.add(points);
      }
      group.userData.parallax = def.parallax;
      this.#scene?.add(group);
      this.#starGroups.push(group);
    });
  }

  #updateStars(scroll: number): void {
    const H = Math.max(1, this.#h);
    for (let i = 0; i < this.#starGroups.length; i++) {
      const group = this.#starGroups[i];
      const material = this.#starMaterials[i];
      if (!group || !material) continue;
      const parallax = (group.userData.parallax as number) ?? 0;
      const offset = scroll * parallax;
      // Screen y = st.y - offset, so world y = y0 + offset, wrapped by H.
      group.position.y = ((offset % H) + H) % H;
      material.uniforms.uTime!.value = this.#elapsed;
      material.uniforms.uTwinkle!.value = this.#reduced ? 0 : 1;
    }
  }

  /* ---------- planets ---------- */

  #disposePlanets(): void {
    for (const body of this.#bodies) body.dispose();
    this.#bodies = [];
  }

  #buildPlanets(): void {
    if (!this.#scene || !this.#glow) return;
    this.#disposePlanets();
    this.#bodies = this.#planets.map((spec, i) => new PlanetBody(spec, i, this.#glow!));
    for (const body of this.#bodies) this.#scene.add(body.group);
  }

  #updatePlanets(scroll: number, dt: number): void {
    const vmin = Math.min(this.#w, this.#h);
    const S = this.#journeyEnd || this.#h;

    for (const body of this.#bodies) {
      const p = body.spec;
      const r = p.r * vmin;
      const worldY = this.#h * 0.55 + p.s0 * S * p.pf;
      const y = worldY - scroll * p.pf;
      const x = p.px * this.#w;

      // Same ±3r cull as drawPlanets(). It also gates the raycast set, which is
      // why it stays on the CPU rather than being left to frustum culling.
      const visible = y >= -r * 3 && y <= this.#h + r * 3;
      body.setVisible(visible);
      if (!visible) continue;

      body.place(x, -y, r);
      body.advance(dt, this.#elapsed);
    }
  }

  /* ---------- hover ---------- */

  #updateHover(): void {
    if (!this.#camera || !this.#pointerInside) {
      this.#setHovered(-1);
      return;
    }
    this.#raycaster.setFromCamera(this.#pointer, this.#camera);

    const targets = this.#bodies.filter((b) => b.visible && b.spec.link).map((b) => b.surface);
    const hits = this.#raycaster.intersectObjects(targets, false);
    const first = hits[0]?.object;
    const index = first ? this.#bodies.findIndex((b) => b.surface === first) : -1;
    this.#setHovered(index);
  }

  #setHovered(index: number): void {
    if (index === this.#hovered) return;
    const previous = this.#hovered;
    this.#hovered = index;

    if (previous >= 0) {
      this.#bodies[previous]?.setHovered(false);
      const planet = this.#planets[previous];
      if (planet) {
        this.dispatchEvent(
          new CustomEvent<PlanetEventDetail>("planet-leave", {
            bubbles: true,
            detail: { index: previous, planet },
          }),
        );
      }
    }
    if (index >= 0) {
      this.#bodies[index]?.setHovered(true);
      const planet = this.#planets[index];
      if (planet) {
        this.dispatchEvent(
          new CustomEvent<PlanetEventDetail>("planet-enter", {
            bubbles: true,
            detail: { index, planet },
          }),
        );
      }
    }
  }
}

/* ============ One planet ============ */

/**
 * A planet and everything that belongs to it — surface, glow, ring, clouds,
 * moon and ISS. Built once at unit radius and scaled per frame, so a resize
 * never regenerates geometry or textures.
 */
class PlanetBody {
  readonly group = new Group();
  readonly surface: Mesh;
  readonly spec: PlanetSpec;
  visible = true;

  #index: number;
  #glowSprite: Sprite;
  #ring: Mesh | null = null;
  #clouds: Mesh | null = null;
  #moon: Group | null = null;
  #iss: Sprite | null = null;
  #issOrbit: Line | null = null;
  #disposables: { dispose(): void }[] = [];
  #baseGlow: number;
  #glowBoost = 0;

  constructor(spec: PlanetSpec, index: number, glowMap: CanvasTexture) {
    this.spec = spec;
    this.#index = index;

    const seed = spec.seed ?? index + 1;
    const map = surfaceTexture({ ...spec, seed });
    const material = new MeshLambertMaterial({ map });
    const geometry = new SphereGeometry(1, 40, 28);
    this.surface = new Mesh(geometry, material);
    // Axial tilt, so the poles are not dead-on and the spin reads as rotation.
    this.surface.rotation.z = 12 * DEG;
    this.group.add(this.surface);
    this.#disposables.push(map, material, geometry);

    this.#baseGlow = 0.85;
    const glowMaterial = new SpriteMaterial({
      map: glowMap,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: this.#baseGlow,
    });
    this.#glowSprite = new Sprite(glowMaterial);
    this.#glowSprite.scale.setScalar(4);
    this.#glowSprite.position.z = -2;
    this.group.add(this.#glowSprite);
    this.#disposables.push(glowMaterial);

    if (spec.ring) this.#buildRing(spec);
    if (spec.earth) this.#buildEarthSystem(glowMap);
  }

  #buildRing(spec: PlanetSpec): void {
    const geometry = new RingGeometry(1.35, 1.95, 96, 1);
    const map = ringTexture(spec.hi, this.#index * 7 + 3);
    const material = new MeshBasicMaterial({
      map,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
    });
    const ring = new Mesh(geometry, material);

    // The 2D ring was an ellipse of ry/rx = 0.55/1.75 ≈ 0.314, drawn at -0.32
    // rad. asin(0.314) ≈ 0.319 rad, so tilting the real ring by that much off
    // edge-on reproduces the old silhouette almost exactly — and now the back
    // half passes behind the planet for real instead of being two half-strokes.
    ring.rotation.x = -(Math.PI / 2 - 0.319);
    ring.rotation.z = -0.32;
    this.group.add(ring);
    this.#ring = ring;
    this.#disposables.push(geometry, map, material);
  }

  #buildEarthSystem(glowMap: CanvasTexture): void {
    // Clouds.
    const cloudMap = cloudTexture();
    const cloudMaterial = new MeshLambertMaterial({
      map: cloudMap,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const cloudGeometry = new SphereGeometry(1.035, 32, 22);
    this.#clouds = new Mesh(cloudGeometry, cloudMaterial);
    this.group.add(this.#clouds);
    this.#disposables.push(cloudMap, cloudMaterial, cloudGeometry);

    // Moon, on the outer orbit.
    const moonGeometry = new SphereGeometry(0.16, 20, 14);
    const moonMaterial = new MeshLambertMaterial({ color: new Color("#dfe3ea") });
    const moon = new Mesh(moonGeometry, moonMaterial);
    this.#moon = new Group();
    this.#moon.add(moon);
    this.group.add(this.#moon);
    this.#disposables.push(moonGeometry, moonMaterial);

    // ISS orbit ring — the inner tilted ellipse, 0.75 y-squash, script.js:301-310.
    const curve = new EllipseCurve(0, 0, 1.9, 1.9 * 0.75, 0, Math.PI * 2, false, 0);
    const orbitGeometry = new BufferGeometry().setFromPoints(curve.getPoints(96));
    const orbitMaterial = new LineBasicMaterial({
      color: new Color("#c8e6ff"),
      transparent: true,
      opacity: 0.2,
    });
    this.#issOrbit = new Line(orbitGeometry, orbitMaterial);
    this.#issOrbit.position.z = -1;
    this.group.add(this.#issOrbit);
    this.#disposables.push(orbitGeometry, orbitMaterial);

    // The map is not optional: a Sprite without one renders as a hard opaque
    // square, which is exactly what the ISS looked like on the first pass.
    const issMaterial = new SpriteMaterial({
      map: glowMap,
      color: new Color("#ebf5ff"),
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.#iss = new Sprite(issMaterial);
    this.#iss.scale.setScalar(0.55);
    this.group.add(this.#iss);
    this.#disposables.push(issMaterial);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.group.visible = visible;
  }

  /** Position in world units and scale to a pixel radius. */
  place(x: number, y: number, r: number): void {
    this.group.position.set(x, y, 0);
    this.group.scale.setScalar(r);
  }

  advance(dt: number, elapsed: number): void {
    const spin = this.spec.spin ?? 0.05;
    this.surface.rotation.y += spin * dt;
    if (this.#clouds) this.#clouds.rotation.y += spin * 1.6 * dt;

    if (this.#moon) {
      const a = elapsed * 0.22;
      this.#moon.position.set(Math.cos(a) * 3.1, Math.sin(a) * 3.1 * 0.62, Math.sin(a) * 0.5);
    }
    if (this.#iss) {
      const a = elapsed * 1.2;
      this.#iss.position.set(Math.cos(a) * 1.9, Math.sin(a) * 1.9 * 0.75, 0.5);
      const blink = 0.6 + 0.4 * Math.sin(elapsed * 6);
      (this.#iss.material as SpriteMaterial).opacity = blink;
    }
    if (this.#ring) this.#ring.rotation.z = -0.32;

    // Hover reads as the planet brightening rather than a cursor change, which
    // is the only affordance a pointer-events: none canvas can offer.
    const material = this.#glowSprite.material as SpriteMaterial;
    const target = this.#baseGlow + this.#glowBoost;
    material.opacity += (target - material.opacity) * Math.min(1, dt * 8);
  }

  setHovered(hovered: boolean): void {
    this.#glowBoost = hovered ? 1.5 : 0;
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const d of this.#disposables) d.dispose();
    this.#disposables = [];
  }
}

/** Registers the element once. Safe to call from more than one page module. */
export function definePlanetField(): void {
  if (!customElements.get("st-planet-field")) {
    customElements.define("st-planet-field", PlanetFieldElement);
  }
}
