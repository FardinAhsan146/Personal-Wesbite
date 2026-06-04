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

// Live Dubai (GST · UTC+4) clock for the nav.
function DxbClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const t = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'Asia/Dubai',
  }).format(now);
  return <>{t} GST</>;
}

// -----------------------------------------------------------------
// LIVE bits — components that subscribe to the rAF clock. Isolated so the
// containing sections don't re-render every frame, which would restart the
// scroll-reveal CSS transitions.
// -----------------------------------------------------------------

// ─── GT86 driveline physics — real-time longitudinal model ───────────────
// Replaces the old keyframe sim with a force-integrated model. Engine RPM is
// SLAVED to wheel speed through the gearing whenever the clutch is locked, so
// the tach and speedo are physically incapable of drifting apart. Driver
// "controllers" emit only pedal/gear inputs; step() integrates F = ma. Real
// FA20/ZN6 numbers (verified): 0-100 ~7-8.5 s, top ~218 km/h (aero-limited in
// overdrive 6th), per-gear redline tops 57/95/134/171/207 km/h.
const PW_PI = Math.PI, A2R = 60 / (2 * PW_PI), R2A = 1 / A2R;       // rad/s <-> rpm
const SIM_RATIOS  = [3.626, 2.188, 1.541, 1.213, 1.000, 0.767];    // ZN6 6MT gears
const SIM_FINAL   = 4.10;                                          // final drive (pre-facelift)
const SIM_TYRE_C  = 1.91;                                          // 215/45R17 effective loaded circ, m
const RW = SIM_TYRE_C / (2 * PW_PI);                               // rolling radius ≈ 0.304 m
const SIM_REDLINE = 7400, FUELCUT = 7450, HYST = 200, SIM_IDLE = 820, STALL = 420;
const PW_M = 1250, PW_EFF = 0.88, RHO = 1.225, PW_CD = 0.27, PW_AREA = 1.97;
const CDRAG = 0.5 * RHO * PW_CD * PW_AREA, CRR = 0.012, PW_G = 9.81;
const IE = 0.115, IW = 1.05;                                       // engine / wheel rotational inertia, kg·m²
const B0 = 12, B1 = 0.025, B2 = 0.00006;                          // FA20 motoring friction (on rad/s)
const MU = 1.25, MU_BURN = 0.42, REAR_LAUNCH = 0.74, REAR_ROLL = 0.50;
const BRAKE_MAX = 11000, CLUTCH_CAP = 360;
const FIXED = 1 / 120, DT_CLAMP = 0.05;                            // physics timestep / max frame dt
const pwClamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// FA20 torque curve (Nm) — note the famous D-4S mid-range dip at ~4000 rpm.
const TQ_PAIRS = [[1000, 130], [2000, 178], [3000, 192], [3500, 182], [4000, 172], [4500, 182], [5000, 195], [6000, 202], [6400, 205], [7000, 200], [7400, 188]];
const TQ250 = new Float32Array(31);                               // resampled 0..7500 rpm @ 250 for O(1) lookup
for (let i = 0; i <= 30; i++) {
  const rpm = i * 250; let v;
  if (rpm <= TQ_PAIRS[0][0]) v = TQ_PAIRS[0][1] * Math.max(0.35, rpm / TQ_PAIRS[0][0]);
  else if (rpm >= TQ_PAIRS[TQ_PAIRS.length - 1][0]) v = TQ_PAIRS[TQ_PAIRS.length - 1][1];
  else for (let k = 1; k < TQ_PAIRS.length; k++) {
    if (rpm <= TQ_PAIRS[k][0]) { const [r0, t0] = TQ_PAIRS[k - 1], [r1, t1] = TQ_PAIRS[k]; v = t0 + (t1 - t0) * (rpm - r0) / (r1 - r0); break; }
  }
  TQ250[i] = v;
}
function torqueAt(rpm) { if (rpm <= 0) return TQ250[0]; const f = (rpm / 250) | 0; if (f >= 30) return TQ250[30]; const a = (rpm - f * 250) / 250; return TQ250[f] + (TQ250[f + 1] - TQ250[f]) * a; }

