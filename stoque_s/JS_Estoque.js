import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const produtosRef = ref(db, 'Produtos/');
let ultimoCodigo = 0;

// ---------------------------
// Inicialização
// ---------------------------

function inicializarProdutos() {
  onValue(produtosRef, (snapshot) => {
    const cardsDiv = document.getElementById("productCards");
    cardsDiv.innerHTML = "";

    if (!snapshot.exists()) {
      ultimoCodigo = 0;
      gerarNovoCodigo();
      return;
    }

    snapshot.forEach(childSnap => {
      const produto = childSnap.val();
      const codigo = childSnap.key;
      adicionarCard(codigo, produto);
      const num = parseInt(codigo.replace(/^ST0*/, ""), 10);
      if (!isNaN(num) && num > ultimoCodigo) {
        ultimoCodigo = num;
      }
    });

    gerarNovoCodigo();
  });
}

function gerarNovoCodigo() {
  const proximoNum = ultimoCodigo + 1;
  const numStr = String(proximoNum).padStart(4, '0');
  const novoCod = `ST${numStr}`;
  document.getElementById("codigo").value = novoCod;
}

// ---------------------------
// Adicionar Card Horizontal
// ---------------------------

function adicionarCard(codigo, produto) {
  const cardsDiv = document.getElementById("productCards");

  const card = document.createElement("div");
  card.className = "product-card";
  card.setAttribute("data-nome", produto.nome.toLowerCase());
  card.setAttribute("data-preco", String(produto.precoVenda).toLowerCase());

  const dados = document.createElement("div");
  dados.className = "dados";
  dados.innerHTML = `
    <h3>${produto.nome} (Q. ${produto.quantidade})</h3>
    <p>Preço de Compra: ${produto.precoCompra} || Validade: ${produto.validade} 
    || <strong>Preço Venda:</strong> ${produto.precoVenda}</p>
  `;

  const acoes = document.createElement("div");
  acoes.className = "acoes";
  const btnDetalhes = document.createElement("button");
  btnDetalhes.textContent = "Detalhes";
  btnDetalhes.onclick = () => abrirDialogoProduto(codigo, produto);
  acoes.appendChild(btnDetalhes);

  card.appendChild(dados);
  card.appendChild(acoes);
  cardsDiv.appendChild(card);
}

// ---------------------------
// Campo de busca
// ---------------------------

