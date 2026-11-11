"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { PAINTS, type PaintId } from "@/stores/studio";
import { ASSET_URL_PATTERN, type VehicleAsset } from "@/types/asset";

/** The source glass is mint-tinted mirror metal, which turns into an opaque teal sheet under the studio softbox. */
const GLASS_TINT = "#3a4248";

/**
 * A licensed GLB from the asset manifest. scripts/assets/prepare-glb.mjs has already put it in the
 * vehicle frame (nose +X, metres, centred, wheels on the floor) and tagged paint and glass meshes
 * with a `role` (glTF extras → userData), so nothing here is asset-specific.
 * Materials are cloned because useGLTF caches the source scene, and repainting must not leak into it.
 * Only manifest URLs are accepted; the meshopt decoder needs 'wasm-unsafe-eval' in the CSP.
 */
export function GlbVehicle({ asset, length, paint }: { asset: VehicleAsset; length: number; paint: PaintId }) {
  if (!ASSET_URL_PATTERN.test(asset.url)) throw new Error(`Refusing to load unmanaged asset URL: ${asset.url}`);
  const { scene } = useGLTF(asset.url, false, true);

  const { model, scale, paintMaterials, materials } = useMemo(() => {
    const model = scene.clone(true);
    const clones = new Map<THREE.Material, THREE.Material>();
    const paintMaterials = new Set<THREE.MeshStandardMaterial>();
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = mesh.material as THREE.Material;
      const material = clones.get(source) ?? source.clone();
      clones.set(source, material);
      mesh.material = material;
      mesh.castShadow = !material.transparent;
      const role = mesh.userData.role as string | undefined;
      if (role === "glass") {
        const glass = material as THREE.MeshStandardMaterial;
        glass.color.set(GLASS_TINT);
        glass.transparent = true;
        glass.opacity = 0.3;
        glass.depthWrite = false;
        mesh.castShadow = false;
      }
      if (role === "paint") paintMaterials.add(material as THREE.MeshStandardMaterial);
    });
    // The pipeline already scaled to the dataset length; this only absorbs a later dataset correction.
    const box = new THREE.Box3().setFromObject(model);
    return { model, scale: length / (box.max.x - box.min.x), paintMaterials: [...paintMaterials], materials: [...clones.values()] };
  }, [scene, length]);

  useEffect(() => {
    const p = PAINTS.find((x) => x.id === paint) ?? PAINTS[0];
    for (const m of paintMaterials) {
      m.color.set(p.color);
      m.metalness = p.metalness;
      m.roughness = p.roughness;
    }
  }, [paintMaterials, paint]);

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  return <primitive object={model} scale={scale} />;
}
