import * as THREE from 'three';
import type { Token } from './Token';
import type { TokenManager } from './TokenManager';
import { TokenSprite } from './TokenSprite';

export class TokenRenderer {
  readonly root = new THREE.Group();
  private readonly sprites = new Map<string, TokenSprite>();

  constructor(private readonly manager: TokenManager) {
    manager.onAdded((t) => this.addSprite(t));
    manager.onUpdated((t, prev) => this.updateSprite(t, prev));
    manager.onRemoved((t) => this.removeSprite(t));
    manager.onSelectionChanged((id) => this.applySelection(id));

    for (const t of manager.all()) this.addSprite(t);
    this.applySelection(manager.getSelectedId());
  }

  /** Hent alle sprite-ikoner — brukes av raycaster for token-klikk. */
  getIconSprites(): THREE.Sprite[] {
    return [...this.sprites.values()].map((s) => s.icon);
  }

  getSpriteFor(id: string): TokenSprite | undefined {
    return this.sprites.get(id);
  }

  private addSprite(token: Token): void {
    if (this.sprites.has(token.id)) return;
    const sprite = new TokenSprite(token);
    this.sprites.set(token.id, sprite);
    this.root.add(sprite.group);
    if (this.manager.getSelectedId() === token.id) {
      sprite.setSelected(true);
    }
  }

  private updateSprite(token: Token, prev: Token): void {
    const sprite = this.sprites.get(token.id);
    if (!sprite) {
      this.addSprite(token);
      return;
    }
    sprite.updateFrom(token, prev);
  }

  private removeSprite(token: Token): void {
    const sprite = this.sprites.get(token.id);
    if (!sprite) return;
    this.root.remove(sprite.group);
    sprite.dispose();
    this.sprites.delete(token.id);
  }

  private applySelection(id: string | null): void {
    for (const [tokenId, sprite] of this.sprites) {
      sprite.setSelected(tokenId === id);
    }
  }
}
