// PIT WALL — full landing page app
// Top nav, hero (gauge cluster), build log, motor, range, letters, open channel.
// Scroll-reveal via IntersectionObserver; live telemetry via rAF clock.

const { useState, useEffect, useRef, useCallback } = React;

// -----------------------------------------------------------------
// Clock — single rAF heartbeat shared across the page
// -----------------------------------------------------------------
function usePwClock() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let id;
    const loop = () => { setT((v) => v + 1); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  return t;
}

// Scroll-reveal hook — adds `is-visible` once an element enters the viewport.
// Robust to environments where IntersectionObserver doesn't fire: also runs
// a synchronous getBoundingClientRect check on mount, a scroll listener,
// and a 1.5s failsafe so nothing ever stays invisible.
function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const inView = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight - 20 && r.bottom > 20;
    };

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.classList.add('is-visible');
      cleanup();
    };

    // Synchronous: already in viewport at mount? Reveal immediately.
    if (inView()) {
      // Defer one frame so the initial render with opacity:0 lands first
      // and the transition actually animates the change.
      requestAnimationFrame(finish);
      return;
    }

    let io;
    try {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) finish(); });
      }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
      io.observe(el);
    } catch {}

    const onScroll = () => { if (inView()) finish(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // Ultimate failsafe: reveal after 1.5s regardless.
    const failsafeId = setTimeout(finish, 1500);

    function cleanup() {
      if (io) io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearTimeout(failsafeId);
    }
    return cleanup;
  }, [ref]);
}

function Reveal({ as: Tag = 'div', className = '', children, stagger = false, style }) {
  const ref = useRef(null);
  useReveal(ref);
  const cls = (stagger ? 'pw-reveal-stagger ' : 'pw-reveal ') + className;
  // No cloneElement — stagger delays come from CSS :nth-child. Avoids creating
  // new style objects every render which would restart the CSS transitions.
  return <Tag ref={ref} className={cls} style={style}>{children}</Tag>;
}

// -----------------------------------------------------------------
// NAV
// -----------------------------------------------------------------
function PwNav() {
  const [active, setActive] = useState('Home');
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    ['Home', '#top'],
    ['Projects', '#build-log'],
    ['Driving', '#motor'],
    ['Travel', '#range'],
    ['Writing', '#letters'],
    ['Contact', '#open-channel'],
  ];
  return (
    <nav className={'pw-nav' + (menuOpen ? ' pw-nav--open' : '')}>
      <div className="pw-nav__cell pw-nav__cell--brand">
        <span className="pw-dot">◉</span>&nbsp;&nbsp;FARDIN AHSAN
      </div>
      <div className="pw-nav__links">
        {links.map(([label, href]) => (
          <a
            key={label}
            href={href}
            onClick={() => { setActive(label); setMenuOpen(false); }}
            className={'pw-nav__cell' + (active === label ? ' pw-nav__cell--active' : '')}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            {label}
          </a>
        ))}
      </div>
      <div className="pw-nav__cell pw-nav__cell--right">
        <DxbClock />
      </div>
      <button
        className="pw-nav__burger"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span></span><span></span><span></span>
      </button>
    </nav>
  );
}

// Live Dubai (GST · UTC+4) clock for the nav. Formatter built once, not every tick.
const PW_DXB_FMT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false, timeZone: 'Asia/Dubai',
});
function DxbClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{PW_DXB_FMT.format(now)} GST</>;
}

// -----------------------------------------------------------------
// LIVE bits — components that subscribe to the rAF clock. Isolated so the
// containing sections don't re-render every frame, which would restart the
// scroll-reveal CSS transitions.
// -----------------------------------------------------------------

// ─── GT86 driveline physics — real-time longitudinal model ───────────────
// <PW-SIM-CORE> Everything down to </PW-SIM-CORE> is plain JS (no JSX, DOM or
// React) operating on a plain state object, so it can be lifted out and run
// headless. One fixed 120 Hz tick = driver controller → 4 physics sub-steps.
//
// Three bodies, three couplings:
//   engine + flywheel (IE) ─[clutch → compliant driveline]─ rear wheels (IWR) ─[tyre]─ car (MCAR)
//   • Clutch/driveline: a torsional spring-damper (half-shafts, diff, sidewalls)
//     whose torque is capped by clutch capacity — over the cap the clutch slips.
//     Shift shunt, clutch-dump wind-up and the in-gear limiter "buck" all fall
//     out of this instead of being scripted.
//   • Tyre: stick/slip friction impulse, capacity μ·Fz_rear (load transfer +
//     friction circle vs lateral g); sliding μ falls off with slip speed.
//   • Brakes (front force + rear torque, ABS-capped) and rolling resistance are
//     friction impulses too — they can stop the car but never reverse it.
// The tach reads crank speed, the speedo reads REAR (driven) wheel speed — so
// a burnout shows ~55 km/h on a car doing walking pace, like the real thing.
//
// Real FA20/ZN6 numbers in → this out (headless check): 0-100 ≈ 7.5 s (needs
// 3rd), redline gear tops 59/97/138/175/212 km/h, ~230 km/h top in 6th.
const PW_PI = Math.PI, A2R = 60 / (2 * PW_PI), R2A = 1 / A2R;       // rad/s <-> rpm
const PW_G = 9.81;
const SIM_RATIOS  = [3.626, 2.188, 1.541, 1.213, 1.000, 0.767];    // ZN6 TL70 6MT
const SIM_FINAL   = 4.10;                                          // final drive (EU/AU 6MT; US is 4.30)
const RW = 0.310;                                                  // 215/45R17 dynamic rolling radius, m
const SIM_REDLINE = 7400, SHIFT_RPM = 7250, SIM_IDLE = 780;        // dial redline, driver's shift point, idle target
const FUELCUT = 7450, FC_RESUME = 7100;                            // hard fuel-cut limiter + re-light hysteresis
const PW_M = 1325;                                                 // 1250 kg kerb + 75 kg driver
const WF = 0.53, CG_H = 0.46, WB = 2.57;                           // front weight share, CG height, wheelbase (m)
const IE = 0.12, IWR = 2.0, I_FRONT = 1.7;                         // crank+flywheel+clutch, rear axle, front wheels (kg·m²)
const MCAR = PW_M + I_FRONT / (RW * RW);                           // translating mass incl. free-rolling front wheels
const PW_EFF = 0.86;                                               // gearbox + diff efficiency
const CDA_K = 0.5 * 1.225 * 0.29 * 2.05;                           // ½·ρ·Cd·A
const CRR0 = 0.013, CRR2 = 1.8e-6;                                 // rolling resistance, grows with v²
const MU_PK = 1.10;                                                // peak tyre μ (summer tyre)
const CLUTCH_CAP = 330, BRAKE_F = 16000, BIAS_F = 0.70;           // Nm; N at full pedal; front brake share
const K_DL = 9000, Z_DL = 0.3;                                     // driveline torsional stiffness at the wheels (Nm/rad), damping ratio
const FIXED = 1 / 120, SUBSTEPS = 4, DT_CLAMP = 0.1, MAX_STEPS = 12; // tick, sub-steps, max frame dt, catch-up cap
const pwClamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// Per-gear overall ratio, driveline stiffness & damping referred to the crank.
const PW_GR = [0], PW_KE = [0], PW_CE = [0];
for (let g = 1; g <= 6; g++) {
  const G = SIM_RATIOS[g - 1] * SIM_FINAL, J = (MCAR * RW * RW + IWR) / (G * G), Ieff = IE * J / (IE + J);
  PW_GR[g] = G; PW_KE[g] = K_DL / (G * G); PW_CE[g] = 2 * Z_DL * Math.sqrt(PW_KE[g] * Ieff);
}

