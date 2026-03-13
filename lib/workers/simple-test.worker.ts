/**
 * Simple test worker to verify worker_threads + tsx + path aliases work.
 */
import { parentPort, workerData } from "worker_threads";
import { prisma } from "@/lib/prisma";

(async () => {
  try {
    console.log("  📨 Worker received data:", workerData);

    // Test 1: Path alias (@/lib/*) works
    console.log("  ✓ Path alias (@/lib/prisma) resolved successfully");

    // Test 2: Prisma client instantiates
    console.log("  ✓ Prisma client instantiated");

    // Test 3: Worker can communicate back to main thread
    parentPort?.postMessage({
      success: true,
      receivedData: workerData,
      prismaClientAvailable: !!prisma,
    });

    await prisma.$disconnect();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("  ❌ Worker error:", errorMessage);
    parentPort?.postMessage({ success: false, error: errorMessage });
  }
})();
