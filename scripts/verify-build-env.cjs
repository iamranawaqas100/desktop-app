#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("\n🔍 Build Verification\n");
console.log("═".repeat(50));

const checks = [
  {
    name: "Node.js version",
    check: () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split(".")[0]);
      return { pass: major >= 18, message: version };
    },
  },
  {
    name: "package.json exists",
    check: () => {
      const exists = fs.existsSync(path.resolve(__dirname, "../package.json"));
      return { pass: exists, message: exists ? "✓" : "✗" };
    },
  },
  {
    name: "Icon file exists",
    check: () => {
      const exists = fs.existsSync(
        path.resolve(__dirname, "../assets/icon.ico")
      );
      return { pass: exists, message: exists ? "✓" : "✗ (build will fail)" };
    },
  },
  {
    name: "UI package exists",
    check: () => {
      const exists = fs.existsSync(
        path.resolve(__dirname, "../../../packages/ui/src")
      );
      return { pass: exists, message: exists ? "✓" : "✗" };
    },
  },
  {
    name: "node_modules installed",
    check: () => {
      const exists = fs.existsSync(path.resolve(__dirname, "../node_modules"));
      return { pass: exists, message: exists ? "✓" : "✗ Run: pnpm install" };
    },
  },
  {
    name: "electron-builder installed",
    check: () => {
      try {
        const pkg = require(path.resolve(__dirname, "../package.json"));
        const hasEB =
          pkg.devDependencies && pkg.devDependencies["electron-builder"];
        return { pass: !!hasEB, message: hasEB ? "✓" : "✗" };
      } catch {
        return { pass: false, message: "✗" };
      }
    },
  },
];

let allPassed = true;

checks.forEach(({ name, check }) => {
  const result = check();
  const icon = result.pass ? "✅" : "❌";
  console.log(`${icon} ${name}: ${result.message}`);
  if (!result.pass) allPassed = false;
});

console.log("═".repeat(50));

if (allPassed) {
  console.log("\n✅ All checks passed! Ready to build.");
  console.log("\nRun: pnpm build:win\n");
  process.exit(0);
} else {
  console.log("\n❌ Some checks failed. Please fix them before building.\n");
  process.exit(1);
}
