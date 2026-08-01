import type { Moon, SystemBody } from '@world-forge/shared';
import { SeededRandom } from './random';

export function classifySystemBodyType(
  orbitalOrder: number,
  giantRoll: number,
  giantClassRoll: number
): SystemBody['bodyType'] {
  if (orbitalOrder <= 4) return 'rocky';
  const giantChance = orbitalOrder === 5
    ? 0.2
    : orbitalOrder === 6
      ? 0.62
      : orbitalOrder === 7
        ? 0.82
        : orbitalOrder === 8
          ? 0.9
          : 0.92;
  if (giantRoll >= giantChance) return 'rocky';
  const gasShare = orbitalOrder <= 6 ? 0.78 : orbitalOrder === 7 ? 0.62 : 0.44;
  return giantClassRoll < gasShare ? 'gas-giant' : 'ice-giant';
}

export function generatedBodyTypeForOrbit(seed: string, orbitalOrder: number): SystemBody['bodyType'] {
  return classifySystemBodyType(
    orbitalOrder,
    unit(seed, `body:${orbitalOrder}:giant`),
    unit(seed, `body:${orbitalOrder}:class`)
  );
}

export function generateSecondaryMoons(
  seed: string,
  parent: Pick<SystemBody, 'id' | 'bodyType' | 'sizeClass' | 'massClass' | 'orbitalOrder'>
): Moon[] {
  const rng = new SeededRandom(`${seed}:secondary-moons:${parent.id}:v1`);
  const count = secondaryMoonCount(parent, rng);
  if (count <= 0) return [];
  const giant = parent.bodyType === 'gas-giant' || parent.bodyType === 'ice-giant';
  const maxSize = parent.bodyType === 'gas-giant'
    ? 0.62
    : parent.bodyType === 'ice-giant'
      ? 0.48
      : parent.bodyType === 'dwarf'
        ? 0.16
        : Math.min(0.34, Math.max(0.12, parent.sizeClass * 0.08));
  const baseDistance = giant ? 0.34 : 0.52;
  const spacing = parent.bodyType === 'gas-giant'
    ? rng.range(0.24, 0.38)
    : parent.bodyType === 'ice-giant'
      ? rng.range(0.3, 0.46)
      : rng.range(0.38, 0.62);
  return Array.from({ length: count }, (_, index) => {
    const sizeFalloff = Math.max(0.58, 1 - index * 0.075);
    const sizeClass = round(Math.max(0.04, maxSize * rng.range(0.46, 1) * sizeFalloff), 2);
    const orbitalDistanceClass = round(baseDistance + index * spacing + rng.range(0.06, 0.22), 2);
    return {
      id: `moon-${index + 1}`,
      name: `Moon ${index + 1}`,
      sizeClass,
      orbitalDistanceClass,
      tideInfluence: round(sizeClass / orbitalDistanceClass, 2)
    };
  });
}

function secondaryMoonCount(
  parent: Pick<SystemBody, 'bodyType' | 'sizeClass' | 'massClass'>,
  rng: SeededRandom
): number {
  if (parent.bodyType === 'belt') return 0;
  if (parent.bodyType === 'gas-giant') return 3 + rng.int(0, 3);
  if (parent.bodyType === 'ice-giant') return 2 + rng.int(0, 2);
  if (parent.bodyType === 'dwarf') return rng.next() < 0.38 ? 1 : 0;
  const retentionChance = clamp(
    0.07 + Math.max(0, parent.sizeClass - 0.55) * 0.08 + Math.max(0, parent.massClass - 0.4) * 0.022,
    0.04,
    0.66
  );
  if (rng.next() >= retentionChance) return 0;
  return parent.sizeClass > 2 && rng.next() < 0.18 ? 2 : 1;
}

function unit(seed: string, key: string): number {
  const value = `${seed}:${key}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967295;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
