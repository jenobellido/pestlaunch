"use client";

import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MotionValue } from "motion/react";
import { subscribeTheme, themeColor } from "@/shared/lib/theme";

// The hero's 3D scene, "calls become insight": a ring of sound bars (a call, coloured by who's
// speaking, like the speaker timeline on a call page) sheds particles that spiral into a glowing
// core. It follows the pointer a little and tips back as the hero scrolls away.

const RING_RADIUS = 3.1;
const CORE_RADIUS = 0.82;

interface Palette {
  rep: THREE.Color;
  customer: THREE.Color;
  light: boolean;
}

function readPalette(): Palette {
  return {
    rep: new THREE.Color(themeColor("--accent") || "#6aa4ff"),
    // Lifted toward white on dark, so the two speakers read apart (both are blues).
    customer: new THREE.Color(themeColor("--sky") || "#7cc4fa").lerp(
      new THREE.Color("#ffffff"),
      document.documentElement.dataset.theme === "light" ? 0 : 0.35,
    ),
    light: document.documentElement.dataset.theme === "light",
  };
}

/** Speaker turns around the ring: alternating rep and customer stretches of uneven length. */
function speakerTurns(count: number): number[] {
  const sides: number[] = [];
  let side = 0;
  // Fixed lengths, so the ring looks the same on every load.
  const lengths = [14, 6, 9, 4, 18, 7, 5, 11, 8, 3, 16, 6, 10, 5];
  for (let i = 0; sides.length < count; i++) {
    const length = lengths[i % lengths.length];
    for (let j = 0; j < length && sides.length < count; j++) sides.push(side);
    side = 1 - side;
  }
  return sides;
}

/** Scratch object for building instance matrices; only used inside one frame at a time. */
const dummy = new THREE.Object3D();

/** How loud each bar is: layered waves travelling around the ring, louder near the pointer. */
function loudness(angle: number, time: number, pointerAngle: number, pointerPull: number) {
  const wave =
    Math.sin(angle * 3 + time * 1.1) * 0.5 +
    Math.sin(angle * 7 - time * 1.7) * 0.3 +
    Math.sin(angle * 13 + time * 2.4) * 0.2;
  const near = Math.cos(angle - pointerAngle) * 0.5 + 0.5;
  return Math.max(0, wave) + Math.pow(near, 6) * pointerPull;
}

