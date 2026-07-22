"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { AvatarCustomizer } from "@/components/AvatarCustomizer";
import { AvatarPreviewLazy } from "@/components/AvatarPreview";
import { DEFAULT_OUTFIT, type AvatarOutfit } from "@/lib/avatarCatalog";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [outfit, setOutfit] = useState<AvatarOutfit>(DEFAULT_OUTFIT);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    await signIn("credentials", {
      name: name.trim(),
      gender: outfit.gender,
      color: outfit.color,
      shirt: outfit.shirt,
      pants: outfit.pants,
      shoes: outfit.shoes,
      style: outfit.style,
      callbackUrl: "/concert",
    });
    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 16px 40px",
        background:
          "radial-gradient(circle at top, rgba(99,102,241,0.12), transparent 40%), #05060d",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 1080,
          margin: "0 auto",
          display: "grid",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 8,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
            Build your avatar before entering the venue
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.4rem)" }}>
            Create your concert look
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "rgba(10,11,16,0.88)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: 18,
              padding: 18,
              display: "grid",
              gap: 16,
            }}
          >
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Display name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Kevin"
                maxLength={24}
                required
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.25)",
                  background: "#0f172a",
                  color: "inherit",
                }}
              />
            </label>

            <AvatarCustomizer outfit={outfit} onChange={setOutfit} />

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "14px 18px",
                borderRadius: 999,
                border: "none",
                background: `linear-gradient(135deg, ${outfit.color}, #312e81)`,
                color: "white",
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                fontSize: 15,
              }}
            >
              {loading ? "Entering venue..." : "Enter the concert"}
            </button>
          </div>

          <div
            style={{
              background: "rgba(10,11,16,0.88)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: 18,
              padding: 18,
              display: "grid",
              gap: 14,
              position: "sticky",
              top: 16,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>Live preview</div>
            <AvatarPreviewLazy name={name || "YOU"} outfit={outfit} />
            <div
              style={{
                display: "grid",
                gap: 6,
                color: "#cbd5e1",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <div>Drag to rotate your avatar.</div>
              <div>
                Your outfit syncs to the club — shirt, pants, shoes, accent glow,
                and emotes (Space dance, E wave, F cheer, R pose).
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
