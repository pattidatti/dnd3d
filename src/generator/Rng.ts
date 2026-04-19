/**
 * Seeded random number generator brukt av map-generatorer.
 * Determinisme er essensielt — samme seed skal gi samme map.
 */

export interface Rng {
  /** Råverdi i [0, 1). */
  next(): number;
  /** Float i [min, max). */
  range(min: number, max: number): number;
  /** Heltall i [min, max] inklusivt. */
  int(min: number, max: number): number;
  /** Velg ett tilfeldig element. */
  choice<T>(arr: readonly T[]): T;
  /** Velg ett element basert på vekter (samme lengde som arr). */
  weightedChoice<T>(arr: readonly T[], weights: readonly number[]): T;
  /** Returner verdi pluss/minus jitter (uniform fordeling). */
  jitter(value: number, amount: number): number;
  /** Rotasjon snappet til 45°-steg, jf. asymmetri-regelen. */
  rot45(): number;
  /** Tilfeldig kvadrant 0..3 (NV, NØ, SØ, SV) — brukt for off-center focal point. */
  quadrant(): 0 | 1 | 2 | 3;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    choice(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    weightedChoice(arr, weights) {
      let total = 0;
      for (const w of weights) total += w;
      let pick = next() * total;
      for (let i = 0; i < arr.length; i++) {
        pick -= weights[i];
        if (pick <= 0) return arr[i];
      }
      return arr[arr.length - 1];
    },
    jitter(value, amount) {
      return value + (next() - 0.5) * 2 * amount;
    },
    rot45() {
      const steps = Math.floor(next() * 8);
      return (steps * Math.PI) / 4;
    },
    quadrant() {
      return Math.floor(next() * 4) as 0 | 1 | 2 | 3;
    },
  };
}

/** Konverter en tekststreng til et 32-bit seed (for brukerinput "abc" → tall). */
export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Gauss-bump for høydefelt — kopiert ut fra DemoWorld for delt bruk. */
export function gauss(
  ix: number,
  iz: number,
  cx: number,
  cz: number,
  r: number,
  h: number,
): number {
  const dx = ix - cx;
  const dz = iz - cz;
  return h * Math.exp(-(dx * dx + dz * dz) / (r * r));
}
