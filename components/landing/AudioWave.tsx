"use client";

const HEIGHTS = [
  25, 45, 30, 60, 40, 75, 35, 50, 65, 30,
  55, 40, 70, 45, 35, 60, 50, 80, 40, 30,
  55, 45, 65, 35, 70, 50, 30, 60, 45, 75,
  40, 55, 35, 65, 50, 30, 70, 45, 60, 35,
];

export function AudioWave() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-1 h-48 pointer-events-none"
      aria-hidden="true"
    >
      {HEIGHTS.map((height, i) => (
        <div
          key={i}
          className={`w-1 rounded-full audio-wave-bar ${
            i % 2 === 1 ? "hidden md:block" : ""
          }`}
          style={{
            height: `${height}px`,
            animationDelay: `${i * 0.04}s`,
            backgroundColor: "var(--primary)",
            opacity: 0.08,
          }}
        />
      ))}
    </div>
  );
}