function SoundRing({ count, palette, still }: { count: number; palette: Palette; still: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const sides = useMemo(() => speakerTurns(count), [count]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    sides.forEach((side, i) => m.setColorAt(i, side ? palette.customer : palette.rep));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [palette, sides]);

  useFrame(({ clock, pointer }) => {
    const m = mesh.current;
    if (!m) return;
    const time = still ? 2.2 : clock.elapsedTime;
    const pointerAngle = Math.atan2(-pointer.y, pointer.x);
    const pull = still ? 0 : Math.min(1, Math.hypot(pointer.x, pointer.y)) * 0.9;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      // Customer turns draw shorter, like the speaker timeline on a call page.
      const height = (0.14 + loudness(angle, time, pointerAngle, pull) * 1.25) * (sides[i] ? 0.72 : 1);
      dummy.position.set(Math.cos(angle) * RING_RADIUS, 0, Math.sin(angle) * RING_RADIUS);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <capsuleGeometry args={[0.045, 1, 4, 8]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={palette.light ? 0.9 : 1} />
    </instancedMesh>
  );
}

const streamVertex = /* glsl */ `
  attribute float aAngle;
  attribute float aSpeed;
  attribute float aOffset;
  attribute float aLift;
  attribute float aSide;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRing;
  uniform float uCore;
  varying float vAlpha;
  varying float vSide;

  void main() {
    float t = fract(uTime * aSpeed + aOffset);
    float pull = pow(t, 1.7);
    float r = mix(uRing, uCore, pull);
    float a = aAngle + pull * 1.6;
    vec3 p = vec3(cos(a) * r, aLift * (1.0 - pull), sin(a) * r);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (1.0 - pull * 0.45) / -mv.z;
    vAlpha = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.82, 1.0, t));
    vSide = aSide;
  }
`;

const streamFragment = /* glsl */ `
  uniform vec3 uRep;
  uniform vec3 uCustomer;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vSide;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = 1.0 - smoothstep(0.05, 0.5, d);
    gl_FragColor = vec4(mix(uRep, uCustomer, vSide), soft * vAlpha * uOpacity);
  }
`;

/** Particles leaving the ring and spiralling into the core: the call being understood. */
function Stream({ count, palette, still }: { count: number; palette: Palette; still: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const attributes = useMemo(() => {
    const random = mulberry32(7);
    const fill = (next: () => number) => Float32Array.from({ length: count }, next);
    return {
      position: new Float32Array(count * 3),
      aAngle: fill(() => random() * Math.PI * 2),
      aSpeed: fill(() => 0.05 + random() * 0.07),
      aOffset: fill(() => random()),
      aLift: fill(() => (random() - 0.5) * 1.6),
      aSide: fill(() => (random() < 0.62 ? 0 : 1)),
    };
  }, [count]);
  const args = useMemo(
    () =>
      [
        {
          vertexShader: streamVertex,
          fragmentShader: streamFragment,
          transparent: true,
          depthWrite: false,
          uniforms: {
            uTime: { value: 2.2 },
            uSize: { value: 34 },
            uPixelRatio: { value: 1 },
            uRing: { value: RING_RADIUS },
            uCore: { value: CORE_RADIUS * 0.6 },
            uRep: { value: new THREE.Color() },
            uCustomer: { value: new THREE.Color() },
            uOpacity: { value: 1 },
          },
        },
      ] as const,
    [],
  );

  useEffect(() => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uRep.value.copy(palette.rep);
    m.uniforms.uCustomer.value.copy(palette.customer);
    // Glowing additive dots read well on dark; on light they'd wash out, so blend normally.
    m.blending = palette.light ? THREE.NormalBlending : THREE.AdditiveBlending;
    m.uniforms.uOpacity.value = palette.light ? 0.7 : 0.9;
    m.needsUpdate = true;
  }, [palette]);

  useFrame(({ clock, gl }) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uPixelRatio.value = gl.getPixelRatio();
    if (!still) m.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attributes.position, 3]} />
        <bufferAttribute attach="attributes-aAngle" args={[attributes.aAngle, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[attributes.aSpeed, 1]} />
        <bufferAttribute attach="attributes-aOffset" args={[attributes.aOffset, 1]} />
        <bufferAttribute attach="attributes-aLift" args={[attributes.aLift, 1]} />
        <bufferAttribute attach="attributes-aSide" args={[attributes.aSide, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={material} args={args} />
    </points>
  );
}

const coreVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vFacing;

  void main() {
    float breath = 1.0 + sin(uTime * 1.4) * 0.035 + sin(position.y * 6.0 + uTime * 2.0) * 0.02;
    vec4 mv = modelViewMatrix * vec4(position * breath, 1.0);
    vFacing = normalize(normalMatrix * normalize(position)).z;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio / -mv.z;
  }
`;

const coreFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFacing;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = 1.0 - smoothstep(0.1, 0.5, d);
    float rim = 0.35 + 0.65 * (1.0 - abs(vFacing));
    gl_FragColor = vec4(uColor, soft * rim * uOpacity);
  }
`;

/** A sphere of points that breathes: the insight the call turns into. */
function Core({ palette, still }: { palette: Palette; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const positions = useMemo(() => {
    // Fibonacci sphere: evenly spread points, no clumps at the poles.
    const n = 760;
    const out = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      out.set([Math.cos(golden * i) * r * CORE_RADIUS, y * CORE_RADIUS, Math.sin(golden * i) * r * CORE_RADIUS], i * 3);
    }
    return out;
  }, []);
  const args = useMemo(
    () =>
      [
        {
          vertexShader: coreVertex,
          fragmentShader: coreFragment,
          transparent: true,
          depthWrite: false,
          uniforms: {
            uTime: { value: 2.2 },
            uSize: { value: 36 },
            uPixelRatio: { value: 1 },
            uColor: { value: new THREE.Color() },
            uOpacity: { value: 1 },
          },
        },
      ] as const,
    [],
  );

  useEffect(() => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uColor.value.copy(palette.rep);
    m.blending = palette.light ? THREE.NormalBlending : THREE.AdditiveBlending;
    m.uniforms.uOpacity.value = palette.light ? 0.75 : 1;
    m.needsUpdate = true;
  }, [palette]);

  useFrame(({ clock, gl }, delta) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uPixelRatio.value = gl.getPixelRatio();
    if (still) return;
    m.uniforms.uTime.value = clock.elapsedTime;
    if (group.current) group.current.rotation.y += delta * 0.18;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <shaderMaterial ref={material} args={args} />
      </points>
    </group>
  );
}

/** Tilts the whole scene toward the pointer and tips it back as the hero scrolls away. */
function Rig({
  children,
  progress,
  still,
}: {
  children: React.ReactNode;
  progress?: MotionValue<number>;
  still: boolean;
}) {
  const rig = useRef<THREE.Group>(null);
  useFrame(({ pointer, camera, size }, delta) => {
    const g = rig.current;
    if (!g) return;
    const scrolled = progress?.get() ?? 0;
    // Back the camera off until the whole ring fits, whatever shape the canvas is.
    const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
    const ring = RING_RADIUS * 2 * 1.18;
    const height = Math.max(ring / (size.width / size.height), ring * 0.95);
    const distance = height / (2 * Math.tan(fov / 2));
    const ease = 1 - Math.exp(-delta * 3);
    const targetX = 0.32 + scrolled * 0.55 + (still ? 0 : -pointer.y * 0.12);
    const targetZ = still ? 0 : -pointer.x * 0.1;
    g.rotation.x += (targetX - g.rotation.x) * ease;
    g.rotation.z += (targetZ - g.rotation.z) * ease;
    if (!still) g.rotation.y += delta * 0.06;
    camera.position.set(0, distance * 0.24, distance * (1 + scrolled * 0.3));
    camera.lookAt(0, 0, 0);
  });
  return (
    <group ref={rig} rotation={[0.32, 0, 0]}>
      {children}
    </group>
  );
}

/** Seeded random numbers, so the particle field is the same on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** If WebGL isn't available the scene just isn't drawn; the hero's CSS glow stays. */
class SceneBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** A media query as live state. */
function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The resolved theme ("light" or "dark"), following the theme switcher and the device. */
function useResolvedTheme() {
  return useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.dataset.theme ?? "dark",
    () => null,
  );
}

export function HeroScene({ progress }: { progress?: MotionValue<number> }) {
  const container = useRef<HTMLDivElement>(null);
  const theme = useResolvedTheme();
  // Colours are read from the CSS tokens whenever the theme changes.
  const palette = useMemo(() => (theme ? readPalette() : null), [theme]);
  const still = useMedia("(prefers-reduced-motion: reduce)");
  const small = useMedia("(max-width: 767px)");
  const [visible, setVisible] = useState(true);

  // Stop drawing while the hero is scrolled out of view.
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="size-full">
      {palette && (
        <SceneBoundary>
          <Canvas
            dpr={[1, 1.75]}
            camera={{ position: [0, 2.3, 8.6], fov: 36 }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            frameloop={!visible ? "never" : still ? "demand" : "always"}
            // The pointer is tracked across the whole page, not just the canvas, which sits behind text.
            eventSource={document.body}
            eventPrefix="client"
            aria-hidden
          >
            <Rig progress={progress} still={still}>
              <SoundRing count={small ? 84 : 132} palette={palette} still={still} />
              <Stream count={small ? 700 : 1500} palette={palette} still={still} />
              <Core palette={palette} still={still} />
            </Rig>
          </Canvas>
        </SceneBoundary>
      )}
    </div>
  );
}
