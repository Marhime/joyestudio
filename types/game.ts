/** Overall game section state machine */
export type GameState = "select" | "countdown" | "playing" | "gameover";

/** Character gameplay stats — displayed as bars in character select */
export interface CharacterStats {
  speed: number; // 1-10
  jump: number; // 1-10
  dash: number; // 1-10
}

/** Character definition — used for both team display and gameplay */
export interface Character {
  id: "maxime" | "karla";
  name: string;
  role: string;
  location: string;
  description: string;
  workedWith: string[];
  avatar: string; // path to full portrait image
  spriteKey: string; // Phaser sprite key
  spriteSrc: string; // path to spritesheet PNG in /public
  color: string; // accent color hex
  stats: CharacterStats;
  /** Unique ability description shown in select */
  ability: string;
}

/** Leaderboard entry from Supabase */
export interface LeaderboardEntry {
  id: string;
  player_name: string;
  character: "maxime" | "karla";
  score: number;
  created_at: string;
}

/** Runtime game config constants */
export interface GameConfig {
  gravity: number;
  baseSpeed: number;
  speedIncrement: number;
  maxSpeed: number;
  coinValue: number;
  dashCooldown: number; // ms
  dashDuration: number; // ms
  dashSpeedMultiplier: number;
  tileSize: number;
  chunkWidth: number; // tiles per chunk
}
