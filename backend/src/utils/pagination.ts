export function getPagination(pageRaw?: unknown, limitRaw?: unknown) {
  const page = Math.max(1, Number(pageRaw) || 1);
  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}
