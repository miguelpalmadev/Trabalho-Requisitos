const PRECO_METRO = 51.4;

let ultimoRecibo = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = protegerTelaCliente();
  if (!user) return;

  preencherUsuario(user);
  configurarCalculos();
  configurarPedido();
  configurarRecibo();
  configurarLogout();
  await renderMeusPedidos();
});

function protegerTelaCliente() {
  const user = getCurrentUser();
  if (!user || user.tipo !== "cliente") {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

function preencherUsuario(user) {
  document.getElementById("clienteNome").value = user.nome;
}

function configurarCalculos() {
  const altura = document.getElementById("altura");
  const comprimento = document.getElementById("comprimento");
  const camadas = document.getElementById("camadas");
  const sinal = document.getElementById("sinal");

  [altura, comprimento, camadas].forEach((input) => {
    input.addEventListener("input", calcularValores);
  });

  sinal.addEventListener("input", validarSinalMinimo);
}

function calcularValores() {
  const altura = parseFloat(document.getElementById("altura").value) || 0;
  const comprimento = parseFloat(document.getElementById("comprimento").value) || 0;
  const camadas = parseInt(document.getElementById("camadas").value, 10) || 0;

  const area = altura * comprimento;
  const total = (area * PRECO_METRO) + camadas;  // Aplicando o cálculo corretamente
  const sinalMinimo = total * 0.5;

  document.getElementById("area").value = area > 0 ? `${area.toFixed(2)} m²` : "";
  document.getElementById("valorTotal").value = total > 0 ? formatMoney(total) : "";

  const sinalInput = document.getElementById("sinal");
  const hint = document.getElementById("sinalHint");

  if (total > 0) {
    sinalInput.min = sinalMinimo.toFixed(2);

    if (!sinalInput.value || parseFloat(sinalInput.value) < sinalMinimo) {
      sinalInput.value = sinalMinimo.toFixed(2);
    }

    hint.textContent = `Mínimo permitido: ${formatMoney(sinalMinimo)}`;
  } else {
    sinalInput.value = "";
    sinalInput.min = "0";
    hint.textContent = "";
  }

  validarSinalMinimo();
}

function validarSinalMinimo() {
  const altura = parseFloat(document.getElementById("altura").value) || 0;
  const comprimento = parseFloat(document.getElementById("comprimento").value) || 0;
  const camadas = parseInt(document.getElementById("camadas").value, 10) || 0;
  const sinalInput = document.getElementById("sinal");
  const msg = document.getElementById("pedidoMensagem");

  const area = altura * comprimento;
  const valorTotal = area * PRECO_METRO + camadas;
  const sinalMinimo = valorTotal * 0.5;
  const sinalInformado = parseFloat(sinalInput.value) || 0;

  if (!valorTotal || !sinalInput.value) {
    sinalInput.setCustomValidity("");
    msg.textContent = "";
    return;
  }

  if (sinalInformado < sinalMinimo) {
    sinalInput.setCustomValidity("O sinal deve ser no mínimo 50% do valor total.");
    msg.style.color = "#c0392b";
    msg.textContent = `O sinal deve ser no mínimo ${formatMoney(sinalMinimo)}.`;
  } else {
    sinalInput.setCustomValidity("");
    if (msg.textContent.includes("mínimo")) {
      msg.textContent = "";
    }
  }
}

function configurarPedido() {
  const form = document.getElementById("pedidoForm");
  const msg = document.getElementById("pedidoMensagem");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const user = getCurrentUser();
    const dataEntrega = document.getElementById("dataEntrega").value;
    const altura = parseFloat(document.getElementById("altura").value) || 0;
    const comprimento = parseFloat(document.getElementById("comprimento").value) || 0;
    const camadas = parseInt(document.getElementById("camadas").value, 10) || 0;
    const formato = document.getElementById("formato").value;
    const sabor = document.getElementById("sabor").value;
    const recheio = document.getElementById("recheio").value;
    const sinal = parseFloat(document.getElementById("sinal").value) || 0;

    if (!dataEntrega || !altura || !comprimento || !camadas || !formato || !sabor || !recheio || !sinal) {
      msg.style.color = "#c0392b";
      msg.textContent = "Preencha todos os campos do pedido.";
      return;
    }

    const area = altura * comprimento;
    const valorTotal = area * PRECO_METRO + camadas;
    const sinalMinimo = valorTotal * 0.5;

    if (sinal < sinalMinimo) {
      msg.style.color = "#c0392b";
      msg.textContent = `O sinal deve ser no mínimo ${formatMoney(sinalMinimo)}.`;
      return;
    }

    if (sinal > valorTotal) {
      msg.style.color = "#c0392b";
      msg.textContent = "O sinal não pode ser maior que o valor total.";
      return;
    }

    try {
      const { pedido, message } = await API.criarPedido({
        userId: user.id,
        cliente: user.nome,
        emailCliente: user.email,
        dataEntrega,
        altura,
        comprimento,
        camadas,
        area,
        formato,
        sabor,
        recheio,
        sinal,
        valorTotal
      });

      form.reset();
      document.getElementById("clienteNome").value = user.nome;
      document.getElementById("area").value = `${area.toFixed(2)} m²`;
      document.getElementById("valorTotal").value = formatMoney(valorTotal);
      document.getElementById("camadas").value = camadas;
      document.getElementById("sinal").value = sinal.toFixed(2);
      document.getElementById("sinalHint").textContent = `Mínimo permitido: ${formatMoney(sinalMinimo)}`;

      ultimoRecibo = pedido;
      msg.style.color = "#4d9d62";
      msg.textContent = message;

      await renderMeusPedidos();
      renderRecibo(pedido);
    } catch (error) {
      msg.style.color = "#c0392b";
      msg.textContent = error.message;
    }
  });
}

