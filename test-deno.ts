async function testDenoImport() {
  try {
    const { encodeBase64 } = await import("https://deno.land/std@0.224.0/encoding/base64.ts");
    console.log("Import successful!");
  } catch (e) {
    console.log("Import failed, as expected in Node.js, but works in Deno");
  }
}
testDenoImport();
