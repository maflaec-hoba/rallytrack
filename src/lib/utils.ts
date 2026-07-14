import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// NEGATIVE PROBE (workshop module 2): deliberate type violation — the
// typecheck gate must fail on this line. Do not merge this branch.
export const probeViolation: number = "this is not a number"
