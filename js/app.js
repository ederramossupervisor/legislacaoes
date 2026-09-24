const CATEGORIAS = [
  { tipo: "constituicao_federal", nome: "Constituição Federal", sigla: "CF" },
  { tipo: "emenda_constitucional", nome: "Emenda Constitucional", sigla: "EC" },
  { tipo: "lei", nome: "Leis", sigla: "LEI" },
  { tipo: "medida_provisoria", nome: "Medidas Provisórias", sigla: "MP" },
  { tipo: "decreto", nome: "Decretos", sigla: "DEC" },
  { tipo: "portaria", nome: "Portarias", sigla: "PORT" },
  { tipo: "instrucao_normativa", nome: "Instrução Normativa", sigla: "IN" },
  { tipo: "resolucao", nome: "Resolução", sigla: "RES" },
  { tipo: "ci", nome: "C.I.", sigla: "CI" },
  { tipo: "outros", nome: "Outros", sigla: "OUT" }
];

const ICONES = {
  abrir: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3h7v7"/><path d="M21 3l-9 9"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg>`,
  baixar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>`,
  estrelaVazia: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 17l-5.6 3 1.4-6.2L3 9.5l6.3-.6L12 3z"/></svg>`,
  estrelaCheia: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 17l-5.6 3 1.4-6.2L3 9.5l6.3-.6L12 3z"/></svg>`
};

let categoriaAtual = null;
let anoAtual = null;

// ---------- INICIALIZAÇÃO ----------
document.addEventListener("DOMContentLoaded", async () => {
  await Auth.init();
  renderCategorias();
  configurarEventos();
});

document.addEventListener("auth:changed", atualizarUIAuth);

function atualizarUIAuth() {
  const logado = Auth.isLogado();
  document.getElementById("btnLogin").classList.toggle("oculto", logado);
  document.getElementById("btnLogout").classList.toggle("oculto", !logado);
  document.getElementById("btnFavoritos").classList.toggle("oculto", !logado);
  document.getElementById("btnAdmin").classList.toggle("oculto", !Auth.isAdmin());
}

function configurarEventos() {
  document.getElementById("btnLogin").onclick = () => toggleModal(true);
  document.getElementById("btnFecharModal").onclick = () => toggleModal(false);
  document.getElementById("btnLogout").onclick = () => Auth.logout();
  document.getElementById("btnFavoritos").onclick = mostrarFavoritos;
  document.getElementById("btnConfirmarLogin").onclick = fazerLogin;

  let timeoutBusca;
  document.getElementById("inputBusca").addEventListener("input", (e) => {
    clearTimeout(timeoutBusca);
    const termo = e.target.value.trim();
    timeoutBusca = setTimeout(() => {
      if (termo.length >= 2) buscarLegislacoes(termo);
      else mostrarTela("telaCategorias");
    }, 300);
  });
}

function toggleModal(mostrar) {
  document.getElementById("modalLogin").classList.toggle("oculto", !mostrar);
  document.getElementById("loginErro").textContent = "";
}

async function fazerLogin() {
  const email = document.getElementById("loginEmail").value;
  const senha = document.getElementById("loginSenha").value;
  try {
    await Auth.login(email, senha);
    toggleModal(false);
  } catch (err) {
    document.getElementById("loginErro").textContent = "E-mail ou senha inválidos.";
  }
}

// ---------- NAVEGAÇÃO ----------
function mostrarTela(id) {
  ["telaCategorias", "telaAnos", "telaDocumentos", "telaBusca", "telaFavoritos", "telaAdmin"]
    .forEach((t) => document.getElementById(t).classList.toggle("oculto", t !== id));
}

function renderCategorias() {
  const container = document.getElementById("telaCategorias");
  container.innerHTML = CATEGORIAS.map(cat => `
    <div class="entrada-indice" data-tipo="${cat.tipo}">
      <span class="sigla">${cat.sigla}</span>
      <span class="nome-categoria">${cat.nome}</span>
    </div>
  `).join("");

  container.querySelectorAll(".entrada-indice").forEach(card => {
    card.onclick = () => abrirCategoria(card.dataset.tipo);
  });

  mostrarTela("telaCategorias");
  atualizarBreadcrumb([]);
}

async function abrirCategoria(tipo) {
  categoriaAtual = CATEGORIAS.find(c => c.tipo === tipo);

  const { data, error } = await supabaseClient
    .from("legislacoes")
    .select("ano")
    .eq("tipo", tipo)
    .order("ano", { ascending: false });

  if (error) { alert("Erro ao carregar anos."); return; }

  const anos = [...new Set(data.map(d => d.ano))];

    const container = document.getElementById("telaAnos");
  container.innerHTML = anos.length
    ? anos.map(ano => `
        <div class="entrada-indice" data-ano="${ano}">
          <span class="sigla">${ano}</span>
          <span class="nome-categoria rotulo-ano">${categoriaAtual.nome}</span>
        </div>
      `).join("")
    : `<p class="vazio">Nenhum documento cadastrado ainda em ${categoriaAtual.nome}.</p>`;

  container.querySelectorAll(".entrada-indice").forEach(card => {
    card.onclick = () => abrirAno(parseInt(card.dataset.ano));
  });

  mostrarTela("telaAnos");
  atualizarBreadcrumb([
    { label: categoriaAtual.nome, acao: () => abrirCategoria(tipo) }
  ]);
}

