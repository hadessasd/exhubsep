const ICONS = [
  "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5",
  "M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z M2 2l7.586 7.586",
  "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  "M8 21h8 M12 17v4 M3 4h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z",
  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z",
  "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
  "M4 4h16v16H4z M9 9h6v6H9z",
  "M12 3v18 M3 12h18",
  "M5 12h14 M12 5l7 7-7 7",
  "M8 6h8v4H8z M6 10h12v8H6z",
  "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2",
];

// Stronger visibility — larger icons, higher opacity
const PLACEMENTS = [
  { t: "6%", l: "3%", s: 36, d: "0s", dur: "24s", o: 0.22 },
  { t: "14%", l: "90%", s: 42, d: "2s", dur: "28s", o: 0.2 },
  { t: "28%", l: "6%", s: 30, d: "4s", dur: "22s", o: 0.24 },
  { t: "8%", l: "48%", s: 28, d: "1s", dur: "26s", o: 0.18 },
  { t: "42%", l: "86%", s: 38, d: "3s", dur: "25s", o: 0.22 },
  { t: "58%", l: "4%", s: 34, d: "5s", dur: "27s", o: 0.2 },
  { t: "68%", l: "58%", s: 36, d: "1.5s", dur: "23s", o: 0.18 },
  { t: "76%", l: "20%", s: 32, d: "3.5s", dur: "21s", o: 0.22 },
  { t: "22%", l: "70%", s: 26, d: "4.5s", dur: "29s", o: 0.2 },
  { t: "52%", l: "36%", s: 34, d: "0.5s", dur: "24s", o: 0.16 },
  { t: "36%", l: "94%", s: 28, d: "6s", dur: "22s", o: 0.2 },
  { t: "88%", l: "76%", s: 36, d: "2.2s", dur: "26s", o: 0.18 },
  { t: "3%", l: "76%", s: 24, d: "3.8s", dur: "30s", o: 0.2 },
  { t: "92%", l: "10%", s: 34, d: "4.2s", dur: "23s", o: 0.18 },
  { t: "48%", l: "16%", s: 28, d: "5.5s", dur: "25s", o: 0.16 },
  { t: "18%", l: "26%", s: 26, d: "1.8s", dur: "27s", o: 0.18 },
  { t: "72%", l: "88%", s: 30, d: "2.8s", dur: "24s", o: 0.2 },
  { t: "84%", l: "42%", s: 28, d: "0.3s", dur: "28s", o: 0.16 },
  { t: "10%", l: "60%", s: 22, d: "6.5s", dur: "31s", o: 0.18 },
  { t: "60%", l: "48%", s: 26, d: "3.1s", dur: "22s", o: 0.16 },
];

export function DoodleBackground() {
  return (
    <div className="doodle-bg" aria-hidden>
      <div className="grid-dots absolute inset-0 opacity-55" />
      <div className="doodle-orb doodle-orb-a" />
      <div className="doodle-orb doodle-orb-b" />
      <div className="doodle-orb doodle-orb-c" />
      <div className="doodle-layer">
        {PLACEMENTS.map((p, i) => {
          const path = ICONS[i % ICONS.length]!;
          return (
            <svg
              key={i}
              className={`doodle-item ${i % 4 === 0 ? "soft" : ""}`}
              style={
                {
                  top: p.t,
                  left: p.l,
                  width: p.s,
                  height: p.s,
                  opacity: p.o,
                  "--delay": p.d,
                  "--dur": p.dur,
                } as React.CSSProperties
              }
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={path} />
            </svg>
          );
        })}
      </div>
    </div>
  );
}
