// Shared helpers for the GLB asset pipeline. Node-only; never imported by the app bundle.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

export async function createIO() {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
}

export async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

/** Mesh, triangle, material and texture counts plus world bounds of the default scene. */
export function inspect(document) {
  const root = document.getRoot();
  let triangles = 0;
  let primitives = 0;
  const instances = new Map();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (mesh) instances.set(mesh, (instances.get(mesh) ?? 0) + 1);
  }
  for (const [mesh, count] of instances) {
    for (const prim of mesh.listPrimitives()) {
      primitives += count;
      const mode = prim.getMode();
      const n = prim.getIndices()?.getCount() ?? prim.getAttribute("POSITION")?.getCount() ?? 0;
      if (mode === 4) triangles += (n / 3) * count;
      else if (mode === 5 || mode === 6) triangles += Math.max(0, n - 2) * count;
    }
  }
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const bounds = scene ? getBounds(scene) : null;
  const size = bounds ? bounds.max.map((v, i) => +(v - bounds.min[i]).toFixed(4)) : null;
  return {
    nodes: root.listNodes().length,
    meshes: root.listMeshes().length,
    drawPrimitives: primitives,
    triangles: Math.round(triangles),
    materials: root.listMaterials().map((m) => m.getName()),
    textures: root.listTextures().map((t) => ({ name: t.getName() || t.getURI(), mime: t.getMimeType(), size: t.getSize(), bytes: t.getImage()?.byteLength ?? 0 })),
    animations: root.listAnimations().length,
    extensionsUsed: root.listExtensionsUsed().map((e) => e.extensionName),
    bounds: bounds && { min: bounds.min.map((v) => +v.toFixed(4)), max: bounds.max.map((v) => +v.toFixed(4)), size },
  };
}
