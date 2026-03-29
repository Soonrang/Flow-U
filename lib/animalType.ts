/** DB `animal_type`: 1=강아지, 2=고양이, 3=혼합 */
export type AnimalTypeCode = 1 | 2 | 3;

export const ANIMAL_TYPE_DOG: AnimalTypeCode = 1;
export const ANIMAL_TYPE_CAT: AnimalTypeCode = 2;
export const ANIMAL_TYPE_MIXED: AnimalTypeCode = 3;

const FALLBACK_CYCLE: AnimalTypeCode[] = [ANIMAL_TYPE_DOG, ANIMAL_TYPE_CAT, ANIMAL_TYPE_MIXED];

export function normalizeAnimalType(raw: unknown, id: number): AnimalTypeCode {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (n === 1 || n === 2 || n === 3) return n;

  if (raw === 'dog') return ANIMAL_TYPE_DOG;
  if (raw === 'cat') return ANIMAL_TYPE_CAT;
  if (raw === 'mixed') return ANIMAL_TYPE_MIXED;

  return FALLBACK_CYCLE[((id % 3) + 3) % 3];
}
