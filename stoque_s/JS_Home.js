// caixa_dia.js
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

/* === ELEMENTOS DOM === */
const saldoHojeEl = document.getElementById("saldoHoje");
const listaCaixasEl = document.getElementById("listaCaixas");

/* === FUNÇÕES === */
function hojeStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`; // exemplo: 08112025
}

function formatarDataHumana(str) {
  if (!str || str.length !== 8) return str;
  return `${str.slice(0, 2)}/${str.slice(2, 4)}/${str.slice(4)}`;
}

function formatarMoeda(valor) {
  const numero = Number(valor || 0);
  // Formata com separador de milhar como espaço e vírgula decimal
  return numero
    .toFixed(2) // garante duas casas decimais
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ") // adiciona espaço a cada 3 dígitos
    .replace(".", ","); // troca o ponto decimal por vírgula
}

/* === PRINCIPAL === */
async function carregarCaixa() {
  const refCaixas = ref(db, "Caixa_dia/");
  const hoje = hojeStr();

  onValue(refCaixas, (snap) => {
    if (!snap.exists()) {
      saldoHojeEl.textContent = "Sem dados disponíveis.";
      return;
    }

    const dados = snap.val();
    const entradas = Object.entries(dados);

    // Caixa de hoje
    const hojeData = dados[hoje];
    if (hojeData && hojeData.valor != null) {
      saldoHojeEl.textContent = formatarMoeda(hojeData.valor);
    } else {
      saldoHojeEl.textContent = "0,00";
    }

    // Caixas anteriores
    listaCaixasEl.innerHTML = "";
    const anteriores = entradas
      .filter(([k]) => k !== hoje)
      .sort((a, b) => b[0].localeCompare(a[0]));

    anteriores.forEach(([data, val]) => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <strong>${formatarDataHumana(data)}</strong>
        <span>${formatarMoeda(val.valor || 0)}</span>
      `;
      listaCaixasEl.appendChild(div);
    });
  });
}

/* === INICIAR === */
carregarCaixa();