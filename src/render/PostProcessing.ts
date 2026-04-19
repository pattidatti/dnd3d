import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { profileFor, type GraphicsQuality } from './GraphicsQuality';

// Vignette + color grade shader. Lift/gamma/gain er klassisk filmisk grading.
// Vignette er en mild radial mørkning, og dampes på lave nivåer av "vignette".
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.5 },
    uVignetteSoftness: { value: 0.65 },
    uLift: { value: new THREE.Vector3(0, 0, 0) },
    uGamma: { value: new THREE.Vector3(1, 1, 1) },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uSaturation: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uVignetteSoftness;
    uniform vec3 uLift;
    uniform vec3 uGamma;
    uniform vec3 uGain;
    uniform float uSaturation;
    varying vec2 vUv;

    vec3 lgg(vec3 c, vec3 lift, vec3 gamma, vec3 gain) {
      // ASC CDL-aktig: out = pow(gain * (c + lift * (1 - c)), 1/gamma)
      vec3 v = gain * (c + lift * (1.0 - c));
      v = max(v, vec3(0.0));
      return pow(v, 1.0 / max(gamma, vec3(0.001)));
    }

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 col = src.rgb;

      col = lgg(col, uLift, uGamma, uGain);

      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // Smooth radial vignette.
      vec2 centered = vUv - 0.5;
      float r = length(centered) * 1.4142;
      float v = smoothstep(uVignetteSoftness, 1.0, r);
      col *= mix(1.0, 1.0 - uVignette, v);

      gl_FragColor = vec4(col, src.a);
    }
  `,
};

export type Mood = 'day' | 'dawn' | 'dusk' | 'night';

interface MoodLook {
  bloomStrength: number;
  bloomThreshold: number;
  bloomRadius: number;
  vignette: number;
  lift: THREE.Vector3;
  gamma: THREE.Vector3;
  gain: THREE.Vector3;
  saturation: number;
}

const MOODS: Record<Mood, MoodLook> = {
  day: {
    bloomStrength: 0.08,
    bloomThreshold: 0.96,
    bloomRadius: 0.4,
    vignette: 0.35,
    lift: new THREE.Vector3(0.0, 0.0, 0.01),
    gamma: new THREE.Vector3(1.0, 1.0, 1.02),
    gain: new THREE.Vector3(1.02, 1.0, 0.99),
    saturation: 1.05,
  },
  dawn: {
    bloomStrength: 0.18,
    bloomThreshold: 0.90,
    bloomRadius: 0.6,
    vignette: 0.45,
    lift: new THREE.Vector3(0.02, 0.0, -0.02),
    gamma: new THREE.Vector3(0.98, 1.02, 1.06),
    gain: new THREE.Vector3(1.08, 0.98, 0.9),
    saturation: 1.12,
  },
  dusk: {
    bloomStrength: 0.22,
    bloomThreshold: 0.88,
    bloomRadius: 0.65,
    vignette: 0.55,
    lift: new THREE.Vector3(0.03, 0.005, -0.015),
    gamma: new THREE.Vector3(0.95, 1.0, 1.05),
    gain: new THREE.Vector3(1.12, 0.96, 0.88),
    saturation: 1.18,
  },
  night: {
    bloomStrength: 0.35,
    bloomThreshold: 0.75,
    bloomRadius: 0.85,
    vignette: 0.7,
    lift: new THREE.Vector3(-0.01, 0.0, 0.04),
    gamma: new THREE.Vector3(1.06, 1.04, 0.96),
    gain: new THREE.Vector3(0.82, 0.9, 1.1),
    saturation: 0.85,
  },
};

export class PostProcessing {
  readonly composer: EffectComposer;
  /** Hovedtarget for composer — eier dybde-tekstur som DarknessPass leser fra. */
  readonly mainRenderTarget: THREE.WebGLRenderTarget;
  readonly depthTexture: THREE.DepthTexture;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;

  private renderPass!: RenderPass;
  private ssaoPass: SSAOPass | null = null;
  private bloomPass!: UnrealBloomPass;
  private gradePass!: ShaderPass;
  private outputPass!: OutputPass;
  private smaaPass: SMAAPass | null = null;
  private darknessPass: Pass | null = null;

  private quality: GraphicsQuality;
  private currentMood: Mood = 'day';

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    quality: GraphicsQuality,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;

    const size = renderer.getSize(new THREE.Vector2());
    const px = renderer.getPixelRatio();
    const w = Math.max(1, Math.floor(size.x * px));
    const h = Math.max(1, Math.floor(size.y * px));

    // Bygg eget render-target med dybde-tekstur — DarknessPass må kunne
    // sample scene-depth for å rekonstruere verdens-posisjon per piksel.
    this.depthTexture = new THREE.DepthTexture(w, h);
    this.depthTexture.format = THREE.DepthFormat;
    this.depthTexture.type = THREE.UnsignedShortType;
    this.mainRenderTarget = new THREE.WebGLRenderTarget(w, h, {
      depthBuffer: true,
      depthTexture: this.depthTexture,
    });

    this.composer = new EffectComposer(renderer, this.mainRenderTarget);
    this.composer.setPixelRatio(px);
    this.composer.setSize(size.x, size.y);

    this.buildPasses();
    this.applyMood(this.currentMood);
  }

  /**
   * Sett (eller fjern) en Darkness-pass som settes inn rett etter RenderPass.
   * Må kalles før noe annet enn Render har kjørt for å få korrekt rekkefølge —
   * praktisk ved boot.
   */
  setDarknessPass(pass: Pass | null): void {
    this.darknessPass = pass;
    this.buildPasses();
    this.applyMood(this.currentMood);
  }

  private buildPasses(): void {
    // Tøm composer (ved rebuild etter quality-bytte).
    while (this.composer.passes.length > 0) {
      const p = this.composer.passes.pop();
      p?.dispose?.();
    }

    const profile = profileFor(this.quality);
    const size = this.renderer.getSize(new THREE.Vector2());

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Mørke kommer rett etter scene-rendering, før bloom/grade — slik at
    // bloom kan plukke opp glow fra opplyste områder, og color-grade får
    // riktig tone-base.
    if (this.darknessPass) {
      this.composer.addPass(this.darknessPass);
    }

    if (profile.ssao) {
      const w = profile.ssaoHalfRes ? Math.floor(size.x / 2) : size.x;
      const h = profile.ssaoHalfRes ? Math.floor(size.y / 2) : size.y;
      this.ssaoPass = new SSAOPass(this.scene, this.camera, w, h);
      this.ssaoPass.kernelRadius = profile.ssaoKernelRadius;
      this.ssaoPass.minDistance = 0.002;
      this.ssaoPass.maxDistance = 0.08;
      this.ssaoPass.output = SSAOPass.OUTPUT.Default;
      this.composer.addPass(this.ssaoPass);
    } else {
      this.ssaoPass = null;
    }

    if (profile.bloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.x, size.y),
        0.4,
        0.6,
        0.85,
      );
      this.composer.addPass(this.bloomPass);
    }

    if (profile.smaa) {
      this.smaaPass = new SMAAPass();
      this.composer.addPass(this.smaaPass);
    } else {
      this.smaaPass = null;
    }

    this.gradePass = new ShaderPass(GradeShader);
    this.composer.addPass(this.gradePass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    if (this.ssaoPass) {
      const profile = profileFor(this.quality);
      const w = profile.ssaoHalfRes ? Math.floor(width / 2) : width;
      const h = profile.ssaoHalfRes ? Math.floor(height / 2) : height;
      this.ssaoPass.setSize(w, h);
    }
    if (this.bloomPass) this.bloomPass.setSize(width, height);
    if (this.smaaPass) {
      const px = this.renderer.getPixelRatio();
      this.smaaPass.setSize(width * px, height * px);
    }
  }

  setQuality(q: GraphicsQuality): void {
    if (q === this.quality) return;
    this.quality = q;
    this.buildPasses();
    this.applyMood(this.currentMood);
  }

  getQuality(): GraphicsQuality {
    return this.quality;
  }

  setMood(mood: Mood): void {
    this.currentMood = mood;
    this.applyMood(mood);
  }

  private applyMood(mood: Mood): void {
    const look = MOODS[mood];
    if (this.bloomPass) {
      this.bloomPass.strength = look.bloomStrength;
      this.bloomPass.threshold = look.bloomThreshold;
      this.bloomPass.radius = look.bloomRadius;
    }
    const u = this.gradePass.uniforms;
    u.uVignette.value = look.vignette;
    (u.uLift.value as THREE.Vector3).copy(look.lift);
    (u.uGamma.value as THREE.Vector3).copy(look.gamma);
    (u.uGain.value as THREE.Vector3).copy(look.gain);
    u.uSaturation.value = look.saturation;
  }

  render(deltaTime: number): void {
    this.composer.render(deltaTime);
  }
}
