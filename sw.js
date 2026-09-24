const CACHE_NAME = "legislacao-es-v2";
const ASSETS = [
  "/index.html",
  "/css/style.css",
  "/js/supabase-config.js",
  "/js/auth.js",
  "/js/app.js",
  "/js/admin.js",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Nunca cachear chamadas ao Supabase (dados sempre precisam vir atualizados)
  if (event.request.url.includes("supabase.co")) return;

  // Só intercepta GET (POST de login/formulário passa direto)
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        // Rede funcionou: atualiza o cache com a versão mais nova e retorna ela
        const respostaClone = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respostaClone));
        return resposta;
      })
      .catch(() => {
        // Sem rede: usa o que tiver em cache como fallback
        return caches.match(event.request);
      })
  );
});