const ovr = (g) => (g >= 1 ? SIM_RATIOS[g - 1] * SIM_FINAL : 0);   // overall ratio (0 = neutral)
const rpmFromV = (v, g) => Math.abs(v) / RW * ovr(g) * A2R;        // THE LOCK INVARIANT (wheel speed → engine rpm)
const gearRpm = (kmh, g) => rpmFromV(kmh / 3.6, g);
const meff = (g) => PW_M + (IE * ovr(g) * ovr(g) + IW) / (RW * RW); // effective mass incl. rotating inertia
const pwRamp = (v) => pwClamp(v / 0.3, -1, 1);                      // smooth sign near v=0
const along = (t, pts) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) { if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * ((t - t0) / (t1 - t0)); } } return pts[pts.length - 1][1]; };
const gearFor = (kmh) => { for (let g = 1; g <= 6; g++) if (gearRpm(kmh, g) <= SIM_REDLINE) return g; return 6; };
const TRACK_PTS = [[0, 52], [5.5, 138], [8, 70], [10.5, 112], [15, 158], [17.5, 76], [20, 52]];        // hot-lap speed profile, km/h
const LAT_PTS = [[0, 0], [2, 0.35], [5.2, 0.1], [8, -1.05], [9.6, -0.5], [10.6, 0.25], [13.5, 0.95], [16.5, 0.2], [17.6, -1.0], [19, -0.35], [20, 0]]; // lateral g through the lap

// Exact-exponential damper toward a target — unconditionally stable analog needle feel.
const pwDamp = (n, target, halflife, dt) => { n.x = target + (n.x - target) * Math.exp(-0.6931472 * dt / Math.max(1e-3, halflife)); return n.x; };

function makeSim() { return { v: 0, we: SIM_IDLE * R2A, gear: 1, clutch: 1, wheelspin: false, wheelW: 0, fuelCut: false, throttle: 0, brake: 0, shiftT: 0, blipTo: 0, toGear: 0, gearFlash: 0, slipping: false, launchHold: 0, _launched: false, _coast: false, aLong: 0, aLat: 0, prevV: 0, modeT: 0 }; }

