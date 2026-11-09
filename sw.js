// ObraKontrol Campo — service worker
// Guarda o app no celular para abrir mesmo sem internet.
// Com internet, sempre busca a versão mais nova do campo.html (atualiza sozinho).
const VERSAO = 'campo-v3.04';
const ESSENCIAIS = [
  './campo.html',
  './manifest-campo.webmanifest',
  './marca/obrakontrol_logo.svg',
  './marca/obrakontrol_logo_claro.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c =>
    Promise.all(ESSENCIAIS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase (banco e login) nunca passa pelo cache
  if (/googleapis\.com|firebaseio\.com|identitytoolkit|securetoken/.test(url.hostname)) return;

  const ehApp = url.origin === self.location.origin && /\/campo\.html$/.test(url.pathname);
  if (req.mode === 'navigate' && ehApp || ehApp) {
    // rede primeiro (versão nova), cache se estiver sem sinal
    e.respondWith(fetch(req.url, { cache: 'no-store' }).then(r => {   // v2.79: ignora o cache do navegador (versão nova na hora)
      const copia = r.clone(); caches.open(VERSAO).then(c => c.put('./campo.html', copia)); return r;
    }).catch(() => caches.match('./campo.html')));
    return;
  }
  // bibliotecas e ícones: cache primeiro
  const ehBiblioteca = /gstatic\.com|cdnjs\.cloudflare\.com/.test(url.hostname) || (url.origin === self.location.origin && /\/(icons\/|manifest-campo)/.test(url.pathname));
  if (ehBiblioteca) {
    e.respondWith(caches.match(req).then(c => c || fetch(req).then(r => {
      const copia = r.clone(); caches.open(VERSAO).then(cc => cc.put(req, copia)); return r;
    })));
  }
});
