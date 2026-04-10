import Phaser from "phaser";
import type { GameConfig } from "~/types/game";
import { getCharacter } from "~/content/team";

/** Runtime constants */
const CONFIG: GameConfig = {
  gravity: 900,
  baseSpeed: 200,
  speedIncrement: 0.15, // px/s added per frame
  maxSpeed: 600,
  coinValue: 10,
  dashCooldown: 1500,
  dashDuration: 200,
  dashSpeedMultiplier: 2.5,
  tileSize: 32,
  chunkWidth: 20,
};

/** Theme colors for alternating backgrounds */
const THEMES = [
  { bg: 0x6ebff6, name: "blue" }, // site blue
  { bg: 0xffa9c9, name: "pink" }, // site pink
];

/** Chunk templates — each is a row-height array (0 = gap, 1-N = platform height from bottom)
 *  Max height diff between adjacent tiles = 2 (jumpable)
 *  Max gap = 4 tiles (crossable with jump + dash)
 */
const CHUNK_TEMPLATES = [
  // Flat ground
  {
    ground: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    coins: [
      { x: 5, y: 6 },
      { x: 8, y: 6 },
      { x: 11, y: 6 },
      { x: 14, y: 6 },
    ],
  },
  // Small gap (3 tiles)
  {
    ground: [3, 3, 3, 3, 3, 0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    coins: [
      { x: 6, y: 7 },
      { x: 7, y: 7 },
    ],
  },
  // Gentle stairs up and down
  {
    ground: [3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 4, 4, 4, 3, 3, 3, 3, 3],
    coins: [
      { x: 7, y: 8 },
      { x: 9, y: 8 },
      { x: 11, y: 8 },
    ],
  },
  // Two small gaps
  {
    ground: [3, 3, 3, 0, 0, 3, 3, 3, 3, 3, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3],
    coins: [
      { x: 3, y: 7 },
      { x: 10, y: 7 },
    ],
  },
  // Low hill
  {
    ground: [3, 3, 3, 4, 4, 0, 0, 3, 3, 4, 5, 5, 4, 3, 3, 3, 4, 4, 3, 3],
    coins: [
      { x: 5, y: 8 },
      { x: 10, y: 8 },
      { x: 11, y: 8 },
    ],
  },
  // Medium gap (4 tiles — needs good jump)
  {
    ground: [3, 3, 3, 3, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    coins: [
      { x: 5, y: 8 },
      { x: 6, y: 8 },
    ],
  },
  // Stepping stones
  {
    ground: [3, 3, 3, 0, 0, 3, 3, 0, 0, 3, 3, 3, 3, 0, 0, 3, 3, 3, 3, 3],
    coins: [
      { x: 5, y: 6 },
      { x: 9, y: 6 },
      { x: 15, y: 6 },
    ],
  },
  // Flat with high coins (reward for jumping)
  {
    ground: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    coins: [
      { x: 4, y: 7 },
      { x: 7, y: 8 },
      { x: 10, y: 7 },
      { x: 13, y: 8 },
      { x: 16, y: 7 },
    ],
  },
];

export class GameScene extends Phaser.Scene {
  // ── Player ──
  private player!: Phaser.Physics.Arcade.Sprite;
  private characterId: "maxime" | "karla" = "maxime";

  // ── World ──
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.Group;
  private worldSpeed = CONFIG.baseSpeed;
  private nextChunkX = 0;
  private chunksSpawned = 0;

  // ── Scoring ──
  private score = 0;
  private coinsCollected = 0;
  private distanceTraveled = 0;

  // ── State ──
  private isGameOver = false;
  private canDoubleJump = false;
  private hasDoubleJumped = false;
  private isDashing = false;
  private dashCooldownTimer = 0;
  private jumpCount = 0;

  // ── Input ──
  private jumpKey!: Phaser.Input.Keyboard.Key;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;

  // ── Theming ──
  private themeIndex = 0;
  private themeTimer = 0;
  private readonly THEME_DURATION = 30_000; // ms

  // ── Decorations ──
  private decorations!: Phaser.GameObjects.Group;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { characterId: string }) {
    this.characterId = (data.characterId as "maxime" | "karla") || "maxime";
    this.score = 0;
    this.coinsCollected = 0;
    this.distanceTraveled = 0;
    this.isGameOver = false;
    this.worldSpeed = CONFIG.baseSpeed;
    this.nextChunkX = 0;
    this.chunksSpawned = 0;
    this.hasDoubleJumped = false;
    this.isDashing = false;
    this.dashCooldownTimer = 0;
    this.themeIndex = 0;
    this.themeTimer = 0;
    this.jumpCount = 0;
  }

  create() {
    const { width, height } = this.scale;
    const character = getCharacter(this.characterId);

    // ── Groups ──
    this.platforms = this.physics.add.staticGroup();
    this.coins = this.physics.add.group({ allowGravity: false });
    this.decorations = this.add.group();

    // ── Player ──
    this.player = this.physics.add.sprite(150, height - 200, this.characterId);
    this.player.setDisplaySize(48, 60);
    this.player.setBounce(0);
    this.player.setCollideWorldBounds(false);
    this.player.setDepth(10);

    // Adjust hitbox to be tighter than the sprite
    this.player.body!.setSize(
      this.player.width * 0.6,
      this.player.height * 0.85,
    );
    this.player.body!.setOffset(
      this.player.width * 0.2,
      this.player.height * 0.15,
    );

    // ── Collisions ──
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(
      this.player,
      this.coins,
      this.collectCoin,
      undefined,
      this,
    );

    // ── Camera ──
    this.cameras.main.startFollow(this.player, false, 0.1, 0);
    this.cameras.main.setFollowOffset(-width / 3, 0);

    // ── Input ──
    if (this.input.keyboard) {
      this.jumpKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE,
      );
      this.dashKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SHIFT,
      );
      this.upKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.UP,
      );
    }

    // Touch: tap left half = jump, tap right half = dash
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      if (pointer.x < this.scale.width / 2) {
        this.handleJump();
      } else {
        this.handleDash();
      }
    });

    // ── Generate initial world ──
    this.spawnInitialGround();
    for (let i = 0; i < 5; i++) {
      this.spawnChunk();
    }

    // ── Spawn some initial clouds ──
    this.spawnClouds(0, width * 3);

    // ── Emit ready ──
    this.game.events.emit("game:started");
  }

  override update(_time: number, delta: number) {
    if (this.isGameOver) return;

    const character = getCharacter(this.characterId);
    const speedMultiplier = character.stats.speed / 7; // normalize around 1.0

    // ── Auto-run ──
    const runSpeed = this.isDashing
      ? this.worldSpeed * CONFIG.dashSpeedMultiplier
      : this.worldSpeed;
    this.player.setVelocityX(runSpeed * speedMultiplier);

    // ── Speed progression ──
    if (this.worldSpeed < CONFIG.maxSpeed) {
      this.worldSpeed += CONFIG.speedIncrement * (delta / 16.67);
    }

    // ── Jump input (keyboard) ──
    if (this.jumpKey && Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
      this.handleJump();
    }
    if (this.upKey && Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.handleJump();
    }

    // ── Dash input (keyboard) ──
    if (this.dashKey && Phaser.Input.Keyboard.JustDown(this.dashKey)) {
      this.handleDash();
    }

    // ── Dash cooldown ──
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= delta;
    }

    // ── Reset jump when landing ──
    if (this.player.body!.blocked.down || this.player.body!.touching.down) {
      this.jumpCount = 0;
      this.hasDoubleJumped = false;
    }

    // ── Score ──
    this.distanceTraveled += runSpeed * speedMultiplier * (delta / 1000);
    this.score =
      Math.floor(this.distanceTraveled / 10) +
      this.coinsCollected * CONFIG.coinValue;

    // Emit score update for UI scene
    this.game.events.emit("game:score", {
      score: this.score,
      coins: this.coinsCollected,
      distance: Math.floor(this.distanceTraveled),
      dashReady: this.dashCooldownTimer <= 0,
    });

    // ── Spawn new chunks ──
    const cameraRight = this.cameras.main.scrollX + this.scale.width;
    while (this.nextChunkX < cameraRight + this.scale.width * 2) {
      this.spawnChunk();
    }

    // ── Cleanup off-screen objects ──
    this.cleanupOffscreen();

    // ── Spawn clouds ──
    if (Math.random() < 0.005) {
      this.spawnCloud(cameraRight + 100);
    }

    // ── Theme cycling ──
    this.themeTimer += delta;
    if (this.themeTimer >= this.THEME_DURATION) {
      this.themeTimer = 0;
      this.themeIndex = (this.themeIndex + 1) % THEMES.length;
      const theme = THEMES[this.themeIndex];
      if (theme) this.tweenBackground(theme.bg);
    }

    // ── Death check (fell off the world) ──
    if (this.player.y > this.scale.height + 100) {
      this.gameOver();
    }

    // ── Player tilt based on velocity ──
    const velY = this.player.body!.velocity.y;
    this.player.setRotation(Phaser.Math.Clamp(velY / 800, -0.3, 0.3));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────────────────────

  private handleJump() {
    if (this.isGameOver) return;

    const character = getCharacter(this.characterId);
    const jumpForce = -400 * (character.stats.jump / 7); // normalize around 1.0
    const isOnGround =
      this.player.body!.blocked.down || this.player.body!.touching.down;

    if (isOnGround) {
      this.player.setVelocityY(jumpForce);
      this.jumpCount = 1;
      this.squashStretch(1.1, 0.85); // stretch on jump
    } else if (
      this.characterId === "maxime" &&
      this.jumpCount === 1 &&
      !this.hasDoubleJumped
    ) {
      // Double jump — Maxime only
      this.player.setVelocityY(jumpForce * 0.85);
      this.hasDoubleJumped = true;
      this.jumpCount = 2;
      this.spawnJumpParticles();
    }
  }

  private handleDash() {
    if (this.isGameOver || this.isDashing || this.dashCooldownTimer > 0) return;

    const character = getCharacter(this.characterId);
    const dashMultiplier = character.stats.dash / 7;

    this.isDashing = true;
    this.player.setAlpha(0.7);

    // Karla's dash is stronger
    const duration =
      CONFIG.dashDuration * (this.characterId === "karla" ? 1.3 : 1);
    const cooldown =
      CONFIG.dashCooldown * (this.characterId === "karla" ? 0.75 : 1);

    this.time.delayedCall(duration, () => {
      this.isDashing = false;
      this.player.setAlpha(1);
      this.dashCooldownTimer = cooldown;
    });

    this.spawnDashTrail();
  }

  private collectCoin(_player: any, coinObj: any) {
    const coin = coinObj as Phaser.Physics.Arcade.Sprite;
    this.coinsCollected++;
    this.spawnCoinParticles(coin.x, coin.y);
    coin.destroy();
  }

  private gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.player.setVelocity(0, 0);
    this.player.body!.enable = false;

    // Screen flash
    this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.shake(200, 0.01);

    this.game.events.emit("game:over", {
      score: this.score,
      coins: this.coinsCollected,
      distance: Math.floor(this.distanceTraveled),
      characterId: this.characterId,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // World generation
  // ────────────────────────────────────────────────────────────────────────────

  private spawnInitialGround() {
    // Flat ground under the player to start
    const ts = CONFIG.tileSize;
    const startTiles = 15;
    for (let x = 0; x < startTiles; x++) {
      for (let h = 0; h < 3; h++) {
        const block = this.add.rectangle(
          x * ts + ts / 2,
          this.scale.height - h * ts - ts / 2,
          ts,
          ts,
          0x221e1f,
        );
        this.physics.add.existing(block, true);
        this.platforms.add(block);
      }
    }
    this.nextChunkX = startTiles * ts;

    // A few starter coins
    for (let i = 0; i < 3; i++) {
      this.spawnCoin(200 + i * 80, this.scale.height - 130);
    }
  }

  private spawnChunk() {
    const ts = CONFIG.tileSize;
    const template =
      CHUNK_TEMPLATES[Phaser.Math.Between(0, CHUNK_TEMPLATES.length - 1)];
    if (!template) return;

    template.ground.forEach((height, col) => {
      if (height === 0) return; // gap
      for (let h = 0; h < height; h++) {
        const x = this.nextChunkX + col * ts + ts / 2;
        const y = this.scale.height - h * ts - ts / 2;

        // Use darker color for top layer, lighter for fill
        const color = h === height - 1 ? 0x221e1f : 0x3a3536;
        const block = this.add.rectangle(x, y, ts, ts, color);
        this.physics.add.existing(block, true);
        this.platforms.add(block);
      }
    });

    // Spawn coins from template
    template.coins.forEach((c) => {
      const x = this.nextChunkX + c.x * ts + ts / 2;
      const y = this.scale.height - c.y * ts - ts / 2;
      this.spawnCoin(x, y);
    });

    this.nextChunkX += CONFIG.chunkWidth * ts;
    this.chunksSpawned++;
  }

  private spawnCoin(x: number, y: number) {
    const coin = this.physics.add.sprite(x, y, "coin");
    coin.setDisplaySize(20, 20);
    coin.setDepth(5);
    this.coins.add(coin);

    // Floating animation
    this.tweens.add({
      targets: coin,
      y: y - 6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VFX
  // ────────────────────────────────────────────────────────────────────────────

  private squashStretch(scaleX: number, scaleY: number) {
    this.tweens.add({
      targets: this.player,
      scaleX: this.player.scaleX * scaleX,
      scaleY: this.player.scaleY * scaleY,
      duration: 80,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  private spawnJumpParticles() {
    for (let i = 0; i < 6; i++) {
      const p = this.add.circle(
        this.player.x + Phaser.Math.Between(-15, 15),
        this.player.y + 20,
        Phaser.Math.Between(2, 5),
        0xffe15a,
      );
      p.setDepth(8);
      this.tweens.add({
        targets: p,
        y: p.y + Phaser.Math.Between(20, 50),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(300, 600),
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnDashTrail() {
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 30, () => {
        if (this.isGameOver) return;
        const ghost = this.add.rectangle(
          this.player.x - i * 15,
          this.player.y,
          40,
          52,
          this.characterId === "maxime" ? 0x6ebff6 : 0xffa9c9,
          0.5,
        );
        ghost.setDepth(9);
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          scaleX: 0.5,
          duration: 300,
          onComplete: () => ghost.destroy(),
        });
      });
    }
  }

  private spawnCoinParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xffe15a);
      p.setDepth(8);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-40, 40),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(200, 500),
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnCloud(x: number) {
    const y = Phaser.Math.Between(30, this.scale.height * 0.4);
    const cloudW = Phaser.Math.Between(60, 140);
    const cloudH = Phaser.Math.Between(20, 40);
    const cloud = this.add.ellipse(x, y, cloudW, cloudH, 0xffffff, 0.3);
    cloud.setDepth(0);
    this.decorations.add(cloud);
  }

  private spawnClouds(fromX: number, toX: number) {
    const count = Math.floor((toX - fromX) / 300);
    for (let i = 0; i < count; i++) {
      this.spawnCloud(fromX + Phaser.Math.Between(0, toX - fromX));
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Cleanup & themes
  // ────────────────────────────────────────────────────────────────────────────

  private cleanupOffscreen() {
    const cameraLeft = this.cameras.main.scrollX - 200;

    // Platforms
    this.platforms.getChildren().forEach((child) => {
      const rect = child as Phaser.GameObjects.Rectangle;
      if (rect.x < cameraLeft) {
        rect.destroy();
      }
    });

    // Coins
    this.coins.getChildren().forEach((child) => {
      const coin = child as Phaser.Physics.Arcade.Sprite;
      if (coin.x < cameraLeft) {
        coin.destroy();
      }
    });

    // Decorations
    this.decorations.getChildren().forEach((child) => {
      const dec = child as Phaser.GameObjects.Ellipse;
      if (dec.x < cameraLeft - 200) {
        dec.destroy();
      }
    });
  }

  private tweenBackground(color: number) {
    const cam = this.cameras.main;
    const currentColor = Phaser.Display.Color.IntegerToColor(
      cam.backgroundColor.color,
    );
    const targetColor = Phaser.Display.Color.IntegerToColor(color);

    this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 2000,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        const value = tween.getValue() ?? 0;
        const t = value / 100;
        const r = Phaser.Math.Interpolation.Linear(
          [currentColor.red, targetColor.red],
          t,
        );
        const g = Phaser.Math.Interpolation.Linear(
          [currentColor.green, targetColor.green],
          t,
        );
        const b = Phaser.Math.Interpolation.Linear(
          [currentColor.blue, targetColor.blue],
          t,
        );
        cam.setBackgroundColor(
          Phaser.Display.Color.GetColor(
            Math.round(r),
            Math.round(g),
            Math.round(b),
          ),
        );
      },
    });
  }
}
