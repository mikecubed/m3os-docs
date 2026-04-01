export function withBase(pathname: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const base = import.meta.env.BASE_URL ?? '/';

  if (base === '/') {
    return normalizedPath;
  }

  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;

  return normalizedPath === '/' ? `${trimmedBase}/` : `${trimmedBase}${normalizedPath}`;
}
