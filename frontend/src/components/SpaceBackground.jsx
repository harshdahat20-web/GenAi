import { useEffect, useRef } from "react";
import * as THREE from "three";

const VERT = `
uniform float uTime; uniform float uPixel;
attribute float aSeed; attribute float aKind;
varying float vMix; varying float vKind;
void main() {
  vec3 p = position;
  float n = sin(p.x * 2.1 + uTime * 0.55) + sin(p.y * 2.7 - uTime * 0.45) + sin(p.z * 2.3 + uTime * 0.65);
  p *= 1.0 + n * 0.04;
  vMix = 0.5 + 0.5 * sin(p.y * 1.4 + aSeed * 6.2831 + uTime * 0.25);
  vKind = aKind;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.6 + aSeed * 2.6) * uPixel * (7.5 / -mv.z);
}`;

const FRAG = `
uniform float uOpacity; varying float vMix; varying float vKind;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  vec3 clay = vec3(0.851, 0.467, 0.341), sand = vec3(0.941, 0.784, 0.627), sky = vec3(0.416, 0.608, 0.8);
  vec3 c = mix(clay, sand, vMix);
  c = mix(c, sky, smoothstep(0.88, 1.0, vMix) * 0.55);
  gl_FragColor = vec4(c, a * a * uOpacity * (vKind > 0.5 ? 0.45 : 1.0));
}`;

// A slow, breathing globe of particles with two orbit rings. "dim" pushes it behind the app screens.
export default function SpaceBackground({ dim = false }) {
  const ref = useRef(null);
  const dimRef = useRef(dim);
  dimRef.current = dim;

  useEffect(() => {
    const canvas = ref.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.z = 7.5;
    const group = new THREE.Group();
    scene.add(group);

    const SHELL = 2200, DUST = 700, N = SHELL + DUST;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N), kind = new Float32Array(N);
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < SHELL; i++) {
      const y = 1 - (2 * (i + 0.5)) / SHELL, r = Math.sqrt(1 - y * y), phi = i * ga, R = 2.2 * (0.97 + Math.random() * 0.06);
      pos.set([Math.cos(phi) * r * R, y * R, Math.sin(phi) * r * R], i * 3);
      seed[i] = Math.random();
    }
    for (let i = SHELL; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2.1 * Math.cbrt(Math.random()));
      pos.set([v.x, v.y, v.z], i * 3);
      seed[i] = Math.random(); kind[i] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixel: { value: renderer.getPixelRatio() }, uOpacity: { value: 1 } },
    });
    group.add(new THREE.Points(geo, mat));

    const ringMat = new THREE.LineBasicMaterial({ color: 0xd97757, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = (rx, ry, tilt) => {
      const pts = [];
      for (let i = 0; i < 180; i++) { const a = (i / 180) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0)); }
      const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
      l.rotation.set(...tilt);
      group.add(l);
      return l;
    };
    const r1 = ring(3.0, 1.0, [1.2, 0.3, 0]), r2 = ring(3.3, 1.5, [0.5, -0.6, 0.4]);

    const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    resize();
    const mouse = { x: 0, y: 0 };
    const onMove = (e) => { mouse.x = (e.clientX / innerWidth - 0.5) * 2; mouse.y = (e.clientY / innerHeight - 0.5) * 2; };
    addEventListener("resize", resize);
    addEventListener("pointermove", onMove);

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let last = 0, spin = 0, raf;
    const cur = { x: 2.3, y: 0, s: 1, o: 0 }; // starts invisible, fades in
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime(), dt = Math.min(t - last, 0.05); last = t;
      const wide = innerWidth / innerHeight > 1.15, d = dimRef.current;
      const tgt = d ? { x: 0, y: 0, s: wide ? 1.3 : 1.1, o: 0.3 } : { x: wide ? 2.3 : 0, y: wide ? 0 : 1.7, s: wide ? 1 : 0.85, o: 1 };
      const k = 1 - Math.exp(-dt * 2.2);
      for (const key of ["x", "y", "s", "o"]) cur[key] += (tgt[key] - cur[key]) * k;
      group.position.set(cur.x, cur.y, 0);
      group.scale.setScalar(cur.s);
      mat.uniforms.uOpacity.value = cur.o;
      ringMat.opacity = 0.22 * cur.o;
      if (!still) { spin += dt * 0.07; mat.uniforms.uTime.value = t; }
      group.rotation.y += (spin + mouse.x * 0.3 - group.rotation.y) * k;
      group.rotation.x += (mouse.y * 0.18 - group.rotation.x) * k;
      r1.rotation.z += still ? 0 : dt * 0.1;
      r2.rotation.z -= still ? 0 : dt * 0.07;
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      geo.dispose(); mat.dispose(); ringMat.dispose();
      group.children.forEach((c) => c.geometry?.dispose());
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
}
