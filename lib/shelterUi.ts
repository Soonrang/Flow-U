import { type AnimalTypeCode } from '@/lib/animalType';

export const PHONE_NUMBER_REGEX = /^[0-9+\-()\s]{8,20}$/;

export const ANIMAL_BADGE_CLASS: Record<AnimalTypeCode, string> = {
  1: 'bg-blue-50 text-blue-600 border-blue-200',
  2: 'bg-pink-50 text-pink-600 border-pink-200',
  3: 'bg-emerald-50 text-emerald-600 border-emerald-200',
};

export const ANIMAL_LABEL: Record<AnimalTypeCode, string> = {
  1: '🐶 강아지',
  2: '🐱 고양이',
  3: '🐾 혼합',
};