document.getElementById("searchInput").addEventListener("input", function () {
  const filtro = this.value.toLowerCase();
  const cards = document.querySelectorAll(".product-card");

  cards.forEach((card) => {
    const nome = card.getAttribute("data-nome");
    const preco = card.getAttribute("data-preco");

    if (nome.includes(filtro) || preco.includes(filtro)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
});

// ---------------------------
// Diálogo de Detalhes e Adição
// ---------------------------

function abrirDialogoProduto(codigo, produto) {
  const overlay = document.createElement("div");
  overlay.style = `
    position: fixed;
    left:0; top:0;
    width:100%; height:100%;
    background: rgba(0,0,0,0.5);
    display:flex; justify-content:center; align-items:center;
  `;

  const box = document.createElement("div");
  box.style = `
    background:white;
    padding:20px;
    border-radius:8px;
    width:400px;
  `;

  box.innerHTML = `
    <h3>${produto.nome}</h3>
    <p><strong>Validade:</strong> ${produto.validade}</p>
    <p><strong>Fabrico:</strong> ${produto.fabrico}</p>
    <p><strong>Quantidade:</strong> ${produto.quantidade}</p>
    <p><strong>Preço Venda:</strong> ${produto.precoVenda}</p>
    <div style="margin-top:20px; display:flex; gap:10px; justify-content:space-between;">
      <button id="btnEliminar">Eliminar</button>
      <button id="btnAdicionar">Adicionar</button>
      <button id="btnCancelar">Cancelar</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document.getElementById("btnCancelar").onclick = () => {
    document.body.removeChild(overlay);
  };

  document.getElementById("btnEliminar").onclick = () => {
    remove(ref(db, `Produtos/${codigo}`))
      .then(() => {
        alert("Produto removido");
        document.body.removeChild(overlay);
      })
      .catch(err => {
        alert("Erro ao remover: " + err.message);
      });
  };

  document.getElementById("btnAdicionar").onclick = () => {
    document.body.removeChild(overlay);

    const novoDialogo = document.createElement("div");
    novoDialogo.style = `
      position: fixed;
      left: 0; top: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    const box = document.createElement("div");
    box.style = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      width: 350px;
    `;

    box.innerHTML = `
      <h3>Adicionar ao Produto</h3>
      <p><strong>Código:</strong> ${codigo}</p>
      <p><strong>Nome do Produto:</strong> ${produto.nome}</p>
      <label>Valor da Compra (novo):</label>
      <input type="number" id="novoValorCompra" step="0.01" />
      <label>Quantidade (nova):</label>
      <input type="number" id="novaQuantidade" step="0.01" />
      <label>Preço de Compra (calculado):</label>
      <input type="number" id="precoCompraNovo" readonly />
      <label>Preço de Venda (atualizar):</label>
      <input type="number" id="novoPrecoVenda" step="0.01" value="${produto.precoVenda}" />
      <div style="margin-top: 15px; text-align: right;">
        <button id="btnSalvarNovo">Salvar</button>
        <button id="btnCancelarNovo">Cancelar</button>
      </div>
    `;

    novoDialogo.appendChild(box);
    document.body.appendChild(novoDialogo);

    const inputValor = box.querySelector("#novoValorCompra");
    const inputQtd = box.querySelector("#novaQuantidade");
    const inputPrecoCalc = box.querySelector("#precoCompraNovo");

    function atualizarPrecoCompra() {
      const valorNovo = parseFloat(inputValor.value) || 0;
      const qtdNova = parseFloat(inputQtd.value) || 0;
      const totalValor = valorNovo + parseFloat(produto.valorCompra);
      const totalQtd = qtdNova + parseFloat(produto.quantidade);

      if (totalQtd > 0) {
        const precoUnit = totalValor / totalQtd;
        inputPrecoCalc.value = precoUnit.toFixed(2);
      } else {
        inputPrecoCalc.value = "";
      }
    }

    inputValor.addEventListener("input", atualizarPrecoCompra);
    inputQtd.addEventListener("input", atualizarPrecoCompra);

    document.getElementById("btnCancelarNovo").onclick = () => {
      document.body.removeChild(novoDialogo);
    };

    document.getElementById("btnSalvarNovo").onclick = () => {
      const valorNovo = parseFloat(inputValor.value) || 0;
      const qtdNova = parseFloat(inputQtd.value) || 0;
      const novoPrecoVenda = parseFloat(box.querySelector("#novoPrecoVenda").value) || 0;

      const valorTotal = valorNovo + parseFloat(produto.valorCompra);
      const qtdTotal = qtdNova + parseFloat(produto.quantidade);
      const precoCompraAtualizado = valorTotal / qtdTotal;

      const produtoAtualizado = {
        ...produto,
        valorCompra: valorTotal,
        quantidade: qtdTotal,
        precoCompra: precoCompraAtualizado.toFixed(2),
        precoVenda: novoPrecoVenda
      };

      set(ref(db, `Produtos/${codigo}`), produtoAtualizado)
        .then(() => {
          alert("Produto atualizado com sucesso!");
          document.body.removeChild(novoDialogo);
        })
        .catch(err => {
          alert("Erro ao atualizar: " + err.message);
        });
    };
  };
}

// ---------------------------
// Preço de Compra automático
// ---------------------------

function configurarCalculoPrecoCompra() {
  const valorCompraInput = document.getElementById("valorCompra");
  const quantidadeInput = document.getElementById("quantidade");

  function calcular() {
    const v = parseFloat(valorCompraInput.value) || 0;
    const q = parseFloat(quantidadeInput.value) || 0;
    if (q > 0) {
      const unit = v / q;
      document.getElementById("precoCompra").value = unit.toFixed(2);
    } else {
      document.getElementById("precoCompra").value = "";
    }
  }

  valorCompraInput.addEventListener("input", calcular);
  quantidadeInput.addEventListener("input", calcular);
}

// ---------------------------
// Gravação do formulário principal
// ---------------------------

document.getElementById("productForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const codigo = document.getElementById("codigo").value;
  const produto = {
    nome: document.getElementById("nome").value,
    descricao: document.getElementById("descricao").value,
    validade: document.getElementById("validade").value,
    fabrico: document.getElementById("fabrico").value,
    valorCompra: parseFloat(document.getElementById("valorCompra").value) || 0,
    quantidade: parseFloat(document.getElementById("quantidade").value) || 0,
    precoCompra: parseFloat(document.getElementById("precoCompra").value) || 0,
    precoVenda: parseFloat(document.getElementById("precoVenda").value) || 0,
    unidade: document.getElementById("unidade").value
  };

  set(ref(db, `Produtos/${codigo}`), produto)
    .then(() => {
      alert("Produto salvo com sucesso!");
      document.getElementById("productForm").reset();
      gerarNovoCodigo();
    })
    .catch(err => {
      alert("Erro ao salvar produto: " + err.message);
      console.error(err);
    });
});

// ---------------------------
// Iniciar
// ---------------------------

configurarCalculoPrecoCompra();
inicializarProdutos();
