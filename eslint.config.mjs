import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Three.js materials/geometries are imperative GPU resources that R3F code mutates per frame
    // by design (e.g. emissiveIntensity in useFrame). The React-compiler immutability rule
    // does not model that, so it is disabled for 3D modules only.
    files: ["src/components/three/**", "src/features/**/*scene*.tsx", "src/components/engineering/**", "src/components/simulations/**"],
    rules: { "react-hooks/immutability": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
