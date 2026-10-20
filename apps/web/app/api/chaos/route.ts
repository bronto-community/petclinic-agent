// Deliberate failures for the observability lab, protected by CHAOS_SECRET.
//   ?kind=error  → an unhandled exception (500)
//   ?kind=crash  → the process exits mid-request (a function crash)
export async function GET(request: Request) {
  const secret = process.env.CHAOS_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const kind = new URL(request.url).searchParams.get("kind");
  console.error(JSON.stringify({ msg: "chaos", kind }));
  if (kind === "crash") process.exit(1);
  if (kind === "error") throw new Error("chaos: deliberate unhandled error");
  return Response.json({ error: "kind must be error or crash" }, { status: 400 });
}
