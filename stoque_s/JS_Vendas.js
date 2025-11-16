// vendas.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getDatabase, ref, set, onValue, push, get, child, remove, runTransaction, update } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

/* ========== CONFIGURE AQUI ========== */
const firebaseConfig = {
  apiKey: "AIzaSyCn8XM7PjwLtt89L6Sh8trsXVT6nm_3gwk",
  authDomain: "sistema-s-cb482.firebaseapp.com",
  databaseURL: "https://sistema-s-cb482-default-rtdb.firebaseio.com/",
  projectId: "sistema-s-cb482",
  storageBucket: "sistema-s-cb482.firebasestorage.app",
  messagingSenderId: "830354059517",
  appId: "1:830354059517:web:b42ec83f161c198fa74e94",
  measurementId: "G-TRW2TPH7EX"
};
/* ===================================== */

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// nós
const produtosRef = ref(db, 'Produtos/');
const vendasBaseRef = (dataStr) => ref(db, `Vendas/${dataStr}`);
const caixaDiaRef = (dataStr) => ref(db, `Caixa_dia/${dataStr}`);

// elementos DOM
const productListEl = document.getElementById("productList");
const searchProductsEl = document.getElementById("searchProducts");
const clientCodeEl = document.getElementById("clientCode");
const saleTotalEl = document.getElementById("saleTotal");
const saleTbody = document.getElementById("saleTbody");
const btnFacturar = document.getElementById("btnFacturar");
const btnNovaVenda = document.getElementById("btnNovaVenda");
const btnAnularVenda = document.getElementById("btnAnularVenda");


// estado da venda actual (local)
let currentDateStr = hojeStr();
let currentSaleId = null; 
let currentClientCode = null;
let saleDataCache = null; 

/* ---------------------------
  Utilidades
--------------------------- */
function hojeStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`; // ex: 18102025
}

function gerarClientCode() {
  const rand = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `CLI${rand}`;
}

function formatMoney(v) {
  return Number(v).toFixed(2);
}

/* ---------------------------
  Inicializar: produtos e venda
--------------------------- */
function iniciar() {
  currentDateStr = hojeStr();
  criarOuRecuperarVendaActiva();
  observarProdutos();
}

function observarProdutos() {
  onValue(produtosRef, (snap) => {
    const produtos = snap.exists() ? snap.val() : {};
    renderListaProdutos(produtos);
  });
}

/* ---------------------------
  RENDER produtos (cards)
--------------------------- */
function renderListaProdutos(produtosObj) {
  productListEl.innerHTML = "";
  const filtro = (searchProductsEl.value || "").toLowerCase();

  const entries = Object.entries(produtosObj || {});
  entries.forEach(([codigo, produto]) => {
    const nome = (produto.nome || "").toString();
    const precoVenda = (produto.precoVenda || 0).toString();
    const searchable = `${nome.toLowerCase()} ${precoVenda.toLowerCase()}`;
    if (filtro && !searchable.includes(filtro)) return;

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-info">
        <div class="code">${codigo}  (${produto.quantidade})</div>
        <div>
          <div class="name">${nome}</div>
          <div class="meta">Preço: ${formatMoney(produto.precoVenda || 0)} | Unidade: ${produto.unidade || '-'}</div>
        </div>
      </div>
    `;
    card.addEventListener("click", () => abrirDialogoQuantidade(codigo, produto));
    productListEl.appendChild(card);
  });
}

/* ---------------------------
  BUSCA
--------------------------- */
searchProductsEl.addEventListener("input", () => {
  get(produtosRef).then(snap => {
    const produtos = snap.exists() ? snap.val() : {};
    renderListaProdutos(produtos);
  });
});

