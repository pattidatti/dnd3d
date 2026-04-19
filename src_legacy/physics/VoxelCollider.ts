import * as THREE from 'three';
import type { VoxelWorld } from '../world/VoxelWorld';
import { BlockType } from '../world/BlockPalette';

export interface SweepResult {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  grounded: boolean;
  collidedX: boolean;
  collidedY: boolean;
  collidedZ: boolean;
}

const EPS = 0.0005;

/**
 * AABB-sweep mot voxel-verden. AABB er definert av senter-XZ og base-Y:
 *   min = (pos.x - hx, pos.y,      pos.z - hz)
 *   max = (pos.x + hx, pos.y + h,  pos.z + hz)
 *
 * Vann (og senere lignende ikke-solide blokker) teller ikke som kollisjon.
 */
export class VoxelCollider {
  constructor(private readonly world: VoxelWorld) {}

  /** Er blokken ved (x,y,z) solid mht. kollisjon? */
  solid(x: number, y: number, z: number): boolean {
    const t = this.world.getBlock(x, y, z);
    if (t === undefined) return false;
    if (t === BlockType.Water) return false;
    return true;
  }

  /** Utfør sweep akse-for-akse med gitt hastighet over dt. */
  sweep(
    pos: THREE.Vector3,
    halfX: number,
    halfZ: number,
    height: number,
    velocity: THREE.Vector3,
    dt: number,
  ): SweepResult {
    const out: SweepResult = {
      position: pos.clone(),
      velocity: velocity.clone(),
      grounded: false,
      collidedX: false,
      collidedY: false,
      collidedZ: false,
    };

    // --- X-akse ---
    let dx = velocity.x * dt;
    if (dx !== 0) {
      const pushed = this.sweepAxis(
        out.position.x, out.position.y, out.position.z,
        halfX, halfZ, height,
        0, dx,
      );
      out.position.x += pushed.moved;
      if (pushed.blocked) {
        out.velocity.x = 0;
        out.collidedX = true;
      }
    }

    // --- Z-akse ---
    let dz = velocity.z * dt;
    if (dz !== 0) {
      const pushed = this.sweepAxis(
        out.position.x, out.position.y, out.position.z,
        halfX, halfZ, height,
        2, dz,
      );
      out.position.z += pushed.moved;
      if (pushed.blocked) {
        out.velocity.z = 0;
        out.collidedZ = true;
      }
    }

    // --- Y-akse ---
    let dy = velocity.y * dt;
    if (dy !== 0) {
      const pushed = this.sweepAxis(
        out.position.x, out.position.y, out.position.z,
        halfX, halfZ, height,
        1, dy,
      );
      out.position.y += pushed.moved;
      if (pushed.blocked) {
        if (dy < 0) out.grounded = true;
        out.velocity.y = 0;
        out.collidedY = true;
      }
    }

    // Fallback grounded-sjekk: hvis vi ikke akselererte ned men står rett
    // over en solid blokk, er vi på bakken.
    if (!out.grounded && out.velocity.y <= 0) {
      out.grounded = this.isGrounded(out.position, halfX, halfZ);
    }

    return out;
  }

  /** Er det en solid blokk rett under AABB-en? */
  isGrounded(pos: THREE.Vector3, halfX: number, halfZ: number): boolean {
    const probeY = pos.y - EPS * 4;
    const y = Math.floor(probeY);
    if (y < 0) return false;
    const x0 = Math.floor(pos.x - halfX + EPS);
    const x1 = Math.floor(pos.x + halfX - EPS);
    const z0 = Math.floor(pos.z - halfZ + EPS);
    const z1 = Math.floor(pos.z + halfZ - EPS);
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        if (this.solid(x, y, z)) return true;
      }
    }
    return false;
  }

  /** Kan AABB-en stå på (px, py, pz) uten å klippe i solide blokker? */
  canStand(pos: THREE.Vector3, halfX: number, halfZ: number, height: number): boolean {
    const x0 = Math.floor(pos.x - halfX + EPS);
    const x1 = Math.floor(pos.x + halfX - EPS);
    const z0 = Math.floor(pos.z - halfZ + EPS);
    const z1 = Math.floor(pos.z + halfZ - EPS);
    const y0 = Math.floor(pos.y + EPS);
    const y1 = Math.floor(pos.y + height - EPS);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          if (this.solid(x, y, z)) return false;
        }
      }
    }
    return true;
  }

  /**
   * Sweep én akse. `axis`: 0=X, 1=Y, 2=Z. Returnerer hvor langt AABB-en faktisk
   * flyttet seg + om den ble blokkert.
   */
  private sweepAxis(
    px: number, py: number, pz: number,
    halfX: number, halfZ: number, height: number,
    axis: number, delta: number,
  ): { moved: number; blocked: boolean } {
    if (delta === 0) return { moved: 0, blocked: false };

    const sign = delta > 0 ? 1 : -1;
    const absDelta = Math.abs(delta);

    // AABB-grenser før bevegelse
    const minX = px - halfX, maxX = px + halfX;
    const minY = py,         maxY = py + height;
    const minZ = pz - halfZ, maxZ = pz + halfZ;

    // "Leading edge" på aksen som beveger seg
    let leadStart: number;
    if (axis === 0) leadStart = sign > 0 ? maxX : minX;
    else if (axis === 1) leadStart = sign > 0 ? maxY : minY;
    else leadStart = sign > 0 ? maxZ : minZ;

    const leadEnd = leadStart + delta;

    // Nabo-blokker innenfor traversert område
    const voxStart = sign > 0
      ? Math.floor(leadStart + EPS)
      : Math.floor(leadEnd - EPS);
    const voxEnd = sign > 0
      ? Math.floor(leadEnd - EPS)
      : Math.floor(leadStart + EPS) - 1;

    // "Andre akser" — cellerange som overlapper AABB-en
    let a0: number, a1: number, b0: number, b1: number;
    if (axis === 0) {
      a0 = Math.floor(minY + EPS); a1 = Math.floor(maxY - EPS);
      b0 = Math.floor(minZ + EPS); b1 = Math.floor(maxZ - EPS);
    } else if (axis === 1) {
      a0 = Math.floor(minX + EPS); a1 = Math.floor(maxX - EPS);
      b0 = Math.floor(minZ + EPS); b1 = Math.floor(maxZ - EPS);
    } else {
      a0 = Math.floor(minX + EPS); a1 = Math.floor(maxX - EPS);
      b0 = Math.floor(minY + EPS); b1 = Math.floor(maxY - EPS);
    }

    // Iterér blokker i bevegelsesretning; finn første kollisjon.
    let moved = delta;
    let blocked = false;
    const step = sign;
    let v = voxStart;
    const done = (cv: number) =>
      sign > 0 ? cv > voxEnd : cv < voxEnd;

    while (!done(v)) {
      for (let a = a0; a <= a1; a++) {
        for (let b = b0; b <= b1; b++) {
          let solid: boolean;
          if (axis === 0) solid = this.solid(v, a, b);
          else if (axis === 1) solid = this.solid(a, v, b);
          else solid = this.solid(a, b, v);
          if (solid) {
            // Klem bevegelse slik at leading-edge stopper ved voxel-flaten.
            const face = sign > 0 ? v : v + 1;
            const allowed = face - leadStart - sign * EPS;
            // Hvis allowed har motsatt fortegn av delta, har vi allerede passert.
            if (Math.abs(allowed) < absDelta) {
              moved = allowed;
            }
            blocked = true;
            break;
          }
        }
        if (blocked) break;
      }
      if (blocked) break;
      v += step;
    }

    return { moved, blocked };
  }
}
