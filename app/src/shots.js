// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo
// loaded; ?shot=cover shows the cover alone, filling the viewport. `photo` picks
// the sample (samples/<photo>.jpg), `caption` the title words, `layout`/`grade`
// the look, and `w`/`h` the cover's pixel size. window.__shotReady is set once
// the scene has painted, so a screenshot driver can wait on it.
export async function runShot(query, scene) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Vice Sunset';
  await scene.loadSample(photo, caption);
  scene.applyScene();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
