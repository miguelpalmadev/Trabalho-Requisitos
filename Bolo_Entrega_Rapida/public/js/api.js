const API = {
  async request(path, options = {}) {
    const response = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Erro na requisição.');
    }

    return data;
  },

  register(payload) {
    return this.request('/api/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  login(payload) {
    return this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  listarPedidos(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/pedidos${query ? `?${query}` : ''}`);
  },

  async criarPedido(payload) {
    const { area, camadas } = payload;
    const valorTotal = (area * 51.4) + camadas;

    // Incluir o valor total no payload antes de enviar para a API
    const pedido = {
      ...payload,
      valorTotal,
    };

    return this.request('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify(pedido)
    });
  },

  concluirPedido(id) {
    return this.request(`/api/pedidos/${id}/concluir`, {
      method: 'PATCH'
    });
  }
};