import { type Terrain, BIOME, type BiomeId } from '../world/Terrain';
import { CELL_SIZE } from '../world/Grid';
import { type PropWorld, randomPropId } from '../world/PropWorld';
import { type Rng, makeRng, gauss, hashSeed } from './Rng';
import { pick, pickWithVariation } from './AssetPicker';
import type { Blueprint, Cluster, PathSegment, Point2 } from './Blueprint';
import { generateVillage } from './generators/VillageGenerator';

export type MapType = 'village' | 'forest' | 'dungeon' | 'tavern' | 'castle' | 'harbor';

export interface GenerateOptions {
  type: MapType;
  /** String-seed fra UI; konverteres til tall via hashSeed. Tom string = tilfeldig. */
  seed?: string;
}

export interface GenerateResult {
  blueprint: Blueprint;
  seed: number;
}

/**
 * Orchestrator for prosedyral map-generering.
 *
 * Workflow:
 * 1. Kjør riktig generator-funksjon → Blueprint
 * 2. Apply til Terrain (heights + biome)
 * 3. Apply til PropWorld (clear + add via events)
 * 4. Caller må selv kalle App.rebuildTerrain() for å regenerere TerrainMesh + Collider + Fog.
 */
export class MapGenerator {
  constructor(
    private readonly terrain: Terrain,
    private readonly propWorld: PropWorld,
  ) {}

  generate(opts: GenerateOptions): GenerateResult {
    const seed = opts.seed && opts.seed.length > 0 ? hashSeed(opts.seed) : (Math.random() * 0xffffffff) >>> 0;
    const rng = makeRng(seed);

    let blueprint: Blueprint;
    switch (opts.type) {
      case 'village':
        blueprint = generateVillage(rng, this.terrain.widthCells, this.terrain.depthCells);
        break;
      default:
        throw new Error(`Map-type '${opts.type}' er ikke implementert ennå (kommer i Fase B)`);
    }

    this.applyTerrain(blueprint);
    this.applyProps(blueprint, rng);

    return { blueprint, seed };
  }

  private applyTerrain(bp: Blueprint): void {
    const { widthCells, depthCells } = this.terrain;

    // Reset høyder til 0 og base-biome.
    for (let iz = 0; iz <= depthCells; iz++) {
      for (let ix = 0; ix <= widthCells; ix++) {
        this.terrain.setVertexHeight(ix, iz, 0);
      }
    }
    for (let iz = 0; iz < depthCells; iz++) {
      for (let ix = 0; ix < widthCells; ix++) {
        this.terrain.setBiome(ix, iz, bp.terrain.baseBiome);
      }
    }

    // Bumps — sum av gauss-funksjoner.
    if (bp.terrain.heightBumps.length > 0) {
      for (let iz = 0; iz <= depthCells; iz++) {
        for (let ix = 0; ix <= widthCells; ix++) {
          let h = this.terrain.heights[iz * (widthCells + 1) + ix];
          for (const b of bp.terrain.heightBumps) {
            h += gauss(ix, iz, b.cx, b.cz, b.radius, b.height);
          }
          this.terrain.setVertexHeight(ix, iz, h);
        }
      }
    }

    // Biome-patches.
    for (const p of bp.terrain.biomePatches) {
      this.paintBiomeCircle(p.cx, p.cz, p.radius, p.biome);
    }

    // Stier overskriver biome (Path), males som linjer mellom punktene.
    for (const seg of bp.paths) {
      this.paintPath(seg);
    }
  }

  private applyProps(bp: Blueprint, rng: Rng): void {
    this.propWorld.clear();

    // 1) Focal point + surround
    const fp = bp.focalPoint;
    const fpAsset = pick(fp.tag, rng);
    this.placeProp(fpAsset, fp.x, fp.z, 0, 5.0);
    if (fp.surround) {
      for (const s of fp.surround) {
        const key = pick(s.tag, rng);
        this.placeProp(key, fp.x + s.offsetX, fp.z + s.offsetZ, s.rotY, s.scale ?? 4.0);
      }
    }

    // 2) Strukturer (hus, vegger) — deterministisk
    for (const st of bp.structures) {
      const key = pick(st.tag, rng);
      this.placeProp(key, st.x, st.z, st.rotY, st.scale);
    }

    // 3) Klynger — poisson-lignende sampling
    for (const c of bp.clusters) {
      this.fillCluster(c, rng);
    }

    // 4) Story-props sist
    for (const sp of bp.storyProps) {
      const a = pickWithVariation(sp.suggestedTag, rng);
      this.placeProp(
        a.key,
        sp.x,
        sp.z,
        sp.rotY ?? a.rotY,
        sp.scale ?? a.scale,
      );
    }
  }

