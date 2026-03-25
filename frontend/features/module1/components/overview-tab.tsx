"use client";

type OverviewTabProps = {
  activeReviewItems: number;
  cancelledAppointmentsCount: number;
  confirmedAppointmentsCount: number;
  encountersCount: number;
  filteredAppointmentsCount: number;
  filteredPatientsCount: number;
  globalSearch: string;
  pendingAppointmentsCount: number;
  whatsappAppointmentsCount: number;
};

export function OverviewTab({
  activeReviewItems,
  cancelledAppointmentsCount,
  confirmedAppointmentsCount,
  encountersCount,
  filteredAppointmentsCount,
  filteredPatientsCount,
  globalSearch,
  pendingAppointmentsCount,
  whatsappAppointmentsCount,
}: OverviewTabProps) {
  return (
    <section className="tab-layout">
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Resumen general</p>
            <h2>Vista operativa del tablero</h2>
          </div>
        </div>
        <section className="headline-strip">
          <div className="headline-card" title="Cantidad de citas mostradas según la vista actual y filtros activos.">
            <strong>{filteredAppointmentsCount}</strong>
            <span>Citas visibles</span>
          </div>
          <div className="headline-card" title="Pacientes visibles en el contexto actual del tablero.">
            <strong>{filteredPatientsCount}</strong>
            <span>Pacientes visibles</span>
          </div>
          <div className="headline-card" title="Consultas clínicas visibles o registradas en el contexto actual.">
            <strong>{encountersCount}</strong>
            <span>Consultas visibles</span>
          </div>
          <div className="headline-card" title="Casos que siguen esperando revisión manual.">
            <strong>{activeReviewItems}</strong>
            <span>Casos para revisión</span>
          </div>
        </section>
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Estado rápido</h2>
          </div>
        </div>
        <div className="summary-grid">
          <div className="metric-card" title="Citas que todavía están pendientes de confirmación.">
            <strong>{pendingAppointmentsCount}</strong>
            <span>Por confirmar</span>
          </div>
          <div className="metric-card" title="Citas ya confirmadas dentro de la vista actual.">
            <strong>{confirmedAppointmentsCount}</strong>
            <span>Confirmadas</span>
          </div>
          <div className="metric-card" title="Citas creadas desde la integración de WhatsApp.">
            <strong>{whatsappAppointmentsCount}</strong>
            <span>Desde WhatsApp</span>
          </div>
          <div className="metric-card" title="Citas canceladas que siguen visibles en el tablero actual.">
            <strong>{cancelledAppointmentsCount}</strong>
            <span>Canceladas</span>
          </div>
        </div>
      </article>

      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Colores</p>
            <h2>Leyenda visual</h2>
          </div>
        </div>
        <div className="calendar-legend overview-legend">
          <span className="legend-item" title="Cita regular sin confirmación especial ni origen WhatsApp."><span className="legend-swatch legend-swatch-default" />Cita normal</span>
          <span className="legend-item" title="Cita marcada como confirmada por el paciente o el equipo."><span className="legend-swatch legend-swatch-confirmed" />Cita confirmada</span>
          <span className="legend-item" title="Cita creada desde la integración con WhatsApp."><span className="legend-swatch legend-swatch-ws" />Cita desde WhatsApp</span>
          <span className="legend-item" title="Cita cancelada que se conserva en la vista histórica."><span className="legend-swatch legend-swatch-cancelled" />Cita cancelada</span>
        </div>
      </article>

      {globalSearch ? (
        <article className="card section-card span-three console-search-banner">
          <div>
            <p className="eyebrow">Filtro activo</p>
            <h2>Mostrando resultados para "{globalSearch}"</h2>
          </div>
          <span>Las cifras y módulos visibles ya reflejan ese filtro global.</span>
        </article>
      ) : null}
    </section>
  );
}
