// PIT WALL — realistic analog gauges
// Tachometer (RPM), Speedometer (km/h), MiniGauge (fuel/temp/etc).
// Numbered scales, redline zone, swinging needles with a center hub.

// ----- helpers -----
function pwPolar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
}

// Returns SVG arc path from start->end angle, radius r, centered cx,cy.
function pwArc(cx, cy, r, startDeg, endDeg) {
  const [x1, y1] = pwPolar(cx, cy, r, startDeg);
  const [x2, y2] = pwPolar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// Convert a scalar 0..1 to a degree along the gauge sweep.
// Gauges sweep from 135° (lower-left) through 270° to 45° (lower-right) — i.e. through the bottom flipped, no — we want bottom OPEN.
// Standard car: needle at zero is lower-left (about 7 o'clock), max at lower-right (about 5 o'clock), sweeping through the top.
// We map t∈[0,1] to angle 135°→405° (= 45° + 360°). The arc passes through 270° (top of circle when y-axis points down, so actually bottom). SVG y is down, so 270° is the top of the circle in screen coords... actually:
//   SVG: angle 0° = (+x, 0), 90° = (0, +y) = down, 180° = (-x), 270° = (0, -y) = up.
// We want needle to start at lower-left, sweep through TOP, end at lower-right.
// Lower-left in SVG: angle 135° → (x=-r/√2, y=+r/√2) → that IS lower-left ✓
// Top: 270° → (0, -r) → that is the top ✓
// Lower-right: 45° → (+r/√2, +r/√2) ✓
// So sweep needs to go 135° → 90° → 45° via 0° (right side) — that goes through the right side, not the top.
// Going from 135° to 405° (=45°+360°) increments through 180°, 225°, 270°, 315°, 360°, 405° — that goes through the BOTTOM.
// We want through the TOP, which means going DOWN in angle: 135° → 90° → 45° (through 90°), which goes through right side.
// That isn't symmetric either. Let me re-check.
// SVG: 0°=right, 90°=down, 180°=left, 270°=up.
// To sweep through up (270°): start at lower-LEFT and travel counter-clockwise to lower-RIGHT going via UP.
// Lower-left = 135°. Counter-clockwise (DECREASING angle) from 135° → 90° → 45° (right side) — that's through right side, not up.
// Going clockwise (increasing) from 135° → 180° → 270° → 360° → 405° (=45°) — that goes left→up→right. That passes through up ✓.
// So we increase angle from 135° to 405°. Total sweep 270°. ✓

function pwGaugeAngle(t) {
  const start = 135;
  const end = 405;
  return start + t * (end - start);
}

// ----- Tachometer -----
// props: { value (rpm), max (default 9000), redline (default 7000), size, label, gear }
// needleRef / gearRef let an external rAF loop drive the needle + gear digit
// imperatively (no CSS transition, no per-frame React re-render).
function PWTach({ value, max = 9000, redline = 7000, size = 360, label = 'RPM × 1000', gear, children, needleRef, gearRef }) {
  const cx = size / 2, cy = size / 2;
  const rim = size / 2 - 4;
  const tickOuter = rim - 8;
  const tickMajorIn = rim - 28;
  const tickMinorIn = rim - 16;
  const tickMiniIn = rim - 12;
  const numberR = rim - 44;

  const t = Math.max(0, Math.min(1, value / max));
  const angle = pwGaugeAngle(t);

  // Number labels at every 1000 (10 numbers from 0..9 if max=9000)
  const numMax = Math.floor(max / 1000);
  const labels = [];
  for (let i = 0; i <= numMax; i++) {
    const ang = pwGaugeAngle(i / numMax);
    const [x, y] = pwPolar(cx, cy, numberR, ang);
    const isRed = i * 1000 >= redline;
    labels.push({ n: i, x, y, isRed });
  }

  // Major + minor tick marks: major every 1000, minor every 500, mini every 250
  const ticks = [];
  const totalSteps = (numMax * 4); // every 250 RPM (numMax * 4)
  for (let i = 0; i <= totalSteps; i++) {
    const rpm = (i / totalSteps) * max;
    const ang = pwGaugeAngle(i / totalSteps);
    const isMajor = i % 4 === 0;
    const isMinor = !isMajor && i % 2 === 0;
    const inR = isMajor ? tickMajorIn : isMinor ? tickMinorIn : tickMiniIn;
    const [x1, y1] = pwPolar(cx, cy, inR, ang);
    const [x2, y2] = pwPolar(cx, cy, tickOuter, ang);
    const isRed = rpm >= redline;
    ticks.push({ x1, y1, x2, y2, isMajor, isMinor, isRed });
  }

  // Redline arc
  const redStart = pwGaugeAngle(redline / max);
  const redEnd = pwGaugeAngle(1);

  // Needle geometry — sharp triangular blade with red tip + counterweight
  const [needleTipX, needleTipY] = pwPolar(cx, cy, rim - 36, 0);
  const [needleBackX, needleBackY] = pwPolar(cx, cy, -22, 0);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <defs>
        <radialGradient id="pw-face" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1a1f27" />
          <stop offset="70%" stopColor="#0e1116" />
          <stop offset="100%" stopColor="#070809" />
        </radialGradient>
        <radialGradient id="pw-hub" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3c4250" />
          <stop offset="50%" stopColor="#1a1f27" />
          <stop offset="100%" stopColor="#0a0c10" />
        </radialGradient>
        <linearGradient id="pw-needle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3c4250" />
          <stop offset="0.7" stopColor="#cfd5dd" />
          <stop offset="1" stopColor="#ff5a3c" />
        </linearGradient>
      </defs>

      {/* Outer bezel */}
      <circle cx={cx} cy={cy} r={rim + 3} fill="#0a0c10" stroke="rgba(150,200,220,0.18)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={rim} fill="url(#pw-face)" stroke="rgba(150,200,220,0.25)" strokeWidth="0.8" />

      {/* Inner highlight ring */}
      <circle cx={cx} cy={cy} r={rim - 4} fill="none" stroke="rgba(150,200,220,0.06)" strokeWidth="0.6" />

      {/* Redline arc band */}
      <path d={pwArc(cx, cy, rim - 6, redStart, redEnd)} fill="none" stroke="#ff5a3c" strokeWidth="6" opacity="0.85" strokeLinecap="butt" />
      <path d={pwArc(cx, cy, rim - 6, redStart, redEnd)} fill="none" stroke="rgba(255,90,60,0.35)" strokeWidth="14" opacity="0.6" />

      {/* Cyan operating band (low) */}
      <path d={pwArc(cx, cy, rim - 6, pwGaugeAngle(0.05), redStart)} fill="none" stroke="rgba(127,212,230,0.18)" strokeWidth="2.5" />

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isRed ? '#ff5a3c' : (t.isMajor ? '#e8eaee' : t.isMinor ? '#9aa3ad' : '#5a6068')}
          strokeWidth={t.isMajor ? 2 : t.isMinor ? 1.1 : 0.7}
          strokeLinecap="butt"
        />
      ))}

      {/* Number labels */}
      {labels.map((l) => (
        <text key={l.n}
          x={l.x} y={l.y}
          textAnchor="middle" dominantBaseline="central"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="600"
          fontSize={size * 0.075}
          fill={l.isRed ? '#ff5a3c' : '#e8eaee'}
          letterSpacing="-0.02em"
        >
          {l.n}
        </text>
      ))}

      {/* Centre label "RPM x1000" — sits just below the hub */}
      <text
        x={cx} y={cy + rim * 0.22}
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        fontSize={size * 0.034}
        fill="#7fd4e6"
        letterSpacing="0.24em"
      >{label}</text>

      {/* Brand mark — only visible without a portrait child (portrait sits in this area) */}
      {!children && (
        <text
          x={cx} y={cy - rim * 0.38}
          textAnchor="middle"
          fontFamily="Instrument Serif, serif"
          fontStyle="italic"
          fontSize={size * 0.052}
          fill="#7fd4e6"
          letterSpacing="0.04em"
        >Fardin Ahsan</text>
      )}

      {/* Optional child slot (portrait) sits in the upper-mid of the dial
         so it doesn't conflict with the centre hub or the upper number
         labels. The gear digit goes BELOW centre. */}
      {children && (
        <foreignObject
          x={cx - rim * 0.28}
          y={cy - rim * 0.62}
          width={rim * 0.56}
          height={rim * 0.5}
        >
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {children}
          </div>
        </foreignObject>
      )}

      {/* GEAR digit — always rendered (when prop set), positioned in the
         lower face of the dial, below the centre hub and well clear of the
         corner number labels (0 / redline). */}
      {gear !== undefined && (
        <>
          <text
            x={cx} y={cy + rim * 0.42}
            textAnchor="middle" dominantBaseline="central"
            fontFamily="JetBrains Mono, monospace"
            fontSize={size * 0.038}
            fill="#9aa3ad"
            letterSpacing="0.28em"
          >GEAR</text>
          <text
            ref={gearRef}
            x={cx} y={cy + rim * 0.58}
            textAnchor="middle" dominantBaseline="central"
            fontFamily="Space Grotesk, sans-serif"
            fontWeight="700"
            fontSize={size * 0.14}
            fill="#ffc266"
            letterSpacing="-0.05em"
          >{gear}</text>
        </>
      )}

      {/* Needle — driven imperatively via needleRef (transform-box-proof 3-arg rotate, no transition) */}
      <g ref={needleRef} transform={`rotate(${angle} ${cx} ${cy})`} style={{ willChange: 'transform' }}>
        {/* Shadow — static offset polygon (no blur filter: blur re-rasterizes
            every frame as the needle rotates, which is very expensive on
            mobile GPUs). A slightly softer dark fill reads the same in motion. */}
        <polygon
          points={`${needleBackX},${needleBackY - 2} ${cx},${cy - 6} ${needleTipX},${needleTipY} ${cx},${cy + 6} ${needleBackX},${needleBackY + 2}`}
          fill="rgba(0,0,0,0.45)" transform="translate(2,2)"
        />
        {/* Body */}
        <polygon
          points={`${needleBackX},${needleBackY - 2} ${cx},${cy - 5} ${needleTipX},${needleTipY} ${cx},${cy + 5} ${needleBackX},${needleBackY + 2}`}
          fill="url(#pw-needle)"
          stroke="rgba(0,0,0,0.5)" strokeWidth="0.5"
        />
        {/* Red tip emphasis */}
        <polygon
          points={`${needleTipX - 18},${needleTipY - 3} ${needleTipX},${needleTipY} ${needleTipX - 18},${needleTipY + 3}`}
          fill="#ff5a3c"
        />
      </g>

      {/* Center hub */}
      <circle cx={cx} cy={cy} r={size * 0.05} fill="url(#pw-hub)" stroke="rgba(150,200,220,0.4)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={size * 0.018} fill="#0a0c10" stroke="rgba(150,200,220,0.5)" strokeWidth="0.6" />
    </svg>
  );
}

