// Types for the JavaScript farmer figure (tsconfig has allowJs off). Used by the home page's life story.
import type { JSX, ReactNode } from "react";
export type FarmerLook = {
  skin: string; hair: string; stubble?: string; mustache?: string;
  shirt?: string; shirtLine?: string; sleeve?: boolean; vest?: string; vestLine?: string;
  lungi: string; check: string; tuck?: boolean; sandals?: boolean;
  hat?: "gamcha" | "mathal" | "band" | "hair"; hatColor?: string; hatLine?: string;
  /** Wardrobe beyond the lungi (home page life story). */
  pants?: string; shoes?: string; longSleeve?: boolean; skirt?: "kurta" | "none"; hem?: number; hemDrop?: number;
};
export const LOOKS: Record<string, FarmerLook>;
declare function Farmer(props: { look: FarmerLook; slots?: { back?: ReactNode; farHand?: ReactNode; mid?: ReactNode; nearHand?: ReactNode; front?: ReactNode } }): JSX.Element;
export default Farmer;
export function farmerPainter(root: Element, look: FarmerLook): (sk: Skeleton, extra?: { blink?: number; tail?: number; tailBend?: number; drag?: number }) => void;
export type Skeleton = { atlas: [number, number]; nape: [number, number]; hip: [number, number]; head: number; [k: string]: unknown };