/* ---------------------------
  Venda activa: criar / recuperar
--------------------------- */
async function criarOuRecuperarVendaActiva() {
  const vendasRef = vendasBaseRef(currentDateStr);
  const snap = await get(vendasRef);
  let foundSaleId = null;

  if (snap.exists()) {
    const vendas = snap.val();
    for (const key in vendas) {
      if (vendas[key] && vendas[key].activa) {
        foundSaleId = key;
        break;
      }
    }
  }

  if (!foundSaleId) {
    const newSaleRef = push(vendasRef);
    const saleId = newSaleRef.key;
    const clientCode = gerarClientCode();
    const saleObj = {
      clientCode,
      createdAt: Date.now(),
      total: 0,
      activa: true
    };
    await set(newSaleRef, saleObj);
    currentSaleId = saleId;
    currentClientCode = clientCode;
    saleDataCache = { items: {}, total: 0 };
    atualizarSaleUI();
  } else {
    currentSaleId = foundSaleId;
    const saleSnap = await get(child(vendasRef, foundSaleId));
    const saleObj = saleSnap.exists() ? saleSnap.val() : { clientCode: gerarClientCode(), total: 0 };
    currentClientCode = saleObj.clientCode || gerarClientCode();
    const itemsSnap = await get(child(vendasRef, `${foundSaleId}/items`));
    const items = itemsSnap.exists() ? itemsSnap.val() : {};
    let total = 0;
    for (const k in items) total += (Number(items[k].valorTotal) || 0);
    saleDataCache = { items, total };
    await update(child(vendasRef, foundSaleId), { total });
    atualizarSaleUI();
  }
}

/* ---------------------------
  UI: atualizar venda (carrinho)
--------------------------- */
function atualizarSaleUI() {
  clientCodeEl.textContent = currentClientCode || "—";
  const total = saleDataCache ? saleDataCache.total : 0;
  saleTotalEl.textContent = formatMoney(total);
  saleTbody.innerHTML = "";
  const items = saleDataCache?.items || {};
  for (const itemKey in items) {
    const it = items[itemKey];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.nome} <br><small>${it.codigo}</small></td>
      <td>${it.quantidade}</td>
      <td>${formatMoney(it.precoVenda)}</td>
      <td>${formatMoney(it.valorTotal)}</td>
      <td><button class="remove-btn" data-key="${itemKey}">X</button></td>
    `;
    saleTbody.appendChild(tr);
  }

  saleTbody.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => removerItemVenda(btn.dataset.key));
  });
}

/* ---------------------------
  Abrir diálogo quantidade
--------------------------- */
function abrirDialogoQuantidade(codigo, produto) {
  // === Overlay principal do diálogo ===
  const overlay = document.createElement("div");
  overlay.style = `
    position: fixed; left:0; top:0; width:100%; height:100%;
    background: rgba(0,0,0,0.45); display:flex; justify-content:center; align-items:center;
    z-index:1000;
  `;

  // === Caixa de conteúdo ===
  const box = document.createElement("div");
  box.style = `
    background:#fff; padding:18px; border-radius:8px; width:320px;
    box-shadow: 0 3px 8px rgba(0,0,0,0.25);
  `;
  box.innerHTML = `
    <h3>${produto.nome}</h3>
    <p><strong>Preço venda:</strong> ${formatMoney(produto.precoVenda || 0)} | Unidade: ${produto.unidade || '-'}</p>
    <label>Quantidade:</label>
    <input id="dlgQtd" type="number" min="1" value="1" style="width:100%; padding:8px; margin-bottom:10px;" />
    <div style="display:flex; gap:8px; justify-content:flex-end;">
      <button id="dlgCancel">Cancelar</button>
      <button id="dlgConfirm" style="background:#133d13; color:#fff; border:none; padding:8px 10px;">Confirmar</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // === Funções de clique ===
  box.querySelector("#dlgCancel").addEventListener("click", () => document.body.removeChild(overlay));

  box.querySelector("#dlgConfirm").addEventListener("click", async () => {
    const qtd = Number(box.querySelector("#dlgQtd").value) || 1;

    // ==== Criar spinner ====
    const spinner = document.createElement("div");
    spinner.style = `
      position: fixed; left:0; top:0; width:100%; height:100%;
      background: rgba(255,255,255,0.7);
      display:flex; justify-content:center; align-items:center;
      z-index:2000;
    `;
    spinner.innerHTML = `
      <div style="
        border: 4px solid #ccc;
        border-top: 4px solid #133d13;
        border-radius: 50%;
        width: 45px;
        height: 45px;
        animation: spin 1s linear infinite;
      "></div>
    `;
    document.body.appendChild(spinner);

    // ==== Animação do spinner ====
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    try {
      await adicionarProdutoAVenda(codigo, produto, qtd);
    } finally {
      document.body.removeChild(overlay);
      document.body.removeChild(spinner);
    }
  });
}


