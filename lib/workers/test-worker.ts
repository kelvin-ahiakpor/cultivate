/**
 * Test script to verify worker_threads + tsx setup works correctly.
 *
 * Run with: npx tsx lib/workers/test-worker.ts
 *
 * This spawns a simple worker that imports from @/lib/* to verify:
 * 1. Worker threads work
 * 2. tsx enables TypeScript execution in the worker
 * 3. Path aliases (@/lib/*) resolve correctly
 */
import { Worker } from "worker_threads";
import { join } from "path";

console.log("🧪 Testing worker_threads + tsx setup...\n");

const workerPath = join(process.cwd(), "lib", "workers", "simple-test.worker.ts");

const worker = new Worker(workerPath, {
  execArgv: ["--require", "tsx/cjs"],
  workerData: {
    testValue: "Hello from main thread!",
  },
});

worker.on("message", (result) => {
  console.log("✅ Worker message received:", result);
  console.log("\n✅ Worker setup test PASSED!\n");
  process.exit(0);
});

worker.on("error", (err) => {
  console.error("❌ Worker error:", err);
  console.log("\n❌ Worker setup test FAILED!\n");
  process.exit(1);
});

worker.on("exit", (code) => {
  if (code !== 0) {
    console.error(`❌ Worker stopped with exit code ${code}`);
    console.log("\n❌ Worker setup test FAILED!\n");
    process.exit(1);
  }
});

setTimeout(() => {
  console.error("❌ Worker test timeout (10s)");
  console.log("\n❌ Worker setup test FAILED!\n");
  process.exit(1);
}, 10000);
