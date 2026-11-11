#!/usr/bin/env node
/**
 * Normalises and optimises one licensed vehicle GLB for TeslHa.
 *
 *   node scripts/assets/prepare-glb.mjs --in <src.glb> --name <id> --length <metres> --forward <-z|+z|-x|+x>
 *        [--rules scripts/assets/rules/<id>.json]
 *        [--out public/models] [--report-dir docs/assets/reports] [--max-texture 2048] [--simplify 0.5] [--webp] [--no-meshopt]
 *
 * Output frame (matches src/lib/car-design/vehicle-frame.ts): nose on +X, up +Y, metres,
 * centred on X/Z, wheels on y = 0. The transform lives on one "VehicleRoot" node so the source
 * hierarchy and names are kept. Output name carries a content hash for immutable caching.
 * Only reads .glb files (no external URIs, so no path traversal); never executes anything in them.
 */
import { createHash } from "node:crypto";
import { mkdir, open, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { parseArgs } from "node:util";
import { getBounds } from "@gltf-transform/core";
import { flatten, dedup, prune, weld, simplify, textureCompress, meshopt, instance } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { createIO, inspect, sha256 } from "./lib.mjs";

const MAX_INPUT_BYTES = 300 * 1024 * 1024;
const YAW = { "+x": 0, "-z": -Math.PI / 2, "+z": Math.PI / 2, "-x": Math.PI };

const { values: a } = parseArgs({
  options: {
    in: { type: "string" },
    name: { type: "string" },
    length: { type: "string" },
    forward: { type: "string" },
    out: { type: "string", default: "public/models" },
    "report-dir": { type: "string", default: "docs/assets/reports" },
    "max-texture": { type: "string", default: "2048" },
    simplify: { type: "string" },
    rules: { type: "string" },
    webp: { type: "boolean", default: false },
    "no-meshopt": { type: "boolean", default: false },
  },
});
const fail = (m) => {
  console.error(`prepare-glb: ${m}`);
  process.exit(2);
};
if (!a.in || !a.name || !a.length || !a.forward) fail("--in, --name, --length and --forward are required");
if (!/^[a-z0-9-]+$/.test(a.name)) fail("--name must be kebab-case");
if (!(a.forward in YAW)) fail("--forward must be one of +x, -x, +z, -z");
const length = Number(a.length);
if (!(length > 1 && length < 7)) fail("--length must be a vehicle length in metres");
if (extname(a.in).toLowerCase() !== ".glb") fail("only binary .glb input is accepted (no external resources)");

const info = await stat(a.in);
if (!info.isFile() || info.size > MAX_INPUT_BYTES) fail("input is not a regular file under 300 MB");
const fh = await open(a.in, "r");
const magic = Buffer.alloc(4);
await fh.read(magic, 0, 4, 0);
await fh.close();
if (magic.toString("latin1") !== "glTF") fail("input does not start with the glTF binary magic");

const io = await createIO();
const doc = await io.read(a.in);
const before = { bytes: info.size, sha256: await sha256(a.in), ...inspect(doc) };
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];
for (const s of root.listScenes()) if (s !== scene) s.dispose();

// One root node carries the normalisation. Without rules the source hierarchy is kept as is.
const unmatched = [];
// Bake source transforms into each mesh node first (flatten prunes empty nodes, so the root comes after).
if (a.rules) await doc.transform(flatten());
const vehicleRoot = doc.createNode("VehicleRoot");
if (a.rules) {
  // Regroup by semantic path, chosen from material names.
  const { rules } = JSON.parse(await readFile(a.rules, "utf8"));
  const compiled = rules.map((r) => ({ ...r, re: new RegExp(r.match) }));
  const groups = new Map();
  const groupFor = (path) => {
    let parent = vehicleRoot;
    let key = "";
    for (const part of path.split("/")) {
      key += "/" + part;
      if (!groups.has(key)) {
        const g = doc.createNode(part);
        parent.addChild(g);
        groups.set(key, g);
      }
      parent = groups.get(key);
    }
    return parent;
  };
  const counts = new Map();
  for (const node of [...scene.listChildren()]) {
    scene.removeChild(node);
    const material = node.getMesh()?.listPrimitives()[0]?.getMaterial()?.getName() ?? "";
    const rule = node.getMesh() && compiled.find((r) => r.re.test(material));
    if (!node.getMesh()) {
      if (node.listChildren().length === 0) node.dispose();
      continue;
    }
    if (!rule) unmatched.push(material);
    const path = rule?.group ?? "Unclassified";
    const n = (counts.get(path) ?? 0) + 1;
    counts.set(path, n);
    node.setName(`${path.replaceAll("/", "_")}_${n}`);
    if (rule?.role) node.setExtras({ ...node.getExtras(), role: rule.role });
    groupFor(path).addChild(node);
  }
  if (unmatched.length) fail(`materials without a rule: ${[...new Set(unmatched)].join(", ")}`);
} else {
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    vehicleRoot.addChild(child);
  }
}
scene.addChild(vehicleRoot);
const yaw = YAW[a.forward];
vehicleRoot.setRotation([0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)]);
let b = getBounds(scene);
const s = length / (b.max[0] - b.min[0]);
vehicleRoot.setScale([s, s, s]);
b = getBounds(scene);
vehicleRoot.setTranslation([-(b.min[0] + b.max[0]) / 2, -b.min[1], -(b.min[2] + b.max[2]) / 2]);

const steps = [dedup(), instance({ min: 2 }), weld()];
if (a.simplify) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: Number(a.simplify), error: 0.0005, lockBorder: true }));
const maxTex = Number(a["max-texture"]);
// Downscale only; webp is opt-in because some viewers lack EXT_texture_webp.
steps.push(textureCompress({ encoder: sharp, resize: [maxTex, maxTex], ...(a.webp ? { targetFormat: "webp", quality: 88 } : {}) }));
steps.push(prune());
if (!a["no-meshopt"]) steps.push(meshopt({ encoder: MeshoptEncoder, level: "medium" }));
await MeshoptSimplifier.ready;
await doc.transform(...steps);

const bytes = await io.writeBinary(doc);
const hash = createHash("sha256").update(bytes).digest("hex");
await mkdir(a.out, { recursive: true });
const file = join(a.out, `${a.name}.${hash.slice(0, 8)}.glb`);
await writeFile(file, bytes);
const after = { file, bytes: bytes.byteLength, sha256: hash, ...inspect(doc) };
const report = { source: basename(a.in), options: { rules: a.rules ? basename(a.rules) : null, length, forward: a.forward, maxTexture: Number(a["max-texture"]), simplify: a.simplify ?? null, webp: a.webp, meshopt: !a["no-meshopt"] }, before, after };
await mkdir(a["report-dir"], { recursive: true });
await writeFile(join(a["report-dir"], `${a.name}.json`), JSON.stringify(report, null, 2) + "\n");
const mb = (n) => (n / 1048576).toFixed(2) + " MB";
console.log(`${file}\n  ${mb(before.bytes)} → ${mb(after.bytes)} · triangles ${before.triangles} → ${after.triangles} · draw primitives ${before.drawPrimitives} → ${after.drawPrimitives} · textures ${before.textures.length} → ${after.textures.length}\n  size ${after.bounds.size.join(" × ")} m`);
