// Types for the farmer skeleton (rig.js); see Farmer.d.ts.
import type { Skeleton } from "./Farmer";
export type PoseChannels = Record<string, number | string>;
export function solve(pose: PoseChannels, ground: number): Skeleton;
export function inHand(sk: Skeleton, side: "n" | "f", dx?: number, dy?: number): [number, number, number];
