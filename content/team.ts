import type { Character } from "~/types/game";

export const team: Character[] = [
  {
    id: "maxime",
    name: "Maxime Joyes",
    role: "Developer & Tech Lead",
    location: "Mexico",
    description:
      "Full-stack developer obsessed with motion, performance, and pixel-perfect interfaces. Turns designs into living, breathing experiences.",
    workedWith: ["Chanel", "LVMH", "Renault", "Nissan", "Michelin"],
    avatar: "/images/team/maxime-joyes.png",
    spriteKey: "maxime",
    spriteSrc: "/images/team/maxime-joyes.png",
    color: "#6ebff6",
    stats: { speed: 8, jump: 10, dash: 6 },
    ability: "Double Jump",
  },
  {
    id: "karla",
    name: "Karla Medina",
    role: "Design & Strategy Lead",
    location: "Mexico",
    description:
      "Creative director who crafts brand narratives and visual systems that connect with audiences and drive engagement.",
    workedWith: ["Chanel", "LVMH", "Renault", "Nissan", "Michelin"],
    avatar: "/images/team/karla-daniela.png",
    spriteKey: "karla",
    spriteSrc: "/images/team/karla-daniela.png",
    color: "#ffa9c9",
    stats: { speed: 6, jump: 8, dash: 8 },
    ability: "Power Dash",
  },
];

/** Helper to find a character by id */
export function getCharacter(id: "maxime" | "karla"): Character {
  return team.find((c) => c.id === id)!;
}
