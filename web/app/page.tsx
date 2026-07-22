import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <div className="landing__atmosphere" aria-hidden />
      <div className="landing__beam landing__beam--left" aria-hidden />
      <div className="landing__beam landing__beam--right" aria-hidden />
      <div className="landing__floor" aria-hidden />
      <div className="landing__noise" aria-hidden />

      <div className="landing__content">
        <h1 className="landing__brand">
          Pulse
          <span>Club</span>
        </h1>

        <p className="landing__headline">The room is already moving.</p>

        <p className="landing__lede">
          Drop into a live 3D club — dance, vote the DJ drop, snap photos, and
          talk in the voice lounge with whoever shows up.
        </p>

        <div className="landing__actions">
          <Link href="/login" className="landing__cta">
            Enter the club
          </Link>
          <span className="landing__meta">Live · Multiplayer · Free to join</span>
        </div>
      </div>
    </main>
  );
}
