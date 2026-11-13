"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { CORNER, FACE_H, FACE_W, paintBack, paintFront, type CardBackData } from "./card-faces";

/** Card size in world units (5:7) and thickness. */
const W = 2.5;
const H = (W * FACE_H) / FACE_W;
const DEPTH = 0.035;
const BEVEL = 0.012;
const FACE_Z = DEPTH / 2 + BEVEL + 0.002;

/** Pointer travel (px) below which a press counts as a click (flip), not a drag. */
const CLICK_SLOP = 6;
const DRAG_SPEED = 0.011;
const MAX_TILT = 0.22;
const MAX_SCROLL_TURN = 0.45;

export type CardControls = {
  flip: () => void;
  /** Adds spin from the keyboard: x tips the card, y turns it. */
  nudge: (x: number, y: number) => void;
};

type SceneProps = {
  artUrl: string;
  data: CardBackData;
  /** 0 at rest, grows as the page scrolls on; turns the card slightly. */
  scrollTurn: () => number;
  /** Fired once the card textures are painted and the first frame is drawn. */
  onReady: () => void;
  running: boolean;
};

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A flat face in the card outline with UVs stretched over the whole card. */
function faceGeometry(shape: THREE.Shape) {
  const g = new THREE.ShapeGeometry(shape, 12);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  if (pos && uv) {
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
    uv.needsUpdate = true;
  }
  return g;
}

function canvasTexture(canvas: HTMLCanvasElement, maxAnisotropy: number) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

const foilVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** Gold foil: a sheen band that slides with the viewing angle and the light, tinted brass to pale cyan. */
const foilFragment = /* glsl */ `
  uniform vec2 uLight;
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float facing = dot(normalize(vNormal), normalize(vView));
    vec2 tilt = vec2(vNormal.x, vNormal.y) * 1.6 + uLight * 0.6;
    float d = (vUv.x * 0.9 + vUv.y * 0.6) - 0.75 + tilt.x * 0.55 - tilt.y * 0.35;
    float band = exp(-pow(d * 5.0, 2.0));
    float fine = 0.5 + 0.5 * sin((vUv.x * 1.3 - vUv.y) * 60.0 + tilt.x * 8.0);
    vec3 gold = vec3(1.0, 0.82, 0.48);
    vec3 cool = vec3(0.62, 0.92, 1.0);
    vec3 tint = mix(gold, cool, smoothstep(-0.25, 0.35, d));
    float a = (band * 0.55 + band * fine * 0.25 + 0.04) * uStrength * smoothstep(0.0, 0.25, facing);
    gl_FragColor = vec4(tint * a, 1.0);
  }
`;

/** Deterministic 0..1 noise, so the ember field is the same on every render. */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Drifting embers behind the card: one draw call, motion done in the shader. */
function Embers({ count = 110 }: { count?: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = (hash(i) - 0.5) * 7; // x
      seeds[i * 4 + 1] = hash(i + 0.31); // start height (0..1)
      seeds[i * 4 + 2] = -0.8 - hash(i + 0.57) * 2.2; // depth behind the card
      seeds[i * 4 + 3] = hash(i + 0.83); // speed / phase
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seeds, 4));
    return g;
  }, [count]);
  const [uniforms] = useState(() => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 } }));
  useFrame((state, dt) => {
    const u = material.current?.uniforms;
    if (!u?.uTime || !u.uPixelRatio) return;
    u.uTime.value += Math.min(dt, 0.05);
    u.uPixelRatio.value = state.viewport.dpr;
  });
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={
          /* glsl */ `
          attribute vec4 seed;
          uniform float uTime;
          uniform float uPixelRatio;
          varying float vGlow;
          void main() {
            float speed = 0.12 + seed.w * 0.22;
            float h = fract(seed.y + uTime * speed * 0.18);
            vec3 p = vec3(seed.x + sin(uTime * (0.6 + seed.w) + seed.w * 20.0) * 0.18, -2.6 + h * 5.4, seed.z);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            float flicker = 0.65 + 0.35 * sin(uTime * (3.0 + seed.w * 4.0) + seed.w * 50.0);
            vGlow = flicker * smoothstep(0.0, 0.15, h) * (1.0 - smoothstep(0.7, 1.0, h));
            gl_PointSize = (16.0 + seed.w * 22.0) * uPixelRatio / -mv.z;
          }
        `
        }
        fragmentShader={
          /* glsl */ `
          varying float vGlow;
          void main() {
            float r = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, r) * vGlow;
            gl_FragColor = vec4(vec3(1.0, 0.66, 0.28) * a * 1.4, a);
          }
        `
        }
      />
    </points>
  );
}