async function abrirAno(ano) {
  anoAtual = ano;

  const { data, error } = await supabaseClient
    .from("legislacoes")
    .select("*")
    .eq("tipo", categoriaAtual.tipo)
    .eq("ano", ano)
    .order("numero", { ascending: false });

  if (error) { alert("Erro ao carregar documentos."); return; }

  renderDocumentos(data, "telaDocumentos");
  mostrarTela("telaDocumentos");
  atualizarBreadcrumb([
    { label: categoriaAtual.nome, acao: () => abrirCategoria(categoriaAtual.tipo) },
    { label: ano, acao: () => abrirAno(ano) }
  ]);
}

// ---------- RENDER DE DOCUMENTOS (reaproveitado por busca/favoritos) ----------
async function renderDocumentos(lista, idContainer) {
  const container = document.getElementById(idContainer);

  if (!lista.length) {
    container.innerHTML = `<p class="vazio">Nenhum documento encontrado.</p>`;
    return;
  }

  let favoritosIds = new Set();
  if (Auth.isLogado()) {
    const { data } = await supabaseClient
      .from("favoritos")
      .select("legislacao_id")
      .eq("usuario_id", Auth.currentUser.id);
    favoritosIds = new Set((data || []).map(f => f.legislacao_id));
  }

  container.innerHTML = lista.map(doc => {
    const favoritado = favoritosIds.has(doc.id);
    return `
    <div class="card-documento" data-id="${doc.id}">
      <h3>
        <span class="sigla">${CATEGORIAS.find(c => c.tipo === doc.tipo)?.sigla || "OUT"}</span>
        ${doc.numero ? "nº " + doc.numero : ""} ${doc.ano ? "/" + doc.ano : ""}
      </h3>
      <p class="titulo-doc">${doc.titulo || ""}</p>
      <p class="assunto-doc">${doc.assunto || ""}</p>
      <div class="acoes-doc">
        <button class="btnAbrir" ${!doc.arquivo_url ? "disabled" : ""}>${ICONES.abrir} Abrir PDF</button>
        <button class="btnBaixar" ${!doc.arquivo_url ? "disabled" : ""}>${ICONES.baixar} Baixar</button>
        <button class="btnFavoritar ${favoritado ? "favoritado" : ""}">${favoritado ? ICONES.estrelaCheia : ICONES.estrelaVazia} Favoritar</button>
      </div>
    </div>
  `;
  }).join("");

  container.querySelectorAll(".card-documento").forEach(card => {
    const id = card.dataset.id;
    const doc = lista.find(d => d.id === id);

    card.querySelector(".btnAbrir").onclick = () => doc.arquivo_url && window.open(doc.arquivo_url, "_blank");
    card.querySelector(".btnBaixar").onclick = () => doc.arquivo_url && window.open(doc.arquivo_url.replace("/view", "/export?format=pdf"), "_blank");
    card.querySelector(".btnFavoritar").onclick = () => toggleFavorito(doc.id, card.querySelector(".btnFavoritar"));
  });
}
function nomeTipo(doc) {
  if (doc.tipo === "outros") return doc.tipo_outros || "Outros";
  return CATEGORIAS.find(c => c.tipo === doc.tipo)?.nome || doc.tipo;
}

async function toggleFavorito(legislacaoId, botao) {
  if (!Auth.isLogado()) { toggleModal(true); return; }

  const jaFavoritado = botao.classList.contains("favoritado");

  if (jaFavoritado) {
    await supabaseClient.from("favoritos").delete()
      .eq("usuario_id", Auth.currentUser.id)
      .eq("legislacao_id", legislacaoId);
    botao.classList.remove("favoritado");
    botao.innerHTML = `${ICONES.estrelaVazia} Favoritar`;
  } else {
    await supabaseClient.from("favoritos").insert({
      usuario_id: Auth.currentUser.id,
      legislacao_id: legislacaoId
    });
    botao.classList.add("favoritado");
    botao.innerHTML = `${ICONES.estrelaCheia} Favoritar`;
  }
}

// ---------- BUSCA GLOBAL ----------
async function buscarLegislacoes(termo) {
  const termoNum = parseInt(termo);
  let query = supabaseClient.from("legislacoes").select("*").limit(50);

  if (!isNaN(termoNum) && termo.length === 4) {
    query = query.eq("ano", termoNum);
  } else {
    query = query.or(
      `numero.ilike.%${termo}%,titulo.ilike.%${termo}%,assunto.ilike.%${termo}%,tipo_outros.ilike.%${termo}%`
    );
  }

  const { data, error } = await query;
  if (error) { console.error(error); return; }

  await renderDocumentos(data, "telaBusca");
  mostrarTela("telaBusca");
  atualizarBreadcrumb([{ label: `Busca: "${termo}"`, acao: () => {} }]);
}

// ---------- FAVORITOS ----------
async function mostrarFavoritos() {
  if (!Auth.isLogado()) { toggleModal(true); return; }

  const { data, error } = await supabaseClient
    .from("favoritos")
    .select("legislacao_id, legislacoes(*)")
    .eq("usuario_id", Auth.currentUser.id);

  if (error) { alert("Erro ao carregar favoritos."); return; }

  const lista = data.map(f => f.legislacoes);
  await renderDocumentos(lista, "telaFavoritos");
  mostrarTela("telaFavoritos");
  atualizarBreadcrumb([{ label: "Meus favoritos", acao: mostrarFavoritos }]);
}

// ---------- BREADCRUMB ----------
function atualizarBreadcrumb(itens) {
  const el = document.getElementById("breadcrumb");
  if (!itens.length) { el.classList.add("oculto"); return; }

  el.classList.remove("oculto");
  el.innerHTML = `<a href="#" id="bcInicio">Início</a>` +
    itens.map(i => ` &raquo; <span>${i.label}</span>`).join("");

  el.querySelector("#bcInicio").onclick = (e) => { e.preventDefault(); renderCategorias(); };
}
