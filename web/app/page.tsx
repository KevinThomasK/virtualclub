import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          textAlign: "center",
          display: "grid",
          gap: 16,
        }}
      >
        <p style={{ color: "#94a3b8", margin: 0 }}>3D multiplayer starter</p>
        <h1 style={{ margin: 0, fontSize: "2.5rem" }}>Virtual Concert</h1>
        <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
          Log in, pick a name and color, then walk around a shared 3D stage with
          other users. Press Space to dance.
        </p>
        <Link
          href="/login"
          style={{
            justifySelf: "center",
            background: "#6366f1",
            color: "white",
            textDecoration: "none",
            padding: "12px 20px",
            borderRadius: 999,
            fontWeight: 600,
          }}
        >
          Enter the venue
        </Link>
      </div>
    </main>
  );
}
