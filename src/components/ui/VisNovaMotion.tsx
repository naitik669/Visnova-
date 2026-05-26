import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type MotionVariant =
  | 'notFound'
  | 'progressEmpty'
  | 'visionCreated'
  | 'taskCompleted'
  | 'progressLoader'
  | 'cookie'
  | 'privacy'
  | 'error'
  | 'circleEmpty'
  | 'reportSent'
  | 'waitlist'
  | 'theme';

type VisNovaMotionProps = {
  variant: MotionVariant;
  className?: string;
};

const styles = `
@property --vn-theme-bg { syntax: '<color>'; inherits: true; initial-value: #F7F3FF; }
@property --vn-theme-primary { syntax: '<color>'; inherits: true; initial-value: #8B5CF6; }
@property --vn-theme-secondary { syntax: '<color>'; inherits: true; initial-value: #A78BFA; }
@property --vn-theme-card { syntax: '<color>'; inherits: true; initial-value: #FFFFFF; }
@property --vn-theme-border { syntax: '<color>'; inherits: true; initial-value: #E7DDFF; }
@property --vn-theme-text { syntax: '<color>'; inherits: true; initial-value: #25163D; }
.vn-motion {
  --vn-motion-primary: var(--accent, #8B5CF6);
  --vn-motion-secondary: color-mix(in srgb, var(--accent, #8B5CF6) 62%, var(--text-secondary, #A78BFA) 38%);
  --vn-motion-soft: color-mix(in srgb, var(--accent, #8B5CF6) 14%, var(--card, #FFFFFF) 86%);
  --vn-motion-bg: var(--bg-base, #F7F3FF);
  --vn-motion-card: var(--card-elevated, var(--card, #FFFFFF));
  --vn-motion-border: var(--card-border, color-mix(in srgb, var(--accent, #8B5CF6) 20%, transparent));
  --vn-motion-text: var(--text-main, #25163D);
  --vn-motion-muted: var(--text-secondary, #6B5E84);
  --vn-motion-contrast: var(--accent-contrast, #FFFFFF);
  --vn-motion-danger-soft: color-mix(in srgb, var(--danger, #fb7185) 18%, var(--card, var(--vn-motion-card)) 82%);
  --vn-cookie-base: color-mix(in srgb, var(--warning, #D4A276) 28%, var(--card, var(--vn-motion-card)) 72%);
  --vn-cookie-border: color-mix(in srgb, var(--warning, #D4A276) 48%, var(--accent, #8B5CF6) 8%);
}
.vn-motion svg { overflow: visible; }
.vn-card-vision { animation: vnFloatVision 6s ease-in-out infinite alternate; }
.vn-card-tasks { animation: vnFloatTasks 7s ease-in-out infinite alternate; }
.vn-card-progress { animation: vnFloatProgress 6.5s ease-in-out infinite alternate; }
.vn-card-notes { animation: vnFloatNotes 5.5s ease-in-out infinite alternate; }
.vn-cards-group { animation: vnCardsState 10s ease-in-out infinite; }
.vn-compass-search { transform-origin: 400px 230px; animation: vnCompassState 10s ease-in-out infinite; }
.vn-orbit-outer { transform-origin: center; animation: vnSpin 15s linear infinite; }
.vn-orbit-inner { transform-origin: center; animation: vnSpinReverse 10s linear infinite; }
.vn-search-rays { animation: vnRaysPulse 3s ease-in-out infinite alternate; }
.vn-state-404 { transform-origin: 400px 230px; animation: vnState404 10s ease-in-out infinite; }
.vn-draw-digit { stroke-dasharray: 400; stroke-dashoffset: 400; animation: vnDrawDigits 10s ease-in-out infinite; }
.vn-sparkle { transform-box: fill-box; transform-origin: center; animation: vnSparkleGlow 2s ease-in-out infinite alternate; }
.vn-s2 { animation-delay: .5s; }
.vn-s3 { animation-delay: 1s; }
.vn-timeline-path { stroke-dasharray: 500; stroke-dashoffset: 500; animation: vnDrawTimeline 8s cubic-bezier(.25,1,.5,1) infinite; }
.vn-node { transform-box: fill-box; transform-origin: center; animation: vnScaleNodes 8s ease-out infinite; }
.vn-node-2 { animation-delay: .1s; }
.vn-node-3 { animation-delay: .2s; }
.vn-active-dot { transform-box: fill-box; transform-origin: center; animation: vnDotLand 8s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-dot-ripple { transform-box: fill-box; transform-origin: center; animation: vnRippleBurst 8s cubic-bezier(.16,1,.3,1) infinite; }
.vn-connector-line { stroke-dasharray: 90; stroke-dashoffset: 90; animation: vnDrawConnector 8s ease-out infinite; }
.vn-proof-card { transform-box: fill-box; transform-origin: bottom center; animation: vnCardPopUp 8s cubic-bezier(.34,1.6,.64,1) infinite; }
.vn-check-path { stroke-dasharray: 30; stroke-dashoffset: 30; animation: vnDrawCheckmark 8s ease-in-out infinite; }
.vn-check-circle { transform-box: fill-box; transform-origin: center; animation: vnCheckCirclePop 8s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-seed { transform-box: fill-box; transform-origin: center; animation: vnSeedPulse 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-orbit-path { stroke-dasharray: 400; stroke-dashoffset: 400; transform-origin: center; animation: vnDrawOrbit 10s ease-in-out infinite; }
.vn-vision-card { transform-box: fill-box; transform-origin: center; animation: vnExpandCard 10s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-card-detail { transform-box: fill-box; transform-origin: center; animation: vnPopDetails 10s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-skeletal-line { transform-box: fill-box; transform-origin: left center; animation: vnLoadLines 10s cubic-bezier(.16,1,.3,1) infinite; }
.vn-mini-tasks { animation: vnLaunchTasks 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-mini-proof { animation: vnLaunchProof 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-mini-resources { animation: vnLaunchResources 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-task-card { animation: vnCardSequence 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-checkbox { animation: vnCheckboxComplete 10s ease-in-out infinite; }
.vn-done-column { animation: vnColumnSettle 10s ease-in-out infinite; }
.vn-progress-ring { stroke-dasharray: 503; stroke-dashoffset: 503; transform-origin: center; animation: vnRingSweep 3s cubic-bezier(.4,0,.2,1) infinite; }
.vn-inner-aura { transform-box: fill-box; transform-origin: center; animation: vnAuraPulse 2.5s ease-in-out infinite; }
.vn-orbiting-system { transform-origin: center; animation: vnSpin 15s linear infinite; }
.vn-orbit-icon { animation: vnSpinReverse 15s linear infinite; }
.vn-float-card { transform-box: fill-box; transform-origin: center; animation: vnGentlePulse 3s ease-in-out infinite alternate; }
.vn-cookie-group { transform-box: fill-box; transform-origin: center; animation: vnPopCookie 10s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-shield-group { transform-box: fill-box; transform-origin: center; animation: vnPopShield 10s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-toggle-group { transform-box: fill-box; transform-origin: center; animation: vnPopToggle 10s ease-out infinite; }
.vn-toggle-knob { animation: vnSlideToggle 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-toggle-track { animation: vnColorToggle 10s ease-in-out infinite; }
.vn-log-card { transform-origin: center; animation: vnCardEntrance 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-private-pill { transform-box: fill-box; transform-origin: center; animation: vnPillEntrance 10s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-shield-outline { stroke-dasharray: 800; stroke-dashoffset: 800; transform-origin: center; animation: vnShieldReveal 10s ease-out infinite; }
.vn-lock-group { transform-box: fill-box; transform-origin: center; animation: vnLockSequence 10s ease-in-out infinite; }
.vn-check-badge { transform-box: fill-box; transform-origin: center; animation: vnCheckReveal 10s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-line-outer { animation: vnLineBreakOuter 10s ease-in-out infinite; }
.vn-line-center { transform-origin: center; animation: vnLineBreakCenter 10s ease-in-out infinite; }
.vn-orbit-group { transform-origin: center; animation: vnOrbitSearch 10s cubic-bezier(.4,0,.2,1) infinite; }
.vn-alert-indicator { transform-box: fill-box; transform-origin: center; animation: vnAlertReveal 10s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-retry-arrow { transform-box: fill-box; transform-origin: center; animation: vnRetryReveal 10s cubic-bezier(.34,1.6,.64,1) infinite; }
.vn-avatar-1 { transform-origin: center; animation: vnAvatar1 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-avatar-2 { transform-origin: center; animation: vnAvatar2 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-avatar-3 { transform-origin: center; animation: vnAvatar3 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-connection-line { stroke-dasharray: 120; stroke-dashoffset: 120; animation: vnDrawLines 10s ease-out infinite; }
.vn-pulse-ring { transform-origin: center; animation: vnPulseWave 10s ease-out infinite; }
.vn-triangle-system { transform-origin: center; animation: vnFloatSystem 4s ease-in-out infinite alternate; animation-delay: 4.5s; }
.vn-inbox-system { transform-origin: center; animation: vnAmbientFloat 6s ease-in-out infinite alternate; }
.vn-feedback-card { transform-origin: center; animation: vnCardFlight 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-inbox-front { transform-origin: center; animation: vnTraySettle 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-invite-card { transform-origin: center; animation: vnFloatCard 10s cubic-bezier(.25,1,.5,1) infinite; }
.vn-gate-left { animation: vnOpenGateLeft 10s ease-in-out infinite; }
.vn-gate-right { animation: vnOpenGateRight 10s ease-in-out infinite; }
.vn-gate-glow { animation: vnPortalGlow 10s ease-in-out infinite; }
.vn-progress-dot { animation: vnDotProgressLoop 2s linear infinite; }
.vn-dot-2 { animation-delay: .6s; }
.vn-dot-3 { animation-delay: 1.2s; }
.vn-theme-engine { animation: vnThemeShift 15s linear infinite; }
.vn-droplet-icon { transform-origin: 370px 67px; animation: vnRotateDroplet 15s linear infinite; }
.vn-selector-ring { transform: translateX(calc(var(--active-index) * 40px)); transition: transform .5s cubic-bezier(.34,1.56,.64,1); }
.vn-color-wave { transform-origin: 250px 145px; animation: vnWaveExpand 15s linear infinite; }
.vn-app-card { transform-origin: center; animation: vnCardFloat 5s ease-in-out infinite alternate; }
@keyframes vnFloatVision { from { transform: translate(150px,120px); } to { transform: translate(150px,110px) rotate(1.5deg); } }
@keyframes vnFloatTasks { from { transform: translate(520px,100px); } to { transform: translate(520px,112px) rotate(-1deg); } }
@keyframes vnFloatProgress { from { transform: translate(100px,310px); } to { transform: translate(100px,302px) rotate(-1.5deg); } }
@keyframes vnFloatNotes { from { transform: translate(550px,300px); } to { transform: translate(550px,310px) rotate(2deg); } }
@keyframes vnCardsState { 0%,35% { opacity:1; } 45%,85% { opacity:.15; filter: blur(1px); } 92%,100% { opacity:1; filter:none; } }
@keyframes vnCompassState { 0%,35% { opacity:1; transform:scale(1); } 42%,85% { opacity:0; transform:scale(.6); } 92%,100% { opacity:1; transform:scale(1); } }
@keyframes vnSpin { to { transform: rotate(360deg); } }
@keyframes vnSpinReverse { to { transform: rotate(-360deg); } }
@keyframes vnRaysPulse { from { opacity:.15; } to { opacity:.45; } }
@keyframes vnState404 { 0%,38% { opacity:0; transform:scale(.95); } 45%,85% { opacity:1; transform:scale(1); } 90%,100% { opacity:0; transform:scale(.95); } }
@keyframes vnDrawDigits { 0%,38% { stroke-dashoffset:400; } 48%,85% { stroke-dashoffset:0; } 88%,100% { stroke-dashoffset:400; } }
@keyframes vnSparkleGlow { from { opacity:.3; transform:scale(.8); } to { opacity:1; transform:scale(1.2); } }
@keyframes vnDrawTimeline { 0% { stroke-dashoffset:500; } 15%,85% { stroke-dashoffset:0; } 93%,100% { stroke-dashoffset:500; } }
@keyframes vnScaleNodes { 0%,10% { transform:scale(0); opacity:0; } 20%,85% { transform:scale(1); opacity:1; } 92%,100% { transform:scale(0); opacity:0; } }
@keyframes vnDotLand { 0%,8% { transform:scale(0); opacity:0; } 15%,85% { transform:scale(1); opacity:1; } 91%,100% { transform:scale(0); opacity:0; } }
@keyframes vnRippleBurst { 0%,12% { transform:scale(.3); opacity:0; } 16% { opacity:.8; } 24%,100% { transform:scale(2.2); opacity:0; } }
@keyframes vnDrawConnector { 0%,15% { stroke-dashoffset:90; } 23%,85% { stroke-dashoffset:0; } 90%,100% { stroke-dashoffset:90; } }
@keyframes vnCardPopUp { 0%,18% { transform:scale(0); opacity:0; } 28%,85% { transform:scale(1); opacity:1; } 90%,100% { transform:scale(0); opacity:0; } }
@keyframes vnDrawCheckmark { 0%,30% { stroke-dashoffset:30; } 40%,85% { stroke-dashoffset:0; } 90%,100% { stroke-dashoffset:30; } }
@keyframes vnCheckCirclePop { 0%,25% { transform:scale(0); opacity:0; } 35%,85% { transform:scale(1); opacity:1; } 90%,100% { transform:scale(0); opacity:0; } }
@keyframes vnSeedPulse { 0% { transform:scale(0); opacity:0; } 4% { transform:scale(1.4); opacity:1; } 14% { transform:scale(.2); opacity:0; } 90%,100% { transform:scale(0); opacity:0; } }
@keyframes vnDrawOrbit { 0%,3% { stroke-dashoffset:400; opacity:0; transform:rotate(0deg); } 12% { stroke-dashoffset:0; opacity:1; transform:rotate(180deg); } 85% { opacity:.1; transform:rotate(360deg); } 90%,100% { opacity:0; stroke-dashoffset:400; } }
@keyframes vnExpandCard { 0%,13% { transform:scale(0); opacity:0; } 22% { transform:scale(1.05); opacity:1; } 26%,85% { transform:scale(1); opacity:1; } 90%,100% { transform:scale(.7); opacity:0; } }
@keyframes vnPopDetails { 0%,23% { transform:scale(0); opacity:0; } 30%,85% { transform:scale(1); opacity:1; } 90%,100% { transform:scale(0); opacity:0; } }
@keyframes vnLoadLines { 0%,25% { transform:scaleX(0); opacity:0; } 32%,85% { transform:scaleX(1); opacity:1; } 90%,100% { transform:scaleX(0); opacity:0; } }
@keyframes vnLaunchTasks { 0%,35% { transform:translate(160px,92px) scale(0); opacity:0; } 49%,85% { transform:translate(0,0) scale(1); opacity:1; } 90%,100% { transform:translate(100px,50px) scale(.5); opacity:0; } }
@keyframes vnLaunchProof { 0%,37% { transform:translate(170px,-55px) scale(0); opacity:0; } 51%,85% { transform:translate(0,0) scale(1); opacity:1; } 90%,100% { transform:translate(100px,-40px) scale(.5); opacity:0; } }
@keyframes vnLaunchResources { 0%,39% { transform:translate(-160px,35px) scale(0); opacity:0; } 53%,85% { transform:translate(0,0) scale(1); opacity:1; } 90%,100% { transform:translate(-100px,20px) scale(.5); opacity:0; } }
@keyframes vnCardSequence { 0% { transform:translateX(-350px); opacity:0; } 12%,35% { transform:translateX(0); opacity:1; } 45%,85% { transform:translateX(365px); opacity:1; } 92%,100% { transform:translateX(365px) scale(.95); opacity:0; } }
@keyframes vnCheckboxComplete { 0%,18% { fill:none; stroke:var(--vn-motion-secondary); stroke-width:2; } 24%,85% { fill:var(--vn-motion-soft); stroke:var(--vn-motion-primary); stroke-width:2.5; } 92%,100% { fill:none; stroke:var(--vn-motion-secondary); stroke-width:2; } }
@keyframes vnColumnSettle { 0%,45% { opacity:.6; } 49%,85% { opacity:1; } 92%,100% { opacity:.6; } }
@keyframes vnRingSweep { 0% { stroke-dashoffset:503; transform:rotate(0); } 50% { stroke-dashoffset:125; transform:rotate(180deg); } 100% { stroke-dashoffset:503; transform:rotate(360deg); } }
@keyframes vnAuraPulse { 0%,100% { transform:scale(.92); opacity:.04; } 50% { transform:scale(1.04); opacity:.1; } }
@keyframes vnGentlePulse { from { transform:scale(1); } to { transform:scale(1.05); } }
@keyframes vnPopCookie { 0%,3% { transform:scale(0); opacity:0; } 12% { transform:scale(1.1); opacity:1; } 16%,85% { transform:scale(1); opacity:1; } 92%,100% { transform:scale(.8); opacity:0; } }
@keyframes vnPopShield { 0%,25% { transform:scale(0) translate(10px,10px); opacity:0; } 35% { transform:scale(1.1) translate(-2px,-2px); opacity:1; } 38%,85% { transform:scale(1); opacity:1; } 92%,100% { transform:scale(.5); opacity:0; } }
@keyframes vnPopToggle { 0%,15% { transform:scale(0); opacity:0; } 23%,85% { transform:scale(1); opacity:1; } 92%,100% { transform:scale(.5); opacity:0; } }
@keyframes vnSlideToggle { 0%,20% { transform:translateX(0); fill:var(--vn-motion-primary); } 28%,85% { transform:translateX(20px); fill:var(--vn-motion-card); } 92%,100% { transform:translateX(0); fill:var(--vn-motion-primary); } }
@keyframes vnColorToggle { 0%,20% { fill:var(--vn-motion-soft); stroke:var(--vn-motion-border); } 28%,85% { fill:var(--vn-motion-primary); stroke:var(--vn-motion-primary); } 92%,100% { fill:var(--vn-motion-soft); stroke:var(--vn-motion-border); } }
@keyframes vnCardEntrance { 0% { transform:translateX(-320px); opacity:0; } 12%,85% { transform:translateX(0); opacity:1; } 92%,100% { transform:scale(.9); opacity:0; } }
@keyframes vnPillEntrance { 0%,12% { transform:scale(0) translateY(10px); opacity:0; } 20%,85% { transform:scale(1); opacity:1; } 92%,100% { transform:scale(.8); opacity:0; } }
@keyframes vnShieldReveal { 0%,20% { stroke-dashoffset:800; opacity:0; transform:scale(.95); } 32%,85% { stroke-dashoffset:0; opacity:1; transform:scale(1); } 92%,100% { opacity:0; transform:scale(.95); } }
@keyframes vnLockSequence { 0%,20% { transform:scale(0); opacity:0; } 28%,35% { transform:scale(1); opacity:1; } 40%,100% { transform:scale(0); opacity:0; } }
@keyframes vnCheckReveal { 0%,37% { transform:scale(0); opacity:0; } 46%,85% { transform:scale(1); opacity:1; } 92%,100% { transform:scale(0); opacity:0; } }
@keyframes vnLineBreakOuter { 0%,25% { stroke:var(--vn-motion-primary); stroke-dasharray:none; opacity:1; } 33%,58% { stroke:var(--vn-motion-secondary); stroke-dasharray:4 4; opacity:.7; } 66%,85% { stroke:var(--vn-motion-primary); stroke-dasharray:none; opacity:1; } 92%,100% { opacity:0; } }
@keyframes vnLineBreakCenter { 0%,25% { stroke:var(--vn-motion-primary); stroke-dasharray:none; opacity:.8; transform:scaleX(1); } 33%,58% { stroke:var(--vn-motion-danger-soft); stroke-dasharray:2 2; opacity:.3; transform:scaleX(.5); } 66%,85% { stroke:var(--vn-motion-primary); stroke-dasharray:none; opacity:.8; transform:scaleX(1); } 92%,100% { opacity:0; } }
@keyframes vnOrbitSearch { 0%,25% { transform:scale(1) rotate(0); opacity:1; } 33%,58% { transform:scale(1) rotate(720deg); opacity:1; } 66%,100% { transform:scale(0); opacity:0; } }
@keyframes vnAlertReveal { 0%,28% { transform:scale(0); opacity:0; } 34%,58% { transform:scale(1); opacity:1; } 64%,100% { transform:scale(0); opacity:0; } }
@keyframes vnRetryReveal { 0%,63% { transform:scale(0) rotate(0deg); opacity:0; } 71%,85% { transform:scale(1) rotate(360deg); opacity:1; } 92%,100% { transform:scale(0) rotate(360deg); opacity:0; } }
@keyframes vnAvatar1 { 0% { transform:scale(0); opacity:0; } 10% { transform:scale(1.15); opacity:1; } 40%,85% { transform:translateY(-45px); opacity:1; } 92%,100% { transform:translateY(-45px) scale(.8); opacity:0; } }
@keyframes vnAvatar2 { 0%,25% { transform:translate(-100px,-100px) scale(0); opacity:0; } 40%,85% { transform:translate(0,0) scale(1); opacity:1; } 92%,100% { transform:scale(.8); opacity:0; } }
@keyframes vnAvatar3 { 0%,25% { transform:translate(100px,100px) scale(0); opacity:0; } 40%,85% { transform:translate(0,0) scale(1); opacity:1; } 92%,100% { transform:scale(.8); opacity:0; } }
@keyframes vnDrawLines { 0%,40% { stroke-dashoffset:120; opacity:0; } 50%,85% { stroke-dashoffset:0; opacity:1; } 91%,100% { opacity:0; } }
@keyframes vnPulseWave { 0%,48% { transform:scale(.6); opacity:0; } 58% { transform:scale(1.1); opacity:.5; } 68%,100% { transform:scale(1.2); opacity:0; } }
@keyframes vnFloatSystem { from { transform:translateY(0) rotate(0); } to { transform:translateY(-4px) rotate(1.5deg); } }
@keyframes vnAmbientFloat { from { transform:translateY(0); } to { transform:translateY(-5px); } }
@keyframes vnCardFlight { 0% { transform:translateY(-180px) rotate(-15deg); opacity:0; } 12%,85% { transform:translateY(0) rotate(4deg); opacity:1; } 92%,100% { transform:scale(.85); opacity:0; } }
@keyframes vnTraySettle { 0%,11% { transform:scaleY(1); } 14% { transform:scaleY(.94) scaleX(1.02); } 18% { transform:scaleY(1.03) scaleX(.99); } 22%,100% { transform:scaleY(1); } }
@keyframes vnFloatCard { 0% { transform:translateY(140px) scale(.85); opacity:0; } 12% { transform:translateY(0) scale(1.05); opacity:1; } 16%,85% { transform:translateY(0) scale(1); opacity:1; } 92%,100% { transform:translateY(40px) scale(.9); opacity:0; } }
@keyframes vnOpenGateLeft { 0%,15% { transform:translateX(0); opacity:1; } 26%,85% { transform:translateX(-35px); opacity:.25; } 92%,100% { transform:translateX(0); opacity:1; } }
@keyframes vnOpenGateRight { 0%,15% { transform:translateX(0); opacity:1; } 26%,85% { transform:translateX(35px); opacity:.25; } 92%,100% { transform:translateX(0); opacity:1; } }
@keyframes vnPortalGlow { 0%,15% { opacity:0; } 28%,85% { opacity:1; } 92%,100% { opacity:0; } }
@keyframes vnDotProgressLoop { 0% { transform:translateX(0); opacity:0; } 20%,80% { opacity:1; } 100% { transform:translateX(45px); opacity:0; } }
@keyframes vnThemeShift { 0%,15%,100% { --vn-theme-bg:var(--vn-motion-bg); --vn-theme-primary:var(--vn-motion-primary); --vn-theme-secondary:var(--vn-motion-secondary); --vn-theme-card:var(--vn-motion-card); --vn-theme-border:var(--vn-motion-border); --vn-theme-text:var(--vn-motion-text); --active-index:0; } 20%,35% { --vn-theme-bg:#020617; --vn-theme-primary:#38bdf8; --vn-theme-secondary:#94a3b8; --vn-theme-card:#111827; --vn-theme-border:rgba(148,163,184,.24); --vn-theme-text:#f8fafc; --active-index:1; } 40%,55% { --vn-theme-bg:#f8faf7; --vn-theme-primary:#8da482; --vn-theme-secondary:#5a6b52; --vn-theme-card:#ffffff; --vn-theme-border:rgba(141,164,130,.22); --vn-theme-text:#2d3428; --active-index:2; } 60%,75% { --vn-theme-bg:#04130b; --vn-theme-primary:#86efac; --vn-theme-secondary:#9fceb2; --vn-theme-card:#102719; --vn-theme-border:rgba(134,239,172,.22); --vn-theme-text:#f0fdf4; --active-index:3; } 80%,95% { --vn-theme-bg:#16051f; --vn-theme-primary:#f0abfc; --vn-theme-secondary:#d8b4fe; --vn-theme-card:#2f173d; --vn-theme-border:rgba(240,171,252,.22); --vn-theme-text:#fdf4ff; --active-index:4; } }
@keyframes vnRotateDroplet { 0%,15% { transform:rotate(0); } 20%,35% { transform:rotate(72deg); } 40%,55% { transform:rotate(144deg); } 60%,75% { transform:rotate(216deg); } 80%,95% { transform:rotate(288deg); } 100% { transform:rotate(360deg); } }
@keyframes vnWaveExpand { 15% { transform:scale(0); opacity:0; fill:#3B82F6; } 17% { transform:scale(1.6); opacity:.15; } 20%,35% { transform:scale(0); opacity:0; fill:#D97706; } 37% { transform:scale(1.6); opacity:.15; } 40%,55% { transform:scale(0); opacity:0; fill:#10B981; } 57% { transform:scale(1.6); opacity:.15; } 60%,75% { transform:scale(0); opacity:0; fill:#9061FF; } 77% { transform:scale(1.6); opacity:.15; } 80%,95% { transform:scale(0); opacity:0; fill:var(--vn-motion-primary); } 97% { transform:scale(1.6); opacity:.15; } 100% { transform:scale(0); opacity:0; } }
@keyframes vnCardFloat { from { transform:translateY(0); } to { transform:translateY(-4px); } }
@media (prefers-reduced-motion: reduce) { .vn-motion * { animation-duration: .001ms !important; animation-iteration-count: 1 !important; } }
`;