// ----- Speedometer (km/h, smaller, similar style) -----
function PWSpeedo({ value, max = 260, size = 260, label = 'KM/H', units = 'kph', gear, needleRef, digitRef }) {
  const cx = size / 2, cy = size / 2;
  const rim = size / 2 - 4;
  const tickOuter = rim - 6;
  const tickMajorIn = rim - 22;
  const tickMinorIn = rim - 14;
  const numberR = rim - 34;

  const t = Math.max(0, Math.min(1, value / max));
  const angle = pwGaugeAngle(t);

  // Numbered every 20 km/h
  const step = 20;
  const numCount = Math.floor(max / step);
  const labels = [];
  for (let i = 0; i <= numCount; i++) {
    const ang = pwGaugeAngle(i / numCount);
    const [x, y] = pwPolar(cx, cy, numberR, ang);
    labels.push({ n: i * step, x, y });
  }

  const ticks = [];
  const totalSteps = numCount * 2; // every 10 km/h
  for (let i = 0; i <= totalSteps; i++) {
    const ang = pwGaugeAngle(i / totalSteps);
    const isMajor = i % 2 === 0;
    const inR = isMajor ? tickMajorIn : tickMinorIn;
    const [x1, y1] = pwPolar(cx, cy, inR, ang);
    const [x2, y2] = pwPolar(cx, cy, tickOuter, ang);
    ticks.push({ x1, y1, x2, y2, isMajor });
  }

  const [needleTipX, needleTipY] = pwPolar(cx, cy, rim - 26, 0);
  const [needleBackX, needleBackY] = pwPolar(cx, cy, -16, 0);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <defs>
        <radialGradient id="pw-face-s" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1a1f27" />
          <stop offset="70%" stopColor="#0e1116" />
          <stop offset="100%" stopColor="#070809" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={rim + 3} fill="#0a0c10" stroke="rgba(150,200,220,0.18)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={rim} fill="url(#pw-face-s)" stroke="rgba(150,200,220,0.25)" strokeWidth="0.8" />

      {/* Amber operating band */}
      <path d={pwArc(cx, cy, rim - 5, pwGaugeAngle(0.05), pwGaugeAngle(0.95))} fill="none" stroke="rgba(255,194,102,0.18)" strokeWidth="2.5" />

      {ticks.map((t, i) => (
        <line key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isMajor ? '#e8eaee' : '#7a8088'}
          strokeWidth={t.isMajor ? 1.6 : 0.7}
        />
      ))}

      {labels.map((l) => (
        <text key={l.n}
          x={l.x} y={l.y}
          textAnchor="middle" dominantBaseline="central"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="600"
          fontSize={size * 0.072}
          fill="#e8eaee"
          letterSpacing="-0.02em"
        >{l.n}</text>
      ))}

      <text x={cx} y={cy + rim * 0.45}
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        fontSize={size * 0.045}
        fill="#ffc266" letterSpacing="0.24em"
      >{label}</text>

      {gear !== undefined ? null : (
        <text x={cx} y={cy - rim * 0.34}
          textAnchor="middle"
          fontFamily="Instrument Serif, serif" fontStyle="italic"
          fontSize={size * 0.065}
          fill="#ffc266" letterSpacing="0.04em"
        >velocity</text>
      )}

      {/* Digital readout — small, well below centre, narrower than the inner
         arc band so side numbers never touch its edges. */}
      <text x={cx} y={cy + rim * 0.62}
        textAnchor="middle" dominantBaseline="central"
        fontFamily="JetBrains Mono, monospace" fontWeight="600"
        fontSize={size * 0.05}
        fill="#9aa3ad"
        letterSpacing="0.18em"
      >SPD</text>
      <text ref={digitRef} x={cx} y={cy + rim * 0.74}
        textAnchor="middle" dominantBaseline="central"
        fontFamily="JetBrains Mono, monospace" fontWeight="600"
        fontSize={size * 0.09}
        fill="#ffc266"
        letterSpacing="-0.02em"
      >{Math.floor(value).toString().padStart(3, '0')}</text>

      {/* Needle — driven imperatively via needleRef (transform-box-proof, no transition) */}
      <g ref={needleRef} transform={`rotate(${angle} ${cx} ${cy})`} style={{ willChange: 'transform' }}>
        <polygon
          points={`${needleBackX},${needleBackY - 1.5} ${cx},${cy - 4} ${needleTipX},${needleTipY} ${cx},${cy + 4} ${needleBackX},${needleBackY + 1.5}`}
          fill="#cfd5dd" stroke="rgba(0,0,0,0.4)" strokeWidth="0.4"
        />
        <polygon
          points={`${needleTipX - 14},${needleTipY - 2.4} ${needleTipX},${needleTipY} ${needleTipX - 14},${needleTipY + 2.4}`}
          fill="#ffc266"
        />
      </g>

      <circle cx={cx} cy={cy} r={size * 0.05} fill="url(#pw-hub)" stroke="rgba(150,200,220,0.4)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={size * 0.018} fill="#0a0c10" stroke="rgba(150,200,220,0.5)" strokeWidth="0.6" />
    </svg>
  );
}

