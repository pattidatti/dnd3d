import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { profileFor, type GraphicsQuality } from './GraphicsQuality';

export type Mood = 'day' | 'dawn' | 'dusk' | 'night';

interface MoodSpec {
  // Sun position
  elevation: number; // grader, 0 = horisont, 90 = zenith. Negative = under horisont.
  azimuth: number;
  // Lights
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  // Sky shader
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  // Atmosphere
  fogColor: number;
  fogNear: number;
  fogFar: number;
  envIntensity: number;
  toneMappingExposure: number;
}

const MOOD_PRESETS: Record<Mood, MoodSpec> = {
  day: {
    elevation: 42,
    azimuth: 145,
    sunColor: 0xfff1d6,
    sunIntensity: 0.8,
    hemiSky: 0xa0c8ff,
    hemiGround: 0xc09040,
    hemiIntensity: 0.25,
    turbidity: 3.0,
    rayleigh: 1.0,
    mieCoefficient: 0.004,
    mieDirectionalG: 0.75,
    fogColor: 0x9ab8d4,
    fogNear: 140,
    fogFar: 500,
    envIntensity: 0.12,
    toneMappingExposure: 0.40,
  },
  dawn: {
    elevation: 12,
    azimuth: 95,
    sunColor: 0xffb27a,
    sunIntensity: 0.7,
    hemiSky: 0xffd0a8,
    hemiGround: 0x6a4a3a,
    hemiIntensity: 0.25,
    turbidity: 6,
    rayleigh: 1.4,
    mieCoefficient: 0.003,
    mieDirectionalG: 0.80,
    fogColor: 0xe8c8a0,
    fogNear: 120,
    fogFar: 460,
    envIntensity: 0.10,
    toneMappingExposure: 0.38,
  },
  dusk: {
    elevation: 11,
    azimuth: 260,
    sunColor: 0xff7a4a,
    sunIntensity: 0.7,
    hemiSky: 0xff8866,
    hemiGround: 0x3a2a4a,
    hemiIntensity: 0.20,
    turbidity: 5,
    rayleigh: 1.6,
    mieCoefficient: 0.003,
    mieDirectionalG: 0.80,
    fogColor: 0xc88060,
    fogNear: 110,
    fogFar: 440,
    envIntensity: 0.10,
    toneMappingExposure: 0.38,
  },
  night: {
    // Sola under horisonten — Sky-shaderen rendrer da mørkt uten Mie-glød.
    elevation: -12,
    azimuth: 200,
    sunColor: 0x4a5878,
    sunIntensity: 0.04,
    hemiSky: 0x0a0e1a,
    hemiGround: 0x05060a,
    hemiIntensity: 0.10,
    turbidity: 0.05,
    rayleigh: 0.15,
    mieCoefficient: 0.0005,
    mieDirectionalG: 0.5,
    fogColor: 0x040618,
    fogNear: 30,
    fogFar: 200,
    envIntensity: 0.03,
    toneMappingExposure: 0.18,
  },
};

interface AnimState {
  // Vi animerer en delmengde av MoodSpec myk-overgang.
  sunColor: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  fogColor: THREE.Color;
  sunIntensity: number;
  hemiIntensity: number;
  envIntensity: number;
  fogNear: number;
  fogFar: number;
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  elevation: number;
  azimuth: number;
  toneMappingExposure: number;
}

function specToState(s: MoodSpec): AnimState {
  return {
    sunColor: new THREE.Color(s.sunColor),
    hemiSky: new THREE.Color(s.hemiSky),
    hemiGround: new THREE.Color(s.hemiGround),
    fogColor: new THREE.Color(s.fogColor),
    sunIntensity: s.sunIntensity,
    hemiIntensity: s.hemiIntensity,
    envIntensity: s.envIntensity,
    fogNear: s.fogNear,
    fogFar: s.fogFar,
    turbidity: s.turbidity,
    rayleigh: s.rayleigh,
    mieCoefficient: s.mieCoefficient,
    mieDirectionalG: s.mieDirectionalG,
    elevation: s.elevation,
    azimuth: s.azimuth,
    toneMappingExposure: s.toneMappingExposure,
  };
}

