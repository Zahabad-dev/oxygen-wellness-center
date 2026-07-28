export default function TourButton({ tour, label = 'Activar tutorial' }) {
  return (
    <button type="button" className="btn btn-secondary tour-btn" onClick={tour.start}>
      🎓 {label}
    </button>
  );
}
