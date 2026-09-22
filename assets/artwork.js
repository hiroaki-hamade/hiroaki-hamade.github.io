// Decide once per page load. No clock polling, location lookup, or storage.
const slot = document.querySelector('[data-time-artwork]');
if (slot) mountArtwork(slot);

function mountArtwork(root) {
  const hour = new Date().getHours();
  let period = hour >= 6 && hour < 18 ? 'day' : 'night';

  // Preview both appearances locally without changing the computer's clock.
  // These parameters do not override the local-time rule on the public site.
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (isLocal) {
    const preview = new URLSearchParams(location.search).get('artwork');
    if (preview === 'day' || preview === 'night') period = preview;
  }

  // Templates are inert: the unchosen poster, canvases, and module stay unloaded.
  const template = root.querySelector(`#artwork-${period}`);
  root.classList.toggle('neural-art', period === 'day');
  root.replaceChildren(template.content.cloneNode(true));
  root.dataset.period = period;

  // Keep the selected poster visible if the animation cannot be loaded.
  const loading = period === 'day'
    ? import('./neural-core.js?v=1')
    : import('./black-hole.js?v=1');
  loading.catch(() => {
    root.dataset.ready = 'false';
    root.dataset.loadError = 'true';
    root.querySelector('button').hidden = true;
  });
}
