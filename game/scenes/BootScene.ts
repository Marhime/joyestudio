import Phaser from "phaser";

/**
 * BootScene — preloads all game assets then hands off to GameScene.
 *
 * Expects `this.game.registry` to contain:
 *   - characterId: 'maxime' | 'karla'
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // ── Character sprites (single frame for now — squash/stretch for animation) ──
    this.load.image("maxime", "/images/team/maxime-joyes.png");
    this.load.image("karla", "/images/team/karla-daniela.png");

    // ── Coin / collectible ──
    // Generated procedurally in GameScene if no asset exists
    // this.load.image('coin', '/game/sprites/coin.png')

    // ── Loading bar ──
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 200, 16, 0x221e1f);
    const fill = this.add.rectangle(
      width / 2 - 98,
      height / 2,
      0,
      12,
      0xffe15a,
    );
    fill.setOrigin(0, 0.5);

    this.load.on("progress", (value: number) => {
      fill.width = 196 * value;
    });

    this.load.on("complete", () => {
      bar.destroy();
      fill.destroy();
    });
  }

  create() {
    // Generate a coin texture procedurally (smiley circle)
    this.generateCoinTexture();

    // Start the game
    const characterId = this.game.registry.get("characterId") || "maxime";
    this.scene.start("GameScene", { characterId });
    this.scene.start("UIScene");
  }

  private generateCoinTexture() {
    const size = 24;
    const gfx = this.add.graphics();

    // Yellow circle
    gfx.fillStyle(0xffe15a, 1);
    gfx.fillCircle(size / 2, size / 2, size / 2 - 1);

    // Eyes
    gfx.fillStyle(0x221e1f, 1);
    gfx.fillRect(8, 8, 3, 3);
    gfx.fillRect(14, 8, 3, 3);

    // Smile
    gfx.fillRect(8, 15, 9, 2);
    gfx.fillRect(7, 14, 2, 2);
    gfx.fillRect(16, 14, 2, 2);

    gfx.generateTexture("coin", size, size);
    gfx.destroy();
  }
}
