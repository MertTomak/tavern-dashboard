"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Particle grid over the card face: enough to read as the picture, few enough for one cheap draw call. */
const GX = 80;
const GY = 112;

export type DissolveState = {
  /** 0 = whole card, 1 = fully scattered into embers. */
  d: number;
  /** True while the card shows its back to the viewer. */
  back: boolean;
};

/** Deterministic 0..1 noise so the ember pattern is the same every time. */
function hash(n: number) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Inside the card's rounded outline (corner radius r), so the cloud starts as the card shape. */
function insideRounded(x: number, y: number, w: number, h: number, r: number) {
  const dx = Math.max(Math.abs(x) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y) - (h / 2 - r), 0);
  return dx * dx + dy * dy <= r * r;
}

const vertex = /* glsl */ `
  attribute vec2 aUv;
  attribute vec3 aSeed;
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform float uShowBack;
  uniform float uD;
  uniform float uTime;
  uniform float uScale;
  uniform float uCell;
  varying vec3 vColor;
  varying float vHeat;
  void main() {
    vec3 c = uShowBack > 0.5 ? texture2D(uBack, vec2(1.0 - aUv.x, aUv.y)).rgb : texture2D(uFront, aUv).rgb;
    // Each ember lifts and drifts on its own path, curling a little as it rises.
    // They sink back into the dark (away from the camera) so the cloud never reaches the canvas edge.
    float d = uD * (0.5 + aSeed.z * 0.7);
    vec3 drift = vec3((aSeed.x - 0.5) * 1.0, (aSeed.y - 0.45) * 0.5, -(0.2 + aSeed.z * 1.6));
    vec3 curl = vec3(sin(uTime * 2.1 + aSeed.y * 30.0), 0.0, cos(uTime * 1.7 + aSeed.x * 30.0)) * 0.12;
    // Drift in world space, so "away" stays away from the viewer whichever face is showing.
    vec4 world = modelMatrix * vec4(position, 1.0);
    world.xyz += (drift + curl) * d;
    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    // Embers glow: the picture's colour burns toward hearth orange as it scatters.
    vHeat = smoothstep(0.0, 0.6, uD);
    vColor = mix(c, vec3(1.0, 0.55, 0.18) * (0.7 + aSeed.y * 0.8), vHeat * 0.85);
    gl_PointSize = uCell * uScale / -mv.z * (1.25 - 0.55 * vHeat);
  }
`;

const fragment = /* glsl */ `
  uniform vec2 uRes;
  uniform float uFade;
  varying vec3 vColor;
  varying float vHeat;
  void main() {
    // Whole: square cells that tile into the picture. Scattered: soft round sparks.
    vec2 q = gl_PointCoord - 0.5;
    float spark = smoothstep(0.5, 0.15, length(q));
    float a = mix(1.0, spark, vHeat);
    // Sparks fade out before the canvas edge instead of being cut off by it.
    float edge = min(min(gl_FragCoord.x, uRes.x - gl_FragCoord.x), min(gl_FragCoord.y, uRes.y - gl_FragCoord.y));
    a *= smoothstep(0.0, uFade, edge);
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor * (1.0 + vHeat * 0.6), a);
  }
`;

/**
 * The card as a cloud of embers: one point per cell, coloured from the visible
 * face. `state.d` drives it (0 whole … 1 scattered); the card meshes hide while
 * it plays. One draw call, all motion in the shader.
 */
export function EmberDissolve({
  width,
  height,
  corner,
  front,
  back,
  state,
}: {
  width: number;
  height: number;
  corner: number;
  front: THREE.Texture;
  back: THREE.Texture;
  state: React.RefObject<DissolveState>;
}) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const camera = useThree((s) => s.camera);

  const geometry = useMemo(() => {
    const pos: number[] = [];
    const uv: number[] = [];
    const seed: number[] = [];
    for (let j = 0; j < GY; j++) {
      for (let i = 0; i < GX; i++) {
        const u = (i + 0.5) / GX;
        const v = (j + 0.5) / GY;
        const x = (u - 0.5) * width;
        const y = (v - 0.5) * height;
        if (!insideRounded(x, y, width, height, corner)) continue;
        const k = j * GX + i;
        pos.push(x, y, 0);
        uv.push(u, v);
        seed.push(hash(k), hash(k + 0.37), hash(k + 0.71));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aUv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 3));
    return g;
  }, [width, height, corner]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uFront: { value: front },
      uBack: { value: back },
      uShowBack: { value: 0 },
      uD: { value: 0 },
      uTime: { value: 0 },
      uScale: { value: 1 },
      uCell: { value: width / GX },
      uRes: { value: new THREE.Vector2(1, 1) },
      uFade: { value: 60 },
    }),
    [front, back, width],
  );

  useFrame((s, dt) => {
    const p = points.current;
    const u = material.current?.uniforms;
    if (!p || !u) return;
    const { d, back: showBack } = state.current;
    p.visible = d > 0.001;
    if (!p.visible) return;
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 38;
    (u.uD as { value: number }).value = d;
    (u.uShowBack as { value: number }).value = showBack ? 1 : 0;
    (u.uTime as { value: number }).value += Math.min(dt, 0.05);
    (u.uRes as { value: THREE.Vector2 }).value.set(s.size.width * s.viewport.dpr, s.size.height * s.viewport.dpr);
    (u.uFade as { value: number }).value = 60 * s.viewport.dpr;
    (u.uScale as { value: number }).value = (s.size.height * s.viewport.dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} visible={false}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} />
    </points>
  );
}
