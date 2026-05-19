export async function GET() {
  return Response.json({
    instance: process.env.HOSTNAME || "unknown",
    envFile: process.env,
  });
}