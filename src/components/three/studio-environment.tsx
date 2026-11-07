"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

/**
 * Procedural studio environment baked once into a PMREM env map: large overhead softbox,
 * side strip lights and a red accent wall. No HDR download, no per-frame cube rendering.
 */
export function StudioEnvironment({ night = false, intensity = 1 }: { night?: boolean; intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const env = new THREE.Scene();
    env.background = new THREE.Color(night ? "#010102" : "#0a0b0d");
    const geo = new THREE.PlaneGeometry(1, 1);
    const mats: THREE.Material[] = [];
    const add = (color: string, strength: number, pos: [number, number, number], rot: [number, number, number], scale: [number, number]) => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide });
      mats.push(m);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.scale.set(scale[0], scale[1], 1);
      env.add(mesh);
    };
    const k = night ? 0.25 : 1;
    add("#ffffff", 3 * k, [0, 6, 0], [Math.PI / 2, 0, 0], [12, 4]);
    add("#ffffff", 2 * k, [-7, 2, 0], [0, Math.PI / 2, 0], [10, 1.6]);
    add("#ffffff", 2 * k, [7, 2, 0], [0, -Math.PI / 2, 0], [10, 1.6]);
    add("#ffffff", 1.2 * k, [0, 3, 7], [0, Math.PI, 0], [6, 1]);
    add("#ff2a36", night ? 3 : 1.6, [0, 1, -7], [0, 0, 0], [14, 0.5]);

    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(env, 0.04);
    const prev = scene.environment;
    scene.environment = rt.texture;
    scene.environmentIntensity = intensity;

    return () => {
      scene.environment = prev;
      rt.dispose();
      pmrem.dispose();
      geo.dispose();
      mats.forEach((m) => m.dispose());
    };
  }, [gl, scene, night, intensity]);

  return null;
}
