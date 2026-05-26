import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type MotionVariant =
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
  | 'theme'
  | 'postPublished'
  | 'progressLogPosted'
  | 'journalSaved'
  | 'noteSaved'
  | 'visionBoardItemAdded'
  | 'resourceSaved'
  | 'addedToCart'
  | 'helpRequestPosted'
  | 'nudgeSent'
  | 'visionTeamInvite'
  | 'publicPostShared'
  | 'milestoneReached'
  | 'weeklySprintCompleted';

type VisNovaMotionProps = {
  variant: MotionVariant;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  decorative?: boolean;
  ariaLabel?: string;
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
.vn-action-float { transform-origin: center; animation: vnActionFloat 4.5s ease-in-out infinite alternate; }
.vn-action-card-in { transform-box: fill-box; transform-origin: center; animation: vnActionCardIn 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-card-settle { transform-box: fill-box; transform-origin: center; animation: vnActionSettle 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-card-fly { transform-box: fill-box; transform-origin: center; animation: vnActionFly 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-card-slide { transform-box: fill-box; transform-origin: center; animation: vnActionSlide 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-board-card { transform-box: fill-box; transform-origin: center; animation: vnActionBoardCard 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-folder { transform-box: fill-box; transform-origin: bottom center; animation: vnActionSquash 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-line { stroke-dasharray: 150; stroke-dashoffset: 150; animation: vnActionDrawLine 9s ease-in-out infinite; }
.vn-action-line-long { stroke-dasharray: 330; stroke-dashoffset: 330; animation: vnActionDrawLine 9s ease-in-out infinite; }
.vn-action-progress { stroke-dasharray: 240; stroke-dashoffset: 240; animation: vnActionProgress 9s ease-in-out infinite; }
.vn-action-badge { transform-box: fill-box; transform-origin: center; animation: vnActionBadge 9s cubic-bezier(.34,1.56,.64,1) infinite; }
.vn-action-check { stroke-dasharray: 24; stroke-dashoffset: 24; animation: vnActionCheck 9s ease-out infinite; }
.vn-action-ripple { transform-box: fill-box; transform-origin: center; animation: vnActionRipple 9s cubic-bezier(.16,1,.3,1) infinite; }
.vn-action-sparkle { transform-box: fill-box; transform-origin: center; animation: vnActionSparkle 9s cubic-bezier(.16,1,.3,1) infinite; }
.vn-action-dot { offset-path: path('M 280 140 Q 370 100 460 160'); animation: vnActionDotTravel 9s linear infinite; }
.vn-action-drop { transform-box: fill-box; transform-origin: center; animation: vnActionDrop 9s cubic-bezier(.4,0,.2,1) infinite; }
.vn-action-plane { offset-path: path('M 150 190 C 160 120, 220 70, 290 120 C 340 150, 370 120, 450 135'); offset-rotate: auto 180deg; transform-origin: center; animation: vnActionPlane 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-bubble { offset-path: path('M 160 150 Q 300 80 440 150'); transform-origin: center; animation: vnActionBubble 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-swing { transform-box: fill-box; transform-origin: 50% 5%; animation: vnActionSwing 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-pin { transform-box: fill-box; transform-origin: center; animation: vnActionPin 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-write { stroke-dasharray: 100; stroke-dashoffset: 100; animation: vnActionWrite 9s ease-in-out infinite; }
.vn-action-pen { transform-box: fill-box; transform-origin: center; animation: vnActionPen 9s ease-in-out infinite; }
.vn-action-bookmark { transform-box: fill-box; transform-origin: top center; animation: vnActionBookmark 9s cubic-bezier(.25,1,.5,1) infinite; }
.vn-action-pop-1 { animation-delay: .2s; }
.vn-action-pop-2 { animation-delay: .45s; }
.vn-action-pop-3 { animation-delay: .7s; }
.vn-action-pop-4 { animation-delay: .95s; }
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
@keyframes vnActionFloat { from { transform:translateY(0) rotate(0); } to { transform:translateY(-4px) rotate(.45deg); } }
@keyframes vnActionCardIn { 0% { transform:scale(.75) translateY(18px); opacity:0; } 12% { transform:scale(1.06); opacity:1; } 18%,82% { transform:scale(1); opacity:1; } 92%,100% { transform:scale(.86) translateY(16px); opacity:0; } }
@keyframes vnActionSettle { 0%,36% { transform:scale(1); } 42% { transform:scaleY(.92) scaleX(1.04); } 48%,100% { transform:scale(1); } }
@keyframes vnActionFly { 0%,18% { transform:translate(0,0) scale(0); opacity:0; } 28% { transform:translate(0,0) scale(1); opacity:1; } 44% { transform:translate(185px,8px) scale(.62); opacity:1; } 48%,100% { transform:translate(185px,8px) scale(.62); opacity:0; } }
@keyframes vnActionSlide { 0% { transform:translateY(-105px) rotate(-7deg); opacity:0; } 14%,82% { transform:translateY(0) rotate(0); opacity:1; } 92%,100% { transform:translateY(24px) scale(.9); opacity:0; } }
@keyframes vnActionBoardCard { 0% { transform:translate(-90px,-60px) scale(.6) rotate(-8deg); opacity:0; } 16% { transform:translate(0,0) scale(1.04) rotate(1deg); opacity:1; } 24%,82% { transform:translate(0,0) scale(1) rotate(0); opacity:1; } 92%,100% { transform:scale(.85); opacity:0; } }
@keyframes vnActionSquash { 0%,13% { transform:scale(1); } 17% { transform:scaleY(.94) scaleX(1.03); } 23%,100% { transform:scale(1); } }
@keyframes vnActionDrawLine { 0%,28% { stroke-dashoffset:150; opacity:0; } 36%,82% { stroke-dashoffset:0; opacity:.75; } 92%,100% { stroke-dashoffset:150; opacity:0; } }
@keyframes vnActionProgress { 0% { stroke-dashoffset:240; opacity:1; } 34%,82% { stroke-dashoffset:0; opacity:1; } 92%,100% { stroke-dashoffset:240; opacity:0; } }
@keyframes vnActionBadge { 0%,30% { transform:scale(0); opacity:0; } 40% { transform:scale(1.12); opacity:1; } 46%,82% { transform:scale(1); opacity:1; } 92%,100% { transform:scale(0); opacity:0; } }
@keyframes vnActionCheck { 0%,36% { stroke-dashoffset:24; } 48%,82% { stroke-dashoffset:0; } 92%,100% { stroke-dashoffset:24; } }
@keyframes vnActionRipple { 0%,28% { transform:scale(.45); opacity:0; } 36% { opacity:.75; } 48%,100% { transform:scale(2.1); opacity:0; } }
@keyframes vnActionSparkle { 0%,38% { transform:scale(0) rotate(0); opacity:0; } 48% { transform:scale(1.2) rotate(45deg); opacity:1; } 58%,100% { transform:scale(.7) rotate(90deg); opacity:0; } }
@keyframes vnActionDotTravel { 0%,50% { offset-distance:0%; opacity:0; transform:scale(0); } 56% { opacity:1; transform:scale(1.15); } 70% { offset-distance:100%; opacity:1; transform:scale(1); } 76%,100% { offset-distance:100%; opacity:0; transform:scale(0); } }
@keyframes vnActionDrop { 0%,14% { transform:translateY(0); opacity:0; } 18% { opacity:1; } 28% { transform:translateY(86px); opacity:1; } 34%,100% { transform:translateY(86px) scale(0); opacity:0; } }
@keyframes vnActionPlane { 0%,14% { offset-distance:0%; opacity:0; transform:scale(0); } 18% { opacity:1; transform:scale(1); } 40% { offset-distance:100%; opacity:1; transform:scale(1); } 46%,100% { offset-distance:100%; opacity:0; transform:scale(0); } }
@keyframes vnActionBubble { 0%,10% { offset-distance:0%; opacity:0; transform:scale(0); } 16%,28% { opacity:1; transform:scale(1); offset-distance:0%; } 44% { offset-distance:100%; opacity:1; transform:scale(1); } 50%,100% { offset-distance:100%; opacity:0; transform:scale(0); } }
@keyframes vnActionSwing { 0% { transform:translateY(-145px) rotate(-12deg) scale(.85); opacity:0; } 16% { transform:translateY(0) rotate(-5deg) scale(1); opacity:1; } 35% { transform:rotate(4deg); } 43% { transform:rotate(-2deg); } 52%,82% { transform:rotate(0); opacity:1; } 92%,100% { transform:scale(.9) translateY(36px); opacity:0; } }
@keyframes vnActionPin { 0%,26% { transform:translateY(-38px); opacity:0; } 34%,82% { transform:translateY(0); opacity:1; } 92%,100% { transform:translateY(-20px); opacity:0; } }
@keyframes vnActionWrite { 0%,18% { stroke-dashoffset:100; opacity:0; } 24% { opacity:1; } 38%,82% { stroke-dashoffset:0; opacity:1; } 92%,100% { stroke-dashoffset:100; opacity:0; } }
@keyframes vnActionPen { 0%,15% { transform:translate(130px,125px) scale(0); opacity:0; } 20% { transform:translate(185px,120px) scale(1); opacity:1; } 28% { transform:translate(115px,150px) scale(1); } 36% { transform:translate(205px,170px) scale(1); } 42%,100% { transform:translate(220px,155px) scale(0); opacity:0; } }
@keyframes vnActionBookmark { 0%,32% { transform:translateY(-54px); opacity:0; } 42%,82% { transform:translateY(0); opacity:1; } 92%,100% { transform:translateY(-54px); opacity:0; } }
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

function MiniCheck({ cx, cy, r = 10 }: { cx: number; cy: number; r?: number }) {
  return (
    <g className="vn-action-badge">
      <circle cx={cx} cy={cy} r={r} fill="var(--vn-motion-primary)" filter="url(#vnSoftShadow)" />
      <path className="vn-action-check" d={`M ${cx - r * 0.4} ${cy} L ${cx - r * 0.12} ${cy + r * 0.32} L ${cx + r * 0.46} ${cy - r * 0.38}`} stroke="var(--vn-motion-contrast)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  );
}

function MiniAvatar({ cx, cy, fill = 'var(--vn-motion-primary)' }: { cx: number; cy: number; fill?: string }) {
  return (
    <g filter="url(#vnSoftShadow)">
      <circle cx={cx} cy={cy} r="18" fill={fill} />
      <circle cx={cx} cy={cy - 6} r="5" fill="var(--vn-motion-contrast)" />
      <path d={`M ${cx - 9} ${cy + 11} C ${cx - 9} ${cy + 6} ${cx - 5} ${cy + 3} ${cx} ${cy + 3} C ${cx + 5} ${cy + 3} ${cx + 9} ${cy + 6} ${cx + 9} ${cy + 11} Z`} fill="var(--vn-motion-contrast)" />
    </g>
  );
}

function VisionCardMini({ x, y }: { x: number; y: number }) {
  return (
    <g filter="url(#vnSoftShadow)">
      <rect x={x} y={y} width="140" height="80" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" />
      <circle cx={x + 30} cy={y + 40} r="12" fill="var(--vn-motion-secondary)" opacity="0.15" />
      <circle cx={x + 30} cy={y + 40} r="7" stroke="var(--vn-motion-primary)" strokeWidth="2" />
      <circle cx={x + 30} cy={y + 40} r="2" fill="var(--vn-motion-primary)" />
      <rect x={x + 50} y={y + 31} width="70" height="6" rx="3" fill="var(--vn-motion-text)" opacity="0.85" />
      <rect x={x + 50} y={y + 43} width="45" height="5" rx="2.5" fill="var(--vn-motion-secondary)" opacity="0.6" />
    </g>
  );
}

function PostPublishedSvg() {
  return (
    <svg viewBox="0 0 600 320" width="100%" height="100%" fill="none" role="img" aria-label="Post published">
      <BaseDefs />
      <circle cx="300" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <path className="vn-action-line" d="M280 140 Q370 100 460 160" stroke="var(--vn-motion-border)" strokeWidth="2" strokeLinecap="round" />
      <circle className="vn-action-dot" cx="0" cy="0" r="4.5" fill="var(--vn-motion-primary)" />
      <g className="vn-action-float">
        <g>
          <circle cx="460" cy="160" r="28" stroke="var(--vn-motion-border)" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="460" cy="160" r="18" fill="var(--vn-motion-secondary)" opacity="0.15" />
          <circle cx="460" cy="160" r="11" stroke="var(--vn-motion-primary)" strokeWidth="2.5" />
          <circle cx="460" cy="160" r="4" fill="var(--vn-motion-primary)" />
        </g>
        <rect x="110" y="190" width="170" height="80" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" opacity="0.25" filter="url(#vnSoftShadow)" />
        <rect x="110" y="145" width="170" height="80" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" opacity="0.6" filter="url(#vnSoftShadow)" />
      </g>
      <g className="vn-action-card-in">
        <rect x="215" y="140" width="170" height="80" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" strokeWidth="1.5" filter="url(#vnSoftShadow)" />
        <circle cx="239" cy="164" r="8" fill="var(--vn-motion-secondary)" />
        <rect x="253" y="158" width="60" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.8" />
        <rect x="253" y="167" width="40" height="4" rx="2" fill="var(--vn-motion-text)" opacity="0.4" />
        <rect x="231" y="184" width="138" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.6" />
        <rect x="231" y="195" width="90" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.6" />
        <rect x="315" y="156" width="34" height="12" rx="6" fill="var(--vn-motion-primary)" />
        <text x="332" y="165" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="7" fill="var(--vn-motion-contrast)" textAnchor="middle">PROOF</text>
        <MiniCheck cx={361} cy={196} r={10} />
      </g>
    </svg>
  );
}

function ProgressLogPostedSvg() {
  return (
    <svg viewBox="0 0 600 320" width="100%" height="100%" fill="none" role="img" aria-label="Proof logged">
      <BaseDefs />
      <circle cx="300" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <path d="M120 240 H480" stroke="var(--vn-motion-border)" strokeWidth="3" strokeLinecap="round" />
      <path className="vn-action-progress" d="M430 240 L170 240" stroke="var(--vn-motion-primary)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="170" cy="240" r="8" fill="var(--vn-motion-primary)" stroke="var(--vn-motion-card)" strokeWidth="2.5" filter="url(#vnGlow)" />
      <circle cx="430" cy="240" r="8" stroke="var(--vn-motion-border)" strokeWidth="2" fill="none" />
      <circle className="vn-action-ripple" cx="430" cy="240" r="8" stroke="var(--vn-motion-primary)" strokeWidth="2" fill="none" />
      <g className="vn-action-float">
        <path d="M170 154 V240" stroke="var(--vn-motion-border)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6" />
        <path className="vn-action-line" d="M360 117 H240" stroke="var(--vn-motion-primary)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
        <VisionCardMini x={100} y={80} />
        <g className="vn-action-card-slide" filter="url(#vnSoftShadow)">
          <rect x="360" y="80" width="140" height="74" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" strokeWidth="1.5" />
          <circle cx="390" cy="117" r="10" fill="var(--vn-motion-secondary)" opacity="0.15" />
          <rect x="410" y="108" width="65" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.85" />
          <rect x="410" y="119" width="45" height="4" rx="2" fill="var(--vn-motion-secondary)" opacity="0.6" />
          <MiniCheck cx={390} cy={117} r={10} />
        </g>
      </g>
      <circle className="vn-action-drop" cx="430" cy="154" r="6" fill="var(--vn-motion-primary)" filter="url(#vnGlow)" />
    </svg>
  );
}

function JournalSavedSvg() {
  return (
    <svg viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Journal saved">
      <BaseDefs />
      <circle cx="250" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <g className="vn-action-float">
        <g className="vn-action-card-in" filter="url(#vnSoftShadow)">
          <rect x="135" y="76" width="112" height="158" rx="12" fill="var(--vn-motion-primary)" />
          <rect x="253" y="76" width="112" height="158" rx="12" fill="var(--vn-motion-primary)" />
          <rect x="247" y="76" width="6" height="158" fill="var(--vn-motion-border)" />
          <rect x="140" y="80" width="105" height="150" rx="10" fill="var(--vn-motion-card)" />
          <rect x="255" y="80" width="105" height="150" rx="10" fill="var(--vn-motion-card)" />
          <path d="M148 85 V225 M352 85 V225" stroke="var(--vn-motion-border)" strokeWidth="1" strokeDasharray="2 3" />
          <g stroke="var(--vn-motion-text)" strokeWidth="2" strokeLinecap="round" fill="none">
            <path className="vn-action-write" d="M268 115 Q285 113 301 116 Q317 113 325 115" />
            <path className="vn-action-write vn-action-pop-1" d="M268 135 Q285 133 301 136 Q317 133 325 135" />
            <path className="vn-action-write vn-action-pop-2" d="M268 155 Q285 153 301 156 Q317 153 325 155" />
          </g>
          <g className="vn-action-badge">
            <rect x="178" y="140" width="28" height="20" rx="6" fill="var(--vn-motion-primary)" />
            <path d="M184 140 V134 C184 129.5 192 129.5 192 134 V140" stroke="var(--vn-motion-primary)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="192" cy="150" r="1.5" fill="var(--vn-motion-contrast)" />
          </g>
          <path className="vn-action-bookmark" d="M315 76 V125 L320 121 L325 125 V76 Z" fill="var(--vn-motion-secondary)" />
        </g>
        <g className="vn-action-pen">
          <path d="M12 -12 L32 -32 L36 -28 L16 -8 Z" fill="var(--vn-motion-text)" opacity="0.8" />
          <polygon points="12,-12 16,-8 6,-6" fill="var(--vn-motion-primary)" />
        </g>
      </g>
    </svg>
  );
}

function NoteSavedSvg() {
  return (
    <svg viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Note saved">
      <BaseDefs />
      <circle cx="250" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <rect x="120" y="70" width="260" height="170" rx="24" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" filter="url(#vnSoftShadow)" />
      <g opacity="0.45">{[150, 190, 230, 270, 310, 350].map((x) => <circle key={x} cx={x} cy="105" r="1.2" fill="var(--vn-motion-border)" />)}</g>
      <g className="vn-action-swing">
        <path d="M180 100 H320 V190 L300 210 H180 Z" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" strokeWidth="1.2" filter="url(#vnSoftShadow)" />
        <path d="M320 190 C310 190 300 200 300 210 C300 200 310 200 320 190 Z" fill="var(--vn-motion-secondary)" />
        <rect x="195" y="112" width="42" height="14" rx="7" fill="var(--vn-motion-secondary)" opacity="0.2" />
        <rect x="203" y="117" width="26" height="4" rx="2" fill="var(--vn-motion-text)" />
        <rect x="195" y="142" width="110" height="6" rx="3" fill="var(--vn-motion-text)" opacity="0.85" />
        <rect x="195" y="154" width="85" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.4" />
        <rect x="195" y="166" width="60" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.4" />
        <MiniCheck cx={290} cy={119} r={10} />
      </g>
      <g className="vn-action-pin">
        <circle cx="250" cy="102" r="5" fill="var(--vn-motion-primary)" filter="url(#vnGlow)" />
        <path d="M250 102 L253 108" stroke="var(--vn-motion-text)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

function VisionBoardItemAddedSvg() {
  return (
    <svg viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Board item added">
      <BaseDefs />
      <circle cx="250" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <rect x="105" y="70" width="290" height="180" rx="24" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" filter="url(#vnSoftShadow)" />
      <path className="vn-action-line-long" d="M145 115 H355 M145 165 H355 M145 215 H355 M185 95 V235 M315 95 V235" stroke="var(--vn-motion-border)" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.55" />
      <g className="vn-action-board-card">
        <rect x="190" y="120" width="120" height="80" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-primary)" strokeWidth="1.5" filter="url(#vnSoftShadow)" />
        <rect x="207" y="140" width="64" height="7" rx="3.5" fill="var(--vn-motion-text)" opacity="0.85" />
        <rect x="207" y="154" width="43" height="5" rx="2.5" fill="var(--vn-motion-secondary)" opacity="0.65" />
        <circle cx="286" cy="145" r="10" fill="var(--vn-motion-soft)" />
      </g>
      <MiniCheck cx={310} cy={118} r={11} />
    </svg>
  );
}

function ResourceSavedSvg() {
  return (
    <svg viewBox="0 0 600 320" width="100%" height="100%" fill="none" role="img" aria-label="Resource saved">
      <BaseDefs />
      <circle cx="300" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <g className="vn-action-float">
        <path className="vn-action-line" d="M370 170 H240" stroke="var(--vn-motion-primary)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
        <VisionCardMini x={100} y={130} />
        <rect x="375" y="125" width="130" height="90" rx="14" fill="var(--vn-motion-secondary)" opacity="0.15" stroke="var(--vn-motion-border)" />
        <g className="vn-action-card-slide">
          <rect x="390" y="130" width="100" height="65" rx="11" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" />
          <rect x="402" y="142" width="76" height="24" rx="6" fill="var(--vn-motion-secondary)" opacity="0.1" />
          <path d="M440 146 L442 151 H447 L443 154 L445 159 L440 156 L435 159 L437 154 L433 151 H438 Z" fill="var(--vn-motion-primary)" opacity="0.85" />
          <rect x="402" y="174" width="50" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.85" />
        </g>
        <g className="vn-action-folder">
          <path d="M380 145 V138 C380 135 383 132 387 132 H425 C429 132 432 135 432 138 V145 Z" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" />
          <rect x="370" y="145" width="140" height="75" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" strokeWidth="1.5" filter="url(#vnSoftShadow)" />
          <rect x="385" y="160" width="60" height="5" rx="2.5" fill="var(--vn-motion-secondary)" opacity="0.4" />
        </g>
        <MiniCheck cx={485} cy={145} r={9} />
      </g>
    </svg>
  );
}

function AddedToCartSvg() {
  return (
    <svg viewBox="0 0 500 320" width="100%" height="100%" fill="none" role="img" aria-label="Added to cart">
      <BaseDefs />
      <circle cx="250" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <g className="vn-action-float">
        <path className="vn-action-line" d="M195 170 Q275 180 345 170" stroke="var(--vn-motion-primary)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
        <g className="vn-action-card-fly">
          <rect x="110" y="120" width="100" height="66" rx="12" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" filter="url(#vnSoftShadow)" />
          <rect x="122" y="132" width="40" height="24" rx="4" fill="var(--vn-motion-secondary)" opacity="0.2" />
          <rect x="122" y="164" width="60" height="4" rx="2" fill="var(--vn-motion-text)" opacity="0.8" />
        </g>
        <path d="M315 140 H385 L378 185 C378 190 373 194 367 194 H333 C327 194 322 190 322 185 Z" fill="var(--vn-motion-secondary)" opacity="0.1" />
        <g className="vn-action-folder">
          <path d="M315 140 H385 L378 185 C378 190 373 194 367 194 H333 C327 194 322 190 322 185 Z" fill="var(--vn-motion-card)" stroke="var(--vn-motion-primary)" strokeWidth="2" filter="url(#vnSoftShadow)" />
          <path d="M330 152 V183 M350 152 V186 M370 152 V183" stroke="var(--vn-motion-border)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M326 140 C326 122 374 122 374 140" stroke="var(--vn-motion-border)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
        <MiniCheck cx={350} cy={165} r={9} />
        <g className="vn-action-badge"><circle cx="376" cy="132" r="9" fill="var(--vn-motion-primary)" /><text x="376" y="135" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="9" fill="var(--vn-motion-contrast)" textAnchor="middle">1</text></g>
      </g>
    </svg>
  );
}

function HelpRequestPostedSvg() {
  return (
    <svg viewBox="0 0 600 320" width="100%" height="100%" fill="none" role="img" aria-label="Help request posted">
      <BaseDefs />
      <circle cx="300" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <g className="vn-action-float">
        <path className="vn-action-line-long" d="M265 125 Q350 100 440 110 M265 125 Q345 190 440 230" stroke="var(--vn-motion-secondary)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4" />
        <MiniAvatar cx={440} cy={110} fill="var(--vn-motion-secondary)" />
        <MiniAvatar cx={440} cy={230} fill="var(--vn-motion-primary)" />
        <circle className="vn-action-ripple" cx="440" cy="110" r="18" stroke="var(--vn-motion-primary)" strokeWidth="1.5" fill="none" />
        <circle className="vn-action-ripple" cx="440" cy="230" r="18" stroke="var(--vn-motion-primary)" strokeWidth="1.5" fill="none" />
        <g className="vn-action-card-in">
          <rect x="120" y="125" width="160" height="90" rx="16" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" strokeWidth="1.5" filter="url(#vnSoftShadow)" />
          <circle cx="145" cy="155" r="8" fill="var(--vn-motion-secondary)" opacity="0.2" />
          <rect x="160" y="151" width="75" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.8" />
          <rect x="137" y="178" width="125" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.4" />
          <g className="vn-action-badge"><circle cx="265" cy="125" r="15" fill="var(--vn-motion-primary)" filter="url(#vnSoftShadow)" /><text x="265" y="130" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="var(--vn-motion-contrast)" textAnchor="middle">?</text></g>
        </g>
      </g>
    </svg>
  );
}

function NudgeSentSvg() {
  return (
    <svg viewBox="0 0 600 320" width="100%" height="100%" fill="none" role="img" aria-label="Nudge sent">
      <BaseDefs />
      <circle cx="300" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <g className="vn-action-float">
        <path className="vn-action-line-long" d="M160 150 Q300 80 440 150" stroke="var(--vn-motion-secondary)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4" />
        <MiniAvatar cx={160} cy={180} fill="var(--vn-motion-secondary)" />
        <MiniAvatar cx={440} cy={180} fill="var(--vn-motion-primary)" />
        <circle className="vn-action-ripple" cx="440" cy="180" r="18" stroke="var(--vn-motion-primary)" strokeWidth="1.5" fill="none" />
        <g className="vn-action-bubble">
          <circle cx="0" cy="0" r="14" fill="var(--vn-motion-primary)" filter="url(#vnSoftShadow)" />
          <path d="M0 -5 C-2.5 -7.5 -6 -5 -6 -2.5 C-6 1 -1.5 4 0 5 C1.5 4 6 1 6 -2.5 C6 -5 2.5 -7.5 0 -5 Z" fill="var(--vn-motion-contrast)" />
        </g>
        <MiniCheck cx={440} cy={150} r={14} />
      </g>
    </svg>
  );
}

function VisionTeamInviteSvg() {
  return (
    <svg viewBox="0 0 600 320" width="100%" height="100%" fill="none" role="img" aria-label="Invite link ready">
      <BaseDefs />
      <circle cx="300" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <g className="vn-action-float">
        <VisionCardMini x={90} y={120} />
        <path className="vn-action-line" d="M240 160 H350" stroke="var(--vn-motion-primary)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
        <g className="vn-action-card-in">
          <rect x="350" y="104" width="160" height="110" rx="18" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" filter="url(#vnSoftShadow)" />
          <rect x="372" y="127" width="82" height="7" rx="3.5" fill="var(--vn-motion-text)" opacity="0.85" />
          <rect x="372" y="143" width="108" height="6" rx="3" fill="var(--vn-motion-secondary)" opacity="0.45" />
          <g transform="translate(374 174)">
            <MiniAvatar cx={0} cy={0} fill="var(--vn-motion-primary)" />
            <MiniAvatar cx={26} cy={0} fill="var(--vn-motion-secondary)" />
            <circle cx="52" cy="0" r="18" fill="var(--vn-motion-soft)" stroke="var(--vn-motion-border)" />
            <text x="52" y="4" fontFamily="system-ui" fontWeight="800" fontSize="13" fill="var(--vn-motion-primary)" textAnchor="middle">+</text>
          </g>
          <MiniCheck cx={488} cy={112} r={10} />
        </g>
      </g>
    </svg>
  );
}

function PublicPostSharedSvg() {
  return (
    <svg viewBox="0 0 600 320" width="100%" height="100%" fill="none" role="img" aria-label="Shared publicly">
      <BaseDefs />
      <circle cx="300" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <g className="vn-action-float">
        <path className="vn-action-line-long" d="M150 190 C160 120,220 70,290 120 C340 150,370 120,450 135" stroke="var(--vn-motion-secondary)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4" />
        <g filter="url(#vnSoftShadow)">
          <rect x="85" y="150" width="130" height="80" rx="16" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" />
          <circle cx="115" cy="180" r="12" fill="var(--vn-motion-secondary)" opacity="0.2" />
          <rect x="135" y="176" width="55" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.8" />
        </g>
        <rect x="385" y="145" width="130" height="80" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" opacity="0.25" filter="url(#vnSoftShadow)" />
        <rect x="385" y="110" width="130" height="80" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" opacity="0.6" filter="url(#vnSoftShadow)" />
        <g className="vn-action-card-in">
          <rect x="385" y="75" width="130" height="80" rx="14" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" filter="url(#vnSoftShadow)" />
          <rect x="414" y="90" width="45" height="4" rx="2" fill="var(--vn-motion-text)" opacity="0.8" />
          <rect x="399" y="108" width="102" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.6" />
          <rect x="399" y="118" width="75" height="5" rx="2.5" fill="var(--vn-motion-text)" opacity="0.6" />
          <MiniCheck cx={501} cy={86} r={8} />
        </g>
        <g className="vn-action-plane">
          <path d="M0 0 L-15 -5 L-8 -2 L-15 5 Z" fill="var(--vn-motion-primary)" />
          <path d="M0 0 L-8 -2 L-5 3 Z" fill="var(--vn-motion-secondary)" opacity="0.85" />
        </g>
      </g>
    </svg>
  );
}

function MilestoneReachedSvg() {
  return (
    <svg viewBox="0 0 600 320" width="100%" height="100%" fill="none" role="img" aria-label="Milestone reached">
      <BaseDefs />
      <circle cx="300" cy="180" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <g className="vn-action-float">
        <path d="M120 220 H480" stroke="var(--vn-motion-border)" strokeWidth="4" strokeLinecap="round" />
        <path className="vn-action-progress" d="M150 220 H300" stroke="var(--vn-motion-primary)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="150" cy="220" r="8" fill="var(--vn-motion-primary)" stroke="var(--vn-motion-card)" strokeWidth="2.5" filter="url(#vnGlow)" />
        <circle cx="450" cy="220" r="6" stroke="var(--vn-motion-border)" strokeWidth="2" fill="var(--vn-motion-card)" />
        <circle className="vn-action-ripple" cx="300" cy="220" r="10" stroke="var(--vn-motion-primary)" strokeWidth="2" fill="none" />
        <g className="vn-action-badge">
          <circle cx="300" cy="220" r="28" fill="var(--vn-motion-secondary)" opacity="0.15" />
          <circle cx="300" cy="220" r="28" stroke="var(--vn-motion-primary)" strokeWidth="2.2" filter="url(#vnSoftShadow)" />
          <circle cx="300" cy="220" r="22" stroke="var(--vn-motion-border)" strokeDasharray="2 3" />
          <path d="M300 206 L304 214 L313 214 L306 220 L309 229 L300 223 L291 229 L294 220 L287 214 L296 214 Z" fill="var(--vn-motion-primary)" />
        </g>
        <path className="vn-action-sparkle" d="M340 180 Q340 185 345 185 Q340 185 340 190 Q340 185 335 185 Q340 185 340 180 Z" fill="var(--vn-motion-primary)" />
      </g>
    </svg>
  );
}

function WeeklySprintCompletedSvg() {
  return (
    <svg viewBox="0 0 600 320" width="100%" height="100%" fill="none" role="img" aria-label="Weekly Sprint completed">
      <BaseDefs />
      <circle cx="300" cy="160" r="110" fill="var(--vn-motion-soft)" opacity="0.7" filter="blur(35px)" />
      <g className="vn-action-float">
        <path d="M150 130 H390" stroke="var(--vn-motion-border)" strokeWidth="4" strokeLinecap="round" />
        <path className="vn-action-progress" d="M150 130 H390" stroke="var(--vn-motion-primary)" strokeWidth="5" strokeLinecap="round" />
        {[150, 190, 230, 270, 310, 350].map((cx, index) => <circle className={`vn-action-badge vn-action-pop-${Math.min(index + 1, 4)}`} key={cx} cx={cx} cy="130" r="6" fill="var(--vn-motion-primary)" />)}
        <g fill="var(--vn-motion-text)" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="8" textAnchor="middle" opacity="0.6">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <text key={`${day}-${index}`} x={150 + index * 40} y="152">{day}</text>)}
        </g>
        <g className="vn-action-badge" filter="url(#vnSoftShadow)">
          <rect x="330" y="95" width="110" height="70" rx="16" fill="var(--vn-motion-card)" stroke="var(--vn-motion-border)" />
          <text x="385" y="116" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="8" fill="var(--vn-motion-text)" textAnchor="middle">SPRINT</text>
          <text x="385" y="126" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="7" fill="var(--vn-motion-secondary)" textAnchor="middle">COMPLETE</text>
          <MiniCheck cx={385} cy={143} r={9} />
        </g>
        <g className="vn-action-card-in">
          <MiniAvatar cx={230} cy={220} />
          <MiniAvatar cx={248} cy={220} fill="var(--vn-motion-secondary)" />
          <rect x="294" y="216" width="80" height="6" rx="3" fill="var(--vn-motion-text)" opacity="0.75" />
          <rect x="294" y="229" width="80" height="4" rx="2" fill="var(--vn-motion-secondary)" opacity="0.4" />
        </g>
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
  theme: ThemeSvg,
  postPublished: PostPublishedSvg,
  progressLogPosted: ProgressLogPostedSvg,
  journalSaved: JournalSavedSvg,
  noteSaved: NoteSavedSvg,
  visionBoardItemAdded: VisionBoardItemAddedSvg,
  resourceSaved: ResourceSavedSvg,
  addedToCart: AddedToCartSvg,
  helpRequestPosted: HelpRequestPostedSvg,
  nudgeSent: NudgeSentSvg,
  visionTeamInvite: VisionTeamInviteSvg,
  publicPostShared: PublicPostSharedSvg,
  milestoneReached: MilestoneReachedSvg,
  weeklySprintCompleted: WeeklySprintCompletedSvg
};

const sizeClasses = {
  sm: 'max-w-24',
  md: 'max-w-md',
  lg: 'max-w-2xl'
};

export function VisNovaMotion({ variant, className, size = 'md', decorative, ariaLabel }: VisNovaMotionProps) {
  const Renderer = renderers[variant];
  return (
    <div className={cn('vn-motion mx-auto aspect-[16/10] w-full', sizeClasses[size], className)} aria-hidden={decorative || undefined} aria-label={!decorative ? ariaLabel : undefined}>
      <style>{styles}</style>
      <Renderer />
    </div>
  );
}

export default VisNovaMotion;