// ----- MiniGauge (small bar-arc for fuel, temp, etc) -----
function PWMiniGauge({ value, max = 100, label = 'FUEL', size = 140, color = '#7fd4e6', warn = 0.85 }) {
  const cx = size / 2, cy = size / 2;
  const rim = size / 2 - 4;
  const t = Math.max(0, Math.min(1, value / max));
  const startAng = 135, endAng = 405;
  const valAng = startAng + t * (endAng - startAng);
  const hi = t > warn;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={cx} cy={cy} r={rim} fill="#0a0c10" stroke="rgba(150,200,220,0.18)" strokeWidth="0.8" />
      {/* Track */}
      <path d={pwArc(cx, cy, rim - 8, startAng, endAng)} fill="none" stroke="rgba(150,200,220,0.18)" strokeWidth="3" strokeLinecap="round" />
      {/* Value arc */}
      <path d={pwArc(cx, cy, rim - 8, startAng, valAng)} fill="none" stroke={hi ? '#ff5a3c' : color} strokeWidth="3" strokeLinecap="round" />
      {/* Major ticks every quarter */}
      {[0, 0.25, 0.5, 0.75, 1].map((tt, i) => {
        const a = startAng + tt * (endAng - startAng);
        const [x1, y1] = pwPolar(cx, cy, rim - 14, a);
        const [x2, y2] = pwPolar(cx, cy, rim - 4, a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9aa3ad" strokeWidth="1" />;
      })}
      <text x={cx} y={cy - size * 0.08} textAnchor="middle" dominantBaseline="central"
        fontFamily="Space Grotesk, sans-serif" fontWeight="700"
        fontSize={size * 0.22} fill={hi ? '#ff5a3c' : '#e8eaee'} letterSpacing="-0.03em"
      >{Math.floor(value)}</text>
      <text x={cx} y={cy + size * 0.08} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        fontSize={size * 0.085} fill="#9aa3ad" letterSpacing="0.18em"
      >{label}</text>
    </svg>
  );
}

// Linear gauge — horizontal bar with ticks (for boost, brake bias, etc)
function PWBar({ value, max = 100, label, color = '#7fd4e6', sub }) {
  const t = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9aa3ad', marginBottom: 6 }}>
        <span>{label}</span><span>{sub}</span>
      </div>
      <div style={{ position: 'relative', height: 8, background: 'rgba(150,200,220,0.1)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${t * 100}%`, background: color, transition: 'width 0.2s ease' }} />
        {/* tick marks */}
        {[0.25, 0.5, 0.75].map((p) => (
          <div key={p} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p * 100}%`, width: 1, background: 'rgba(12,13,16,0.55)' }} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { PWTach, PWSpeedo, PWMiniGauge, PWBar, pwGaugeAngle, pwPolar });
