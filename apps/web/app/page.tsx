export default function Page() {
  return (
    <main style={{ display:"grid", gridTemplateColumns:"320px 1fr", minHeight:"100vh" }}>
      <aside style={{ borderRight:"1px solid #d9d1c3", padding:"24px" }}>
        <p style={{ letterSpacing:"0.28em", fontSize:12, margin:0 }}>LANTERN</p>
        <h1 style={{ fontSize:28, fontWeight:500, margin:"16px 0 8px" }}>A crew for every brief.</h1>
        <p style={{ margin:0, lineHeight:1.45 }}>Ads, explainers, films, product, tutorials, music videos. Same agent. Different crafts.</p>
        <form action="/project/new" style={{ marginTop:24, display:"grid", gap:8 }}>
          <textarea name="brief" rows={6} placeholder="Describe the video…" style={{ width:"100%", padding:12, background:"#fff", border:"1px solid #d9d1c3" }} />
          <button type="submit" style={{ background:"#C9893A", color:"#12100E", border:0, padding:"10px 14px" }}>Run agent</button>
        </form>
      </aside>
      <section style={{ background:"#0E0D0B", color:"#F4EFE6", display:"grid", placeItems:"center" }}>
        <p style={{ opacity:0.6 }}>Stage — preview lands here</p>
      </section>
    </main>
  );
}