const TRANSITION_MS = 600;

export class SkyEnvironment {
  readonly sky: Sky;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private readonly scene: THREE.Scene;
  private readonly sunVec = new THREE.Vector3();

  private currentMood: Mood = 'day';
  private state: AnimState = specToState(MOOD_PRESETS.day);
  private fromState: AnimState = specToState(MOOD_PRESETS.day);
  private toState: AnimState = specToState(MOOD_PRESETS.day);
  private transitionStart = 0;
  private transitionDur = 0;
  private animating = false;

  private pmrem: THREE.PMREMGenerator;
  private envScene: THREE.Scene;
  private envSky: Sky;
  private currentEnvTarget: THREE.WebGLRenderTarget | null = null;
  private envDirty = false;
  private envRefreshScheduled = false;
  private readonly renderer: THREE.WebGLRenderer;

  private readonly listeners = new Set<(mood: Mood) => void>();

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.sky = new Sky();
    this.sky.scale.setScalar(4500);
    scene.add(this.sky);

    this.hemi = new THREE.HemisphereLight(0xa0c8ff, 0xc09040, 0.45);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 700;
    const s = 260;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.5;
    this.sun.shadow.camera.updateProjectionMatrix();
    scene.add(this.sun);
    scene.add(this.sun.target);

    scene.background = new THREE.Color(MOOD_PRESETS.day.fogColor);
    scene.fog = new THREE.Fog(MOOD_PRESETS.day.fogColor, 140, 500);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envSky = this.sky.clone() as Sky;
    this.envSky.material = this.sky.material;
    this.envScene.add(this.envSky);
    scene.environmentIntensity = MOOD_PRESETS.day.envIntensity;

