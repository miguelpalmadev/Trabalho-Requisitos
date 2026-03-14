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

  [altura, comprimento].forEach((input) => {
    input.addEventListener("input", calcularValores);
  });
}

function calcularValores() {
  const altura = parseFloat(document.getElementById("altura").value) || 0;
  const comprimento = parseFloat(document.getElementById("comprimento").value) || 0;

  const area = altura * comprimento;
  const total = area * PRECO_METRO;
  const sinal = total * 0.5;

  document.getElementById("area").value = area > 0 ? `${area.toFixed(2)} m²` : "";
  document.getElementById("valorTotal").value = total > 0 ? formatMoney(total) : "";
  document.getElementById("sinal").value = sinal > 0 ? formatMoney(sinal) : "";
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
    const formato = document.getElementById("formato").value;
    const sabor = document.getElementById("sabor").value;
    const recheio = document.getElementById("recheio").value;

    if (!dataEntrega || !altura || !comprimento || !formato || !sabor || !recheio) {
      msg.style.color = "#c0392b";
      msg.textContent = "Preencha todos os campos do pedido.";
      return;
    }

    const area = altura * comprimento;
    const valorTotal = area * PRECO_METRO;
    const sinal = valorTotal * 0.5;

    try {
      const { pedido, message } = await API.criarPedido({
        userId: user.id,
        cliente: user.nome,
        emailCliente: user.email,
        dataEntrega,
        altura,
        comprimento,
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
      document.getElementById("sinal").value = formatMoney(sinal);

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
    const pedidosAtivos = pedidos.filter((pedido) => pedido.status !== "concluido");

    if (!pedidosAtivos.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">Nenhum pedido encontrado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = pedidosAtivos
      .map(
        (pedido, index) => `
        <tr data-id="${pedido.id}">
          <td>#${index + 1}</td>
          <td>${formatDateBR(pedido.dataEntrega)}</td>
          <td>${pedido.area.toFixed(2)} m²</td>
          <td>${pedido.formato}</td>
          <td>${pedido.sabor}</td>
          <td>${pedido.recheio}</td>
          <td>${formatMoney(pedido.sinal)}</td>
          <td>${formatMoney(pedido.valorTotal)}</td>
          <td class="status-pendente">${capitalize(pedido.status)}</td>
        </tr>
      `
      )
      .join("");

    tbody.querySelectorAll("tr[data-id]").forEach((row) => {
      row.addEventListener("click", () => {
        const pedido = pedidosAtivos.find((p) => p.id === row.dataset.id);
        if (pedido) {
          ultimoRecibo = pedido;
          renderRecibo(pedido);
        }
      });
    });
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">Erro ao carregar pedidos.</td>
      </tr>
    `;
  }
}

function configurarRecibo() {
  const btn = document.getElementById("emitirReciboBtn");
  btn.addEventListener("click", () => {
    renderRecibo(ultimoRecibo);
  });
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
      <li><strong>Formato:</strong> ${pedido.formato}</li>
      <li><strong>Sabor da massa:</strong> ${pedido.sabor}</li>
      <li><strong>Recheio:</strong> ${pedido.recheio}</li>
      <li><strong>Valor total do bolo:</strong> ${formatMoney(pedido.valorTotal)}</li>
      <li><strong>Valor do sinal pago:</strong> ${formatMoney(pedido.sinal)}</li>
      <li><strong>Status:</strong> ${capitalize(pedido.status)}</li>
    </ul>
  `;
}

function configurarLogout() {
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
  });
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