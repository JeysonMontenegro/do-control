"use client";

type ActiveFilterItem = {
  label: string;
  value: string;
};

type ActiveFiltersBarProps = {
  clearLabel?: string;
  items: ActiveFilterItem[];
  onClearAll?: () => void;
  resultsLabel: string;
  resultsValue: number;
};

export function ActiveFiltersBar({
  clearLabel = "Limpiar filtros",
  items,
  onClearAll,
  resultsLabel,
  resultsValue,
}: ActiveFiltersBarProps) {
  const hasFilters = items.length > 0;

  return (
    <div className="active-filters-bar">
      <div className="active-filters-summary">
        <strong>{resultsValue}</strong>
        <span>{resultsLabel}</span>
      </div>

      <div className="active-filters-chips">
        {hasFilters ? (
          items.map((item) => (
            <span key={`${item.label}-${item.value}`} className="active-filter-chip">
              {item.label}: {item.value}
            </span>
          ))
        ) : (
          <span className="active-filter-chip active-filter-chip-muted">Sin filtros adicionales</span>
        )}
      </div>

      {hasFilters && onClearAll ? (
        <button type="button" className="secondary-button" onClick={onClearAll}>
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}
