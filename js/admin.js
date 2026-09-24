let legislacaoEditando = null;

const TIPOS_RELACAO = [
  { valor: "revoga", label: "Revoga", inverso: "Revogada por" },
  { valor: "revoga_parcialmente", label: "Revoga parcialmente", inverso: "Revogada parcialmente por" },
  { valor: "altera", label: "Altera", inverso: "Alterada por" },
  { valor: "acrescenta", label: "Acrescenta dispositivo a", inverso: "Acrescida por" },
  { valor: "regulamenta", label: "Regulamenta", inverso: "Regulamentada por" },
  { valor: "complementa", label: "Complementa", inverso: "Complementada por" },
  { valor: "suspende", label: "Suspende", inverso: "Suspensa por" },
  { valor: "prorroga", label: "Prorroga", inverso: "Prorrogada por" },
  { valor: "republica", label: "Republica", inverso: "Republicada por" },
  { valor: "convalida", label: "Convalida", inverso: "Convalidada por" },
  { valor: "relacionada", label: "Relacionada com", inverso: "Relacionada com" }
];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnAdmin").onclick = abrirAdmin;
  document.getElementById("btnNovaLegislacao").onclick = () => abrirFormulario(null);
  document.getElementById("btnCancelarForm").onclick = fecharFormulario;
  document.getElementById("btnSalvarLegislacao").onclick = salvarLegislacao;
  document.getElementById("formTipo").addEventListener("change", (e) => {
    document.getElementById("campoTipoOutros").classList.toggle("oculto", e.target.value !== "outros");
  });
  configurarBuscaRelacao();
});

