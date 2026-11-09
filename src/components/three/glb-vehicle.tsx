"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { PAINTS, type PaintId } from "@/stores/studio";

/** The exported Roadster's nose points along -Z. TeslHa vehicles face +X. */
const YAW_TO_FORWARD = -Math.PI / 2;
const BODY_PAINT_MATERIAL = "Paint1Mtl";
/** The export's glass is mint-tinted mirror metal, which turns into an opaque teal sheet under the studio softbox. */
const GLASS_MATERIAL = /^Meshesmeshes(window|windscreen)/;

/**
 * A licensed GLB placed in the vehicle frame: nose on +X, centred on the origin, wheels on the
 * floor, scaled so its length matches the dataset. Materials are cloned because useGLTF caches the
 * source scene, and repainting must not leak into it.
 */
export function GlbVehicle({ url, length, paint }: { url: string; length: number; paint: PaintId }) {
  const { scene } = useGLTF(url, false, false);

  const { model, offset, scale, bodyPaint, materials } = useMemo(() => {
    const model = scene.clone(true);
    const clones = new Map<THREE.Material, THREE.Material>();
    let bodyPaint: THREE.MeshStandardMaterial | null = null;
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = mesh.material as THREE.Material;
      const material = clones.get(source) ?? source.clone();
      clones.set(source, material);
      mesh.material = material;
      mesh.castShadow = !material.transparent;
      if (GLASS_MATERIAL.test(material.name)) {
        const glass = material as THREE.MeshStandardMaterial;
        glass.color.set("#3a4248");
        glass.opacity = 0.3;
      }
      if (material.name === BODY_PAINT_MATERIAL) bodyPaint = material as THREE.MeshStandardMaterial;
    });
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const offset: [number, number, number] = [-center.x, -box.min.y, -center.z];
    return { model, offset, scale: length / (box.max.z - box.min.z), bodyPaint: bodyPaint as THREE.MeshStandardMaterial | null, materials: [...clones.values()] };
  }, [scene, length]);

  useEffect(() => {
    if (!bodyPaint) return;
    const p = PAINTS.find((x) => x.id === paint) ?? PAINTS[0];
    bodyPaint.color.set(p.color);
    bodyPaint.metalness = p.metalness;
    bodyPaint.roughness = p.roughness;
  }, [bodyPaint, paint]);

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  return (
    <group rotation-y={YAW_TO_FORWARD} scale={scale}>
      <primitive object={model} position={offset} />
    </group>
  );
}
