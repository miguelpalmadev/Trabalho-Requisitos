document.addEventListener("DOMContentLoaded", async () => {
  const user = protegerTelaConfeiteiro();
  if (!user) return;

  configurarNavegacaoCalendario();
  configurarReciboConfeiteiro();
  configurarLogout();
  await carregarTela();
});

function protegerTelaConfeiteiro() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user || user.tipo !== "confeiteiro") {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function carregarTela() {
  try {
    pedidosCache = await API.listarPedidos();
    renderCalendar(currentMonth, currentYear);  // Garantindo que a função de renderização do calendário seja chamada corretamente
    renderPedidos();
  } catch (error) {
    document.getElementById("pedidosBody").innerHTML = `
      <tr>
        <td colspan="11">Erro ao carregar pedidos.</td>
      </tr>
    `;
  }
}

function renderCalendar(month, year) {
  const calendar = document.getElementById("calendar");
  const monthLabel = document.getElementById("monthLabel");

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  monthLabel.textContent = `${monthNames[month]} de ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const pedidos = getPedidosAtivos();

  let html = dayNames.map((day) => `<div class="day-name">${day}</div>`).join("");

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="day-cell empty"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const totalPedidosDia = pedidos.filter((pedido) => pedido.dataEntrega === date).length;
    const isFull = totalPedidosDia >= 4;  // Limite de pedidos por dia

    html += `
      <div class="day-cell ${isFull ? "full" : ""}">
        <div class="day-number">${day}</div>
        <div class="day-info">${totalPedidosDia} pedido(s)</div>
        <div class="day-info">${isFull ? "Lotado" : "Disponível"}</div>
      </div>
    `;
  }

  calendar.innerHTML = html;
}

function renderPedidos() {
  const tbody = document.getElementById("pedidosBody");
  const pedidos = getPedidosAtivos();

  if (!pedidos.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11">Nenhum pedido encontrado.</td>
      </tr>
    `;
    renderReciboConfeiteiro(null);
    return;
  }

  tbody.innerHTML = pedidos
    .map(
      (pedido, index) => `
      <tr data-id="${pedido.id}">
        <td>#${index + 1}</td>
        <td>${pedido.cliente}</td>
        <td>${pedido.area.toFixed(2)} m²</td>
        <td>${pedido.formato}</td>
        <td>${pedido.sabor}</td>
        <td>${pedido.recheio}</td>
        <td>${formatMoney(pedido.sinal)}</td>
        <td>${formatMoney(pedido.valorTotal)}</td>
        <td>${formatDateBR(pedido.dataEntrega)}</td>
        <td><button class="concluir-btn" data-id="${pedido.id}">Concluir</button></td>
      </tr>
    `
    )
    .join("");

  tbody.querySelectorAll("tr[data-id]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest(".concluir-btn")) return;

      const pedido = pedidos.find((p) => p.id === row.dataset.id);
      if (pedido) {
        ultimoReciboConfeiteiro = pedido;
        renderReciboConfeiteiro(pedido);
      }
    });
  });

  document.querySelectorAll(".concluir-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await concluirPedido(btn.dataset.id);
    });
  });
}

async function concluirPedido(id) {
  try {
    await API.concluirPedido(id);
    pedidosCache = await API.listarPedidos();

    if (ultimoReciboConfeiteiro && ultimoReciboConfeiteiro.id === id) {
      ultimoReciboConfeiteiro = null;
      renderReciboConfeiteiro(null);
    }

    renderPedidos();
    renderCalendar(currentMonth, currentYear);  // Atualizando o calendário depois de concluir o pedido
  } catch (error) {
    alert(error.message);
  }
}

function renderReciboConfeiteiro(pedido) {
  const box = document.getElementById("reciboConfeiteiroBox");

  if (!pedido) {
    box.innerHTML = `<p>Selecione um pedido no resumo para visualizar o recibo.</p>`;
    return;
  }

  box.innerHTML = `
    <ul>
      <li><strong>Cliente:</strong> ${pedido.cliente}</li>
      <li><strong>E-mail:</strong> ${pedido.emailCliente}</li>
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