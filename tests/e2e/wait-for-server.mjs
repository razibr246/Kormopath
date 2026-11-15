const base = process.env.BASE || "http://localhost:3100";
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
    if (response.ok) { ready = true; break; }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) throw new Error(`Server did not become ready at ${base}`);
