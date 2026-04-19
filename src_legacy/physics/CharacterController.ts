import * as THREE from 'three';
import type { VoxelCollider } from './VoxelCollider';

// Karakter-mål: ~6 fot høy, skulder ~1.1 fot brede, tykkelse ~0.7.
export const CHAR_HALF_X = 0.55;
export const CHAR_HALF_Z = 0.35;
export const CHAR_HEIGHT = 5.9;

const WALK_SPEED = 6.5;      // fot/sek
const RUN_SPEED = 10.5;
const ACCEL = 60;            // hvor fort vi når målhastighet
const AIR_ACCEL = 20;
const JUMP_SPEED = 9.5;
const GRAVITY = 24;
const MAX_FALL = 45;
const STEP_HEIGHT = 1.05;

export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
}

export class CharacterController {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  grounded = false;

  readonly input: InputState = {
    forward: false, back: false, left: false, right: false, jump: false, run: false,
  };

  private readonly tmpWish = new THREE.Vector3();
  private readonly tmpPos = new THREE.Vector3();

  constructor(private readonly collider: VoxelCollider) {}

  setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.grounded = this.collider.isGrounded(this.position, CHAR_HALF_X, CHAR_HALF_Z);
  }

  setInput(partial: Partial<InputState>): void {
    Object.assign(this.input, partial);
  }

  resetInput(): void {
    this.input.forward = false;
    this.input.back = false;
    this.input.left = false;
    this.input.right = false;
    this.input.jump = false;
    this.input.run = false;
  }

  /** yaw i radianer; "framover" er -Z rotert av yaw rundt Y. */
  setYaw(yaw: number): void {
    this.yaw = yaw;
  }

  update(dt: number): void {
    // Ønsket horisontal retning i yaw-rommet
    let fx = 0, fz = 0;
    if (this.input.forward) fz -= 1;
    if (this.input.back) fz += 1;
    if (this.input.left) fx -= 1;
    if (this.input.right) fx += 1;

    // Rotér fra lokalt til verdens-retning
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    this.tmpWish.set(fx * cos + fz * sin, 0, -fx * sin + fz * cos);
    const len = Math.hypot(this.tmpWish.x, this.tmpWish.z);
    if (len > 1) {
      this.tmpWish.x /= len;
      this.tmpWish.z /= len;
    }

    const maxSpeed = this.input.run ? RUN_SPEED : WALK_SPEED;
    const targetX = this.tmpWish.x * maxSpeed;
    const targetZ = this.tmpWish.z * maxSpeed;
    const accel = this.grounded ? ACCEL : AIR_ACCEL;
    this.velocity.x = approach(this.velocity.x, targetX, accel * dt);
    this.velocity.z = approach(this.velocity.z, targetZ, accel * dt);

    // Hopp
    if (this.input.jump && this.grounded) {
      this.velocity.y = JUMP_SPEED;
      this.grounded = false;
    }

    // Tyngdekraft
    this.velocity.y = Math.max(-MAX_FALL, this.velocity.y - GRAVITY * dt);

    // --- Horisontal sweep først, så vertikal ---
    const horiz = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
    const horizRes = this.collider.sweep(
      this.position,
      CHAR_HALF_X, CHAR_HALF_Z, CHAR_HEIGHT,
      horiz, dt,
    );

    // Step-up: hvis vi ble blokkert horisontalt og står på bakken, prøv å
    // løfte body by STEP_HEIGHT og re-sweep.
    if ((horizRes.collidedX || horizRes.collidedZ) && this.grounded) {
      this.tmpPos.copy(this.position);
      this.tmpPos.y += STEP_HEIGHT;
      if (this.collider.canStand(this.tmpPos, CHAR_HALF_X, CHAR_HALF_Z, CHAR_HEIGHT)) {
        const stepHoriz = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
        const stepRes = this.collider.sweep(
          this.tmpPos,
          CHAR_HALF_X, CHAR_HALF_Z, CHAR_HEIGHT,
          stepHoriz, dt,
        );
        // Bare godta step-up hvis vi faktisk kom lengre horisontalt
        const movedOld = distXZ(horizRes.position, this.position);
        const movedNew = distXZ(stepRes.position, this.tmpPos);
        if (movedNew > movedOld + 0.05) {
          this.position.copy(stepRes.position);
          this.velocity.x = stepRes.velocity.x;
          this.velocity.z = stepRes.velocity.z;
        } else {
          this.position.copy(horizRes.position);
          this.velocity.x = horizRes.velocity.x;
          this.velocity.z = horizRes.velocity.z;
        }
      } else {
        this.position.copy(horizRes.position);
        this.velocity.x = horizRes.velocity.x;
        this.velocity.z = horizRes.velocity.z;
      }
    } else {
      this.position.copy(horizRes.position);
      this.velocity.x = horizRes.velocity.x;
      this.velocity.z = horizRes.velocity.z;
    }

    // Vertikal sweep
    const vert = new THREE.Vector3(0, this.velocity.y, 0);
    const vertRes = this.collider.sweep(
      this.position,
      CHAR_HALF_X, CHAR_HALF_Z, CHAR_HEIGHT,
      vert, dt,
    );
    this.position.copy(vertRes.position);
    this.velocity.y = vertRes.velocity.y;
    this.grounded = vertRes.grounded;
  }
}

function approach(cur: number, target: number, maxDelta: number): number {
  if (cur < target) return Math.min(target, cur + maxDelta);
  if (cur > target) return Math.max(target, cur - maxDelta);
  return cur;
}

function distXZ(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.hypot(dx, dz);
}
