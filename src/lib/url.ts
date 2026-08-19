const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const href = (path: string) => {
  if (/^https?:\/\//.test(path) || path.startsWith("data:")) return path;
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
};

export const isCurrentPath = (current: string, target: string) => {
  const normalized = current.replace(new RegExp(`^${basePath}`), "") || "/";
  return target === "/" ? normalized === "/" : normalized.startsWith(target);
};
