"use client";

import {
  ACCENT_COLORS,
  GENDER_OPTIONS,
  PANTS_OPTIONS,
  SHIRT_OPTIONS,
  SHOES_OPTIONS,
  STYLE_OPTIONS,
  type AvatarOutfit,
  type CatalogOption,
} from "@/lib/avatarCatalog";

type AvatarCustomizerProps = {
  outfit: AvatarOutfit;
  onChange: (next: AvatarOutfit) => void;
};

function SwatchGrid({
  title,
  options,
  selectedColor,
  onSelectColor,
}: {
  title: string;
  options: CatalogOption[];
  selectedColor: string;
  onSelectColor: (color: string) => void;
}) {
  return (
    <section style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: 8,
        }}
      >
        {options.map((option) => {
          const selected = selectedColor === option.color;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectColor(option.color)}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr",
                gap: 8,
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 12,
                border: selected
                  ? `2px solid ${option.color}`
                  : "1px solid rgba(148,163,184,0.25)",
                background: selected ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.8)",
                color: "inherit",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: option.color,
                  boxShadow: `0 0 12px ${option.color}55`,
                  border: "2px solid rgba(255,255,255,0.35)",
                }}
              />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700 }}>
                  {option.emoji} {option.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function OptionGrid({
  title,
  options,
  selectedId,
  onSelect,
}: {
  title: string;
  options: CatalogOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 8,
        }}
      >
        {options.map((option) => {
          const selected = selectedId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              style={{
                display: "grid",
                gap: 6,
                padding: "10px 12px",
                borderRadius: 12,
                border: selected
                  ? `2px solid ${option.color}`
                  : "1px solid rgba(148,163,184,0.25)",
                background: selected ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.8)",
                color: "inherit",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 18 }}>{option.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{option.label}</span>
              {option.description ? (
                <span style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4 }}>
                  {option.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function AvatarCustomizer({ outfit, onChange }: AvatarCustomizerProps) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <OptionGrid
        title="Body type"
        options={GENDER_OPTIONS}
        selectedId={outfit.gender}
        onSelect={(gender) => onChange({ ...outfit, gender })}
      />
      <SwatchGrid
        title="Accent glow"
        options={ACCENT_COLORS}
        selectedColor={outfit.color}
        onSelectColor={(color) => onChange({ ...outfit, color })}
      />
      <OptionGrid
        title="Top / dress"
        options={SHIRT_OPTIONS}
        selectedId={outfit.shirt}
        onSelect={(shirt) => onChange({ ...outfit, shirt })}
      />
      <OptionGrid
        title="Pants"
        options={PANTS_OPTIONS}
        selectedId={outfit.pants}
        onSelect={(pants) => onChange({ ...outfit, pants })}
      />
      <OptionGrid
        title="Shoes"
        options={SHOES_OPTIONS}
        selectedId={outfit.shoes}
        onSelect={(shoes) => onChange({ ...outfit, shoes })}
      />
      <OptionGrid
        title="Overall style"
        options={STYLE_OPTIONS}
        selectedId={outfit.style}
        onSelect={(style) => onChange({ ...outfit, style })}
      />
    </div>
  );
}
