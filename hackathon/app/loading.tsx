export default function Loading() {
  return (
    <div className="page-grid">
      <section className="hero loading-shell">
        <div className="loading-bar loading-bar-lg" />
        <div className="loading-bar loading-bar-md" />
        <div className="loading-grid">
          <div className="loading-card" />
          <div className="loading-card" />
          <div className="loading-card" />
        </div>
      </section>
    </div>
  );
}
