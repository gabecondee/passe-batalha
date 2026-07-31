// Maps each top-level nav item to all routes that belong to that module.
// Used by Sidebar and BottomNav to keep the parent item highlighted while
// the user navigates through any subscreen of the same module.
export const NAV_MODULE_PREFIXES: Record<string, string[]> = {
  '/': ['/'],
  '/skills': ['/skills'],
  '/missions': ['/missions'],
  '/bosses': ['/bosses'],
  '/inventory': [
    '/inventory',
    '/resources',
    '/diet',
    '/agenda',
    '/training',
    '/journal',
    '/achievements',
    '/shop',
  ],
  '/ranking': ['/ranking'],
  '/settings': ['/settings', '/profile'],
};

export function isNavItemActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/') return pathname === '/';
  const prefixes = NAV_MODULE_PREFIXES[itemPath] ?? [itemPath];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}