  private fillCluster(c: Cluster, rng: Rng): void {
    const target = rng.int(c.count.min, c.count.max);
    const placed: Point2[] = [];
    const tags = [c.primaryTag, ...(c.secondaryTags ?? [])];
    const tagWeights = tags.map((_, i) => (i === 0 ? 3.0 : 1.0));
    const maxAttempts = target * 8;

    for (let attempt = 0; attempt < maxAttempts && placed.length < target; attempt++) {
      // Tilfeldig punkt i sirkelen.
      const angle = rng.next() * Math.PI * 2;
      const r = Math.sqrt(rng.next()) * c.radius;
      const x = c.cx + r * Math.cos(angle);
      const z = c.cz + r * Math.sin(angle);

      // Sjekk min-avstand mot allerede plasserte.
      let ok = true;
      for (const p of placed) {
        const dx = x - p.x;
        const dz = z - p.z;
        if (dx * dx + dz * dz < c.spacing * c.spacing) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const tag = rng.weightedChoice(tags, tagWeights);
      const a = pickWithVariation(tag, rng, c.scaleRange);
      this.placeProp(a.key, x, z, a.rotY, a.scale);
      placed.push({ x, z });
    }
  }

  private placeProp(key: string, x: number, z: number, rotY: number, scale: number): void {
    this.propWorld.add({
      id: randomPropId(),
      assetKey: key,
      x,
      y: this.terrain.sampleHeight(x, z),
      z,
      rotY,
      scale,
    });
  }

  private paintBiomeCircle(cx: number, cz: number, radius: number, biome: BiomeId): void {
    const { widthCells, depthCells } = this.terrain;
    const r2 = radius * radius;
    const ix0 = Math.max(0, Math.floor(cx - radius));
    const ix1 = Math.min(widthCells - 1, Math.ceil(cx + radius));
    const iz0 = Math.max(0, Math.floor(cz - radius));
    const iz1 = Math.min(depthCells - 1, Math.ceil(cz + radius));
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const dx = ix + 0.5 - cx;
        const dz = iz + 0.5 - cz;
        if (dx * dx + dz * dz <= r2) {
          this.terrain.setBiome(ix, iz, biome);
        }
      }
    }
  }

  /** Skriv Path-biome langs en sti (sekvens av punkter). World-koordinater. */
  private paintPath(seg: PathSegment): void {
    const { widthCells } = this.terrain;
    const half = widthCells / 2;
    const widthHalf = seg.widthCells / 2;

    for (let i = 0; i < seg.points.length - 1; i++) {
      const a = seg.points[i];
      const b = seg.points[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      const steps = Math.max(1, Math.ceil(len / (CELL_SIZE * 0.5)));

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const wx = a.x + dx * t;
        const wz = a.z + dz * t;
        const cellCx = wx / CELL_SIZE + half;
        const cellCz = wz / CELL_SIZE + half;

        // Mal en disk rundt punktet.
        const r = widthHalf + 0.6;
        const r2 = r * r;
        const ix0 = Math.floor(cellCx - r);
        const ix1 = Math.ceil(cellCx + r);
        const iz0 = Math.floor(cellCz - r);
        const iz1 = Math.ceil(cellCz + r);
        for (let iz = iz0; iz <= iz1; iz++) {
          for (let ix = ix0; ix <= ix1; ix++) {
            if (ix < 0 || iz < 0 || ix >= this.terrain.widthCells || iz >= this.terrain.depthCells) continue;
            const ddx = ix + 0.5 - cellCx;
            const ddz = iz + 0.5 - cellCz;
            if (ddx * ddx + ddz * ddz <= r2) {
              this.terrain.setBiome(ix, iz, BIOME.Path);
            }
          }
        }
      }
    }
  }
}