async function abrirAdmin() {
  if (!Auth.isAdmin()) return;

  const { data, error } = await supabaseClient
    .from("legislacoes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { alert("Erro ao carregar legislações."); return; }

  renderListaAdmin(data);
  mostrarTela("telaAdmin");
  atualizarBreadcrumb([{ label: "Administração", acao: abrirAdmin }]);
}

function renderListaAdmin(lista) {
  const container = document.getElementById("listaAdmin");

  if (!lista.length) {
    container.innerHTML = `<p class="vazio">Nenhuma legislação cadastrada ainda.</p>`;
    return;
  }

  const ICONE_EDITAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
  const ICONE_EXCLUIR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;

  container.innerHTML = lista.map(doc => `
    <div class="linha-admin" data-id="${doc.id}">
      <div>
        <span class="sigla">${CATEGORIAS.find(c => c.tipo === doc.tipo)?.sigla || "OUT"}</span>
        ${doc.numero ? "nº " + doc.numero : ""} <span class="rotulo-ano">${doc.ano}</span>
        <p class="titulo-doc">${doc.titulo}</p>
      </div>
      <div class="acoes-admin">
        <button class="btnEditar">${ICONE_EDITAR} Editar</button>
        <button class="btnExcluir">${ICONE_EXCLUIR} Excluir</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".linha-admin").forEach(linha => {
    const doc = lista.find(d => d.id === linha.dataset.id);
    linha.querySelector(".btnEditar").onclick = () => abrirFormulario(doc);
    linha.querySelector(".btnExcluir").onclick = () => excluirLegislacao(doc);
  });
}

function abrirFormulario(doc) {
  legislacaoEditando = doc;
  document.getElementById("tituloModalForm").textContent = doc ? "Editar legislação" : "Nova legislação";
  document.getElementById("formErro").textContent = "";

  document.getElementById("formTipo").value = doc?.tipo || "portaria";
  document.getElementById("formTipoOutros").value = doc?.tipo_outros || "";
  document.getElementById("campoTipoOutros").classList.toggle("oculto", (doc?.tipo || "portaria") !== "outros");
  document.getElementById("formNumero").value = doc?.numero || "";
  document.getElementById("formTitulo").value = doc?.titulo || "";
  document.getElementById("formAssunto").value = doc?.assunto || "";
  document.getElementById("formAno").value = doc?.ano || new Date().getFullYear();
  document.getElementById("formData").value = doc?.data_documento || "";
  document.getElementById("formEmenta").value = doc?.ementa || "";
  document.getElementById("formObservacoes").value = doc?.observacoes || "";

  document.getElementById("formArquivo").value = "";
  const arquivoAtual = document.getElementById("arquivoAtual");
  arquivoAtual.innerHTML = doc?.arquivo_url
    ? `Arquivo atual: <a href="${doc.arquivo_url}" target="_blank">${doc.arquivo_nome || "abrir PDF"}</a> (selecione um novo arquivo só se quiser substituir)`
    : "";

  const secaoRelacoes = document.getElementById("secaoRelacoes");
  if (doc) {
    secaoRelacoes.classList.remove("oculto");
    carregarRelacoes(doc.id).then(lista => renderRelacoes(lista, doc.id));
  } else {
    secaoRelacoes.classList.add("oculto");
    document.getElementById("listaRelacoes").innerHTML = "";
  }

  document.getElementById("relacaoBusca").value = "";
  document.getElementById("relacaoResultados").classList.add("oculto");

  document.getElementById("modalLegislacao").classList.remove("oculto");
}

function fecharFormulario() {
  document.getElementById("modalLegislacao").classList.add("oculto");
  legislacaoEditando = null;
}

async function salvarLegislacao() {
  const tipo = document.getElementById("formTipo").value;
  const tipoOutros = document.getElementById("formTipoOutros").value;
  const titulo = document.getElementById("formTitulo").value.trim();
  const ano = parseInt(document.getElementById("formAno").value);
  const arquivoInput = document.getElementById("formArquivo");
  const btnSalvar = document.getElementById("btnSalvarLegislacao");
  const erro = document.getElementById("formErro");
  erro.textContent = "";

  if (!titulo) { erro.textContent = "O título é obrigatório."; return; }
  if (!ano || ano < 1900) { erro.textContent = "Informe um ano válido."; return; }
  if (tipo === "outros" && !tipoOutros) { erro.textContent = "Informe o nome do tipo para a categoria Outros."; return; }

  const formData = new FormData();
  formData.append("tipo", tipo);
  formData.append("tipo_outros", tipoOutros);
  formData.append("numero", document.getElementById("formNumero").value);
  formData.append("titulo", titulo);
  formData.append("assunto", document.getElementById("formAssunto").value);
  formData.append("ano", String(ano));
  formData.append("data_documento", document.getElementById("formData").value);
  formData.append("ementa", document.getElementById("formEmenta").value);
  formData.append("observacoes", document.getElementById("formObservacoes").value);
  if (legislacaoEditando) formData.append("legislacao_id", legislacaoEditando.id);
  if (arquivoInput.files[0]) formData.append("arquivo", arquivoInput.files[0]);

  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY
      },
      body: formData
    });

    const resultado = await res.json();

    if (!resultado.ok) {
      erro.textContent = resultado.erro?.includes("duplicate")
        ? "Já existe uma legislação com esse tipo, número e ano."
        : (resultado.erro || "Erro ao salvar.");
      return;
    }

    fecharFormulario();
    abrirAdmin();
  } catch (err) {
    erro.textContent = "Erro de conexão: " + err.message;
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar";
  }
}

async function excluirLegislacao(doc) {
  const confirmar = confirm(`Tem certeza que deseja excluir "${doc.titulo}"?`);
  if (!confirmar) return;

  const { error } = await supabaseClient.from("legislacoes").delete().eq("id", doc.id);
  if (error) { alert("Erro ao excluir: " + error.message); return; }

  abrirAdmin();
}

// ---------- RELAÇÕES ENTRE LEGISLAÇÕES ----------
async function carregarRelacoes(legislacaoId) {
  const { data } = await supabaseClient
    .from("legislacao_relacoes")
    .select("id, tipo_relacao, legislacao_id, relacionada_id, origem:legislacao_id(titulo,numero,ano), destino:relacionada_id(titulo,numero,ano)")
    .or(`legislacao_id.eq.${legislacaoId},relacionada_id.eq.${legislacaoId}`);
  return data || [];
}

function renderRelacoes(lista, legislacaoId) {
  const container = document.getElementById("listaRelacoes");

  if (!lista.length) {
    container.innerHTML = `<p class="vazio-relacao">Nenhuma relação cadastrada.</p>`;
    return;
  }

  container.innerHTML = lista.map(rel => {
    const souOrigem = rel.legislacao_id === legislacaoId;
    const outro = souOrigem ? rel.destino : rel.origem;
    const tipoInfo = TIPOS_RELACAO.find(t => t.valor === rel.tipo_relacao);
    const rotulo = souOrigem ? tipoInfo.label : tipoInfo.inverso;
    return `
      <div class="linha-relacao" data-id="${rel.id}">
        <span>${rotulo}: ${outro?.numero ? "nº " + outro.numero : ""}${outro?.ano ? "/" + outro.ano : ""} — ${outro?.titulo || ""}</span>
        <button class="btnRemoverRelacao">Remover</button>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".btnRemoverRelacao").forEach(btn => {
    const linha = btn.closest(".linha-relacao");
    btn.onclick = async () => {
      await supabaseClient.from("legislacao_relacoes").delete().eq("id", linha.dataset.id);
      const atualizadas = await carregarRelacoes(legislacaoId);
      renderRelacoes(atualizadas, legislacaoId);
    };
  });
}

function configurarBuscaRelacao() {
  let timeoutRelacao;
  document.getElementById("relacaoBusca").addEventListener("input", (e) => {
    clearTimeout(timeoutRelacao);
    const termo = e.target.value.trim();
    const resultados = document.getElementById("relacaoResultados");

    if (termo.length < 2 || !legislacaoEditando) {
      resultados.classList.add("oculto");
      return;
    }

    timeoutRelacao = setTimeout(async () => {
      const { data } = await supabaseClient
        .from("legislacoes")
        .select("id, titulo, numero, ano, tipo")
        .neq("id", legislacaoEditando.id)
        .or(`titulo.ilike.%${termo}%,numero.ilike.%${termo}%`)
        .limit(8);

      if (!data || !data.length) {
        resultados.innerHTML = `<p class="vazio-relacao">Nada encontrado.</p>`;
        resultados.classList.remove("oculto");
        return;
      }

      resultados.innerHTML = data.map(doc => `
        <div class="item-resultado-relacao" data-id="${doc.id}">
          ${CATEGORIAS.find(c => c.tipo === doc.tipo)?.sigla || "OUT"} ${doc.numero ? "nº " + doc.numero : ""}${doc.ano ? "/" + doc.ano : ""} — ${doc.titulo}
        </div>
      `).join("");
      resultados.classList.remove("oculto");

      resultados.querySelectorAll(".item-resultado-relacao").forEach(item => {
        item.onclick = async () => {
          const tipo = document.getElementById("relacaoTipo").value;
          const { error } = await supabaseClient.from("legislacao_relacoes").insert({
            legislacao_id: legislacaoEditando.id,
            relacionada_id: item.dataset.id,
            tipo_relacao: tipo
          });
          if (error && error.code !== "23505") alert("Erro ao adicionar relação: " + error.message);

          document.getElementById("relacaoBusca").value = "";
          resultados.classList.add("oculto");
          const atualizadas = await carregarRelacoes(legislacaoEditando.id);
          renderRelacoes(atualizadas, legislacaoEditando.id);
        };
      });
    }, 300);
  });
}
