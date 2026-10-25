export default function NewProject() {
  return (
    <main style={{ padding:48, maxWidth:640 }}>
      <p style={{ letterSpacing:"0.28em", fontSize:12 }}>LANTERN</p>
      <h1>New project</h1>
      <p>The API is at {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101"}. Sign in with POST /v1/dev/token after seeding, then POST /v1/projects and /v1/agent/run.</p>
    </main>
  );
}
