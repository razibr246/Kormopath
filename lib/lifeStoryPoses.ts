/**
 * Key poses for the life story's characters, in the farmer rig's units (field360/src/components/farmwork/rig.js):
 * a 200-unit-tall adult facing right, standing on ground y = RIG_GROUND. Angles are degrees from straight up, positive
 * leaning toward what is in front. Hands and feet are IK targets, so a planted foot stays put and a hand lands where
 * it is put. Between poses every number is carried by a damped spring (lib/spring.ts), which is what makes the
 * movement physical. Pure data: tested in tests/life-story.test.ts (every pose has every channel).
 */
import type { Pose } from "./lifeStory";

export const RIG_GROUND = 300;

export type RigPose = {
  hipX: number; hipY: number; lumbar: number; chest: number; neck: number; head: number;
  nfX: number; ffX: number; nfLift: number; ffLift: number; nfRoll: number; ffRoll: number;
  nhX: number; nhY: number; fhX: number; fhY: number; nhWrist: number; fhWrist: number;
  eye: number; eyeY: number; brow: number;
  /** Brow angle in degrees: negative lifts the front of the brow (worry), positive lowers it (focus). */
  browTilt: number;
  /** Warmth in the cheek, 0..1 (joy, relief). */
  blush: number;
  /** Lids narrowed, 0..1: a smile crinkles them, fatigue weighs them down. */
  squint: number;
  /** Eyes opened wide, 0..1 (surprise). */
  wide: number;
  nhShape: "relax" | "open" | "grip" | "pinch" | "cup" | "flat";
  fhShape: "relax" | "open" | "grip" | "pinch" | "cup" | "flat";
  mouth: "calm" | "smile" | "effort" | "open";
  /** 1 when the phone is in his near hand. */
  phone: number;
};

const STAND: RigPose = {
  hipX: 200, hipY: 200, lumbar: 2, chest: 4, neck: 6, head: 4,
  nfX: 216, ffX: 184, nfLift: 0, ffLift: 0, nfRoll: 0, ffRoll: 0,
  nhX: 207, nhY: 213, fhX: 191, fhY: 215, nhWrist: 0, fhWrist: 0,
  eye: 0, eyeY: 0, brow: 0, browTilt: 0, blush: 0, squint: 0, wide: 0, nhShape: "relax", fhShape: "relax", mouth: "calm", phone: 0,
};
const SIT: Partial<RigPose> = { hipX: 190, hipY: 250, nfX: 236, ffX: 226 };
const KNEEL: Partial<RigPose> = { hipX: 188, hipY: 238, nfX: 230, ffX: 150, ffRoll: 40 };

