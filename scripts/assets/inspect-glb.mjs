#!/usr/bin/env node
// Usage: node scripts/assets/inspect-glb.mjs <file.glb> [--json]
import { stat } from "node:fs/promises";
import { createIO, inspect, sha256 } from "./lib.mjs";

const [file, flag] = process.argv.slice(2);
if (!file) {
  console.error("usage: inspect-glb.mjs <file.glb> [--json]");
  process.exit(2);
}
const io = await createIO();
const doc = await io.read(file);
const report = { file, bytes: (await stat(file)).size, sha256: await sha256(file), ...inspect(doc) };
console.log(flag === "--json" ? JSON.stringify(report, null, 2) : report);