    this.applyState(this.state);
    this.refreshEnvironment();
  }

  /** Kalles per frame fra App for å drive mykt overgang og evt. PMREM-rebuild. */
  tick(): void {
    if (this.animating) {
      const t = Math.min(1, (performance.now() - this.transitionStart) / this.transitionDur);
      const e = easeInOut(t);
      lerpState(this.fromState, this.toState, e, this.state);
      this.applyState(this.state);
      this.envDirty = true;
      if (t >= 1) {
        this.animating = false;
        this.state = { ...this.toState, sunColor: this.toState.sunColor.clone(),
          hemiSky: this.toState.hemiSky.clone(), hemiGround: this.toState.hemiGround.clone(),
          fogColor: this.toState.fogColor.clone() };
      }
    }

    if (this.envDirty && !this.envRefreshScheduled) {
      this.envRefreshScheduled = true;
      // PMREM er dyrt — debounce med rAF for å unngå per-frame rebuild.
      requestAnimationFrame(() => {
        this.envRefreshScheduled = false;
        this.envDirty = false;
        this.refreshEnvironment();
      });
    }
  }

  setMood(mood: Mood, animate = true): void {
    if (this.currentMood === mood && !this.animating) return;
    this.currentMood = mood;
    const target = specToState(MOOD_PRESETS[mood]);
    if (!animate) {
      this.state = target;
      this.applyState(this.state);
      this.envDirty = true;
      this.animating = false;
    } else {
      this.fromState = cloneState(this.state);
      this.toState = target;
      this.transitionStart = performance.now();
      this.transitionDur = TRANSITION_MS;
      this.animating = true;
    }
    for (const l of this.listeners) l(mood);
  }

  /** Sett tid på døgnet eksplisitt. t i 0..24 (0=midnatt, 12=middag). */
  setTimeOfDay(hours: number): void {
    const h = ((hours % 24) + 24) % 24;
    // Mappe til en mood basert på time. Mellom mood-er bruker vi nærmeste preset for nå
    // (full kontinuerlig solbevegelse + farger er overkill — preset gir konsistent stemning).
    let mood: Mood;
    if (h < 5 || h >= 21) mood = 'night';
    else if (h < 8) mood = 'dawn';
    else if (h < 17) mood = 'day';
    else if (h < 20) mood = 'dusk';
    else mood = 'night';
    this.setMood(mood);
  }

  /** Oppdater sun.shadow.mapSize basert på quality. Trygg å kalle når som helst. */
  applyShadowMapSize(quality: GraphicsQuality): void {
    const size = profileFor(quality).shadowMapSize;
    if (this.sun.shadow.mapSize.x === size) return;
    this.sun.shadow.mapSize.set(size, size);
    // Frigjør gammel shadow-map så den re-allokeres med ny størrelse.
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
  }

  getMood(): Mood {
    return this.currentMood;
  }

  onMoodChange(cb: (mood: Mood) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private applyState(s: AnimState): void {
    // Sky
    const u = this.sky.material.uniforms;
    u.turbidity.value = s.turbidity;
    u.rayleigh.value = s.rayleigh;
    u.mieCoefficient.value = s.mieCoefficient;
    u.mieDirectionalG.value = s.mieDirectionalG;

    // Sun position
    const phi = THREE.MathUtils.degToRad(90 - s.elevation);
    const theta = THREE.MathUtils.degToRad(s.azimuth);
    this.sunVec.setFromSphericalCoords(1, phi, theta);
    u.sunPosition.value.copy(this.sunVec);
    this.sun.position.copy(this.sunVec).multiplyScalar(200);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();

    // Lower elevation = lower bias risk, øk for å unngå acne.
    const elev01 = THREE.MathUtils.clamp(s.elevation / 60, 0, 1);
    this.sun.shadow.bias = -0.0005 - (1 - elev01) * 0.001;

    // Lights
    this.sun.color.copy(s.sunColor);
    this.sun.intensity = s.sunIntensity;
    this.hemi.color.copy(s.hemiSky);
    this.hemi.groundColor.copy(s.hemiGround);
    this.hemi.intensity = s.hemiIntensity;

    // Fog + bakgrunn
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(s.fogColor);
      this.scene.fog.near = s.fogNear;
      this.scene.fog.far = s.fogFar;
    }
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(s.fogColor);
    } else {
      this.scene.background = s.fogColor.clone();
    }
    this.scene.environmentIntensity = s.envIntensity;
    this.renderer.toneMappingExposure = s.toneMappingExposure;
  }

  private refreshEnvironment(): void {
    const newTarget = this.pmrem.fromScene(this.envScene);
    const old = this.currentEnvTarget;
    this.currentEnvTarget = newTarget;
    this.scene.environment = newTarget.texture;
    old?.dispose();
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function cloneState(s: AnimState): AnimState {
  return {
    ...s,
    sunColor: s.sunColor.clone(),
    hemiSky: s.hemiSky.clone(),
    hemiGround: s.hemiGround.clone(),
    fogColor: s.fogColor.clone(),
  };
}

function lerpState(a: AnimState, b: AnimState, t: number, out: AnimState): void {
  out.sunColor.copy(a.sunColor).lerp(b.sunColor, t);
  out.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
  out.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);
  out.fogColor.copy(a.fogColor).lerp(b.fogColor, t);
  out.sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, t);
  out.hemiIntensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, t);
  out.envIntensity = THREE.MathUtils.lerp(a.envIntensity, b.envIntensity, t);
  out.fogNear = THREE.MathUtils.lerp(a.fogNear, b.fogNear, t);
  out.fogFar = THREE.MathUtils.lerp(a.fogFar, b.fogFar, t);
  out.turbidity = THREE.MathUtils.lerp(a.turbidity, b.turbidity, t);
  out.rayleigh = THREE.MathUtils.lerp(a.rayleigh, b.rayleigh, t);
  out.mieCoefficient = THREE.MathUtils.lerp(a.mieCoefficient, b.mieCoefficient, t);
  out.mieDirectionalG = THREE.MathUtils.lerp(a.mieDirectionalG, b.mieDirectionalG, t);
  out.elevation = THREE.MathUtils.lerp(a.elevation, b.elevation, t);
  out.azimuth = THREE.MathUtils.lerp(a.azimuth, b.azimuth, t);
  out.toneMappingExposure = THREE.MathUtils.lerp(a.toneMappingExposure, b.toneMappingExposure, t);
}