// One physics sub-step (semi-implicit Euler): clutch state machine OPEN / SLIP / WHEELSPIN / LOCKED.
function integrate(s, h) {
  let rpm = (s.gear > 0 && s.clutch >= 0.999 && !s.wheelspin) ? Math.max(SIM_IDLE, rpmFromV(s.v, s.gear)) : s.we * A2R;
  if (rpm >= FUELCUT) s.fuelCut = true; if (rpm <= SIM_REDLINE - HYST) s.fuelCut = false;
  let effThr = s.throttle;
  if (s.gear === 0 || s.clutch < 0.5) { const idleThr = pwClamp(0.0032 * (SIM_IDLE - rpm), 0, 0.45); effThr = Math.max(s.throttle, idleThr); }
  const Tcomb = s.fuelCut ? 0 : effThr * torqueAt(Math.min(rpm, FUELCUT));
  const Tfric = B0 + B1 * s.we + B2 * s.we * s.we;
  const Tnet = Tcomb - Tfric;
  const Faero = -CDRAG * s.v * Math.abs(s.v), Froll = -CRR * PW_M * PW_G * pwRamp(s.v), Fbrk = (s.v > 0.05 ? -s.brake * BRAKE_MAX : 0);
  const w_in = rpmFromV(s.v, s.gear) / A2R;                        // driveline rad/s referred to engine
  const cap = MU * PW_M * PW_G * ((s.gear <= 2 && s.v * 3.6 < 40) ? REAR_LAUNCH : REAR_ROLL);
  s.slipping = false;
  if (s.gear === 0 || s.clutch < 0.02) {                           // OPEN — engine free, wheels coast
    s.we += Tnet / IE * h; s.we = Math.max(STALL * R2A, s.we);
    s.v += (Faero + Froll + Fbrk) / (PW_M + IW / (RW * RW)) * h; s.wheelspin = false; s.slipping = true;
  } else if (s.clutch < 0.999) {                                   // CLUTCH SLIP — launch / shift
    s.slipping = true;
    if (s.launchHold > 0) {                                        // feathered launch: hold revs in powerband, lock when wheels catch up
      s.we = s.launchHold * R2A;
      const Ft = pwClamp(torqueAt(s.launchHold) * ovr(s.gear) * PW_EFF / RW, 0, cap);
      s.v += (Ft + Faero + Froll + Fbrk) / meff(s.gear) * h;
      if (rpmFromV(s.v, s.gear) >= s.launchHold - 40) { s.clutch = 1; s.launchHold = 0; s.wheelspin = false; s.we = Math.max(SIM_IDLE * R2A, rpmFromV(s.v, s.gear) * R2A); }
    } else {
      const Tclutch = CLUTCH_CAP * s.clutch * Math.sign(s.we - w_in || 1);
      s.we += (Tnet - Tclutch) / IE * h; s.we = Math.max(STALL * R2A, s.we);
      const Ft = pwClamp(Tclutch * ovr(s.gear) * PW_EFF / RW, -cap, cap);
      s.v += (Ft + Faero + Froll + Fbrk) / meff(s.gear) * h;
    }
  } else if (s.wheelspin) {                                        // WHEELSPIN / BURNOUT — clutch locked, tyres sliding
    s.slipping = true;
    const capB = MU_BURN * PW_M * PW_G * REAR_ROLL;
    const Ispin = IE + IW / (ovr(s.gear) * ovr(s.gear));
    const groundReac = capB * RW / (ovr(s.gear) * PW_EFF);
    s.we += (Tnet - groundReac) / Ispin * h; s.we = Math.max(STALL * R2A, s.we);
    s.wheelW = s.we / ovr(s.gear);
    s.v += (capB + Faero + Froll + Fbrk) / PW_M * h; if (s.v < 0) s.v = 0;
    if (s.wheelW * RW <= s.v + 0.5) { s.wheelspin = false; s.we = Math.max(SIM_IDLE * R2A, rpmFromV(s.v, s.gear) * R2A); }
  } else {                                                         // LOCKED — one rigid body, engine SLAVED to v
    const Fd = Tnet * ovr(s.gear) * PW_EFF / RW, Ft = pwClamp(Fd, -cap, cap);
    if (Fd > cap + 50 && s.throttle > 0.5) { s.wheelspin = true; s.wheelW = s.v / RW; }
    s.v += (Ft + Faero + Froll + Fbrk) / meff(s.gear) * h;
    s.we = Math.max(SIM_IDLE * R2A, rpmFromV(s.v, s.gear) * R2A);  // <<< tach can't desync from speedo
  }
  if (s.v < 0) s.v = 0;
  if (!Number.isFinite(s.v)) s.v = 0; if (!Number.isFinite(s.we)) s.we = SIM_IDLE * R2A;
  s.we = pwClamp(s.we, STALL * R2A, (FUELCUT + 200) * R2A); s.v = pwClamp(s.v, 0, 330 / 3.6);
}
// Advance one frame: sub-step 4× when slipping / on the limiter for stiff-term stability.
function pwStep(s, dt) {
  const N = (s.slipping || s.fuelCut) ? 4 : 1, h = dt / N;
  for (let i = 0; i < N; i++) integrate(s, h);
  s.aLong = (s.v - s.prevV) / dt / PW_G; s.prevV = s.v;
  s.aLat *= 0.86;                                                  // decays unless a controller (TRACK) keeps writing it
  s.gearFlash = Math.max(0, s.gearFlash - dt);
  if (s.shiftT > 0) s.shiftT = Math.max(0, s.shiftT - dt);
}
// Value shown on the tach: slaved rpm when locked, free engine speed otherwise.
function dispRpm(s) { return (s.gear > 0 && s.clutch >= 0.999 && !s.wheelspin) ? Math.max(SIM_IDLE, rpmFromV(s.v, s.gear)) : s.we * A2R; }

// Shift state machine — controllers request, serviceShift carries it out (clutch out, swap, blip).
function requestUpshift(s) { if (s.gear < 6 && s.shiftT <= 0) { s.clutch = 0; s.shiftT = 0.10; s.toGear = s.gear + 1; s.blipTo = 0; } }
function requestDownshift(s, kmh) { if (s.gear > 1 && s.shiftT <= 0) { s.clutch = 0; s.shiftT = 0.20; s.toGear = s.gear - 1; s.blipTo = gearRpm(kmh, s.gear - 1); } }
function serviceShift(s, dt) { if (s.shiftT > 0) { s.throttle = s.blipTo ? 0.85 : 0; if (s.shiftT <= dt + 1e-9) { s.gear = s.toGear; s.clutch = 1; s.gearFlash = 0.12; s.we = Math.max(SIM_IDLE * R2A, rpmFromV(s.v, s.gear) * R2A); s.blipTo = 0; } return true; } return false; }