// FA20 full-load crank torque (Nm): 205 Nm @ 6400-6600, ~200 hp @ 7000, and the
// infamous mid-range dip around 3800-4400. Monotone-cubic resampled every 50 rpm.
const TQ_PTS = [[0, 60], [600, 95], [1000, 125], [1500, 150], [2000, 170], [2500, 182], [3000, 190], [3500, 186], [3800, 178], [4100, 174], [4400, 177], [4700, 184], [5000, 192], [5500, 199], [6000, 202], [6400, 205], [6600, 205], [7000, 203], [7400, 193], [7800, 175], [8000, 165]];
const TQ_STEP = 50, TQ_N = 160, TQ_TAB = new Float32Array(TQ_N + 1);
(function buildTorqueTable() {
  const n = TQ_PTS.length, x = TQ_PTS.map((p) => p[0]), y = TQ_PTS.map((p) => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {                                 // Fritsch–Carlson: no overshoot between points
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  for (let k = 0, i = 0; k <= TQ_N; k++) {
    const r = k * TQ_STEP; while (i < n - 2 && r > x[i + 1]) i++;
    const h = x[i + 1] - x[i], t = pwClamp((r - x[i]) / h, 0, 1), t2 = t * t, t3 = t2 * t;
    TQ_TAB[k] = (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h * m[i + 1];
  }
})();
function pwTorque(rpm) { const f = rpm / TQ_STEP; if (f <= 0) return TQ_TAB[0]; if (f >= TQ_N) return TQ_TAB[TQ_N]; const i = f | 0; return TQ_TAB[i] + (TQ_TAB[i + 1] - TQ_TAB[i]) * (f - i); }
// Motoring (friction + closed-throttle pumping) torque on rad/s: ~14 Nm at idle, ~57 Nm at 7000.
const pwFric = (w) => 12 + 0.025 * w + 0.00005 * w * w;
// Throttle plate → cylinder filling: small openings fill the engine at low rpm, need more at high rpm.
function pwLoad(thr, rpm) { if (thr <= 0) return 0; if (thr >= 1) return 1; const a = 1.5 + 9000 / Math.max(rpm, 700); return (1 - Math.exp(-a * thr)) / (1 - Math.exp(-a)); }
// Deterministic xorshift noise (idle combustion jitter) so headless runs repeat exactly.
function pwRand(s) { let x = s.seed | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s.seed = x; return (x >>> 0) / 4294967296; }

function makeSim() {
  return {
    v: 0, ww: 0, we: SIM_IDLE * R2A, tw: 0,                        // car m/s · rear wheel rad/s · crank rad/s · driveline twist (rad, crank side)
    gear: 0, gearDisp: 1, clutch: 1, throttle: 0, brake: 0,         // driver inputs (clutch = engagement 0..1); gearDisp 0 = N
    thrEff: 0, comb: 1, fuelCut: false, iscI: 0, noise: 0, acT: 0, seed: 0x2f6e2b1, tcs: 1, tcsOn: true,
    slide: false, cSlip: false, slipping: false, slipV: 0,
    aLong: 0, aFilt: 0, aLat: 0, prevV: 0, gearFlash: 0,
    sh: null, ph: 0, modeT: 0, t: 0, trackX: 0, tLaunch: 0, t100: 0,
  };
}

// One physics sub-step of length h (s).
function pwPhysics(s, h) {
  const g = s.gear, G = PW_GR[g], rpm = s.we * A2R;

  // Throttle plate: opens fast, closes a little lazily (the FA20's emissions "rev hang").
  s.thrEff += (s.throttle - s.thrEff) * (1 - Math.exp(-h / (s.throttle > s.thrEff ? 0.05 : 0.08)));
  // Hard fuel-cut limiter with hysteresis; combustion re-lights over ~15 ms.
  if (rpm >= FUELCUT) s.fuelCut = true; else if (s.fuelCut && rpm <= FC_RESUME) s.fuelCut = false;
  s.comb = s.fuelCut ? 0 : s.comb + (1 - s.comb) * (1 - Math.exp(-h / 0.015));
  // Idle-speed control: PI on airflow toward 780 rpm (integrator only near idle — no wind-up).
  const err = SIM_IDLE - rpm;
  if (err > -300) s.iscI = pwClamp(s.iscI + err * 0.004 * h, -0.05, 0.25);
  const isc = pwClamp(0.08 + err * 0.0012 + s.iscI, 0, 0.45);
  // Idle combustion jitter (filtered noise) + the A/C compressor clutching in every ~11 s.
  s.noise += -s.noise * 10 * h + 22 * Math.sqrt(h) * (pwRand(s) + pwRand(s) + pwRand(s) - 1.5);
  s.acT = (s.acT + h) % 11;
  const Tf = pwFric(s.we) + (s.acT > 6.5 ? 5 : 0);
  // TRC: trims (spark/fuel) torque as soon as the driven wheels outrun the car — the
  // SLIP telltale is the real car's flashing slip indicator. Off for the burnout.
  if (s.tcsOn && s.slipV > 1.0) s.tcs = Math.max(0.3, s.tcs - (s.slipV - 1.0) * 4 * h); else s.tcs = Math.min(1, s.tcs + 3 * h);
  let Te = s.comb * s.tcs * Math.max(pwLoad(s.thrEff, rpm), isc) * (pwTorque(rpm) + Tf) - Tf;
  if (rpm < 1500) Te += s.noise * pwClamp((1500 - rpm) / 700, 0, 1);

  // Clutch → compliant driveline. Locked: spring-damper torque passes straight
  // through. Over capacity: the clutch slips at ±cap and the shaft relaxes.
  let Tc = 0; s.cSlip = false;
  if (g > 0 && s.clutch > 0.001) {
    const cap = CLUTCH_CAP * s.clutch, k = PW_KE[g], c = PW_CE[g];
    const dw = s.we - s.ww * G, Tl = k * s.tw + c * dw;
    if (Tl <= cap && Tl >= -cap) { Tc = Tl; s.tw += dw * h; }
    else { Tc = Tl > 0 ? cap : -cap; s.tw = (s.tw + h * Tc / c) / (1 + h * k / c); s.cSlip = Math.abs(dw) > 3; }
  } else s.tw = 0;

  // Free dynamics: crank, rear axle (losses always oppose the flow of power), aero on the body.
  s.we += (Te - Tc) / IE * h; if (s.we < 0) s.we = 0;
  s.ww += Tc * G * (Tc >= 0 ? PW_EFF : 1 / PW_EFF) / IWR * h;
  s.v -= CDA_K * s.v * s.v / MCAR * h;

  // Contact loads: longitudinal load transfer, friction circle vs lateral g.
  const Fzr = pwClamp(PW_M * ((1 - WF) * PW_G + s.aFilt * CG_H / WB), 0.2 * PW_M * PW_G, 0.8 * PW_M * PW_G), Fzf = PW_M * PW_G - Fzr;
  const lat = s.aLat / MU_PK, mu = MU_PK * Math.sqrt(Math.max(0.04, 1 - lat * lat));
  const muT = s.slide ? mu * (0.72 + 0.28 * Math.exp(-Math.abs(s.slipV) / 2.5)) : mu;
  const Fb = s.brake * BRAKE_F;
  const capT = muT * Fzr * h;                                       // tyre impulse cap
  const capB = Math.min(Fb * (1 - BIAS_F), 0.95 * mu * Fzr) * RW * h; // rear brake (ABS-limited) angular impulse cap
  const capG = (Math.min(Fb * BIAS_F, mu * Fzf) + PW_M * PW_G * (CRR0 + CRR2 * s.v * s.v)) * h; // front brakes + rolling
  const mT = 1 / (RW * RW / IWR + 1 / MCAR);

  // Sequential friction impulses (accumulated + clamped, Gauss-Seidel).
  let Jb = 0, Jg = 0, Jt = 0;
  for (let it = 0; it < 4; it++) {
    let d = -s.ww * IWR, n = pwClamp(Jb + d, -capB, capB); d = n - Jb; Jb = n; s.ww += d / IWR;
    d = -s.v * MCAR; n = pwClamp(Jg + d, -capG, capG); d = n - Jg; Jg = n; s.v += d / MCAR;
    d = -(s.ww * RW - s.v) * mT; n = pwClamp(Jt + d, -capT, capT); d = n - Jt; Jt = n; s.ww += d * RW / IWR; s.v -= d / MCAR;
  }
  if (s.v < 0) s.v = 0; if (s.ww < 0) s.ww = 0;
  s.slipV = s.ww * RW - s.v; s.slide = Math.abs(s.slipV) > 0.25;
  s.slipping = s.slide || s.cSlip;
  if (!Number.isFinite(s.v + s.ww + s.we + s.tw)) { s.v = s.ww = s.tw = 0; s.we = SIM_IDLE * R2A; }
}

// Driver shift: clutch in + lift → neutral (blip on a downshift) → select →
// feed the clutch back in. ~0.36 s up, ~0.43 s down (× `lazy`). The rpm drop
// to the new ratio happens through the clutch, not by fiat.
function pwShift(s, to, lazy = 1) {
  if (s.sh || to < 1 || to > 6 || to === s.gear) return;
  const down = to < s.gear;
  s.sh = { t: 0, to, down, thr0: s.throttle, T1: (down ? 0.08 : 0.07) * lazy, T2: (down ? 0.17 : 0.09) * lazy, T3: (down ? 0.18 : 0.20) * lazy };
}
function pwServiceShift(s, dt, thrAfter) {
  const sh = s.sh; if (!sh) return false;
  sh.t += dt;
  const t = sh.t, rpm = s.we * A2R;
  if (t < sh.T1) {                                                  // clutch in, lift
    const p = t / sh.T1; s.clutch = 1 - p; s.throttle = sh.down ? 0 : sh.thr0 * Math.max(0, 1 - 2 * p);
  } else if (t < sh.T1 + sh.T2) {                                   // across the gate; synchro grabs halfway
    const p = (t - sh.T1) / sh.T2; s.clutch = 0;
    if (p < 0.5) s.gear = 0; else if (s.gear !== sh.to) { s.gear = sh.to; s.gearDisp = sh.to; s.gearFlash = 0.12; s.tw = 0; }
    s.throttle = sh.down ? pwClamp((s.ww * PW_GR[sh.to] * A2R - 250 - rpm) / 1000, 0, 0.9) : 0;   // heel-toe blip to the new gear's revs
  } else if (t < sh.T1 + sh.T2 + sh.T3) {                           // let the clutch out, roll back on
    const p = (t - sh.T1 - sh.T2) / sh.T3; s.clutch = p * p * (3 - 2 * p); s.throttle = sh.down ? 0 : thrAfter * pwClamp((p - 0.4) / 0.6, 0, 1);
  } else { s.clutch = 1; s.sh = null; return false; }
  return true;
}
// Brake pedal for a target deceleration (m/s²): feed-forward minus drag, plus a touch of feedback.
function pwBrakeFor(s, decel) {
  const resist = CDA_K * s.v * s.v + PW_M * PW_G * CRR0;
  return pwClamp((MCAR * decel - resist) / BRAKE_F + 0.04 * (decel + s.aFilt), 0, 1);
}
const pwRpmIn = (s, g) => s.ww * PW_GR[g] * A2R;                   // crank rpm the wheels would demand in gear g
function pwGearFor(kmh, hi = 6500) { for (let g = 1; g <= 6; g++) if ((kmh / 3.6) / RW * PW_GR[g] * A2R <= hi) return g; return 6; }
// Heel-toe down the box while braking (never below `minG`).
function pwDownshifts(s, below, minG, lazy) {
  if (s.gear > minG && s.we * A2R < below && pwRpmIn(s, s.gear - 1) < 6600) pwShift(s, s.gear - 1, lazy);
}

// Place the car at a speed/gear with everything settled (mode seeds).
function pwPlace(s, kmh, gear) {
  s.v = kmh / 3.6; s.ww = s.v / RW; s.prevV = s.v; s.gear = gear; s.gearDisp = gear; s.tw = 0; s.sh = null;
  s.we = Math.max(SIM_IDLE, gear ? pwRpmIn(s, gear) : SIM_IDLE) * R2A;
  s.clutch = 1; s.throttle = 0; s.thrEff = 0; s.brake = 0; s.fuelCut = false; s.comb = 1; s.slide = false; s.slipV = 0; s.iscI = 0;
  s.ph = 0; s.modeT = 0; s.aLong = 0; s.aFilt = 0; s.aLat = 0; s.tcs = 1; s.tcsOn = true;
}

// Hot-lap circuit (~1.7 km club layout): [length m, radius m (+ right, − left, 0 = straight)].
// Curvature is smoothed into clothoid-ish transitions; the driver follows a
// grip-limited corner speed and a 0.82 g braking envelope built backwards from it.
const TRACK_LAYOUT = [[420, 0], [50, 16], [180, 0], [63, -40], [90, 0], [141, 90], [250, 0], [20, -25], [20, 25], [140, 0], [82, 35], [160, 0], [94, -60]];
const TRK_MU_LAT = 0.98, TRK_DECEL = 8.0;
const TRK_N = TRACK_LAYOUT.reduce((a, [l]) => a + l, 0);
const TRK_K = new Float32Array(TRK_N), TRK_V = new Float32Array(TRK_N);
(function buildTrack() {
  let i = 0; for (const [len, r] of TRACK_LAYOUT) for (let m = 0; m < len; m++) TRK_K[i++] = r ? 1 / r : 0;
  for (let pass = 0; pass < 2; pass++) {                            // ±12 m moving average, twice
    const src = TRK_K.slice();
    for (let j = 0; j < TRK_N; j++) { let a = 0; for (let o = -12; o <= 12; o++) a += src[(j + o + TRK_N) % TRK_N]; TRK_K[j] = a / 25; }
  }
  for (let j = 0; j < TRK_N; j++) TRK_V[j] = Math.min(75, Math.sqrt(TRK_MU_LAT * PW_G / Math.max(1e-4, Math.abs(TRK_K[j]))));
  for (let pass = 0; pass < 2; pass++) for (let j = TRK_N - 1; j >= 0; j--) {
    const nx = TRK_V[(j + 1) % TRK_N]; TRK_V[j] = Math.min(TRK_V[j], Math.sqrt(nx * nx + 2 * TRK_DECEL));
  }
})();

// Initial state when a driving mode is selected.
const SEEDS = {
  PULL: (s) => pwPlace(s, 48, 2),
  ENG_BRAKE: (s) => pwPlace(s, 165, pwGearFor(165)),
  LAUNCH: (s) => { pwPlace(s, 0, 1); s.clutch = 0; s.brake = 0.3; },
  TRACK: (s) => { const k = TRK_V[0] * 3.6; pwPlace(s, k, pwGearFor(k)); s.trackX = 0; },
  LIMITER: (s) => pwPlace(s, 0, 0),
  BURNOUT: (s) => { pwPlace(s, 0, 1); s.clutch = 0; s.brake = 0.6; s.tcsOn = false; },   // TRC off
  IDLE: (s) => pwPlace(s, 0, 0),
};

// Per-mode "driver": only pedals, clutch and gear lever — physics does the rest.
const DRIVERS = {
  // Rolling flat-out pull from 2nd, banging ~7250 upshifts; lift at 160, brake + heel-toe back to 2nd, repeat.
  PULL(s, dt) {
    s.modeT += dt; if (pwServiceShift(s, dt, 1)) return;
    const rpm = s.we * A2R, k = s.v * 3.6; s.clutch = 1;
    if (s.ph === 0) {
      s.brake = 0; s.throttle = 1;
      if (s.gear < 6 && rpm >= SHIFT_RPM) pwShift(s, s.gear + 1);
      else if (k >= 160) s.ph = 1;
    } else {
      s.throttle = 0; s.brake = pwBrakeFor(s, 5.5);
      pwDownshifts(s, 3300, 2, 1);
      if (k <= 48 && s.gear === 2) { s.ph = 0; s.brake = 0; }
    }
  },
  // Lift at 165: pure engine braking + drag for 2.5 s, then trail the brakes and heel-toe
  // down the box; clutch in near walking pace, stop in neutral, loop.
  ENG_BRAKE(s, dt) {
    s.modeT += dt; if (pwServiceShift(s, dt, 0)) return;
    const k = s.v * 3.6; s.throttle = 0;
    if (s.ph === 0) { s.brake = 0; s.clutch = 1; if (s.modeT > 2.5) s.ph = 1; }
    else if (s.ph === 1) {
      s.clutch = 1; s.brake = pwBrakeFor(s, 4.0);
      pwDownshifts(s, 3000, 2, 1.25);
      if (k < 18) { s.ph = 2; s.modeT = 0; }
    } else if (s.ph === 2) {
      s.clutch = Math.max(0, s.clutch - dt / 0.25); if (s.clutch === 0) s.gear = 0;
      s.brake = pwBrakeFor(s, 3.0);
      if (s.v < 0.05 && s.gear === 0) { s.ph = 3; s.modeT = 0; s.clutch = 1; }
    } else { s.brake = 0.2; s.clutch = 1; if (s.modeT > 1.2) SEEDS.ENG_BRAKE(s); }
  },
  // Staged in 1st on the brake, ~5000 rpm; bite the clutch to just under the rears' grip and
  // slip it while the throttle walks the revs down to meet the wheels (~1 s), then flat out
  // (TRC catches any flare), pull to 125 km/h, brake to a stop, restage.
  LAUNCH(s, dt) {
    s.modeT += dt; if (pwServiceShift(s, dt, 1)) return;
    const rpm = s.we * A2R, k = s.v * 3.6;
    if (s.ph === 0) {
      s.gear = 1; s.clutch = 0; s.brake = 0.3;
      s.throttle = pwClamp(0.05 + (5000 - rpm) * 0.0003, 0, 1);
      if (s.modeT > 1.5) { s.ph = 1; s.tLaunch = s.t; s.t100 = 0; }
    } else if (s.ph === 1 || s.ph === 2) {
      s.brake = 0;
      if (s.ph === 1 && !(s.clutch >= 0.45 && !s.cSlip && !s.slide)) {   // slipping: clutch held just under the tyres' limit,
        const target = Math.max(pwRpmIn(s, 1), 5000 - 1800 * (s.t - s.tLaunch));  // throttle walks the revs down to the wheels
        s.clutch = pwClamp(s.clutch + dt * (s.slide ? -2 : 1 / 0.3), 0, 0.55);
        s.throttle = pwClamp(0.6 + (target - rpm) * 0.002, 0.05, 1);
      } else {                                                      // caught: clutch fully out, flat
        s.clutch = Math.min(1, s.clutch + dt * 3); s.throttle = 1;
        if (s.clutch >= 1) s.ph = 2;
      }
      if (!s.t100 && k >= 100) s.t100 = s.t - s.tLaunch;
      if (s.ph === 2 && s.gear < 6 && rpm >= SHIFT_RPM) pwShift(s, s.gear + 1);
      else if (k >= 125) s.ph = 3;
    } else if (s.ph === 3) {
      s.throttle = 0; s.clutch = 1; s.brake = pwBrakeFor(s, 6.5);
      pwDownshifts(s, 3000, 2, 1);
      if (k < 16) { s.ph = 4; s.modeT = 0; }
    } else if (s.ph === 4) {
      s.throttle = 0; s.clutch = Math.max(0, s.clutch - dt / 0.2); if (s.clutch === 0) s.gear = 0;
      s.brake = pwBrakeFor(s, 4.0);
      if (s.v < 0.05 && s.gear === 0 && s.modeT > 1.0) SEEDS.LAUNCH(s);
    }
  },
  // Hot lap: follow the braking envelope / corner-speed profile; heel-toe on the way in,
  // squeeze the throttle as the lateral load comes off, back off if the rears step out.
  TRACK(s, dt) {
    s.modeT += dt;
    s.trackX = (s.trackX + s.v * dt) % TRK_N;
    const i = s.trackX | 0;
    s.aLat = s.v * s.v * TRK_K[i] / PW_G;
    if (pwServiceShift(s, dt, 1)) return;
    const look = (i + Math.round(s.v * 0.35)) % TRK_N;
    const vt = Math.min(TRK_V[i], TRK_V[look]), e = vt - s.v, rpm = s.we * A2R;
    s.clutch = 1;
    if (e < -0.4) {
      s.throttle = 0; s.brake = pwClamp(pwBrakeFor(s, TRK_DECEL) + 0.12 * (-e - 0.4), 0, 1);
      pwDownshifts(s, 3800, 2, 1);
    } else {
      s.brake = 0;
      const exitCap = 0.35 + 0.65 * pwClamp(1 - Math.abs(s.aLat) / TRK_MU_LAT, 0, 1) * 2.2;
      s.throttle = pwClamp(e > 1.5 ? 1 : 0.3 + 0.45 * e, 0, Math.min(1, exitCap)) * (s.slide ? 0.6 : 1);
      if (s.gear < 6 && rpm >= SHIFT_RPM && s.throttle > 0.8) pwShift(s, s.gear + 1);
      else if (s.gear > 2 && rpm < 2300) pwShift(s, s.gear - 1);
    }
  },
  // Neutral: stab it, bounce off the fuel cut for ~1.2 s, lift, rev-hang back down, repeat.
  LIMITER(s, dt) {
    s.modeT += dt; s.gear = 0; s.clutch = 1; s.brake = 0;
    if (s.ph === 0) { s.throttle = 1; if (s.modeT > 1.7) { s.ph = 1; s.modeT = 0; } }
    else { s.throttle = 0; if (s.we * A2R < 1400 && s.modeT > 0.8) { s.ph = 0; s.modeT = 0; } }
  },
  // Brake on, ~5500 rpm, side-step the clutch and stand on it: the rears break loose and
  // spin up to the limiter while the front brakes hold the car to a crawl. Lift, reset, again.
  BURNOUT(s, dt) {
    s.modeT += dt; s.gear = 1;
    const rpm = s.we * A2R;
    if (s.ph === 0) {
      s.clutch = 0; s.brake = 0.6; s.throttle = pwClamp(0.06 + (5500 - rpm) * 0.0003, 0, 1);
      if (s.modeT > 1.0) { s.ph = 1; s.modeT = 0; }
    } else if (s.ph === 1) {
      s.clutch = Math.min(1, s.clutch + dt / 0.12); s.throttle = 1;
      s.brake = pwClamp(0.42 + (s.v - 0.8) * 0.5, 0.2, 0.7);
      if (s.modeT > 6.5) { s.ph = 2; s.modeT = 0; }
    } else {
      s.throttle = 0; s.clutch = Math.max(0, s.clutch - dt / 0.15); s.brake = 0.5;
      if (s.modeT > 1.5) SEEDS.BURNOUT(s);
    }
  },
  // Parked in neutral, foot off everything: ISC hunting + combustion jitter + A/C cycling.
  IDLE(s, dt) { s.gear = 0; s.clutch = 1; s.throttle = 0; s.brake = 0; },
};

// One fixed 120 Hz tick: driver, then the physics sub-steps.
function pwTick(s, mode) {
  s.aLat *= 0.9;                                                    // decays unless TRACK keeps writing it
  (DRIVERS[mode] || DRIVERS.PULL)(s, FIXED);
  if (!s.sh) s.gearDisp = s.gear;                                   // mid-shift the indicator holds until the synchro grabs
  const h = FIXED / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) pwPhysics(s, h);
  const a = (s.v - s.prevV) / FIXED; s.prevV = s.v;
  s.aFilt += (a - s.aFilt) * (1 - Math.exp(-FIXED / 0.08));         // body pitch lag → load transfer
  s.aLong = a / PW_G;
  s.gearFlash = Math.max(0, s.gearFlash - FIXED);
  s.t += FIXED;
}
const dispRpm = (s) => s.we * A2R;                                  // tach: crank speed
const dispKmh = (s) => s.ww * RW * 3.6;                             // speedo: driven-wheel speed

// Instrument dynamics. Needles are stepper-driven spring-mass systems (2nd order,
// slightly under-damped, slew-rate limited, hard pegs at both ends) integrated on
// the same fixed tick; `p` keeps the previous tick for render interpolation.
function pwMakeView() {
  return { tach: { x: 135, v: 0, p: 135 }, spd: { x: 135, v: 0, p: 135 }, thr: { x: 0 }, brk: { x: 0 }, clu: { x: 0 }, gx: { x: 0 }, gy: { x: 0 } };
}
function pwNeedle(n, target, wn, zeta, maxRate, dt) {
  n.p = n.x;
  n.v += (wn * wn * (target - n.x) - 2 * zeta * wn * n.v) * dt;
  if (n.v > maxRate) n.v = maxRate; else if (n.v < -maxRate) n.v = -maxRate;
  n.x += n.v * dt;
  if (n.x < 135) { n.x = 135; if (n.v < 0) n.v = 0; } else if (n.x > 405) { n.x = 405; if (n.v > 0) n.v = 0; }
}
// Exact-exponential damper toward a target (input bars, g-meter dot).
const pwDamp = (n, target, halflife, dt) => { n.x = target + (n.x - target) * Math.exp(-0.6931472 * dt / Math.max(1e-3, halflife)); return n.x; };
const pwSweep = (val, max) => 135 + 270 * pwClamp(val / max, 0, 1);   // == pwGaugeAngle(val / max)
function pwViewStep(vw, s, dt) {
  pwNeedle(vw.tach, pwSweep(dispRpm(s), 9000), 2 * PW_PI * 6.5, 0.72, 800, dt);
  pwNeedle(vw.spd, pwSweep(dispKmh(s), 260), 2 * PW_PI * 3.5, 0.8, 450, dt);
  pwDamp(vw.thr, s.throttle, 0.04, dt); pwDamp(vw.brk, s.brake, 0.04, dt); pwDamp(vw.clu, 1 - s.clutch, 0.04, dt);
  pwDamp(vw.gx, s.aLat, 0.1, dt); pwDamp(vw.gy, s.aLong, 0.1, dt);
}
function pwSettleView(vw, s) {                                      // snap instruments to the sim (static pose)
  vw.tach.x = vw.tach.p = pwSweep(dispRpm(s), 9000); vw.spd.x = vw.spd.p = pwSweep(dispKmh(s), 260); vw.tach.v = vw.spd.v = 0;
  vw.thr.x = s.throttle; vw.brk.x = s.brake; vw.clu.x = 1 - s.clutch; vw.gx.x = s.aLat; vw.gy.x = s.aLong;
}
// </PW-SIM-CORE>

// Run `start` only while `el` is on screen and the tab is visible; `start` returns its own stop().
// Used to park the sim loop / vibe gauges so they cost nothing when nobody can see them.
function pwWhileVisible(el, start) {
  let stop = null, inView = true, shown = !document.hidden, io = null;
  const sync = () => {
    const want = inView && shown;
    if (want && !stop) stop = start() || (() => {});
    else if (!want && stop) { stop(); stop = null; }
  };
  const onVis = () => { shown = !document.hidden; sync(); };
  document.addEventListener('visibilitychange', onVis);
  if (el && typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; sync(); }, { rootMargin: '120px 0px' });
    io.observe(el);
  }
  sync();
  return () => { document.removeEventListener('visibilitychange', onVis); if (io) io.disconnect(); if (stop) stop(); stop = null; };
}

