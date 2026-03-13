/**
 * Test the chunker in complete isolation
 */
import { chunkText } from "./lib/chunker-simple";

const testText = "A".repeat(8840); // Same length as your PDF text

console.log("Testing SIMPLE chunker with 8840 characters...");
console.log(`Memory before: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

const start = Date.now();
const chunks = chunkText(testText);
const elapsed = Date.now() - start;

console.log(`Memory after: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
console.log(`Created ${chunks.length} chunks in ${elapsed}ms`);
console.log("✅ Simple chunker works fine");