// Initial state when a driving mode is selected.
const SEEDS = {
  PULL: (s) => { s.v = 40 / 3.6; s.gear = 2; s.clutch = 1; s.wheelspin = false; s._coast = false; s.we = rpmFromV(s.v, s.gear) * R2A; },
  ENG_BRAKE: (s) => { s.v = 165 / 3.6; s.gear = gearFor(165); s.clutch = 1; s.wheelspin = false; s.modeT = 0; s.we = rpmFromV(s.v, s.gear) * R2A; },
  LAUNCH: (s) => { s.v = 0; s.gear = 1; s.clutch = 0; s.wheelspin = false; s.launchHold = 0; s._launched = false; s.we = SIM_IDLE * R2A; s.modeT = 0; },
  TRACK: (s) => { s.v = 55 / 3.6; s.gear = gearFor(55); s.clutch = 1; s.wheelspin = false; s.modeT = 0; s.we = rpmFromV(s.v, s.gear) * R2A; },
  LIMITER: (s) => { s.v = 0; s.gear = 0; s.clutch = 0; s.we = SIM_IDLE * R2A; s.modeT = 0; },
  BURNOUT: (s) => { s.v = 0; s.gear = 1; s.clutch = 1; s.wheelspin = true; s.wheelW = 0; s.we = 4200 * R2A; },
  IDLE: (s) => { s.v = 0; s.gear = 0; s.clutch = 0; s.we = SIM_IDLE * R2A; },
};

// Per-mode "driver": sets throttle/brake/clutch/gear requests only — physics does the rest.
const DRIVERS = {
  // Rolling full-throttle pull, banging redline upshifts; lift/coast and repeat.
  PULL(s, dt) {
    if (serviceShift(s, dt)) return; s.clutch = 1; if (s.gear === 0) s.gear = 2;
    if (s._coast) { s.throttle = 0; s.brake = 0.05; if (s.v * 3.6 <= 58) { s._coast = false; s.gear = 2; } }
    else { s.throttle = 1; s.brake = 0; if (dispRpm(s) >= SIM_REDLINE - 25 && s.gear < 6) requestUpshift(s); if (s.v * 3.6 > 150 || s.gear >= 5) s._coast = true; }
  },
  // Lift off at speed; firm trail-brake while engine-braking and rev-matched downshifts walk it down to a stop, then loop.
  ENG_BRAKE(s, dt) {
    s.modeT += dt; if (serviceShift(s, dt)) return; s.throttle = 0; s.clutch = 1;
    const k = s.v * 3.6; s.brake = k > 22 ? 0.19 : 0.08;
    if (dispRpm(s) < 3200 && s.gear > 1) requestDownshift(s, k);
    if (k < 7) SEEDS.ENG_BRAKE(s);
  },
  // Stage on the line ~5000 rpm (clutch in), feather it out (engine held in the band), then a clean pull.
  LAUNCH(s, dt) {
    s.modeT += dt; s.brake = 0;
    if (s.modeT < 1.3) { s.gear = 1; s.clutch = 0; s.launchHold = 0; s._launched = false; s.throttle = s.we * A2R < 5000 ? 0.92 : 0.08; return; }
    if (!s._launched) { s.gear = 1; s.throttle = 1; if (s.launchHold === 0 && s.clutch >= 0.999) { s._launched = true; } else { s.clutch = 0.5; s.launchHold = 5000; return; } }
    DRIVERS.PULL(s, dt); if (s.modeT > 22) { SEEDS.LAUNCH(s); s._launched = false; s._coast = false; }
  },
  // Hot lap: chase a speed profile with throttle/brake; gears + lateral g follow.
  TRACK(s, dt) {
    s.modeT = (s.modeT + dt) % 20; if (serviceShift(s, dt)) { s.aLat = along(s.modeT, LAT_PTS); return; } s.clutch = 1;
    const vt = Math.max(0, along(s.modeT, TRACK_PTS)) / 3.6, e = vt - s.v;
    if (e > 0.5) { s.throttle = pwClamp(0.8 * e, 0, 1); s.brake = 0; } else if (e < -0.5) { s.throttle = 0; s.brake = pwClamp(-0.45 * e, 0, 1); } else { s.throttle = 0.25; s.brake = 0; }
    const k = s.v * 3.6;
    if (s.gear < 6 && dispRpm(s) >= SIM_REDLINE - 60 && e > 0.5) requestUpshift(s);
    else if (s.gear > 1 && dispRpm(s) < 2600) requestDownshift(s, k);
    s.aLat = along(s.modeT, LAT_PTS);
  },
  // Neutral: stab the throttle, bounce off the limiter, fall back to idle, repeat.
  LIMITER(s, dt) {
    s.modeT += dt; s.gear = 0; s.clutch = 0; s.v = 0; s.brake = 0;
    if (s.fuelCut || s.modeT > 1.6) { s.throttle = 0; if (dispRpm(s) < 1300) s.modeT = 0; } else s.throttle = 1;
  },
  // Stationary burnout: clutch locked, tyres broken loose — engine pinned at the limiter while the car barely creeps.
  BURNOUT(s, dt) { s.gear = 1; s.clutch = 1; s.brake = 0.26; s.throttle = 1; if (!s.wheelspin) { s.wheelspin = true; s.wheelW = s.v / RW; } },
  // Parked, engine idling.
  IDLE(s, dt) { s.gear = 0; s.clutch = 0; s.throttle = 0; s.brake = 0; },
};

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

