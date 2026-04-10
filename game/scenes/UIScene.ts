import Phaser from "phaser";

/**
 * UIScene — HUD overlay running in parallel with GameScene.
 * Displays score, coins, and dash cooldown indicator.
 */
export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private dashIndicator!: Phaser.GameObjects.Rectangle;
  private dashBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "UIScene", active: false });
  }

  create() {
    const pad = 20;

    // ── Score ──
    this.scoreText = this.add.text(pad, pad, "0", {
      fontFamily: '"Inter Tight", monospace',
      fontSize: "24px",
      color: "#221e1f",
      fontStyle: "bold",
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(100);

    // ── Coins ──
    // Coin icon
    const coinIcon = this.add.circle(pad + 8, pad + 46, 8, 0xffe15a);
    coinIcon.setScrollFactor(0);
    coinIcon.setDepth(100);

    this.coinText = this.add.text(pad + 22, pad + 36, "×0", {
      fontFamily: '"Inter Tight", monospace',
      fontSize: "16px",
      color: "#221e1f",
    });
    this.coinText.setScrollFactor(0);
    this.coinText.setDepth(100);

    // ── Dash cooldown bar ──
    const barWidth = 60;
    const barHeight = 4;
    const barY = pad + 64;

    this.dashBg = this.add.rectangle(
      pad,
      barY,
      barWidth,
      barHeight,
      0x221e1f,
      0.2,
    );
    this.dashBg.setOrigin(0, 0);
    this.dashBg.setScrollFactor(0);
    this.dashBg.setDepth(100);

    this.dashIndicator = this.add.rectangle(
      pad,
      barY,
      barWidth,
      barHeight,
      0xffe15a,
    );
    this.dashIndicator.setOrigin(0, 0);
    this.dashIndicator.setScrollFactor(0);
    this.dashIndicator.setDepth(100);

    // ── Listen for events from GameScene ──
    this.game.events.on("game:score", this.onScoreUpdate, this);
    this.game.events.on("game:over", this.onGameOver, this);

    // Cleanup
    this.events.on("shutdown", () => {
      this.game.events.off("game:score", this.onScoreUpdate, this);
      this.game.events.off("game:over", this.onGameOver, this);
    });
  }

  private onScoreUpdate(data: {
    score: number;
    coins: number;
    dashReady: boolean;
  }) {
    this.scoreText.setText(String(data.score));
    this.coinText.setText(`×${data.coins}`);
    this.dashIndicator.width = data.dashReady ? 60 : 0;
  }

  private onGameOver() {
    // Fade HUD out
    this.tweens.add({
      targets: [this.scoreText, this.coinText, this.dashIndicator, this.dashBg],
      alpha: 0,
      duration: 500,
    });
  }
}
