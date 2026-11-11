// @vitest-environment node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { NodeIO, getBounds, type Node as GltfNode } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { VEHICLE_ASSETS } from "@/data/assets";
import { families } from "@/data/vehicles";
import { ASSET_URL_PATTERN, VehicleAssetSchema } from "@/types/asset";
import { validateAssetGeometry, type GroupBounds } from "@/lib/car-design/asset-validation";
import type { BodyGeometry } from "@/types/vehicle";

const fileOf = (url: string) => join(process.cwd(), "public", url);

function bodyForDesign(design: string): BodyGeometry {
  for (const f of families) {
    for (const b of [f.body, ...f.generations.map((g) => g.body)]) if (b?.design === design) return b;
  }
  throw new Error(`no body uses design ${design}`);
}

/** World bounds of every semantic group under VehicleRoot, keyed by path ("Doors/FrontLeft"). */
async function groupBounds(path: string): Promise<{ groups: Map<string, THREE.Box3>; roles: Set<string>; roots: string[] }> {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const doc = await io.read(path);
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  const groups = new Map<string, THREE.Box3>();
  const roles = new Set<string>();
  const walk = (node: GltfNode, prefix: string) => {
    const role = (node.getExtras() as { role?: string }).role;
    if (role) roles.add(role);
    if (node.getMesh()) return;
    const key = prefix ? `${prefix}/${node.getName()}` : node.getName();
    const b = getBounds(node);
    groups.set(key, new THREE.Box3(new THREE.Vector3(...b.min), new THREE.Vector3(...b.max)));
    for (const c of node.listChildren()) walk(c, key);
  };
  const root = scene.listChildren().find((n) => n.getName() === "VehicleRoot");
  if (root) for (const c of root.listChildren()) walk(c, "");
  return { groups, roles, roots: scene.listChildren().map((n) => n.getName()) };
}

describe("vehicle asset manifest", () => {
  it("only lists self-hosted, hashed, redistributable assets", () => {
    for (const a of VEHICLE_ASSETS) {
      expect(VehicleAssetSchema.parse(a)).toBeTruthy();
      expect(a.url).toMatch(ASSET_URL_PATTERN);
      expect(a.url).toContain(a.sha256.slice(0, 8));
    }
    expect(() => VehicleAssetSchema.parse({ ...VEHICLE_ASSETS[0], url: "https://example.com/car.glb" })).toThrow();
    expect(() => VehicleAssetSchema.parse({ ...VEHICLE_ASSETS[0], license: "CC BY-NC 4.0" })).toThrow();
  });

  it.each(VEHICLE_ASSETS.map((a) => [a.id, a] as const))("%s matches the file on disk and its pipeline report", (_, a) => {
    const file = fileOf(a.url);
    expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file);
    expect(bytes.byteLength).toBe(a.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(a.sha256);
    const report = JSON.parse(readFileSync(join(process.cwd(), "docs/assets/reports", `${a.id}.json`), "utf8"));
    expect(report.after.sha256).toBe(a.sha256);
    expect(report.after.triangles).toBe(a.triangles);
    expect(report.before.sha256).toBe(a.sourceSha256);
  });
});

describe.each(VEHICLE_ASSETS.map((a) => [a.id, a] as const))("asset geometry: %s", (_, asset) => {
  let data: Awaited<ReturnType<typeof groupBounds>>;
  beforeAll(async () => {
    data = await groupBounds(fileOf(asset.url));
  });

  it("is a single VehicleRoot in the teslha-v1 frame with no geometric defects", () => {
    expect(data.roots).toEqual(["VehicleRoot"]);
    expect(validateAssetGeometry(data.groups, bodyForDesign(asset.design), asset)).toEqual([]);
  });

  it("tags paint and glass for the material system", () => {
    expect(data.roles).toContain("paint");
    expect(data.roles).toContain("glass");
  });

  it("has no unclassified meshes", () => {
    expect(data.groups.has("Unclassified")).toBe(false);
  });

  it("fails validation when the steering is pushed through the windshield or the side", () => {
    const body = bodyForDesign(asset.design);
    const steering = data.groups.get("Interior/SteeringSystem");
    if (!steering) return;
    const up = new Map<string, THREE.Box3>(data.groups);
    up.set("Interior/SteeringSystem", steering.clone().translate(new THREE.Vector3(0, 0.5, 0)));
    expect(validateAssetGeometry(up as GroupBounds, body, asset).map((i) => i.check)).toContain("steering");
    const side = new Map<string, THREE.Box3>(data.groups);
    side.set("Interior/SteeringSystem", steering.clone().translate(new THREE.Vector3(0, 0, -0.5)));
    expect(validateAssetGeometry(side as GroupBounds, body, asset).map((i) => i.check)).toContain("steering");
  });

  it("fails validation when a door is moved off its mirror position", () => {
    const fl = data.groups.get("Doors/FrontLeft");
    if (!fl) return;
    const moved = new Map<string, THREE.Box3>(data.groups);
    moved.set("Doors/FrontLeft", fl.clone().translate(new THREE.Vector3(0.1, 0, 0)));
    expect(validateAssetGeometry(moved, bodyForDesign(asset.design), asset).map((i) => i.check)).toContain("symmetry");
  });
});
