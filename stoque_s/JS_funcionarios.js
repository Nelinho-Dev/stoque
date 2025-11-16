import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getDatabase, ref, set, onValue} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";


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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


document.getElementById("cadastroForm").addEventListener("submit", (e) => {
  e.preventDefault();
  console.log("Formulário foi submetido!");

 const pessaol = {
  nome: document.getElementById("nome").value,
  nascimento: document.getElementById("nascimento").value,
  residencia: document.getElementById("residencia").value,
  telefone: document.getElementById("telefone").value,
  grau: document.getElementById("grau").value,
  funcao: document.getElementById("funcao").value
};


  const Nome_Chave = pessaol.nome.replace(/\s+/g, "_").toLowerCase();

  alert("" +  Nome_Chave)

   
    set(ref(db, 'Funcionario/' + Nome_Chave), pessaol)
    .then(() => {
      alert("Dados gravados com sucesso!");
      document.getElementById("cadastroForm").reset();
    })
    .catch((error) => {
      console.error("Erro ao gravar: ", error);
      alert("Erro ao gravar os dados.");
    });
});


function atualizarListaDocentes() {
  const lista = document.getElementById("listaPessoal");
  const icone = document.getElementById("iconeVisualizacao");
  const docentesRef = ref(db, 'Funcionario/');

  onValue(docentesRef, (snapshot) => {
    lista.innerHTML = "";

     if (!snapshot.exists()) {
      icone.style.display = "none";
      return;
    }

    icone.style.display = "block"; // Mostrar o olho

    snapshot.forEach((docenteSnap) => {
      const d = docenteSnap.val();
      const li = document.createElement("li");
      li.className = "docente-card";

      li.innerHTML = `
        <div class="linha">
        <strong>Nome do Funcionário:</strong> ${d.nome}
        <strong>   (</strong> ${d.funcao}
        <strong> )</strong>
        </div>
        <div class="linha">
          <strong>Residência:</strong> ${d.residencia} | 
          <strong>Grau:</strong> ${d.grau}
        </div>
        <div class="linha">
          <strong>Telefone:</strong> ${d.telefone} | 
          <strong>Nascimento:</strong> ${d.nascimento}
        </div>
      `;
      lista.appendChild(li);
    });
  });
}

atualizarListaDocentes();