/* ---------------------------
  Adicionar produto à venda
--------------------------- */
async function adicionarProdutoAVenda(codigo, produto, quantidade) {
  if (!currentSaleId) await criarOuRecuperarVendaActiva();

  const base = vendasBaseRef(currentDateStr);
  const saleRef = child(base, currentSaleId);
  const itemsSnap = await get(child(base, `${currentSaleId}/items`));
  const items = itemsSnap.exists() ? itemsSnap.val() : {};

  let foundKey = null;
  for (const k in items) if (items[k].codigo === codigo) foundKey = k;

  const precoVenda = Number(produto.precoVenda) || 0;
  const valorTotalNovo = precoVenda * quantidade;

  if (foundKey) {
    const prev = items[foundKey];
    const novaQtd = Number(prev.quantidade || 0) + quantidade;
    const novoValorTotal = Number(prev.valorTotal || 0) + valorTotalNovo;
    await update(child(base, `${currentSaleId}/items/${foundKey}`), { quantidade: novaQtd, valorTotal: novoValorTotal });
  } else {
    const newItemRef = push(child(base, `${currentSaleId}/items`));
    await set(newItemRef, { codigo, nome: produto.nome || '', quantidade, precoVenda, valorTotal: valorTotalNovo });
  }

  const newItemsSnap = await get(child(base, `${currentSaleId}/items`));
  let total = 0;
  if (newItemsSnap.exists()) {
    const newItems = newItemsSnap.val();
    for (const k in newItems) total += Number(newItems[k].valorTotal || 0);
  }
  await update(child(base, currentSaleId), { total });

  const finalItemsSnap = await get(child(base, `${currentSaleId}/items`));
  saleDataCache = { items: finalItemsSnap.exists() ? finalItemsSnap.val() : {}, total };
  currentClientCode = (await get(child(base, currentSaleId))).val().clientCode || currentClientCode;
  atualizarSaleUI();


  
}

/* ---------------------------
  Remover item
--------------------------- */
async function removerItemVenda(itemKey) {
  if (!currentSaleId) return;
  const base = vendasBaseRef(currentDateStr);
  await remove(child(base, `${currentSaleId}/items/${itemKey}`));
  const newItemsSnap = await get(child(base, `${currentSaleId}/items`));
  let total = 0;
  if (newItemsSnap.exists()) {
    const newItems = newItemsSnap.val();
    for (const k in newItems) total += Number(newItems[k].valorTotal || 0);
  }
  await update(child(base, currentSaleId), { total });
  saleDataCache = { items: newItemsSnap.exists() ? newItemsSnap.val() : {}, total };
  atualizarSaleUI();
}