function IconCard({ x, y, label, icon }: { x: number; y: number; label: string; icon: 'eye' | 'check' | 'bar' | 'note' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="140" height="64" rx="16" fill="url(#vnCardGrad)" stroke="var(--vn-motion-border)" strokeWidth="1.5" />
      <circle cx="28" cy="32" r="12" fill="var(--vn-motion-primary)" fillOpacity="0.1" />
      {icon === 'eye' && <><path d="M22 32 C22 32 24 28 28 28 C32 28 34 32 34 32 C34 32 32 36 28 36 C24 36 22 32 22 32 Z" stroke="var(--vn-motion-primary)" strokeWidth="1.8" strokeLinecap="round" /><circle cx="28" cy="32" r="2" fill="var(--vn-motion-primary)" /></>}
      {icon === 'check' && <path d="M24 32 L27 35 L33 29" stroke="var(--vn-motion-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {icon === 'bar' && <path d="M21 37 L21 32 M28 37 L28 27 M35 37 L35 30" stroke="var(--vn-motion-primary)" strokeWidth="2" strokeLinecap="round" />}
      {icon === 'note' && <path d="M23 27 H33 M23 32 H33 M23 37 H29" stroke="var(--vn-motion-primary)" strokeWidth="1.8" strokeLinecap="round" />}
      <text x="50" y="37" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="13" fill="var(--vn-motion-text)">{label}</text>
    </g>
  );
}

function BaseDefs() {
  return (
    <defs>
      <linearGradient id="vnCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--vn-motion-card)" />
        <stop offset="100%" stopColor="var(--vn-motion-soft)" />
      </linearGradient>
      <linearGradient id="vnBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--vn-motion-primary)" />
        <stop offset="100%" stopColor="var(--vn-motion-secondary)" />
      </linearGradient>
      <filter id="vnGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="vnSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="var(--vn-motion-primary)" floodOpacity="0.08" />
      </filter>
    </defs>
  );
}

function NotFoundSvg() {
  return (
    <svg viewBox="0 0 800 460" width="100%" height="100%" fill="none" role="img" aria-label="Lost in Vision space">
      <BaseDefs />
      <g className="vn-cards-group">
        <g className="vn-card-vision"><IconCard x={0} y={0} label="Vision" icon="eye" /></g>
        <g className="vn-card-tasks"><IconCard x={0} y={0} label="Tasks" icon="check" /></g>
        <g className="vn-card-progress"><IconCard x={0} y={0} label="Progress" icon="bar" /></g>
        <g className="vn-card-notes"><IconCard x={0} y={0} label="Notes" icon="note" /></g>
      </g>
      <g className="vn-compass-search">
        <path d="M400 230 L190 140 M400 230 L550 120" stroke="var(--vn-motion-primary)" strokeWidth="1.5" strokeDasharray="4 4" className="vn-search-rays" />
        <circle cx="400" cy="230" r="75" stroke="var(--vn-motion-secondary)" strokeWidth="1.5" strokeDasharray="6 6" className="vn-orbit-outer" />
        <circle cx="400" cy="230" r="48" stroke="var(--vn-motion-primary)" strokeWidth="2" strokeDasharray="40 80" className="vn-orbit-inner" />
        <circle cx="400" cy="230" r="16" fill="url(#vnBrandGrad)" filter="url(#vnGlow)" />
      </g>
      <g className="vn-state-404">
        <rect x="230" y="110" width="340" height="240" rx="28" fill="var(--vn-motion-card)" fillOpacity="0.75" stroke="var(--vn-motion-soft)" strokeWidth="2" filter="url(#vnGlow)" />
        <path d="M315 160 L270 245 H340 M315 160 V290" stroke="var(--vn-motion-primary)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="vn-draw-digit" />
        <rect x="365" y="160" width="70" height="130" rx="35" stroke="url(#vnBrandGrad)" strokeWidth="14" strokeLinecap="round" className="vn-draw-digit" />
        <path d="M515 160 L470 245 H540 M515 160 V290" stroke="var(--vn-motion-primary)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="vn-draw-digit" />
        <circle cx="400" cy="225" r="10" fill="var(--vn-motion-primary)" className="vn-sparkle" />
        <circle cx="345" cy="180" r="4" fill="var(--vn-motion-secondary)" className="vn-sparkle" />
        <circle cx="460" cy="275" r="5" fill="var(--vn-motion-primary)" className="vn-sparkle vn-s2" />
      </g>
    </svg>
  );
}

function ProgressEmptySvg() {
  return (
    <svg viewBox="0 0 800 360" width="100%" height="100%" fill="none" role="img" aria-label="Progress proof timeline">
      <BaseDefs />
      <circle cx="260" cy="180" r="90" fill="var(--vn-motion-border)" opacity="0.4" filter="blur(35px)" />
      <path className="vn-timeline-path" d="M160 250 H640" stroke="var(--vn-motion-border)" strokeWidth="4" strokeLinecap="round" />
      <circle className="vn-node vn-node-2" cx="410" cy="250" r="5" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" strokeWidth="3" />
      <circle className="vn-node vn-node-3" cx="560" cy="250" r="5" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" strokeWidth="3" />
      <path className="vn-connector-line" d="M260 250 V165" stroke="var(--vn-motion-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      <g className="vn-active-dot">
        <circle className="vn-dot-ripple" cx="260" cy="250" r="22" stroke="var(--vn-motion-primary)" strokeWidth="1.5" fill="none" />
        <circle cx="260" cy="250" r="10" fill="var(--vn-motion-primary)" filter="url(#vnGlow)" opacity="0.5" />
        <circle cx="260" cy="250" r="6" fill="var(--vn-motion-primary)" stroke="var(--vn-motion-card)" strokeWidth="2" />
      </g>
      <g className="vn-proof-card">
        <rect x="170" y="80" width="180" height="84" rx="16" fill="url(#vnCardGrad)" stroke="var(--vn-motion-border)" filter="url(#vnSoftShadow)" />
        <g className="vn-check-circle">
          <circle cx="215" cy="122" r="14" fill="var(--vn-motion-bg)" stroke="var(--vn-motion-secondary)" />
          <path className="vn-check-path" d="M209 122 L213 126 L221 117" stroke="var(--vn-motion-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="242" y="114" width="75" height="7" rx="3.5" fill="var(--vn-motion-primary)" fillOpacity="0.8" />
        <rect x="242" y="128" width="45" height="5" rx="2.5" fill="var(--vn-motion-secondary)" fillOpacity="0.5" />
      </g>
    </svg>
  );
}

function VisionCreatedSvg() {
  return (
    <svg viewBox="0 0 800 440" width="100%" height="100%" fill="none" role="img" aria-label="Vision created">
      <BaseDefs />
      <circle cx="400" cy="240" r="100" fill="var(--vn-motion-soft)" opacity="0.3" filter="blur(40px)" />
      <circle className="vn-orbit-path" cx="400" cy="240" r="64" stroke="var(--vn-motion-secondary)" strokeWidth="2" strokeDasharray="6 6" />
      <circle className="vn-seed" cx="400" cy="240" r="12" fill="var(--vn-motion-primary)" filter="url(#vnGlow)" />
      <g className="vn-vision-card">
        <rect x="270" y="150" width="260" height="150" rx="24" fill="var(--vn-motion-card)" stroke="var(--vn-motion-soft)" strokeWidth="1.5" filter="url(#vnSoftShadow)" />
        <g className="vn-card-detail">
          <circle cx="320" cy="225" r="18" fill="var(--vn-motion-soft)" />
          <circle cx="320" cy="225" r="11" stroke="var(--vn-motion-primary)" strokeWidth="2.5" />
          <circle cx="320" cy="225" r="4" fill="var(--vn-motion-secondary)" />
          <circle cx="338" cy="208" r="9" fill="var(--vn-motion-primary)" />
          <path className="vn-check-path" d="M334 208 L337 211 L342 205" stroke="var(--vn-motion-card)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="vn-skeletal-line">
          <rect x="355" y="206" width="120" height="8" rx="4" fill="var(--vn-motion-primary)" />
          <rect x="355" y="222" width="80" height="6" rx="3" fill="var(--vn-motion-secondary)" opacity="0.6" />
        </g>
      </g>
      <g className="vn-mini-tasks"><rect x="190" y="110" width="95" height="42" rx="12" fill="var(--vn-motion-card)" stroke="var(--vn-motion-soft)" filter="url(#vnSoftShadow)" /><text x="225" y="135" fontFamily="system-ui" fontWeight="600" fontSize="10" fill="var(--vn-motion-text)">Tasks</text></g>
      <g className="vn-mini-proof"><rect x="180" y="280" width="95" height="42" rx="12" fill="var(--vn-motion-card)" stroke="var(--vn-motion-soft)" filter="url(#vnSoftShadow)" /><text x="215" y="305" fontFamily="system-ui" fontWeight="600" fontSize="10" fill="var(--vn-motion-text)">Proof</text></g>
      <g className="vn-mini-resources"><rect x="510" y="190" width="115" height="42" rx="12" fill="var(--vn-motion-card)" stroke="var(--vn-motion-soft)" filter="url(#vnSoftShadow)" /><text x="545" y="215" fontFamily="system-ui" fontWeight="600" fontSize="10" fill="var(--vn-motion-text)">Resources</text></g>
    </svg>
  );
}

function TaskCompletedSvg() {
  return (
    <svg viewBox="0 0 800 360" width="100%" height="100%" fill="none" role="img" aria-label="Task completed">
      <BaseDefs />
      <circle cx="240" cy="180" r="120" fill="var(--vn-motion-soft)" opacity="0.3" filter="blur(45px)" />
      <g className="vn-done-column">
        <rect x="470" y="70" width="230" height="230" rx="20" fill="none" stroke="var(--vn-motion-border)" strokeWidth="2" strokeDasharray="6 5" />
        <rect x="490" y="90" width="75" height="24" rx="12" fill="var(--vn-motion-border)" />
        <text x="527" y="106" fontFamily="system-ui" fontWeight="700" fontSize="11" fill="var(--vn-motion-primary)" textAnchor="middle">DONE</text>
      </g>
      <g opacity="0.4">
        <rect x="100" y="70" width="230" height="230" rx="20" fill="none" stroke="var(--vn-motion-border)" strokeWidth="1.5" />
        <text x="162" y="106" fontFamily="system-ui" fontWeight="700" fontSize="11" fill="var(--vn-motion-text)" textAnchor="middle">TO DO</text>
      </g>
      <g className="vn-task-card">
        <rect x="115" y="140" width="200" height="74" rx="16" fill="var(--vn-motion-card)" stroke="var(--vn-motion-soft)" filter="url(#vnSoftShadow)" />
        <circle className="vn-checkbox" cx="150" cy="177" r="11" />
        <path className="vn-check-path" d="M144.5 177 L148 180.5 L155.5 172.5" stroke="var(--vn-motion-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="175" y="168" width="95" height="7" rx="3.5" fill="var(--vn-motion-text)" fillOpacity="0.8" />
        <rect x="175" y="181" width="60" height="5" rx="2.5" fill="var(--vn-motion-secondary)" fillOpacity="0.5" />
      </g>
    </svg>
  );
}

function ProgressLoaderSvg() {
  return (
    <svg viewBox="0 0 500 500" width="100%" height="100%" fill="none" role="img" aria-label="Calculating progress">
      <BaseDefs />
      <circle cx="250" cy="250" r="110" fill="var(--vn-motion-soft)" opacity="0.4" filter="blur(35px)" />
      <circle className="vn-inner-aura" cx="250" cy="250" r="68" fill="var(--vn-motion-primary)" />
      <circle cx="250" cy="250" r="80" stroke="var(--vn-motion-border)" strokeWidth="5" opacity="0.6" />
      <circle className="vn-progress-ring" cx="250" cy="250" r="80" stroke="var(--vn-motion-primary)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="250" cy="250" r="130" stroke="var(--vn-motion-border)" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.5" />
      <g className="vn-orbiting-system">
        {[[250,120,'M246 116 H254 M246 120 H254 M246 124 H250'],[380,250,'M375 250 L378 253 L384 247'],[250,380,'M250 376.5 V380 H253'],[120,250,'M116 246 H124 V254 H116 Z']].map(([cx, cy, path], index) => (
          <g className="vn-orbit-icon" key={index}>
            <circle className="vn-float-card" cx={Number(cx)} cy={Number(cy)} r="18" fill="var(--vn-motion-card)" stroke="var(--vn-motion-secondary)" filter="url(#vnSoftShadow)" />
            <path d={String(path)} stroke="var(--vn-motion-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
      </g>
    </svg>
  );
}

function CookieSvg() {
  return (
    <svg viewBox="100 70 280 200" width="100%" height="100%" fill="none" role="img" aria-label="Cookie choices">
      <BaseDefs />
      <g className="vn-cookie-group">
        <circle cx="210" cy="160" r="50" fill="var(--vn-cookie-base)" stroke="var(--vn-cookie-border)" strokeWidth="1.5" filter="url(#vnSoftShadow)" />
        <rect x="182" y="132" width="11" height="8" rx="4" fill="var(--vn-motion-primary)" transform="rotate(-15 182 132)" />
        <rect x="228" y="130" width="14" height="10" rx="5" fill="var(--vn-motion-secondary)" transform="rotate(10 228 130)" />
        <circle cx="206" cy="154" r="5" fill="var(--vn-motion-primary)" />
      </g>
      <g className="vn-shield-group">
        <path d="M265 175 H305 V195 C305 210 285 220 285 220 C285 220 265 210 265 195 Z" fill="var(--vn-motion-secondary)" stroke="var(--vn-motion-border)" strokeWidth="1.5" />
        <path className="vn-check-path" d="M276 195 L282 201 L294 189" stroke="var(--vn-motion-card)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="vn-toggle-group">
        <rect className="vn-toggle-track" x="285" y="105" width="40" height="20" rx="10" strokeWidth="1.5" />
        <circle className="vn-toggle-knob" cx="295" cy="115" r="7" />
      </g>
    </svg>
  );
}

function PrivacySvg() {
  return (
    <svg viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Private logs">
      <BaseDefs />
      <circle cx="250" cy="160" r="100" fill="var(--vn-motion-soft)" opacity="0.4" filter="blur(35px)" />
      <g className="vn-log-card"><rect x="155" y="110" width="190" height="90" rx="18" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" filter="url(#vnSoftShadow)" /><rect x="180" y="134" width="115" height="7" rx="3.5" fill="var(--vn-motion-text)" fillOpacity="0.8" /><rect x="180" y="148" width="65" height="5" rx="2.5" fill="var(--vn-motion-secondary)" fillOpacity="0.5" /></g>
      <g className="vn-private-pill"><rect x="205" y="75" width="90" height="22" rx="11" fill="var(--vn-motion-primary)" /><text x="250" y="89" fontFamily="system-ui" fontWeight="700" fontSize="10" fill="var(--vn-motion-card)" textAnchor="middle">PRIVATE</text></g>
      <path className="vn-shield-outline" d="M130 90 H370 V155 C370 210 250 250 250 250 C250 250 130 210 130 155 Z" stroke="var(--vn-motion-primary)" strokeWidth="2.5" fill="var(--vn-motion-primary)" fillOpacity="0.04" />
      <g className="vn-lock-group"><path d="M238 150 V139 C238 132.5 243.5 127 250 127 C256.5 127 262 132.5 262 139 V150" stroke="var(--vn-motion-primary)" strokeWidth="3" strokeLinecap="round" /><rect x="232" y="148" width="36" height="26" rx="6" fill="var(--vn-motion-primary)" /></g>
      <g className="vn-check-badge"><circle cx="250" cy="160" r="18" fill="var(--vn-motion-primary)" /><path className="vn-check-path" d="M242 160 L247 165 L257 155" stroke="var(--vn-motion-card)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></g>
    </svg>
  );
}

function ErrorSvg() {
  return (
    <svg viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Connection retry">
      <BaseDefs />
      <circle cx="250" cy="160" r="90" fill="var(--vn-motion-danger-soft)" opacity="0.3" filter="blur(35px)" />
      <rect x="110" y="80" width="280" height="160" rx="24" fill="var(--vn-motion-card)" stroke="var(--vn-motion-soft)" filter="url(#vnSoftShadow)" />
      <path className="vn-line-outer" d="M150 160 H220" strokeWidth="2.5" strokeLinecap="round" />
      <path className="vn-line-outer" d="M280 160 H350" strokeWidth="2.5" strokeLinecap="round" />
      <path className="vn-line-center" d="M220 160 H280" strokeWidth="2.5" strokeLinecap="round" />
      <g className="vn-orbit-group"><circle cx="250" cy="160" r="22" stroke="var(--vn-motion-secondary)" strokeWidth="1.5" strokeDasharray="4 4" /><circle cx="250" cy="160" r="7" fill="var(--vn-motion-primary)" /></g>
      <g className="vn-alert-indicator"><path d="M250 102 L259 118 C260 120 259 122 257 122 H243 C241 122 240 120 241 118 Z" fill="var(--vn-motion-danger-soft)" stroke="var(--vn-motion-primary)" /><line x1="250" y1="110" x2="250" y2="115" stroke="var(--vn-motion-primary)" strokeWidth="1.5" strokeLinecap="round" /></g>
      <g className="vn-retry-arrow"><circle cx="250" cy="160" r="20" fill="var(--vn-motion-soft)" stroke="var(--vn-motion-border)" /><path d="M250 148 A12 12 0 1 1 240 153 M240 144 L240 153 H249" stroke="var(--vn-motion-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></g>
    </svg>
  );
}

function CircleEmptySvg() {
  return (
    <svg viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Circle empty">
      <BaseDefs />
      <circle cx="250" cy="160" r="64" stroke="var(--vn-motion-border)" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.5" />
      <circle className="vn-pulse-ring" cx="250" cy="160" r="80" stroke="var(--vn-motion-secondary)" strokeWidth="2" />
      <g className="vn-triangle-system">
        <path className="vn-connection-line" d="M250 115 L195 195" stroke="var(--vn-motion-secondary)" strokeWidth="2" strokeLinecap="round" />
        <path className="vn-connection-line" d="M195 195 L305 195" stroke="var(--vn-motion-secondary)" strokeWidth="2" strokeLinecap="round" />
        <path className="vn-connection-line" d="M305 195 L250 115" stroke="var(--vn-motion-secondary)" strokeWidth="2" strokeLinecap="round" />
        <g className="vn-avatar-1"><circle cx="250" cy="115" r="16" fill="var(--vn-motion-primary)" /><circle cx="250" cy="110" r="5" fill="var(--vn-motion-card)" /><path d="M241 126 C241 121 245 118 250 118 C255 118 259 121 259 126 Z" fill="var(--vn-motion-card)" /></g>
        <g className="vn-avatar-2"><circle cx="195" cy="195" r="16" fill="color-mix(in srgb, var(--success, #10B981) 30%, var(--vn-motion-card) 70%)" /><circle cx="195" cy="190" r="5" fill="var(--vn-motion-primary)" /><path d="M186 206 C186 201 190 198 195 198 C200 198 204 201 204 206 Z" fill="var(--vn-motion-primary)" /></g>
        <g className="vn-avatar-3"><circle cx="305" cy="195" r="16" fill="var(--vn-motion-secondary)" /><circle cx="305" cy="190" r="5" fill="var(--vn-motion-card)" /><path d="M296 206 C296 201 300 198 305 198 C310 198 314 201 314 206 Z" fill="var(--vn-motion-card)" /></g>
      </g>
    </svg>
  );
}

function ReportSentSvg() {
  return (
    <svg viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Report sent">
      <BaseDefs />
      <g className="vn-inbox-system">
        <path d="M175 155 H325 V185 H175 Z" fill="var(--vn-motion-border)" opacity="0.5" />
        <g className="vn-feedback-card"><rect x="195" y="125" width="110" height="70" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" /><rect x="210" y="139" width="80" height="6" rx="3" fill="var(--vn-motion-primary)" /><rect x="210" y="151" width="55" height="5" rx="2.5" fill="var(--vn-motion-secondary)" opacity="0.6" /></g>
        <g className="vn-inbox-front"><path d="M170 170 H215 C220 170 225 180 250 180 C275 180 280 170 285 170 H330 V200 C330 208 322 208 322 208 H178 C178 208 170 208 170 200 Z" fill="url(#vnCardGrad)" stroke="var(--vn-motion-secondary)" strokeWidth="1.2" filter="url(#vnSoftShadow)" /></g>
        <g className="vn-check-badge"><circle cx="250" cy="115" r="18" fill="var(--vn-motion-primary)" /><path className="vn-check-path" d="M242 115 L247 120 L257 110" stroke="var(--vn-motion-card)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></g>
      </g>
    </svg>
  );
}

function WaitlistSvg() {
  return (
    <svg viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Waitlist joined">
      <BaseDefs />
      <path className="vn-gate-glow" d="M215 210 V135 C215 110 285 110 285 135 V210 Z" fill="var(--vn-motion-primary)" fillOpacity="0.25" filter="url(#vnGlow)" />
      <path className="vn-gate-left" d="M215 210 V135 C215 110 250 110 250 115 V210 Z" fill="var(--vn-motion-card)" stroke="var(--vn-motion-secondary)" strokeWidth="1.5" />
      <path className="vn-gate-right" d="M250 210 V115 C250 110 285 110 285 135 V210 Z" fill="var(--vn-motion-card)" stroke="var(--vn-motion-secondary)" strokeWidth="1.5" />
      <g className="vn-invite-card">
        <path d="M150 110 H350 V155 A10 10 0 0 0 350 175 V220 H150 V175 A10 10 0 0 0 150 155 Z" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" filter="url(#vnSoftShadow)" />
        <path d="M235 110 V220" stroke="var(--vn-motion-border)" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="194" cy="165" r="14" stroke="var(--vn-motion-secondary)" strokeWidth="1.2" strokeDasharray="3 3" />
        <circle cx="194" cy="165" r="5" fill="var(--vn-motion-primary)" />
        <circle className="vn-progress-dot" cx="170" cy="195" r="3" fill="var(--vn-motion-primary)" />
        <circle className="vn-progress-dot vn-dot-2" cx="170" cy="195" r="3" fill="var(--vn-motion-secondary)" />
        <circle className="vn-progress-dot vn-dot-3" cx="170" cy="195" r="3" fill="var(--vn-motion-border)" />
        <g className="vn-check-badge"><circle cx="292" cy="165" r="13" fill="var(--vn-motion-primary)" /><path className="vn-check-path" d="M285 165 L289 169 L299 161" stroke="var(--vn-motion-card)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
      </g>
    </svg>
  );
}

function ThemeSvg() {
  return (
    <svg className="vn-theme-engine" viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Theme preview">
      <BaseDefs />
      <circle cx="250" cy="145" r="110" fill="var(--vn-theme-bg)" opacity="0.8" filter="blur(35px)" />
      <circle className="vn-color-wave" cx="250" cy="145" r="100" />
      <g className="vn-app-card" filter="url(#vnSoftShadow)">
        <rect x="130" y="70" width="240" height="150" rx="20" fill="var(--vn-theme-bg)" stroke="var(--vn-theme-border)" />
        <circle cx="155" cy="85" r="3" fill="#EF4444" opacity="0.8" />
        <circle cx="165" cy="85" r="3" fill="#F59E0B" opacity="0.8" />
        <circle cx="175" cy="85" r="3" fill="#10B981" opacity="0.8" />
        <rect x="142" y="105" width="45" height="100" rx="10" fill="var(--vn-theme-card)" opacity="0.5" />
        <rect x="147" y="115" width="35" height="14" rx="5" fill="var(--vn-theme-primary)" />
        <rect x="197" y="105" width="160" height="100" rx="12" fill="var(--vn-theme-card)" />
        <rect x="212" y="123" width="80" height="7" rx="3.5" fill="var(--vn-theme-text)" opacity="0.85" />
        <rect x="212" y="137" width="50" height="5" rx="2.5" fill="var(--vn-theme-secondary)" opacity="0.6" />
        <circle cx="317" cy="155" r="14" stroke="var(--vn-theme-border)" strokeWidth="2.5" />
        <circle cx="317" cy="155" r="14" stroke="var(--vn-theme-primary)" strokeWidth="3.5" strokeDasharray="88" strokeDashoffset="30" strokeLinecap="round" />
      </g>
      <g className="vn-droplet-icon">
        <circle cx="370" cy="67" r="15" fill="var(--vn-theme-card)" stroke="var(--vn-theme-border)" filter="url(#vnSoftShadow)" />
        <path d="M370 57 C365 57 361 62 361 67 C361 72 365 76 370 76 C375 76 379 72 379 67 C379 62 375 57 370 57 Z" fill="var(--vn-theme-primary)" />
      </g>
      {[170, 210, 250, 290, 330].map((cx, index) => <circle key={cx} cx={cx} cy="255" r="7" fill={['var(--vn-motion-primary)', '#3B82F6', '#D97706', '#10B981', '#818CF8'][index]} />)}
      <g className="vn-selector-ring"><circle cx="170" cy="255" r="11" stroke="var(--vn-theme-primary)" strokeWidth="2" /></g>
    </svg>
  );
}

const renderers: Record<MotionVariant, () => ReactNode> = {
  notFound: NotFoundSvg,
  progressEmpty: ProgressEmptySvg,
  visionCreated: VisionCreatedSvg,
  taskCompleted: TaskCompletedSvg,
  progressLoader: ProgressLoaderSvg,
  cookie: CookieSvg,
  privacy: PrivacySvg,
  error: ErrorSvg,
  circleEmpty: CircleEmptySvg,
  reportSent: ReportSentSvg,
  waitlist: WaitlistSvg,
  theme: ThemeSvg
};

export function VisNovaMotion({ variant, className }: VisNovaMotionProps) {
  const Renderer = renderers[variant];
  return (
    <div className={cn('vn-motion mx-auto aspect-[16/10] w-full max-w-md', className)}>
      <style>{styles}</style>
      <Renderer />
    </div>
  );
}

export default VisNovaMotion;
