import * as THREE from 'three';

// Subtile dust-partikler som svever rundt kameraet. Holdt billig:
// én Points-mesh, custom shader for soft round + dybde-fade.

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute float aSeed;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // Drift med per-partikkel-frekvens basert på seed.
    float s = aSeed;
    p.x += sin(uTime * 0.15 + s * 12.13) * 1.4;
    p.y += sin(uTime * 0.11 + s * 7.71) * 0.8;
    p.z += cos(uTime * 0.13 + s * 4.87) * 1.4;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    // Mindre punkter langt unna, fade ut på avstand.
    gl_PointSize = uSize * (50.0 / max(dist, 1.0));
    vAlpha = smoothstep(180.0, 80.0, dist);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float r = length(c);
    if (r > 0.5) discard;
    float a = (1.0 - smoothstep(0.2, 0.5, r)) * vAlpha * uIntensity;
    gl_FragColor = vec4(uColor, a);
  }
`;

export class Atmosphere {
  readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private capacity = 0;
  private intensity = 1.0;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 1.6 },
        uColor: { value: new THREE.Color(0xfff0d0) },
        uIntensity: { value: 1.0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  setCapacity(count: number): void {
    if (count === this.capacity) return;
    this.capacity = count;
    if (count <= 0) {
      this.points.visible = false;
      return;
    }
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const range = 100;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * range * 2;
      positions[i * 3 + 1] = Math.random() * 60 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * range * 2;
      seeds[i] = Math.random() * 100;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.geometry.attributes.position.needsUpdate = true;
    this.points.visible = this.intensity > 0.01;
  }

  setIntensity(i: number): void {
    this.intensity = THREE.MathUtils.clamp(i, 0, 1);
    this.material.uniforms.uIntensity.value = this.intensity;
    this.points.visible = this.capacity > 0 && this.intensity > 0.01;
  }

  setColor(hex: number): void {
    (this.material.uniforms.uColor.value as THREE.Color).set(hex);
  }

  tick(elapsedSeconds: number, cameraPos: THREE.Vector3): void {
    this.material.uniforms.uTime.value = elapsedSeconds;
    // Følg kameraet i XZ slik at partiklene alltid omslutter spilleren.
    this.points.position.set(Math.round(cameraPos.x), 0, Math.round(cameraPos.z));
  }
}