// A throttle / brake / clutch input bar (fill width set imperatively).
function PwInputBar({ label, cls, fillRef }) {
  return (
    <div className={'pw-input pw-input--' + cls}>
      <span className="pw-input__lbl">{label}</span>
      <div className="pw-input__track"><div className={'pw-input__fill pw-input__fill--' + cls} ref={fillRef} /></div>
    </div>
  );
}

// Low-rate repaint clock (re-renders ~`fps` times/sec; paused = render once). Used for
// the decorative vibe gauges so they don't churn React at 60fps like the old code did.
function useSlowClock(fps, paused) {
  const [, setT] = useState(0);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setT((v) => v + 1), 1000 / fps);
    return () => clearInterval(id);
  }, [fps, paused]);
}

// Decorative "vibe" mini-gauges — slow time-based sines, throttled to ~15fps and frozen
// under prefers-reduced-motion. Purely ornamental (aria-hidden), isolated from the sim loop.
function VibeGauges({ active = true }) {
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Pause the 15fps repaint when reduced-motion is set OR the cluster is off-screen.
  useSlowClock(15, reduce || !active);
  const ph = reduce ? 6 : performance.now() / 1000;              // seconds; frozen pose when reduced
  const wave = (f, a, off = 0) => a * Math.sin(ph * f + off);
  const focus = 78 + wave(0.48, 12, 1.4);
  const coffee = 50 + wave(0.36, 30, 2.0);
  const altitude = 1240 + wave(0.30, 90, 3.0);
  const tokensPerSec = 900 + wave(0.66, 240, 4.0);
  return (
    <div className="pw-hero__cluster-mini" aria-hidden="true">
      <window.PWMiniGauge value={focus} max={100} label="FOCUS" size={116} color="#7fd4e6" />
      <window.PWMiniGauge value={coffee} max={100} label="COFFEE" size={116} color="#ffc266" warn={0.2} />
      <window.PWMiniGauge value={altitude / 53} max={100} label="ALT m·10" size={116} color="#ffc266" warn={0.95} />
      <window.PWMiniGauge value={tokensPerSec / 12} max={100} label="TOK/S" size={116} color="#7fd4e6" warn={0.95} />
    </div>
  );
}