function ClusterControls({ mode, setMode }) {
  const modes = [
    { id: 'PULL',      label: '↑ PULL',      sub: 'redline shifts' },
    { id: 'ENG_BRAKE', label: '↓ ENG-BRAKE', sub: 'rev-match downshift' },
    { id: 'LAUNCH',    label: '⚡ LAUNCH',    sub: 'clutch dump' },
    { id: 'TRACK',     label: '◆ TRACK',     sub: 'hot lap' },
    { id: 'LIMITER',   label: '✕ LIMITER',   sub: 'neutral, blipping' },
    { id: 'BURNOUT',   label: '∿ BURNOUT',   sub: 'stand on it' },
    { id: 'IDLE',      label: '○ IDLE',      sub: 'engine on, parked' },
  ];
  return (
    <div className="pw-sim">
      <div className="pw-sim__label">↳ DRIVING MODE</div>
      <div className="pw-sim__row">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            className={'pw-sim__btn' + (mode === m.id ? ' is-active' : '')}
            onClick={() => setMode(m.id)}
          >
            <span className="pw-sim__btn-label">{m.label}</span>
            <span className="pw-sim__btn-sub">{m.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Sequential shift-light bar above the tach (green → amber → red, strobes on limiter).
const PW_NLED = 10;
function PwShiftLights({ ledsRef }) {
  return (
    <div className="pw-shiftlights" aria-hidden="true">
      {Array.from({ length: PW_NLED }, (_, i) => (
        <i key={i} className="pw-led" ref={(el) => { ledsRef.current[i] = el; }} />
      ))}
    </div>
  );
}

// Longitudinal + lateral g-meter (the dot is moved imperatively).
function PwGMeter({ gBallRef }) {
  const S = 104, c = S / 2, r = 40;
  return (
    <div className="pw-gmeter">
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%">
        <circle cx={c} cy={c} r={r} fill="rgba(127,212,230,0.04)" stroke="rgba(150,200,220,0.22)" strokeWidth="0.8" />
        <circle cx={c} cy={c} r={r * 0.5} fill="none" stroke="rgba(150,200,220,0.14)" strokeWidth="0.6" />
        <line x1={c - r} y1={c} x2={c + r} y2={c} stroke="rgba(150,200,220,0.14)" strokeWidth="0.6" />
        <line x1={c} y1={c - r} x2={c} y2={c + r} stroke="rgba(150,200,220,0.14)" strokeWidth="0.6" />
        <g ref={gBallRef} transform="translate(0 0)">
          <circle cx={c} cy={c} r="4" fill="#ff5a3c" />
          <circle cx={c} cy={c} r="7.5" fill="none" stroke="rgba(255,90,60,0.4)" strokeWidth="0.8" />
        </g>
      </svg>
      <span className="pw-gmeter__label">G · LAT/LON</span>
    </div>
  );
}

// A throttle / brake / clutch input bar (fill scaled imperatively — transform only, no layout).
function PwInputBar({ label, cls, fillRef }) {
  return (
    <div className={'pw-input pw-input--' + cls}>
      <span className="pw-input__lbl">{label}</span>
      <div className="pw-input__track"><div className={'pw-input__fill pw-input__fill--' + cls} ref={fillRef} /></div>
    </div>
  );
}

// Swap a text node's data in place (textContent would replace the node → extra layout work).
function pwSetText(el, txt) { const n = el.firstChild; if (n && n.nodeType === 3) n.data = txt; else el.textContent = txt; }

const pwReducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Decorative "vibe" mini-gauges — slow time-based sines, repainted imperatively at ~15fps
// (no React re-render), parked off screen and frozen under prefers-reduced-motion.
const VIBE_SPECS = [
  { label: 'FOCUS',    color: '#7fd4e6', warn: 0.85, val: (ph) => 78 + 12 * Math.sin(ph * 0.48 + 1.4) },
  { label: 'COFFEE',   color: '#ffc266', warn: 0.2,  val: (ph) => 50 + 30 * Math.sin(ph * 0.36 + 2.0) },
  { label: 'ALT m·10', color: '#ffc266', warn: 0.95, val: (ph) => (1240 + 90 * Math.sin(ph * 0.30 + 3.0)) / 53 },
  { label: 'TOK/S',    color: '#7fd4e6', warn: 0.95, val: (ph) => (900 + 240 * Math.sin(ph * 0.66 + 4.0)) / 12 },
];
function VibeGauges() {
  const host = useRef(null);
  const live = useRef(VIBE_SPECS.map(() => ({})));
  const ph0 = useRef(null);
  if (ph0.current === null) ph0.current = pwReducedMotion() ? 6 : performance.now() / 1000;   // seconds; frozen pose when reduced
  useEffect(() => {
    if (pwReducedMotion()) return;
    const paint = () => {
      const ph = performance.now() / 1000;
      VIBE_SPECS.forEach((sp, i) => window.pwMiniGaugeSet(live.current[i], sp.val(ph), 100, 116, sp.color, sp.warn));
    };
    return pwWhileVisible(host.current, () => { paint(); const id = setInterval(paint, 1000 / 15); return () => clearInterval(id); });
  }, []);
  return (
    <div className="pw-hero__cluster-mini" aria-hidden="true" ref={host}>
      {VIBE_SPECS.map((sp, i) => (
        <window.PWMiniGauge key={sp.label} value={sp.val(ph0.current)} max={100} label={sp.label} size={116} color={sp.color} warn={sp.warn} liveRef={live.current[i]} />
      ))}
    </div>
  );
}

// LIVE instrument cluster — fixed-timestep physics (120 Hz, clamped catch-up) inside one
// rAF loop that only runs while the cluster is on screen and the tab is visible. Needles
// are CSS-rotated compositor layers, bars are scaleX, text is throttled and only written
// on change — so a frame is a handful of property writes, no React, no layout, no repaint
// of the dial faces.
function LiveCluster({ mode }) {
  const sim = useRef(null);
  if (!sim.current) sim.current = makeSim();
  const view = useRef(null);
  if (!view.current) view.current = pwMakeView();
  const modeRef = useRef(mode);

  // DOM refs
  const rowRef = useRef(null);
  const tachNeedle = useRef(null), tachGear = useRef(null);
  const spdNeedle = useRef(null), spdDigit = useRef(null);
  const leds = useRef([]);
  const thrBar = useRef(null), brkBar = useRef(null), cluBar = useRef(null);
  const gBall = useRef(null), slipLamp = useRef(null);
  const shown = useRef({});                                          // last values written to the DOM

  const reduceRef = useRef(null);
  if (reduceRef.current === null) reduceRef.current = pwReducedMotion();

  // Push the current sim/instrument state to the DOM. `alpha` interpolates the needles
  // between physics ticks; `animate` gates the limiter strobe (off for the static pose).
  const paint = (alpha, now, animate) => {
    const s = sim.current, vw = view.current, o = shown.current;
    const rpm = dispRpm(s), kmh = dispKmh(s);
    if (window.__PW_DEBUG) window.__pw = { mode: modeRef.current, rpm, kmh, carKmh: s.v * 3.6, gear: s.gear, clutch: s.clutch, throttle: s.throttle, brake: s.brake, slide: s.slide, cSlip: s.cSlip, fuelCut: s.fuelCut, aLong: s.aLong, aLat: s.aLat, t100: s.t100, tachDeg: vw.tach.x, spdDeg: vw.spd.x };

    // Needles — rotate the needle layers (compositor-only).
    const tA = vw.tach.p + (vw.tach.x - vw.tach.p) * alpha;
    const sA = vw.spd.p + (vw.spd.x - vw.spd.p) * alpha;
    const tS = 'rotate(' + tA.toFixed(2) + 'deg)', sS = 'rotate(' + sA.toFixed(2) + 'deg)';
    if (tS !== o.t && tachNeedle.current) { tachNeedle.current.style.transform = tS; o.t = tS; }
    if (sS !== o.s && spdNeedle.current) { spdNeedle.current.style.transform = sS; o.s = sS; }

    // Digital speed — refreshed at ≤15 Hz like a real cluster readout, and only on change.
    if (!(now - (o.dT || 0) < 66)) {
      o.dT = now;
      const d = Math.max(0, Math.floor(kmh)).toString().padStart(3, '0');
      if (d !== o.d && spdDigit.current) { pwSetText(spdDigit.current, d); o.d = d; }
    }
    // Gear digit (flashes white on a shift).
    const gTxt = s.gearDisp === 0 ? 'N' : String(s.gearDisp), gFill = s.gearFlash > 0 ? '#ffffff' : '#ffc266';
    if (tachGear.current) {
      if (gTxt !== o.g) { pwSetText(tachGear.current, gTxt); o.g = gTxt; }
      if (gFill !== o.gf) { tachGear.current.setAttribute('fill', gFill); o.gf = gFill; }
    }

    // Shift lights. Strobe on the limiter is clamped to ≤2.5 Hz (WCAG 2.3.3) and off in reduced-motion.
    const frac = pwClamp((rpm - 0.6 * SIM_REDLINE) / (SIM_REDLINE - 0.6 * SIM_REDLINE), 0, 1);
    const lit = Math.round(frac * PW_NLED);
    const strobe = animate && s.fuelCut && (Math.floor(now / 200) % 2 === 0);
    for (let i = 0; i < PW_NLED; i++) {
      const el = leds.current[i]; if (!el) continue;
      const on = (animate && s.fuelCut) ? strobe : i < lit;
      const cls = on ? (i < 5 ? 'pw-led on pw-led--g' : i < 8 ? 'pw-led on pw-led--a' : 'pw-led on pw-led--r') : 'pw-led';
      if (el.className !== cls) el.className = cls;
    }

    // Input bars (clutch bar shows pedal travel = 1 − engagement).
    const bar = (el, v, k) => { const t = 'scaleX(' + pwClamp(v, 0, 1).toFixed(3) + ')'; if (el && t !== o[k]) { el.style.transform = t; o[k] = t; } };
    bar(thrBar.current, vw.thr.x, 'bt'); bar(brkBar.current, vw.brk.x, 'bb'); bar(cluBar.current, vw.clu.x, 'bc');

    // g-meter dot (±1.5 g full scale; up = accel, down = brake).
    const gx = pwClamp(vw.gx.x / 1.5, -1, 1), gy = pwClamp(vw.gy.x / 1.5, -1, 1);
    const gT = `translate(${(gx * 32).toFixed(1)} ${(-gy * 32).toFixed(1)})`;
    if (gT !== o.gb && gBall.current) { gBall.current.setAttribute('transform', gT); o.gb = gT; }

    // Wheelspin / clutch-slip telltale.
    const op = s.slipping ? '1' : '0.14';
    if (op !== o.sl && slipLamp.current) { slipLamp.current.style.opacity = op; o.sl = op; }
  };

  // Reseed on mode change. With reduced-motion, settle to a representative pose and freeze.
  useEffect(() => {
    modeRef.current = mode;
    const s = sim.current;
    if (SEEDS[mode]) SEEDS[mode](s);
    if (reduceRef.current) {
      for (let i = 0; i < Math.round(2.2 / FIXED); i++) pwTick(s, mode);
      pwSettleView(view.current, s);
      paint(1, performance.now(), false);
    }
  }, [mode]);

  // The single physics + render loop (skipped entirely for reduced-motion users).
  useEffect(() => {
    if (reduceRef.current) return;
    return pwWhileVisible(rowRef.current, () => {
      let raf = 0, last = -1, acc = 0;
      const frame = (now) => {
        if (last < 0) last = now;
        const dt = Math.min((now - last) / 1000, DT_CLAMP); last = now; acc += dt;
        const s = sim.current, vw = view.current, m = modeRef.current;
        let n = 0;
        while (acc >= FIXED && n < MAX_STEPS) { pwTick(s, m); pwViewStep(vw, s, FIXED); acc -= FIXED; n++; }
        if (n === MAX_STEPS) acc = 0;
        paint(acc / FIXED, now, true);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    });
  }, []);

  return (
    <>
      <PwShiftLights ledsRef={leds} />
      <div className="pw-hero__cluster-row" ref={rowRef} role="img" aria-label="Live Toyota GT86 instrument cluster — tachometer and speedometer driven by a real-time physics simulation">
        <window.PWSpeedo value={0} max={260} size={280} needleRef={spdNeedle} digitRef={spdDigit} />
        <window.PWTach value={SIM_IDLE} max={9000} redline={7400} size={400} gear={1} needleRef={tachNeedle} gearRef={tachGear} />
        <div className="pw-cluster-side">
          <PwGMeter gBallRef={gBall} />
          <div className="pw-inputs">
            <PwInputBar label="THR" cls="thr" fillRef={thrBar} />
            <PwInputBar label="BRK" cls="brk" fillRef={brkBar} />
            <PwInputBar label="CLU" cls="clu" fillRef={cluBar} />
            <div className="pw-slip" ref={slipLamp}><span className="pw-pulse">◉</span>&nbsp;&nbsp;SLIP</div>
          </div>
        </div>
      </div>
      <VibeGauges />
    </>
  );
}

function LiveLogTail() {
  const t = usePwClock();
  return (
    <div className="pw-log__line">
      <span className="pw-log__ts">18:42:1{t % 10}</span>
      <span className="pw-log__tag pw-log__tag--code">[CODE]</span>
      listening · <span className="pw-blink">_</span>
    </div>
  );
}

// -----------------------------------------------------------------
// HERO
// -----------------------------------------------------------------
function PwHero() {
  // ── Driving sim state — lives in the hero so the mode-switcher row
  // (which sits inside Reveal) can drive the LiveCluster. ──
  const [simMode, setSimMode] = useState('PULL');

  const logLines = [
    { ts: '18:42:11', tag: 'CODE', cls: 'pw-log__tag--code', msg: 'commit a3f0c · "TalkToYoutuber: chroma persistence"' },
    { ts: '18:41:47', tag: 'CAR_', cls: 'pw-log__tag--car', msg: 'lap 1:21.2 · kartdrome · personal best' },
    { ts: '18:40:02', tag: 'LET_', cls: 'pw-log__tag--let', msg: '"People don’t wear jackets because it’s cold" → published' },
    { ts: '18:39:14', tag: 'MTN_', cls: 'pw-log__tag--mtn', msg: 'queued: kazbek summit · awaiting visa' },
    { ts: '18:37:55', tag: 'CODE', cls: 'pw-log__tag--code', msg: 'thumbnail-search · ↑ 30k vectors indexed' },
    { ts: '18:35:21', tag: 'LET_', cls: 'pw-log__tag--let', msg: 'monty hall, the only correct explanation — drafting' },
    { ts: '18:33:48', tag: 'CAR_', cls: 'pw-log__tag--car', msg: 'GT 86 · 4,212 km on the clock · all of them grins' },
    { ts: '18:30:09', tag: 'MTN_', cls: 'pw-log__tag--mtn', msg: 'fuji rev. ‘25 · 11 summits logged' },
  ];

  return (
    <section id="top" className="pw-hero">
      <div className="pw-hero__grid">
        {/* LEFT — telemetry digital strip */}
        <div className="pw-hero__rail" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="pw-panel pw-panel--cyan">
            <div className="pw-panel__head"><span>TIME-IN-SEAT</span></div>
            <div style={{ padding: '16px', fontFamily: 'JetBrains Mono, monospace' }}>
              <div style={{ fontSize: 48, color: '#e8eaee', letterSpacing: '-0.03em', lineHeight: 1 }}>28<span style={{ fontSize: 22, color: '#7fd4e6', marginLeft: 2 }}>.4</span><span style={{ fontSize: 14, color: '#6a737d', marginLeft: 8, letterSpacing: '0.14em' }}>YRS</span></div>
              <div style={{ fontSize: 11, color: '#6a737d', letterSpacing: '0.16em', marginTop: 8 }}>BORN 01.12.1997 · DUBAI</div>
            </div>
          </div>

          <div className="pw-panel">
            <div className="pw-panel__head"><span>LOCATION</span></div>
            <div style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.7, color: '#c7cdd4' }}>
              <div>LAT &nbsp; 25.305256°N</div>
              <div style={{ color: '#6a737d', fontSize: 10.5, letterSpacing: '0.04em', marginTop: -2 }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;N 25° 18′ 18.92″</div>
              <div style={{ marginTop: 4 }}>LON &nbsp; 55.379457°E</div>
              <div style={{ color: '#6a737d', fontSize: 10.5, letterSpacing: '0.04em', marginTop: -2 }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;E 55° 22′ 46.04″</div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--pw-line-soft)', color: '#e8eaee' }}>
                Samarqand St, Al Nahda
              </div>
              <div style={{ color: '#9aa3ad' }}>Sharjah · <span style={{ color: '#ffc266' }}>UAE</span></div>
              <div style={{ marginTop: 6, color: '#6a737d', fontSize: 11 }}>TZ &nbsp;&nbsp;UTC+04 · GST</div>
            </div>
          </div>

          <div className="pw-panel">
            <div className="pw-panel__head"><span>PASSPORT</span></div>
            <div style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.8, color: '#c7cdd4' }}>
              {[
                ['OMN', 'Oman'],
                ['JPN', 'Japan'],
                ['TUR', 'Turkey'],
                ['GEO', 'Georgia'],
                ['USA', 'United States'],
                ['SGP', 'Singapore'],
              ].map(([code, name]) => (
                <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
                  <span><span style={{ color: '#7fd4e6' }}>✓</span>&nbsp;&nbsp;{name}</span>
                  <span style={{ color: '#6a737d', fontSize: 10.5, letterSpacing: '0.14em' }}>{code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER — name + intro */}
        <div className="pw-hero__center">
          <div className="pw-hero__kicker">
            <span>↳ Software Engineer</span>
            <span className="line" />
            <span className="pw-flick">[ DUBAI · REMOTE ]</span>
          </div>

          <h1 className="pw-hero__name">
            Fardin<br />Ahsan<em>.</em>
          </h1>

          <a className="pw-hero__role" href="https://energyiq.de" target="_blank" rel="noreferrer">
            <span className="pw-hero__role-dot pw-bolt"><i className="fas fa-bolt" /></span>
            <span>Founding Engineer <span className="pw-hero__role-at">@</span> <strong>EnergyIQ</strong></span>
            <span className="pw-hero__role-arrow">energyiq.de ↗</span>
          </a>

          <p className="pw-hero__lede">
            Self-taught software engineer. Building <strong>EnergyIQ</strong>. Driving my <strong>86</strong>.
            Building software. Trying my best to cook!
          </p>

          <div className="pw-hero__cta">
            <a className="pw-btn pw-btn--filled" href="#open-channel">Contact Me ↻</a>
            <a className="pw-btn pw-btn--amber" href="https://drive.google.com/file/d/1nGedBRvMLPSu1lprjSkhVvi-l9h_rz3Y/view?usp=sharing" target="_blank" rel="noreferrer">Resume ↗</a>
          </div>
        </div>

        {/* RIGHT — portrait */}
        <div className="pw-portrait">
          <div className="pw-portrait__photo">
            <img src="assets/portrait-georgia.jpg" alt="Fardin Ahsan" />
            <div className="pw-id-card__corner pw-id-card__corner--tl" />
            <div className="pw-id-card__corner pw-id-card__corner--tr" />
            <div className="pw-id-card__corner pw-id-card__corner--bl" />
            <div className="pw-id-card__corner pw-id-card__corner--br" />
            <div className="pw-portrait__tag"><span className="pw-pulse">●</span>&nbsp;&nbsp;POSING</div>
          </div>
        </div>

      </div>

      {/* Full-width gauge cluster row — sits below the 2-col hero grid */}
      <Reveal className="pw-hero__cluster">
        <p className="pw-cluster-intro">
          This is a simulation of a stock Gen-1 GT86.
        </p>
        <ClusterControls mode={simMode} setMode={setSimMode} />
        <LiveCluster mode={simMode} />
      </Reveal>
    </section>
  );
}

// -----------------------------------------------------------------
// Ticker
// -----------------------------------------------------------------
function PwTicker() {
  // CSS handles the marquee — no JS clock needed here.
  const channels = [
    ['fab fa-github', 'github.com/FardinAhsan146', 'https://github.com/FardinAhsan146'],
    ['fas fa-newspaper', 'fardinahsan.substack.com', 'https://fardinahsan.substack.com/'],
    ['fab fa-linkedin-in', 'linkedin.com/in/fardin-ahsan', 'https://www.linkedin.com/in/fardin-ahsan/'],
    ['fas fa-envelope', 'fardinahsan146@gmail.com', 'mailto:fardinahsan146@gmail.com'],
    ['fab fa-whatsapp', '+971 50 146 8233', 'https://wa.me/971501468233'],
    ['fab fa-telegram-plane', '@flipperzunderthehood', 'https://t.me/flipperzunderthehood'],
    ['fas fa-calendar-alt', 'book a 30-min call', 'https://calendly.com/fardinahsan146/30min'],
    ['fas fa-file-alt', 'résumé / CV', 'https://drive.google.com/file/d/1nGedBRvMLPSu1lprjSkhVvi-l9h_rz3Y/view?usp=sharing'],
  ];
  return (
    <div className="pw-ticker">
      <div className="pw-ticker__roll">
        <div className="pw-ticker__roll-inner">
          {channels.concat(channels).map(([icon, label, url], i) => (
            <a key={i} className="pw-ticker__link" href={url} target="_blank" rel="noreferrer">
              <i className={icon} />&nbsp;&nbsp;{label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// SECTION HEADER (reused)
// -----------------------------------------------------------------
function PwSectionHead({ idx, title, italic, kicker, meta }) {
  return (
    <Reveal className="pw-section__head">
      <h2 className="pw-section__title">
        {title}<em>{italic}</em>
      </h2>
      <div className="pw-section__meta">{meta}</div>
    </Reveal>
  );
}

// -----------------------------------------------------------------
// BUILD LOG (software / projects)
// -----------------------------------------------------------------
function PwBuildLog() {
  const projects = [
    {
      tag: 'PROJ · 01',
      kicker: 'Foundation models · Semantic search',
      name: 'Talk To Youtuber',
      desc: 'A tool that lets you "talk" with any YouTuber by processing their video content into a conversational AI interface. Downloads all videos from a channel, adds them to a database, and performs semantic search to provide context-aware responses.',
      feats: [
        'Semantic search of video transcripts',
        'Conversational interface powered by GPT',
        'SQLite3 + ChromaDB · portable architecture',
        'No YouTube API credentials required',
      ],
      use: (<>“I made this to talk to <a href="https://www.youtube.com/@japaneat" target="_blank" rel="noreferrer" style={{ color: '#ffc266' }}>japaneat</a> before my trip to Japan. A lot of knowledge isn't searchable by text. It lives in YouTube videos.”</>),
      image: 'assets/talk-to-youtuber.gif',
      stack: 'PY · CHROMA · GPT',
      url: 'https://github.com/FardinAhsan146/TalkToYoutuber',
    },
    {
      tag: 'PROJ · 02',
      kicker: 'CLIP embeddings · Visual search',
      name: 'YouTube Thumbnail Search',
      desc: 'A visual search engine for YouTube thumbnails. Search through thousands of thumbnails using natural-language queries — perfect when you can\'t remember a video title or it\'s in a non-English language.',
      feats: [
        'Pull video IDs + thumbnail URLs from any channel',
        'Embed thumbnails with OpenAI CLIP',
        'Natural-language text → image search',
        'Persistent vector DB for faster repeat queries',
      ],
      use: '“I used it to search a Serbian news channel with 30,000 videos for content related to horses, just by their thumbnails.”',
      image: 'assets/youtube-thumbnail-search.gif',
      stack: 'PY · CLIP · CHROMA',
      url: 'https://github.com/FardinAhsan146/YoutubeThumbnailSearch',
    },
  ];

  return (
    <section id="build-log" className="pw-section">
      <PwSectionHead
        idx="01"
        kicker="SOFTWARE.SYS · build log"
        title="On the "
        italic="computer."
        meta={<><div><a href="https://github.com/FardinAhsan146" target="_blank" rel="noreferrer" style={{ color: '#7fd4e6' }}>github.com/FardinAhsan146 ↗</a></div></>}
      />
      <Reveal as="p" className="pw-section__intro">
        When I have nothing to do, I might just sit down and write software. No promises. I might or
        I might not. Either way, the personal projects below. Even if I weren’t an AI engineer, I’d
        have a soft spot for foundation models and vector databases.
      </Reveal>

      <Reveal stagger className="pw-projects pw-reveal-stagger">
        {projects.map((p) => (
          <article key={p.name} className="pw-project">
            <div className="pw-project__media">
              <img src={p.image} alt={p.name} />
              <div className="pw-project__tag">{p.tag}</div>
            </div>
            <div className="pw-project__body">
              <div className="pw-project__kicker">{p.kicker}</div>
              <h3 className="pw-project__name">{p.name}</h3>
              <p className="pw-project__desc">{p.desc}</p>
              <ul className="pw-project__feats">
                {p.feats.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <div className="pw-project__use">{p.use}</div>
              <div className="pw-project__foot">
                <span style={{ color: '#7fd4e6' }}>{p.stack}</span>
                <a href={p.url} target="_blank" rel="noreferrer" style={{ color: '#7fd4e6' }}>open repo ↗</a>
              </div>
            </div>
          </article>
        ))}
      </Reveal>
    </section>
  );
}

// -----------------------------------------------------------------
// MOTOR
// -----------------------------------------------------------------
function PwMotor() {
  return (
    <section id="motor" className="pw-section">
      <PwSectionHead
        idx="02"
        kicker="MOTOR.LIVE · the favorite toy"
        title="On the "
        italic="track."
        meta={<><div>MAKE · TOYOTA GT 86 ’ 14</div><div style={{ color: '#ffc266' }}>4,212 km · all grins</div></>}
      />

      <Reveal className="pw-motor pw-reveal-stagger" stagger>
        <div className="pw-motor__hero">
          <img src="assets/gt86-garage.jpeg" alt="Fardin's orange Toyota GT 86 on the lift in Dubai" />
          <div className="pw-motor__heroOverlay">
            <div>
              <div className="pw-motor__plate">★ DXB N 13557</div>
              <h3 className="pw-motor__title">The Machi.</h3>
              <p className="pw-motor__sub">
                I've always loved small, light, and nimble cars. Very few cars nowadays scratch that itch, the feeling of how driving felt in a video game. My GT86 is my attempt at that. I am steadily and, I think, thoughtfully <em style={{ color: '#ffc266', fontStyle: 'normal' }}>modding it out</em> to resemble what I think driving should feel like. More than anything, I want to smile every moment I am driving it.
              </p>
            </div>
            <div className="pw-motor__readout">
              <span style={{ gridColumn: '1 / -1', color: '#ffc266', fontSize: 10, letterSpacing: '0.24em', borderBottom: '1px solid rgba(255,194,102,0.35)', paddingBottom: 6, marginBottom: 4 }}>BUILD SHEET · 9 MODS LOGGED</span>
              <span>Suspension</span><span>D2 Racing street coilovers</span>
              <span>Sway bars</span><span>Whiteline front &amp; rear</span>
              <span>Chassis</span><span>Ultra Racing strut bar</span>
              <span>Shifter</span><span>IRP short throw</span>
              <span>Clutch</span><span>Mtech clutch &amp; shifter pedal</span>
              <span>Tyres</span><span>Falken Azenis FK520</span>
              <span>Camber</span><span>−1.5° set</span>
              <span>Ride height</span><span>1″ drop</span>
              <span>Wheels</span><span style={{ color: '#ffc266' }}>staggered setup</span>
            </div>
          </div>
        </div>

        <div className="pw-motor__side">
          <div className="pw-motor__card">
            <img src="assets/kart.jpeg" alt="Karting" />
            <div className="pw-motor__cardLabel">
              CIRCUIT · KARTDROME
              <small>Dubai Kartdrome · every chance I get · best lap 1:21.2</small>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// -----------------------------------------------------------------
// RANGE (mountains marquee)
// -----------------------------------------------------------------
function PwRange() {
  const photos = [
    { src: 'assets/portrait-fuji.jpg', coord: '35.36°N / 138.73°E', loc: 'Mount Fuji', cap: 'You think I wasn\'t going to pose in front of Mount Fuji?' },
    { src: 'assets/portrait-georgia.jpg', coord: '42.66°N / 44.64°E', loc: 'Kazbegi, Georgia', cap: 'I pose in front of a mountain everywhere I go.' },
    { src: 'assets/kazbegi.jpeg', coord: '42.69°N / 44.52°E', loc: 'Mount Kazbek · 5,054 m', cap: 'I\'ll climb Mount Kazbek one day.' },
    { src: 'assets/portrait-hokkaido.jpg', coord: '42.75°N / 141.36°E', loc: 'Lake Shikotsu, Hokkaido', cap: 'I didn\'t pass up the chance here either.' },
  ];

  return (
    <section id="range" className="pw-section">
      <PwSectionHead
        idx="03"
        kicker="RANGE.LOG · 11 summits · ∞ queued"
        title="Chasing mountains "
        italic="everywhere."
        meta={<><div>NEXT WAYPOINT</div><div style={{ color: '#ffc266' }}>KAZBEK · 5,054 m</div></>}
      />
      <Reveal as="p" className="pw-section__intro">
        I happen to pose infront of mountains.
      </Reveal>

      <Reveal className="pw-range__viewport">
        <div className="pw-range__track">
          {photos.concat(photos).map((p, i) => (
            <div key={i} className="pw-range__card">
              <img src={p.src} alt={p.loc} />
              <div className="pw-range__cardOverlay">
                <div className="pw-range__coord">▲ {p.coord}</div>
                <div className="pw-range__cap">{p.cap}</div>
                <div className="pw-range__loc">{p.loc}</div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// -----------------------------------------------------------------
// LETTERS (substack)
// -----------------------------------------------------------------
function PwLetters() {
  const posts = [
    {
      no: '№ 03',
      kind: 'CULTURE',
      title: 'People don\'t wear jackets because it\'s cold, they do because it\'s winter.',
      desc: 'Why seeing Canada Goose in Dubai drives me insane.',
      url: 'https://fardinahsan.substack.com/p/people-dont-wear-jackets-because',
      stamp: '5 min read',
    },
    {
      no: '№ 02',
      kind: 'PROBABILITY',
      title: 'The correct explanation for the Monty Hall problem.',
      desc: 'This is how I understand the Monty Hall Problem. The only correct explanation.',
      url: 'https://fardinahsan.substack.com/p/the-correct-explanation-for-the-monty',
      stamp: '6 min read',
    },
    {
      no: '№ 01',
      kind: 'AI',
      title: 'You know shits about to hit the fan when…',
      desc: "LLMs are beyond amazing and will change us as people — we don\'t talk about it enough.",
      url: 'https://fardinahsan.substack.com/p/you-know-shits-about-to-hit-the-fan',
      stamp: '8 min read',
    },
  ];

  return (
    <section id="letters" className="pw-section">
      <PwSectionHead
        idx="04"
        kicker="LETTERS.OUT · the substack"
        title="On the "
        italic="record."
        meta={<><div><a href="https://fardinahsan.substack.com/" target="_blank" rel="noreferrer" style={{ color: '#7fd4e6' }}>fardinahsan.substack.com ↗</a></div></>}
      />
      <Reveal as="p" className="pw-section__intro">
        Sometimes I write. Even if my ideas aren't crazy or novel, it helps me organize my thoughts.
        I don't get to it nearly as much as I want to.
      </Reveal>

      <Reveal stagger className="pw-letters pw-reveal-stagger">
        {posts.map((p) => (
          <a key={p.no} className="pw-letter" href={p.url} target="_blank" rel="noreferrer">
            <div className="pw-letter__meta">
              <span className="pw-letter__no">{p.no} · {p.kind}</span>
              <span>{p.stamp}</span>
            </div>
            <h4 className="pw-letter__title">{p.title}</h4>
            <p className="pw-letter__desc">{p.desc}</p>
            <div className="pw-letter__foot">
              <span></span>
              <span className="pw-letter__read">read ↗</span>
            </div>
          </a>
        ))}
      </Reveal>
    </section>
  );
}

// -----------------------------------------------------------------
// OPEN CHANNEL (contact)
// -----------------------------------------------------------------
function PwOpenChannel() {
  const channels = [
    ['01', 'Email',     'fas fa-envelope',       'fardinahsan146@gmail.com',   'mailto:fardinahsan146@gmail.com'],
    ['02', 'LinkedIn',  'fab fa-linkedin-in',    'fardin-ahsan',                'https://www.linkedin.com/in/fardin-ahsan/'],
    ['03', 'GitHub',    'fab fa-github',         'FardinAhsan146',              'https://github.com/FardinAhsan146'],
    ['04', 'Substack',  'fas fa-newspaper',      'fardinahsan.substack',        'https://fardinahsan.substack.com/'],
    ['05', 'Calendly',  'fas fa-calendar-alt',   'free 30-min call',            'https://calendly.com/fardinahsan146/30min'],
    ['06', 'WhatsApp',  'fab fa-whatsapp',       '+971 50 146 8233',            'https://wa.me/971501468233'],
    ['07', 'Telegram',  'fab fa-telegram-plane', '@flipperzunderthehood',       'https://t.me/flipperzunderthehood'],
    ['08', 'Resume',    'fas fa-file-alt',       'view PDF ↗',                  'https://drive.google.com/file/d/1nGedBRvMLPSu1lprjSkhVvi-l9h_rz3Y/view?usp=sharing'],
  ];

  return (
    <section id="open-channel" className="pw-section">
      <PwSectionHead
        idx="05"
        kicker="HAIL.OPEN · ready to transmit"
        title="Let’s "
        italic="talk!"
        meta={null}
      />

      <Reveal className="pw-contact">
        <div className="pw-contact__hailing">
          <h3 className="pw-contact__big">
            Talk to me about anything! Want to work on something?<br /> Want to <em>discuss an idea?</em><br /> Want to brainstorm something?
          </h3>
          <p className="pw-contact__body">
            Replies usually within minutes. Often from the driver’s seat of a parked GT 86.
          </p>

          <div className="pw-avail">
            <div className="pw-avail__head">
              <span className="pw-avail__src">GST · base</span>
            </div>
            <div className="pw-avail__grid">
              <div className="pw-avail__col">
                <div className="pw-avail__when">WORKING DAYS <span style={{ color: 'var(--pw-fg-dimmer)' }}>(Mon–Fri)</span></div>
                <div className="pw-avail__rows">
                  <div className="pw-avail__row"><span>GST</span><span>18:00 – 00:00</span></div>
                  <div className="pw-avail__row"><span>GMT · UTC</span><span>14:00 – 20:00</span></div>
                  <div className="pw-avail__row"><span>EST</span><span>09:00 – 15:00</span></div>
                  <div className="pw-avail__row"><span>PST</span><span>06:00 – 12:00</span></div>
                  <div className="pw-avail__row"><span>Tokyo</span><span>23:00 – 05:00<sup>+1</sup></span></div>
                </div>
              </div>
              <div className="pw-avail__col">
                <div className="pw-avail__when">WEEKENDS <span style={{ color: 'var(--pw-fg-dimmer)' }}>(Sat–Sun)</span></div>
                <div className="pw-avail__rows">
                  <div className="pw-avail__row"><span>GST</span><span>12:00 – 18:00</span></div>
                  <div className="pw-avail__row"><span>GMT · UTC</span><span>08:00 – 14:00</span></div>
                  <div className="pw-avail__row"><span>EST</span><span>03:00 – 09:00</span></div>
                  <div className="pw-avail__row"><span>PST</span><span>00:00 – 06:00</span></div>
                  <div className="pw-avail__row"><span>Tokyo</span><span>17:00 – 23:00</span></div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <a className="pw-btn pw-btn--filled" href="mailto:fardinahsan146@gmail.com">DROP AN EMAIL ↗</a>
            <a className="pw-btn pw-btn--amber" href="https://calendly.com/fardinahsan146/30min" target="_blank" rel="noreferrer">book 30 min ↗</a>
          </div>
        </div>

        <div className="pw-contact__list">
          {channels.map(([no, name, icon, target, url]) => (
            <a key={no} className="pw-contact__row" href={url} target="_blank" rel="noreferrer">
              <span className="pw-ch-icon"><i className={icon} /></span>
              <span className="pw-ch-name">{name}</span>
              <span className="pw-ch-target">{target}</span>
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// -----------------------------------------------------------------
// FOOT
// -----------------------------------------------------------------
function PwFoot() {
  return (
    <footer className="pw-foot">
      <div className="pw-foot__center">© Fardin Ahsan</div>
    </footer>
  );
}

// -----------------------------------------------------------------
// APP
// -----------------------------------------------------------------
function PwApp() {
  return (
    <div className="pw-app">
      <PwNav />
      <PwHero />
      <PwBuildLog />
      <PwMotor />
      <PwRange />
      <PwLetters />
      <PwOpenChannel />
      <PwFoot />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PwApp />);
