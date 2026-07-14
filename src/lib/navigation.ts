// Bottom navigation model for the app shell (T3 / INS-8).
// Pure data + logic — rendering lives in src/components/bottom-nav.tsx.

export type NavItem = {
  href: string;
  /** Hungarian tab label (UI copy is Hungarian per constitution C9). */
  label: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Kezdőlap" },
  { href: "/tour", label: "Túra" },
  { href: "/tours", label: "Túrák" },
  { href: "/profiles", label: "Profilok" },
  { href: "/settings", label: "Beállítások" },
];

/**
 * Whether the nav item at `href` should render as active for `pathname`.
 * Home matches only exactly; sections also match their subroutes, with a
 * segment boundary so `/tour` never matches `/tours`.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
