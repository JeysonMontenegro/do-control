"use client";

type PagerBarProps = {
  onChange: (page: number) => void;
  page: number;
  totalItems: number;
  pageSize: number;
};

export function PagerBar({ onChange, page, totalItems, pageSize }: PagerBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-bar">
      <button type="button" className="secondary-button" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button type="button" className="secondary-button" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Siguiente
      </button>
    </div>
  );
}
