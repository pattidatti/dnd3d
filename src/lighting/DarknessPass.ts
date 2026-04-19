import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import type { LightRegistry, LightSource } from './LightRegistry';

/**
 * Post-pass som leser scenens farge + dybde, rekonstruerer verdens-posisjon
 * pr. piksel, og multipliserer pikselen med (1 - mørke). Mørke = max(0,
 * minDarkness − reveal_fra_lyskilder), hvor hver lyskilde gir en soft falloff
 * fra senter til radius.
 *
 * Bevisst valg: ingen ekte volumetrisk ray-march i MVP. Vi får dybde-aware
 * mørke ved å sample depthTexture per piksel, men selve "luft-mørket" er ikke
 * synlig før det treffer en flate. Det matcher gameplay-kravet (silhuetter
 * gjennom mørket) uten å koste ray-march-perf.
 */

export const MAX_LIGHTS = 32;

export interface DarknessPassOptions {
  minDarkness?: number;     // 0..1; floor på mørke selv i fullt sollys
  globalOpacity?: number;   // 0..1; multiplier på mørket (1 = full, brukes til DM-overlay)
  skyDarkness?: number;     // 0..1; hvor mye himmel/horisont-piksler skal mørklegges (mood-styrt)
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform mat4 projectionMatrixInverse;
  uniform mat4 viewMatrixInverse;

  uniform int uNumLights;
  uniform vec3 uLightPos[${MAX_LIGHTS}];
  uniform float uLightRadius[${MAX_LIGHTS}];
  uniform vec3 uLightColor[${MAX_LIGHTS}];
  uniform float uLightIntensity[${MAX_LIGHTS}];

  uniform float uMinDarkness;
  uniform float uGlobalOpacity;
  uniform float uSkyDarkness;

  varying vec2 vUv;

  // Konverter ikke-lineær depth (0..1) til verdens-posisjon ved å gå via clip-space.
  vec3 worldPosFromDepth(vec2 uv, float rawDepth) {
    float z = rawDepth * 2.0 - 1.0;
    vec4 clip = vec4(uv * 2.0 - 1.0, z, 1.0);
    vec4 view = projectionMatrixInverse * clip;
    view /= view.w;
    vec4 world = viewMatrixInverse * view;
    return world.xyz;
  }

  void main() {
    vec4 src = texture2D(tDiffuse, vUv);
    float rawDepth = texture2D(tDepth, vUv).x;

    // Himmel/horisont (depth ~1.0): mørklegg etter mood. uSkyDarkness=0 lar
    // dag-himmelen være helt urørt; uSkyDarkness~0.95 + mood-tunet sun-elev
    // gjør natt-himmelen tilnærmet kullsvart.
    if (rawDepth >= 0.9999) {
      vec3 darkSky = src.rgb * 0.08;
      gl_FragColor = vec4(mix(src.rgb, darkSky, uSkyDarkness * uGlobalOpacity), src.a);
      return;
    }

    vec3 wp = worldPosFromDepth(vUv, rawDepth);

    // Akkumuler reveal: hver lyskilde gir 0..1 lommen-styrke. Vi tar maks så
    // overlappende lys ikke summerer over 1.
    float reveal = 0.0;
    vec3 warmTint = vec3(0.0);
    float warmWeight = 0.0;

    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      if (i >= uNumLights) break;
      float r = uLightRadius[i];
      float intensity = uLightIntensity[i];
      vec3 toLight = uLightPos[i] - wp;
      float dist = length(toLight);
      // Soft falloff: full reveal innenfor 30% av radius, glir til 0 ved radius.
      float f = 1.0 - smoothstep(r * 0.3, r, dist);
      f *= intensity;
      reveal = max(reveal, f);
      // Akkumuler farget bidrag (vektet) for varm tinting nær lyset.
      warmTint += uLightColor[i] * f;
      warmWeight += f;
    }
    reveal = clamp(reveal, 0.0, 1.0);

    // Mørke-mengde i [0..1]. Cappen er nesten 1.0 slik at natt kan drepe sikten
    // helt utenfor lyskilder.
    float darkness = uMinDarkness * (1.0 - reveal);
    darkness = clamp(darkness * uGlobalOpacity, 0.0, 0.998);

    // Absolutt nær-svart (ikke src-relativt) så natt utenfor lys mister all
    // gjenkjennbar farge. Kullblå-tone for stemning, ikke pen sort.
    vec3 darkColor = vec3(0.003, 0.005, 0.012);

