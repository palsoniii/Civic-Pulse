/**
 * Tiny cn() utility — merges Tailwind class strings.
 * Using a simple join here to avoid adding clsx/tailwind-merge as a dep.
 * Can be upgraded to clsx + twMerge later if needed.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