/* ---------------------------
  FACTURAR → gerar e baixar PDF automaticamente
--------------------------- */
btnFacturar.addEventListener("click", async () => {
  if (!currentSaleId) return alert("Não há venda activa.");
  const base = vendasBaseRef(currentDateStr);
  const saleSnap = await get(child(base, currentSaleId));
  if (!saleSnap.exists()) return alert("Venda não encontrada.");

  const saleObj = saleSnap.val();
  const itemsSnap = await get(child(base, `${currentSaleId}/items`));
  if (!itemsSnap.exists()) return alert("Nenhum item na venda.");

  // === Exibir spinner de carregamento ===
  const spinner = document.createElement("div");
  spinner.style = `
    position: fixed; left:0; top:0; width:100%; height:100%;
    background: rgba(255,255,255,0.7);
    display:flex; justify-content:center; align-items:center;
    z-index:2000;
  `;
  spinner.innerHTML = `
    <div style="
      border: 4px solid #ccc;
      border-top: 4px solid #133d13;
      border-radius: 50%;
      width: 45px;
      height: 45px;
      animation: spin 1s linear infinite;
    "></div>
  `;
  document.body.appendChild(spinner);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  try {
    const items = itemsSnap.val();
    const itemsArray = Object.entries(items).map(([key, v]) => ({ key, ...v }));

    // === Atualizar stocks e Caixa ===
    for (const it of itemsArray) {
      const produtoQuantRef = ref(db, `Produtos/${it.codigo}/quantidade`);
      await runTransaction(produtoQuantRef, (curr) => (curr || 0) - Number(it.quantidade || 0));
    }

    const caixaRef = caixaDiaRef(currentDateStr);
    const caixaSnap = await get(caixaRef);
    const atual = caixaSnap.exists() ? Number(caixaSnap.val().valor || 0) : 0;
    const novo = atual + Number(saleObj.total || 0);
    await set(caixaRef, { valor: novo, updatedAt: Date.now() });

    await update(child(vendasBaseRef(currentDateStr), currentSaleId), {
      activa: false,
      faturado: true,
      invoiceAt: Date.now(),
    });

    // === Gerar PDF com jsPDF ===
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(14);
    doc.text("Venda a Dinheiro", 10, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Cliente: ${currentClientCode}`, 10, y);
    y += 6;
    doc.text(`Data: ${new Date().toLocaleString()} (${currentDateStr})`, 10, y);
    y += 10;

    doc.setFontSize(10);
    doc.text("Código", 10, y);
    doc.text("Produto", 40, y);
    doc.text("Qtd", 110, y);
    doc.text("Preço", 130, y);
    doc.text("Valor", 160, y);
    y += 6;
    doc.line(10, y, 200, y);
    y += 4;

    for (const it of itemsArray) {
      doc.text(it.codigo, 10, y);
      doc.text(it.nome, 40, y);
      doc.text(String(it.quantidade), 110, y, null, null, "right");
      doc.text(formatMoney(it.precoVenda), 130, y, null, null, "right");
      doc.text(formatMoney(it.valorTotal), 180, y, null, null, "right");
      y += 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    y += 6;
    doc.line(10, y, 200, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`Total: ${formatMoney(saleObj.total)}`, 160, y, null, null, "right");

    // === Baixar automaticamente o PDF ===
    const nomeArquivo = `Factura_${currentClientCode}_${currentDateStr}.pdf`;
    doc.save(nomeArquivo);

    // === Limpar venda e preparar nova ===
    currentSaleId = null;
    currentClientCode = null;
    saleDataCache = { items: {}, total: 0 };
    atualizarSaleUI();
    await criarOuRecuperarVendaActiva();

    // Mensagem final
    alert("Factura gerada e guardada com sucesso!");
  } catch (err) {
    console.error("Erro ao facturar:", err);
    alert("Erro ao processar a factura. Verifique a consola.");
  } finally {
    // === Remover spinner ===
    if (spinner && spinner.parentNode) {
      document.body.removeChild(spinner);
    }
  }
});






/* ---------------------------
  Anular uma venda
--------------------------- */
btnAnularVenda.addEventListener("click", () => {
  const overlay = document.createElement("div");
  overlay.style = `
    position: fixed; left:0; top:0; width:100%; height:100%;
    background: rgba(0,0,0,0.45); display:flex; justify-content:center; align-items:center;
    z-index:1000;
  `;

  const box = document.createElement("div");
  box.style = `
    background:#fff; padding:18px; border-radius:8px; width:380px;
    box-shadow: 0 3px 8px rgba(0,0,0,0.25);
  `;
  box.innerHTML = `
    <h3>Anular uma Venda</h3>
    <label>Código do Cliente:</label>
    <input id="codigoClienteAnular" type="text" style="width:100%; padding:8px; margin-bottom:10px;" placeholder="Ex: CLI123ABC" />
    <button id="btnBuscarVenda" style="background:#133d13; color:#fff; border:none; padding:8px 12px; margin-bottom:10px;">Buscar</button>
    <div id="vendaEncontrada" style="max-height:200px; overflow-y:auto; margin-bottom:10px;"></div>
    <div style="display:flex; gap:8px; justify-content:flex-end;">
      <button id="dlgCancel">Fechar</button>
      <button id="btnConfirmAnular" disabled style="background:#8b0000; color:#fff; border:none; padding:8px 12px;">Anular Venda</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const input = box.querySelector("#codigoClienteAnular");
  const divResultados = box.querySelector("#vendaEncontrada");
  const btnBuscar = box.querySelector("#btnBuscarVenda");
  const btnConfirm = box.querySelector("#btnConfirmAnular");

  let vendaSelecionada = null;

  box.querySelector("#dlgCancel").addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  btnBuscar.addEventListener("click", async () => {
    const cod = input.value.trim().toUpperCase();
    if (!cod) return alert("Insira o código do cliente.");

    const vendasRef = vendasBaseRef(currentDateStr);
    const vendasSnap = await get(vendasRef);
    if (!vendasSnap.exists()) {
      divResultados.innerHTML = "<p style='color:red;'>Nenhuma venda encontrada para hoje.</p>";
      return;
    }

    const vendas = vendasSnap.val();
    divResultados.innerHTML = "";
    let encontrada = null;

    for (const [key, venda] of Object.entries(vendas)) {
      if (venda.clientCode === cod && venda.faturado && !venda.anulada) {
        encontrada = { id: key, ...venda };
        break;
      }
    }

    if (!encontrada) {
      divResultados.innerHTML = `<p style="color:red;">Venda não encontrada para este cliente.</p>`;
      btnConfirm.disabled = true;
      return;
    }

    vendaSelecionada = encontrada;

    // Mostrar produtos da venda
    const itemsSnap = await get(child(vendasRef, `${encontrada.id}/items`));
    const items = itemsSnap.exists() ? itemsSnap.val() : {};
    let html = "<table style='width:100%; border-collapse:collapse;'>";
    html += "<tr><th>Produto</th><th>Qtd</th><th>Valor</th></tr>";
    for (const it of Object.values(items)) {
      html += `<tr><td>${it.nome}</td><td>${it.quantidade}</td><td>${formatMoney(it.valorTotal)}</td></tr>`;
    }
    html += "</table>";
    divResultados.innerHTML = html;
    btnConfirm.disabled = false;
  });

  btnConfirm.addEventListener("click", async () => {
    if (!vendaSelecionada) return;
    if (!confirm("Tem a certeza que deseja anular esta venda?")) return;

    // === Spinner de loading ===
    const spinner = document.createElement("div");
    spinner.style = `
      position: fixed; left:0; top:0; width:100%; height:100%;
      background: rgba(255,255,255,0.7);
      display:flex; justify-content:center; align-items:center;
      z-index:2000;
    `;
    spinner.innerHTML = `
      <div style="
        border: 4px solid #ccc;
        border-top: 4px solid #133d13;
        border-radius: 50%;
        width: 45px;
        height: 45px;
        animation: spin 1s linear infinite;
      "></div>
    `;
    document.body.appendChild(spinner);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    try {
      const itemsSnap = await get(child(vendasBaseRef(currentDateStr), `${vendaSelecionada.id}/items`));
      if (!itemsSnap.exists()) throw new Error("Sem itens para anular.");
      const items = itemsSnap.val();

      // Devolver estoque
      for (const it of Object.values(items)) {
        const produtoQuantRef = ref(db, `Produtos/${it.codigo}/quantidade`);
        await runTransaction(produtoQuantRef, (curr) => (curr || 0) + Number(it.quantidade || 0));
      }

      // Subtrair do caixa
      const caixaRef = caixaDiaRef(currentDateStr);
      const caixaSnap = await get(caixaRef);
      if (caixaSnap.exists()) {
        const atual = Number(caixaSnap.val().valor || 0);
        const novo = atual - Number(vendaSelecionada.total || 0);
        await set(caixaRef, { valor: novo, updatedAt: Date.now() });
      }

      // Marcar como anulada
      await update(child(vendasBaseRef(currentDateStr), vendaSelecionada.id), {
        anulada: true,
        activa: false,
      });

      alert("Venda anulada com sucesso!");
      document.body.removeChild(overlay);
    } catch (e) {
      console.error("Erro ao anular venda:", e);
      alert("Erro ao anular a venda. Veja o console para detalhes.");
    } finally {
      if (spinner && spinner.parentNode) document.body.removeChild(spinner);
    }
  });
});










/* ---------------------------
  iniciar aplicação
--------------------------- */
iniciar();