    // Varm tint nær lys. Ingen multiplikativ lift på src — vi vil at "opplyst"
    // skal komme fra at darkness=0, ikke fra ekstra brightness.
    vec3 warm = warmWeight > 0.0001 ? warmTint / warmWeight : vec3(0.0);
    vec3 lit = src.rgb + warm * 0.45 * reveal;

    vec3 outCol = mix(lit, darkColor, darkness);
    gl_FragColor = vec4(outCol, src.a);
  }
`;

export class DarknessPass extends Pass {
  readonly material: THREE.ShaderMaterial;
  private readonly fsQuad: FullScreenQuad;
  private readonly lights: LightRegistry;
  private readonly camera: THREE.PerspectiveCamera;

  constructor(
    camera: THREE.PerspectiveCamera,
    lights: LightRegistry,
    options: DarknessPassOptions = {},
  ) {
    super();
    this.camera = camera;
    this.lights = lights;
    this.needsSwap = true;

    // Initialiser uniforms-arrays.
    const lightPosUniforms: THREE.Vector3[] = [];
    const lightColorUniforms: THREE.Vector3[] = [];
    for (let i = 0; i < MAX_LIGHTS; i++) {
      lightPosUniforms.push(new THREE.Vector3());
      lightColorUniforms.push(new THREE.Vector3());
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
        projectionMatrixInverse: { value: new THREE.Matrix4() },
        viewMatrixInverse: { value: new THREE.Matrix4() },
        uNumLights: { value: 0 },
        uLightPos: { value: lightPosUniforms },
        uLightRadius: { value: new Float32Array(MAX_LIGHTS) },
        uLightColor: { value: lightColorUniforms },
        uLightIntensity: { value: new Float32Array(MAX_LIGHTS) },
        uMinDarkness: { value: options.minDarkness ?? 0.85 },
        uGlobalOpacity: { value: options.globalOpacity ?? 1.0 },
        uSkyDarkness: { value: options.skyDarkness ?? 0.0 },
      },
      depthWrite: false,
      depthTest: false,
    });

    this.fsQuad = new FullScreenQuad(this.material);
  }

  setMinDarkness(v: number): void {
    this.material.uniforms.uMinDarkness.value = THREE.MathUtils.clamp(v, 0, 1);
  }

  setGlobalOpacity(v: number): void {
    this.material.uniforms.uGlobalOpacity.value = THREE.MathUtils.clamp(v, 0, 1);
  }

  setSkyDarkness(v: number): void {
    this.material.uniforms.uSkyDarkness.value = THREE.MathUtils.clamp(v, 0, 1);
  }

  /** Refresher kamera- og lys-uniforms. Kalles fra App.tick FØR composer.render. */
  syncUniforms(): void {
    const u = this.material.uniforms;
    u.cameraNear.value = this.camera.near;
    u.cameraFar.value = this.camera.far;
    (u.projectionMatrixInverse.value as THREE.Matrix4).copy(this.camera.projectionMatrixInverse);
    (u.viewMatrixInverse.value as THREE.Matrix4).copy(this.camera.matrixWorld);

    const all = this.lights.all();
    // Sortér på avstand fra kamera så de viktigste lysene alltid er med
    // dersom vi har flere enn MAX_LIGHTS.
    if (all.length > MAX_LIGHTS) {
      const camPos = this.camera.position;
      all.sort((a: LightSource, b: LightSource) => a.position.distanceToSquared(camPos) - b.position.distanceToSquared(camPos));
    }
    const n = Math.min(all.length, MAX_LIGHTS);

    const posUniforms = u.uLightPos.value as THREE.Vector3[];
    const colorUniforms = u.uLightColor.value as THREE.Vector3[];
    const radiusArr = u.uLightRadius.value as Float32Array;
    const intensityArr = u.uLightIntensity.value as Float32Array;

    for (let i = 0; i < n; i++) {
      const s = all[i];
      posUniforms[i].copy(s.position);
      colorUniforms[i].set(s.color.r, s.color.g, s.color.b);
      radiusArr[i] = s.radius;
      intensityArr[i] = s.intensity;
    }
    u.uNumLights.value = n;
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget | null,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    // readBuffer ble akkurat skrevet til av RenderPass, og dens depthTexture
    // har fersk scene-dybde. EffectComposer alternerer rt1/rt2 pr. frame —
    // derfor må vi slå opp tDepth dynamisk (ikke holde en fast referanse).
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    this.material.uniforms.tDepth.value = readBuffer.depthTexture;
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }

  override dispose(): void {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
