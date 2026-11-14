export function resolveBasePath(env = {}) {
  const repository = env.GITHUB_REPOSITORY?.split('/').at(-1);
  const inferred = env.GITHUB_ACTIONS === 'true' && repository && !repository.endsWith('.github.io')
    ? `/${repository}/`
    : '/';
  const value = env.PAGES_BASE_PATH ?? inferred;
  const normalized = value.endsWith('/') ? value : `${value}/`;
  if (value.length === 0 || !/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(normalized)
    || normalized.split('/').some((part) => part === '.' || part === '..')) {
    throw new Error('PAGES_BASE_PATH must be / or an absolute path such as /portfolio/.');
  }
  return normalized;
}