async function renderMeusPedidos() {
  const user = getCurrentUser();
  const tbody = document.getElementById("meusPedidosBody");

  try {
    const pedidos = await API.listarPedidos({ userId: user.id, tipo: "cliente" });

    if (!pedidos.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">Nenhum pedido encontrado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = pedidos
      .map((pedido, index) => {
        const statusClasse =
          pedido.status === "concluido" ? "status-concluido" : "status-pendente";

        return `
          <tr data-id="${pedido.id}">
            <td>#${index + 1}</td>
            <td>${formatDateBR(pedido.dataEntrega)}</td>
            <td>${pedido.area.toFixed(2)} m²</td>
            <td>${pedido.camadas || 0}</td>
            <td>${pedido.formato}</td>
            <td>${pedido.sabor}</td>
            <td>${pedido.recheio}</td>
            <td>${formatMoney(pedido.sinal)}</td>
            <td>${formatMoney(pedido.valorTotal)}</td>
            <td class="${statusClasse}">${capitalize(pedido.status)}</td>
          </tr>
        `;
      })
      .join("");

    tbody.querySelectorAll("tr[data-id]").forEach((row) => {
      row.addEventListener("click", () => {
        const pedido = pedidos.find((p) => p.id === row.dataset.id);
        if (pedido) {
          ultimoRecibo = pedido;
          renderRecibo(pedido);
        }
      });
    });
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10">Erro ao carregar pedidos.</td>
      </tr>
    `;
  }
}

function renderRecibo(pedido) {
  const box = document.getElementById("reciboBox");

  if (!pedido) {
    box.innerHTML = `<p>Nenhum pedido disponível para recibo.</p>`;
    return;
  }

  box.innerHTML = `
    <ul>
      <li><strong>Cliente:</strong> ${pedido.cliente}</li>
      <li><strong>Data de entrega:</strong> ${formatDateBR(pedido.dataEntrega)}</li>
      <li><strong>Altura:</strong> ${pedido.altura} m</li>
      <li><strong>Comprimento:</strong> ${pedido.comprimento} m</li>
      <li><strong>Área do bolo:</strong> ${pedido.area.toFixed(2)} m²</li>
      <li><strong>Número de camadas:</strong> ${pedido.camadas || 0}</li>
      <li><strong>Formato:</strong> ${pedido.formato}</li>
      <li><strong>Sabor da massa:</strong> ${pedido.sabor}</li>
      <li><strong>Recheio:</strong> ${pedido.recheio}</li>
      <li><strong>Valor total do bolo:</strong> ${formatMoney(pedido.valorTotal)}</li>
      <li><strong>Valor do sinal pago:</strong> ${formatMoney(pedido.sinal)}</li>
      <li><strong>Status:</strong> ${capitalize(pedido.status)}</li>
    </ul>
  `;
}

function formatMoney(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatDateBR(date) {
  const [ano, mes, dia] = date.split("-");
  return `${dia}/${mes}/${ano}`;
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}