/**
 * The twelve zodiac constellations as their REAL night-sky asterisms —
 * the traditional atlas stick figures, not invented shapes.
 *
 * Coordinates are star-chart frame: north up, east to the LEFT (sky view),
 * computed from each star's actual RA/Dec relative to the figure's centre
 * (x = -dRA*cos(dec), y = +dDec, degrees). Absolute scale is irrelevant —
 * hall-of-stars.js re-centres every pattern on its centroid and fits it to
 * a unit circle before drawing. `mag` is the star's real apparent visual
 * magnitude and drives dot size (lower = brighter = bigger). `label` names
 * the star (proper name or Bayer letter) — kept for maintenance, unused at
 * render time.
 *
 * Generated from stellar catalogue positions and independently verified
 * figure by figure (star identity, magnitudes, chart orientation, edge
 * topology) before landing here. Edit with a star atlas open, or not at
 * all.
 */
export const CONSTELLATIONS = [
  {
    name: "Aries",
    stars: [
      { x: 0.959, y: 0.756, mag: 2, label: "Hamal" },
      { x: 3.85, y: -1.898, mag: 2.6, label: "Sheratan" },
      { x: 4.105, y: -3.412, mag: 3.9, label: "Mesarthim" },
      { x: -8.914, y: 4.555, mag: 3.6, label: "Bharani" },
    ],
    edges: [[3, 0], [0, 1], [1, 2]],
  },
  {
    name: "Taurus",
    stars: [
      { x: -2.556, y: -0.064, mag: 0.9, label: "Aldebaran" },
      { x: -14.627, y: 12.035, mag: 1.7, label: "Elnath" },
      { x: -17.347, y: 4.57, mag: 3, label: "zeta" },
      { x: -0.806, y: 2.607, mag: 3.5, label: "Ain" },
      { x: 0.555, y: 0.97, mag: 3.8, label: "delta" },
      { x: 1.308, y: -0.945, mag: 3.7, label: "gamma" },
      { x: -0.818, y: -0.702, mag: 3.4, label: "theta" },
      { x: 5.888, y: -4.083, mag: 3.5, label: "lambda" },
      { x: 13.918, y: -6.84, mag: 3.7, label: "xi" },
      { x: 14.483, y: -7.544, mag: 3.6, label: "omicron" },
    ],
    edges: [[2, 0], [0, 6], [6, 5], [5, 4], [4, 3], [3, 1], [5, 7], [7, 8], [8, 9]],
  },
  {
    name: "Gemini",
    stars: [
      { x: -8.1, y: 8.33, mag: 1.6, label: "Castor" },
      { x: -10.56, y: 4.47, mag: 1.1, label: "Pollux" },
      { x: 4.93, y: -7.16, mag: 1.9, label: "Alhena" },
      { x: -4.78, y: -1.57, mag: 3.5, label: "Wasat" },
      { x: 3.51, y: 1.58, mag: 3, label: "Mebsuta" },
      { x: -1.12, y: -2.98, mag: 3.9, label: "Mekbuda" },
      { x: 10.17, y: -1.05, mag: 3.3, label: "Propus" },
      { x: 8.31, y: -1.04, mag: 2.9, label: "Tejat" },
      { x: 3.2, y: -10.66, mag: 3.4, label: "Alzirr" },
      { x: -4.32, y: -7.01, mag: 3.6, label: "lambda" },
      { x: -2.72, y: 6.69, mag: 4.4, label: "tau" },
      { x: 1.48, y: 10.41, mag: 3.6, label: "theta" },
      { x: -6.07, y: 4.24, mag: 3.8, label: "iota" },
      { x: -8.41, y: 3.34, mag: 4.1, label: "upsilon" },
    ],
    edges: [[0, 10], [10, 11], [10, 4], [4, 7], [7, 6], [10, 12], [12, 13], [13, 1], [13, 3], [3, 5], [5, 2], [3, 9], [9, 8]],
  },
  {
    name: "Cancer",
    stars: [
      { x: 6.05, y: -8.7, mag: 3.5, label: "Altarf" },
      { x: -3.94, y: -6.03, mag: 4.3, label: "Acubens" },
      { x: -0.65, y: 0.27, mag: 3.9, label: "Asellus Australis" },
      { x: -0.32, y: 3.58, mag: 4.7, label: "Asellus Borealis" },
      { x: -1.13, y: 10.87, mag: 4, label: "iota" },
    ],
    edges: [[4, 3], [3, 2], [2, 1], [2, 0]],
  },
  {
    name: "Leo",
    stars: [
      { x: 5.59, y: -7.17, mag: 1.4, label: "Regulus" },
      { x: 5.84, y: -2.37, mag: 3.5, label: "eta" },
      { x: 2.85, y: 0.7, mag: 2, label: "Algieba" },
      { x: 3.63, y: 4.28, mag: 3.4, label: "Adhafera" },
      { x: 9.28, y: 6.87, mag: 3.9, label: "Rasalas" },
      { x: 10.91, y: 4.63, mag: 3, label: "epsilon" },
      { x: -9.94, y: 1.38, mag: 2.6, label: "Zosma" },
      { x: -9.97, y: -3.71, mag: 3.3, label: "Chertan" },
      { x: -18.2, y: -4.57, mag: 2.1, label: "Denebola" },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 8], [8, 7], [7, 6], [7, 0]],
  },
  {
    name: "Virgo",
    stars: [
      { x: -3.32, y: -9.66, mag: 1, label: "Spica" },
      { x: 20.31, y: 3.26, mag: 3.6, label: "Zavijava" },
      { x: 7.56, y: 0.05, mag: 2.7, label: "Porrima" },
      { x: 4.08, y: 4.9, mag: 3.4, label: "Minelauva" },
      { x: 2.43, y: 12.46, mag: 2.8, label: "Vindemiatrix" },
      { x: -5.69, y: 0.9, mag: 3.4, label: "Heze" },
      { x: 13, y: 0.83, mag: 3.9, label: "Zaniah" },
      { x: 0.49, y: -4.04, mag: 4.4, label: "theta" },
      { x: -16.02, y: -4.5, mag: 4.1, label: "Syrma" },
      { x: -22.78, y: -4.16, mag: 3.9, label: "mu" },
    ],
    edges: [[1, 6], [6, 2], [2, 3], [3, 4], [2, 7], [7, 0], [0, 5], [5, 8], [8, 9]],
  },
  {
    name: "Libra",
    stars: [
      { x: 6.94, y: 4.53, mag: 2.8, label: "Zubenelgenubi" },
      { x: 0.82, y: 11.19, mag: 2.6, label: "Zubeneschamali" },
      { x: -3.51, y: 5.78, mag: 3.9, label: "gamma" },
      { x: 3.85, y: -4.71, mag: 3.3, label: "Brachium" },
      { x: -3.87, y: -7.56, mag: 3.6, label: "upsilon" },
      { x: -4.24, y: -9.21, mag: 3.7, label: "tau" },
    ],
    edges: [[0, 1], [1, 2], [2, 0], [0, 3], [2, 4], [4, 5]],
  },
  {
    name: "Scorpius",
    stars: [
      { x: 9.39, y: 13.27, mag: 2.6, label: "Acrab" },
      { x: 10.46, y: 10.46, mag: 2.3, label: "Dschubba" },
      { x: 10.77, y: 6.97, mag: 2.9, label: "pi" },
      { x: 6.09, y: 7.49, mag: 2.9, label: "Alniyat" },
      { x: 4.37, y: 6.65, mag: 1.1, label: "Antares" },
      { x: 3.02, y: 4.86, mag: 2.8, label: "tau" },
      { x: 0.03, y: -1.21, mag: 2.3, label: "Larawag" },
      { x: -0.34, y: -4.97, mag: 3, label: "mu" },
      { x: -0.9, y: -9.28, mag: 3.6, label: "zeta" },
      { x: -4.58, y: -10.16, mag: 3.3, label: "eta" },
      { x: -9.85, y: -9.92, mag: 1.9, label: "Sargas" },
      { x: -10.93, y: -5.95, mag: 2.4, label: "Girtab" },
      { x: -9.07, y: -4.02, mag: 1.6, label: "Shaula" },
      { x: -8.48, y: -4.22, mag: 2.7, label: "Lesath" },
    ],
    edges: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13]],
  },
  {
    name: "Sagittarius",
    stars: [
      { x: 3.18, y: -5.52, mag: 1.8, label: "Kaus Australis" },
      { x: 3.87, y: -0.97, mag: 2.7, label: "Kaus Media" },
      { x: 7.2, y: -1.56, mag: 3, label: "Alnasl" },
      { x: 2.35, y: 3.44, mag: 2.8, label: "Kaus Borealis" },
      { x: -1.52, y: 1.87, mag: 3.2, label: "phi" },
      { x: -5.24, y: -1.02, mag: 2.6, label: "Ascella" },
      { x: -3.63, y: 2.56, mag: 2.1, label: "Nunki" },
      { x: -6.18, y: 1.19, mag: 3.3, label: "tau" },
    ],
    edges: [[2, 1], [2, 0], [1, 0], [1, 3], [3, 4], [4, 1], [4, 5], [5, 0], [4, 6], [6, 7], [7, 5]],
  },
  {
    name: "Capricornus",
    stars: [
      { x: 11.73, y: 6.28, mag: 3.6, label: "Algedi" },
      { x: 11.03, y: 4.04, mag: 3.1, label: "Dabih" },
      { x: 5.09, y: -6.45, mag: 4.1, label: "psi" },
      { x: 3.74, y: -8.1, mag: 4.1, label: "omega" },
      { x: -4.51, y: -3.59, mag: 3.7, label: "zeta" },
      { x: -6.98, y: -0.65, mag: 4.5, label: "epsilon" },
      { x: -9.33, y: 2.69, mag: 2.9, label: "Deneb Algedi" },
      { x: -7.69, y: 2.16, mag: 3.7, label: "Nashira" },
      { x: -3.46, y: 1.99, mag: 4.3, label: "iota" },
      { x: 0.39, y: 1.59, mag: 4.1, label: "theta" },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0]],
  },
  {
    name: "Aquarius",
    stars: [
      { x: 22.04, y: -3.32, mag: 3.8, label: "Albali" },
      { x: 11.13, y: 0.61, mag: 2.9, label: "Sadalsuud" },
      { x: 2.62, y: 5.86, mag: 2.9, label: "Sadalmelik" },
      { x: -1.31, y: 4.79, mag: 3.8, label: "Sadachbia" },
      { x: -3.1, y: 6.16, mag: 3.6, label: "zeta" },
      { x: -4.72, y: 6.06, mag: 4, label: "eta" },
      { x: -2.22, y: 7.56, mag: 4.7, label: "pi" },
      { x: -0.12, y: -1.6, mag: 4.2, label: "Ancha" },
      { x: 2.47, y: -7.69, mag: 4.3, label: "iota" },
      { x: -9.01, y: -1.4, mag: 3.7, label: "Hydor" },
      { x: -8.26, y: -7.41, mag: 4, label: "tau" },
      { x: -9.51, y: -9.64, mag: 3.3, label: "Skat" },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [1, 8], [2, 7], [7, 9], [9, 10], [10, 11]],
  },
  {
    name: "Pisces",
    stars: [
      { x: 19.93, y: -5.87, mag: 3.7, label: "gamma" },
      { x: 17.27, y: -2.77, mag: 4.3, label: "theta" },
      { x: 14.31, y: -3.52, mag: 4.1, label: "iota" },
      { x: 13.79, y: -7.37, mag: 4.5, label: "lambda" },
      { x: 17.52, y: -7.89, mag: 4.9, label: "kappa" },
      { x: 9.53, y: -2.29, mag: 4, label: "omega" },
      { x: -2.66, y: -1.56, mag: 4.4, label: "delta" },
      { x: -6.18, y: -1.26, mag: 4.3, label: "epsilon" },
      { x: -15.68, y: -3.66, mag: 4.4, label: "nu" },
      { x: -20.76, y: -6.39, mag: 3.8, label: "Alrescha" },
      { x: -16.66, y: 0.01, mag: 4.3, label: "Torcular" },
      { x: -13.22, y: 6.2, mag: 3.6, label: "Alpherg" },
      { x: -8.85, y: 15.43, mag: 4.7, label: "phi" },
      { x: -8.32, y: 20.94, mag: 4.5, label: "tau" },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [2, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13]],
  },
];