export const POSES: Record<Pose, RigPose> = {
  stand: { ...STAND, mouth: "smile", brow: 0.3, blush: 0.5, squint: 0.45 },
  // A hand pressed to his forehead, head down: the weight of the problem.
  worry: { ...STAND, lumbar: 6, chest: 11, neck: 16, head: 20, fhX: 229, fhY: 124, fhShape: "flat", fhWrist: -35, eyeY: 1, brow: 1.4, browTilt: -12, squint: 0.55, mouth: "effort" },
  // Phone up in the near hand, head bowed to it.
  phone: { ...STAND, chest: 8, neck: 18, head: 24, nhX: 238, nhY: 150, nhShape: "grip", nhWrist: -10, eye: 1, eyeY: 1, brow: 0.4, browTilt: 4, phone: 1 },
  // Solved: chest open, far fist up, phone at his chest, smiling up.
  cheer: { ...STAND, nfX: 221, ffX: 179, lumbar: -2, chest: -4, neck: -6, head: -12, nhX: 233, nhY: 170, nhShape: "grip", nhWrist: -20, fhX: 224, fhY: 66, fhShape: "grip", fhWrist: -80, eye: 0.6, eyeY: -0.7, brow: 0.6, mouth: "smile", blush: 0.9, squint: 0.6, phone: 1 },
  // At the desk, head sunk into his hands.
  sitWorry: { ...STAND, ...SIT, lumbar: 22, chest: 46, neck: 52, head: 56, nhX: 241, nhY: 194, fhX: 236, fhY: 197, nhShape: "cup", fhShape: "cup", nhWrist: -40, fhWrist: -40, eyeY: 1, brow: 1.5, browTilt: -14, squint: 0.6, mouth: "effort" } as RigPose,
  sitPhone: { ...STAND, ...SIT, lumbar: 8, chest: 14, neck: 20, head: 26, nhX: 226, nhY: 186, nhShape: "grip", nhWrist: -10, fhX: 233, fhY: 224, fhShape: "flat", eye: 1, eyeY: 1, brow: 0.3, phone: 1 } as RigPose,
  // Upright at the desk, hands on the keyboard, smiling.
  sitWork: { ...STAND, ...SIT, lumbar: 5, chest: 9, neck: 6, head: 2, nhX: 247, nhY: 222, fhX: 240, fhY: 224, nhShape: "flat", fhShape: "flat", eye: 1, eyeY: 0.6, brow: 0.4, mouth: "smile", blush: 0.7, squint: 0.45 } as RigPose,
  // Down on one knee by his mother's bed, a hand to her forehead.
  kneel: { ...STAND, ...KNEEL, lumbar: 16, chest: 26, neck: 30, head: 32, nhX: 262, nhY: 214, nhShape: "flat", nhWrist: 10, fhX: 214, fhY: 236, fhShape: "relax", eye: 1, eyeY: 0.8, brow: 1.3, browTilt: -12, squint: 0.4, mouth: "effort" } as RigPose,
  kneelPhone: { ...STAND, ...KNEEL, lumbar: 8, chest: 12, neck: 20, head: 24, nhX: 226, nhY: 180, nhShape: "grip", nhWrist: -10, fhX: 214, fhY: 236, eye: 1, eyeY: 1, brow: 0.8, phone: 1 } as RigPose,
  // Looking up at the sky, a hand shading his eyes.
  shade: { ...STAND, lumbar: 0, chest: -2, neck: -10, head: -18, fhX: 219, fhY: 117, fhShape: "flat", fhWrist: 100, eye: 0.6, eyeY: -1, brow: 1.1, browTilt: 6, squint: 0.7, mouth: "effort" },
};

/** The father (mirrored to face Rafi): asking, then pleased. */
export const FATHER_POSES = {
  ask: { ...STAND, chest: 8, neck: 12, head: 10, nhX: 236, nhY: 176, nhShape: "open", nhWrist: -30, fhX: 192, fhY: 214, brow: 1, browTilt: -10, mouth: "open" } as RigPose,
  happy: { ...STAND, lumbar: -1, chest: 0, neck: 0, head: -4, nhX: 210, nhY: 196, nhShape: "grip", fhX: 186, fhY: 196, fhShape: "grip", mouth: "smile", brow: 0.4, blush: 0.6, squint: 0.5 } as RigPose,
} as const;

export const NUMERIC_CHANNELS = Object.keys(STAND).filter((k) => typeof STAND[k as keyof RigPose] === "number") as Array<keyof RigPose>;

/**
 * Spring settings per channel: the hips are heavy and settle slowly, the spine follows, the head leads a little
 * (it turns first), and the hands are quick with a small overshoot, so a gesture lands and settles.
 */
export const SPRINGS: Record<string, { f: number; z: number; r?: number }> = {
  // r < 0 is anticipation: the hips and spine dip the other way an instant before a big move, as a body does.
  hipX: { f: 1.1, z: 0.9 }, hipY: { f: 1.3, z: 0.85, r: -0.25 },
  lumbar: { f: 1.4, z: 0.8, r: -0.2 }, chest: { f: 1.6, z: 0.75, r: -0.2 }, neck: { f: 1.9, z: 0.72 }, head: { f: 2.2, z: 0.7, r: 0.4 },
  nhX: { f: 2.3, z: 0.62 }, nhY: { f: 2.3, z: 0.62 }, fhX: { f: 2.1, z: 0.6 }, fhY: { f: 2.1, z: 0.6 },
  nfX: { f: 1.8, z: 0.95 }, ffX: { f: 1.8, z: 0.95 },
  eye: { f: 4, z: 0.9 }, eyeY: { f: 4, z: 0.9 }, brow: { f: 3, z: 0.8 }, browTilt: { f: 2.6, z: 0.85 }, blush: { f: 0.9, z: 1 }, squint: { f: 2.4, z: 0.9 }, wide: { f: 5, z: 0.55 }, phone: { f: 2.5, z: 1 },
};
export const SPRING_DEFAULT = { f: 1.8, z: 0.8 };
