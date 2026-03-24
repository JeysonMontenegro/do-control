"use client";

type EmptyStatePanelProps = {
  actionLabel?: string;
  body: string;
  className?: string;
  eyebrow?: string;
  onAction?: () => void;
  title: string;
  tone?: "default" | "warning";
};

export function EmptyStatePanel({
  actionLabel,
  body,
  className = "",
  eyebrow = "Sin resultados",
  onAction,
  title,
  tone = "default",
}: EmptyStatePanelProps) {
  return (
    <div className={`empty-state-panel empty-state-panel-${tone} ${className}`.trim()}>
      <div className="empty-state-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="secondary-button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
