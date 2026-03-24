"use client";

type ConsoleOverviewStripProps = {
  activeReviewItems: number;
  encountersCount: number;
  filteredAppointmentsCount: number;
  filteredPatientsCount: number;
  globalSearch: string;
};

export function ConsoleOverviewStrip({
  activeReviewItems,
  encountersCount,
  filteredAppointmentsCount,
  filteredPatientsCount,
  globalSearch,
}: ConsoleOverviewStripProps) {
  return (
    <>
      <section className="headline-strip">
        <div className="headline-card">
          <strong>{filteredAppointmentsCount}</strong>
          <span>Citas visibles</span>
        </div>
        <div className="headline-card">
          <strong>{filteredPatientsCount}</strong>
          <span>Pacientes visibles</span>
        </div>
        <div className="headline-card">
          <strong>{encountersCount}</strong>
          <span>Consultas visibles</span>
        </div>
        <div className="headline-card">
          <strong>{activeReviewItems}</strong>
          <span>Casos para revision</span>
        </div>
      </section>

      {globalSearch ? (
        <section className="card section-card span-three console-search-banner">
          <div>
            <p className="eyebrow">Filtro activo</p>
            <h3>Mostrando resultados para "{globalSearch}"</h3>
          </div>
          <span>La agenda, pacientes, consultas y metricas visibles ya estan filtradas localmente.</span>
        </section>
      ) : null}
    </>
  );
}
