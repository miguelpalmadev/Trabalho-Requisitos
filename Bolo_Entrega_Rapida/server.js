const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const LIMITE_POR_DIA = 4;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

ensureDatabase();

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData = { users: [], pedidos: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readDb() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function sanitizeUser(user) {
  if (!user) return null;
  const { senha, ...safeUser } = user;
  return safeUser;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/register', async (req, res) => {
  try {
    const { nome, email, telefone = '', senha, tipo = 'cliente' } = req.body || {};

    if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
      return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (senha.trim().length < 6) {
      return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    const db = readDb();
    const emailNormalizado = normalizeEmail(email);

    const existe = db.users.some((user) => normalizeEmail(user.email) === emailNormalizado);
    if (existe) {
      return res.status(409).json({ message: 'Já existe uma conta com este e-mail.' });
    }

    const senhaHash = await bcrypt.hash(senha.trim(), 10);

    const novoUsuario = {
      id: crypto.randomUUID(),
      tipo,
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      senha: senhaHash,
      criadoEm: new Date().toISOString()
    };

    db.users.push(novoUsuario);
    writeDb(db);

    return res.status(201).json({
      message: 'Conta criada com sucesso!',
      user: sanitizeUser(novoUsuario)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao criar conta.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, senha, tipo } = req.body || {};

    if (!email?.trim() || !senha?.trim()) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
    }

    const db = readDb();
    const user = db.users.find((item) => normalizeEmail(item.email) === normalizeEmail(email));

    if (!user) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }

    const senhaOk = await bcrypt.compare(senha.trim(), user.senha);
    if (!senhaOk) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }

    if (tipo && user.tipo !== tipo) {
      return res.status(400).json({
        message: `Essa conta é do tipo "${user.tipo}". Selecione o tipo correto para entrar.`
      });
    }

    return res.json({
      message: 'Login realizado com sucesso!',
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao fazer login.' });
  }
});

app.get('/api/pedidos', (req, res) => {
  try {
    const { userId, tipo } = req.query;
    const db = readDb();
    let pedidos = db.pedidos;

    if (tipo === 'cliente' && userId) {
      pedidos = pedidos.filter((pedido) => pedido.userId === userId);
    }

    return res.json(pedidos);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar pedidos.' });
  }
});

app.post('/api/pedidos', (req, res) => {
  try {
    const {
      userId,
      cliente,
      emailCliente,
      dataEntrega,
      altura,
      comprimento,
      area,
      formato,
      sabor,
      recheio,
      sinal,
      valorTotal
    } = req.body || {};

    if (
      !userId ||
      !cliente ||
      !emailCliente ||
      !dataEntrega ||
      !altura ||
      !comprimento ||
      !formato ||
      !sabor ||
      !recheio
    ) {
      return res.status(400).json({ message: 'Preencha todos os campos do pedido.' });
    }

    const db = readDb();
    const pedidosAtivosNoDia = db.pedidos.filter(
      (pedido) => pedido.dataEntrega === dataEntrega && pedido.status !== 'concluido'
    );

    if (pedidosAtivosNoDia.length >= LIMITE_POR_DIA) {
      return res.status(409).json({
        message: 'Esse dia está indisponível. Já existem 4 pedidos para esta data.'
      });
    }

    const novoPedido = {
      id: crypto.randomUUID(),
      userId,
      cliente,
      emailCliente,
      dataEntrega,
      altura: Number(altura),
      comprimento: Number(comprimento),
      area: Number(area),
      formato,
      sabor,
      recheio,
      sinal: Number(sinal),
      valorTotal: Number(valorTotal),
      status: 'pendente',
      criadoEm: new Date().toISOString()
    };

    db.pedidos.push(novoPedido);
    writeDb(db);

    return res.status(201).json({
      message: 'Pedido realizado com sucesso!',
      pedido: novoPedido
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao criar pedido.' });
  }
});

app.patch('/api/pedidos/:id/concluir', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDb();
    const pedido = db.pedidos.find((item) => item.id === id);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    pedido.status = 'concluido';
    pedido.concluidoEm = new Date().toISOString();
    writeDb(db);

    return res.json({
      message: 'Pedido concluído com sucesso!',
      pedido
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao concluir pedido.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});