type Motion = {
  rx: number;
  ry: number;
  vx: number;
  vy: number;
  /** Face to settle on once the spin dies down (multiple of π), or null while free. */
  settle: number | null;
  tiltX: number;
  tiltY: number;
  hover: boolean;
  dragging: boolean;
};

const Card = forwardRef<CardControls, Omit<SceneProps, "running">>(function Card({ artUrl, data, scrollTurn, onReady }, ref) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const candle = useRef<THREE.PointLight>(null);
  const gl = useThree((s) => s.gl);
  const pointer = useThree((s) => s.pointer);
  const [faces, setFaces] = useState<{ front: THREE.Texture; back: THREE.Texture } | null>(null);
  const m = useRef<Motion>({ rx: 0, ry: -0.25, vx: 0, vy: 0.9, settle: null, tiltX: 0, tiltY: 0, hover: false, dragging: false });
  const foilMaterial = useRef<THREE.ShaderMaterial>(null);
  const [foil] = useState(() => ({ uLight: { value: new THREE.Vector2() }, uStrength: { value: 0.35 } }));

  const shape = useMemo(() => roundedRect(W, H, W * CORNER), []);
  const body = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 3, curveSegments: 12 });
    g.translate(0, 0, -DEPTH / 2);
    return g;
  }, [shape]);
  const face = useMemo(() => faceGeometry(shape), [shape]);
  useEffect(
    () => () => {
      body.dispose();
      face.dispose();
    },
    [body, face],
  );

  useEffect(() => {
    let live = true;
    const aniso = gl.capabilities.getMaxAnisotropy();
    Promise.all([paintFront(artUrl, data), paintBack(data)]).then(([f, b]) => {
      if (!live) return;
      setFaces({ front: canvasTexture(f, aniso), back: canvasTexture(b, aniso) });
    });
    return () => {
      live = false;
    };
  }, [artUrl, data, gl]);
  useEffect(
    () => () => {
      faces?.front.dispose();
      faces?.back.dispose();
    },
    [faces],
  );

  const readyFired = useRef(false);
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = m.current;
    const g = group.current;
    if (!g) return;

    if (!s.dragging) {
      s.rx += s.vx * dt;
      s.ry += s.vy * dt;
      const decay = Math.exp(-dt * 3.2);
      s.vx *= decay;
      s.vy *= decay;
      if (Math.abs(s.vx) + Math.abs(s.vy) < 0.35) {
        if (s.settle === null) s.settle = Math.round(s.ry / Math.PI) * Math.PI;
        const k = 1 - Math.exp(-dt * 5);
        s.rx += (0 - s.rx) * k;
        s.ry += (s.settle - s.ry) * k;
      }
    }
    // Hover tilt toward the cursor.
    const k = 1 - Math.exp(-dt * 8);
    s.tiltX += ((s.hover && !s.dragging ? -pointer.y * MAX_TILT : 0) - s.tiltX) * k;
    s.tiltY += ((s.hover && !s.dragging ? pointer.x * MAX_TILT : 0) - s.tiltY) * k;

    const turn = Math.max(-MAX_SCROLL_TURN, Math.min(MAX_SCROLL_TURN, scrollTurn()));
    g.rotation.set(s.rx + s.tiltX, s.ry + s.tiltY + turn, 0);
    g.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.04;

    // The key light follows the cursor so the foil shine moves with it.
    if (light.current) {
      light.current.position.x += (pointer.x * 3 - light.current.position.x) * k;
      light.current.position.y += (pointer.y * 2.5 + 1 - light.current.position.y) * k;
    }
    const fu = foilMaterial.current?.uniforms;
    if (fu?.uLight && fu.uStrength) {
      (fu.uLight.value as THREE.Vector2).set(pointer.x, pointer.y);
      fu.uStrength.value += ((s.hover || s.dragging ? 1 : 0.35) - (fu.uStrength.value as number)) * k;
    }
    if (candle.current) candle.current.intensity = 9 + Math.sin(state.clock.elapsedTime * 7.3) * 0.8 + Math.sin(state.clock.elapsedTime * 13.1) * 0.5;

    if (faces && !readyFired.current) {
      readyFired.current = true;
      onReady();
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      flip: () => {
        const s = m.current;
        s.vx = 0;
        s.vy = 0;
        s.settle = Math.round(s.ry / Math.PI) * Math.PI + Math.PI;
      },
      nudge: (x, y) => {
        const s = m.current;
        s.settle = null;
        s.vx += x;
        s.vy += y;
      },
    }),
    [],
  );

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    // No text selection or native drag while turning the card.
    e.nativeEvent.preventDefault();
    const s = m.current;
    const touch = e.pointerType === "touch";
    const start = { x: e.clientX, y: e.clientY };
    let last = { x: e.clientX, y: e.clientY, t: performance.now() };
    let moved = false;
    s.dragging = true;
    s.settle = null;
    s.vx = 0;
    s.vy = 0;
    document.body.style.cursor = "grabbing";

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - last.x;
      const dy = touch ? 0 : ev.clientY - last.y;
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > CLICK_SLOP) moved = true;
      const now = performance.now();
      const dts = Math.max(0.008, (now - last.t) / 1000);
      s.ry += dx * DRAG_SPEED;
      s.rx += dy * DRAG_SPEED;
      s.vy = (dx * DRAG_SPEED) / dts;
      s.vx = (dy * DRAG_SPEED) / dts;
      last = { x: ev.clientX, y: ev.clientY, t: now };
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      document.body.style.cursor = "";
      s.dragging = false;
      // A stale release (pointer held still) carries no fling.
      if (performance.now() - last.t > 90) {
        s.vx = 0;
        s.vy = 0;
      }
      s.vx = Math.max(-12, Math.min(12, s.vx));
      s.vy = Math.max(-14, Math.min(14, s.vy));
      if (!moved && ev.type === "pointerup") {
        s.vx = 0;
        s.vy = 0;
        s.settle = Math.round(s.ry / Math.PI) * Math.PI + Math.PI;
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  return (
    <>
      <ambientLight intensity={0.55} color="#ffe2b8" />
      <directionalLight position={[2, 3, 4]} intensity={1.1} color="#ffe7c2" />
      <pointLight ref={light} position={[0, 1, 3]} intensity={6} distance={9} color="#fff1d6" />
      <pointLight ref={candle} position={[-2.4, -1.6, -1.2]} intensity={9} distance={7} color="#ff9a3c" />
      <Embers />
      <group
        ref={group}
        onPointerDown={onPointerDown}
        onPointerOver={() => {
          m.current.hover = true;
          if (!m.current.dragging) document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          m.current.hover = false;
          if (!m.current.dragging) document.body.style.cursor = "";
        }}
      >
        <mesh geometry={body}>
          <meshStandardMaterial color="#b07a2a" metalness={0.85} roughness={0.32} />
        </mesh>
        {faces && (
          <>
            <mesh geometry={face} position-z={FACE_Z}>
              <meshPhysicalMaterial map={faces.front} roughness={0.42} metalness={0.08} clearcoat={1} clearcoatRoughness={0.25} />
            </mesh>
            <mesh geometry={face} position-z={FACE_Z + 0.001}>
              <shaderMaterial ref={foilMaterial} uniforms={foil} vertexShader={foilVertex} fragmentShader={foilFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh geometry={face} position-z={-FACE_Z} rotation-y={Math.PI}>
              <meshPhysicalMaterial map={faces.back} roughness={0.4} metalness={0.1} clearcoat={0.8} clearcoatRoughness={0.3} />
            </mesh>
          </>
        )}
      </group>
    </>
  );
});

/**
 * The single WebGL canvas on the page: the featured card plus embers behind it.
 * The render loop stops entirely while `running` is false (off screen).
 */
export default forwardRef<CardControls, SceneProps>(function CardScene({ running, ...props }, ref) {
  // Start sharp; if the frame rate drops, step the resolution down to hold 60 fps.
  const [dpr, setDpr] = useState(2);
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={[1, dpr]}
      style={{ touchAction: "pan-y" }}
      camera={{ position: [0, 0, 7], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(2)} />
      <Card ref={ref} {...props} />
    </Canvas>
  );
});