// LIVE instrument cluster — runs the physics on a fixed-timestep accumulator inside one
// rAF loop and writes the needles / LEDs / bars / digits to the DOM imperatively, so the
// hero never re-renders per frame and the two needles share a single source of truth.
function LiveCluster({ mode }) {
  const sim = useRef(null);
  if (!sim.current) sim.current = makeSim();
  const modeRef = useRef(mode);

  // damper sub-states (analog needle/bar feel)
  const tachN = useRef({ x: SIM_IDLE }), spdN = useRef({ x: 0 });
  const dThr = useRef({ x: 0 }), dBrk = useRef({ x: 0 }), dClu = useRef({ x: 0 });
  const dLat = useRef({ x: 0 }), dLon = useRef({ x: 0 });

  // DOM refs
  const tachNeedle = useRef(null), tachGear = useRef(null);
  const spdNeedle = useRef(null), spdDigit = useRef(null);
  const leds = useRef([]);
  const thrBar = useRef(null), brkBar = useRef(null), cluBar = useRef(null);
  const gBall = useRef(null), slipLamp = useRef(null);
  const rowRef = useRef(null);

  // On-screen gate — the physics loop and the vibe gauges only do work while the
  // cluster is actually in view. Scrolling past it on a phone otherwise keeps a
  // 60fps physics + SVG-write loop running and contends with scroll. `visible`
  // (state) pauses the decorative VibeGauges; `visibleRef` is read inside the rAF
  // closure without forcing a per-frame re-render.
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);

  const CXT = 200, CYT = 200;   // tach size 400 → centre 200
  const CXS = 140, CYS = 140;   // speedo size 280 → centre 140
  const A = window.pwGaugeAngle;
  const reduceRef = useRef(null);
  if (reduceRef.current === null) reduceRef.current = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Push the current sim state to the DOM imperatively. `animate` gates the bits
  // that only make sense while running (limiter strobe + needle jitter); when it's
  // false (reduced-motion snapshot) the cluster paints a calm static pose.
  const paint = (s, dt, now, animate) => {
    const rpm = dispRpm(s), kmh = s.v * 3.6;
    if (window.__PW_DEBUG) window.__pw = { mode: modeRef.current, rpm, kmh, gear: s.gear, clutch: s.clutch, wheelspin: s.wheelspin, slipping: s.slipping, fuelCut: s.fuelCut, lockErr: (s.gear > 0 && s.clutch >= 0.999 && !s.wheelspin && s.v > 2) ? Math.abs(rpm - rpmFromV(s.v, s.gear)) : 0 };

    // Needles — asymmetric tach damping (fast rise, slow fall = flat-four rev-hang) + limiter jitter.
    const tgt = (animate && s.fuelCut) ? rpm - Math.random() * 220 : rpm;
    const hl = tgt > tachN.current.x ? 0.045 : 0.5;
    const tA = A(pwClamp(pwDamp(tachN.current, tgt, hl, dt) / 9000, 0, 1));
    const sA = A(pwClamp(pwDamp(spdN.current, kmh, 0.12, dt) / 260, 0, 1));
    if (tachNeedle.current) tachNeedle.current.setAttribute('transform', `rotate(${tA.toFixed(2)} ${CXT} ${CYT})`);
    if (spdNeedle.current) spdNeedle.current.setAttribute('transform', `rotate(${sA.toFixed(2)} ${CXS} ${CYS})`);

    // Digital readouts + gear (flash white on a shift).
    if (spdDigit.current) spdDigit.current.textContent = Math.max(0, Math.floor(kmh)).toString().padStart(3, '0');
    if (tachGear.current) { tachGear.current.textContent = s.gear === 0 ? 'N' : String(s.gear); tachGear.current.setAttribute('fill', s.gearFlash > 0 ? '#ffffff' : '#ffc266'); }

    // Shift lights. Strobe on the limiter is clamped to ≤2.5 Hz (WCAG 2.3.3) and off in reduced-motion.
    const frac = pwClamp((rpm - 0.6 * SIM_REDLINE) / (SIM_REDLINE - 0.6 * SIM_REDLINE), 0, 1);
    const lit = Math.round(frac * PW_NLED);
    const strobe = animate && s.fuelCut && (Math.floor(now / 200) % 2 === 0);
    for (let i = 0; i < PW_NLED; i++) {
      const el = leds.current[i]; if (!el) continue;
      const on = (animate && s.fuelCut) ? strobe : i < lit;
      const tone = i < 5 ? 'g' : i < 8 ? 'a' : 'r';
      const cls = 'pw-led' + (on ? ' on pw-led--' + tone : '');
      if (el.className !== cls) el.className = cls;
    }

    // Input bars (clutch bar shows pedal travel = 1 − engagement).
    const setBar = (el, ref, val) => { if (el) el.style.width = (pwDamp(ref, val, 0.04, dt) * 100).toFixed(1) + '%'; };
    setBar(thrBar.current, dThr.current, s.throttle);
    setBar(brkBar.current, dBrk.current, s.brake);
    setBar(cluBar.current, dClu.current, 1 - s.clutch);

    // g-meter dot (±1.5 g full scale; up = accel, down = brake).
    const gx = pwClamp(pwDamp(dLat.current, s.aLat, 0.1, dt) / 1.5, -1, 1);
    const gy = pwClamp(pwDamp(dLon.current, s.aLong, 0.1, dt) / 1.5, -1, 1);
    if (gBall.current) gBall.current.setAttribute('transform', `translate(${(gx * 32).toFixed(1)} ${(-gy * 32).toFixed(1)})`);

    // Wheelspin / clutch-slip telltale.
    if (slipLamp.current) slipLamp.current.style.opacity = s.slipping ? '1' : '0.14';
  };

  // Reseed on mode change. With reduced-motion, settle to a representative pose and freeze.
  useEffect(() => {
    modeRef.current = mode;
    const s = sim.current;
    if (SEEDS[mode]) SEEDS[mode](s);
    if (reduceRef.current) {
      const ctrl = DRIVERS[mode] || DRIVERS.PULL;
      for (let i = 0; i < Math.round(2.2 / FIXED); i++) { ctrl(s, FIXED); pwStep(s, FIXED); }
      tachN.current.x = dispRpm(s); spdN.current.x = s.v * 3.6;
      dThr.current.x = s.throttle; dBrk.current.x = s.brake; dClu.current.x = 1 - s.clutch;
      dLat.current.x = s.aLat; dLon.current.x = s.aLong;
      paint(s, 0.001, performance.now(), false);
    }
  }, [mode]);

  // Track whether the cluster is on-screen. rootMargin pre-arms it just before
  // it scrolls into view so the needles aren't frozen on arrival.
  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const on = entries[0].isIntersecting;
      visibleRef.current = on;
      setVisible(on);
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The single physics + render loop (skipped entirely for reduced-motion users).
  useEffect(() => {
    if (reduceRef.current) return;
    let raf, last = performance.now(), acc = 0, alive = true;
    const frame = (now) => {
      if (!alive) return;
      // Off-screen: do no physics or DOM writes — just keep the clock current so
      // dt doesn't spike on return. (rAF is already throttled when the tab hides.)
      if (!visibleRef.current) { last = now; acc = 0; raf = requestAnimationFrame(frame); return; }
      const dt = Math.min((now - last) / 1000, DT_CLAMP); last = now; acc += dt;
      const s = sim.current, ctrl = DRIVERS[modeRef.current] || DRIVERS.PULL;
      let guard = 0;
      while (acc >= FIXED && guard++ < 8) { ctrl(s, FIXED); pwStep(s, FIXED); acc -= FIXED; }
      paint(s, dt, now, true);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <PwShiftLights ledsRef={leds} />
      <div ref={rowRef} className="pw-hero__cluster-row" role="img" aria-label="Live Toyota GT86 instrument cluster — tachometer and speedometer driven by a real-time physics simulation">
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
      <VibeGauges active={visible} />
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
            <a className="pw-btn pw-btn--amber" href="https://drive.google.com/file/d/1VgJazP-inmgGJ2-50vjpXC6q1bUrzupK/view?usp=sharing" target="_blank" rel="noreferrer">Resume ↗</a>
          </div>
        </div>

        {/* RIGHT — portrait */}
        <div className="pw-portrait">
          <div className="pw-portrait__photo">
            <img src="assets/portrait-georgia.jpg" alt="Fardin Ahsan" decoding="async" fetchPriority="high" />
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
    ['fas fa-file-alt', 'résumé / CV', 'https://drive.google.com/file/d/1VgJazP-inmgGJ2-50vjpXC6q1bUrzupK/view?usp=sharing'],
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
      image: 'assets/talk-to-youtuber.webp',
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
      image: 'assets/youtube-thumbnail-search.webp',
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
              <img src={p.image} alt={p.name} loading="lazy" decoding="async" />
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
          <img src="assets/gt86-garage.jpeg" alt="Fardin's orange Toyota GT 86 on the lift in Dubai" loading="lazy" decoding="async" />
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
            <img src="assets/kart.jpeg" alt="Karting" loading="lazy" decoding="async" />
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
              <img src={p.src} alt={p.loc} loading="lazy" decoding="async" />
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
    ['08', 'Resume',    'fas fa-file-alt',       'view PDF ↗',                  'https://drive.google.com/file/d/1VgJazP-inmgGJ2-50vjpXC6q1bUrzupK/view?usp=sharing'],
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
