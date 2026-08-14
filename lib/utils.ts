import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized';
}
