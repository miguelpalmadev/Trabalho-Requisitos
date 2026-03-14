document.addEventListener("DOMContentLoaded", () => {
  setupTypeCards();
  setupPasswordToggle();
  setupPhoneMask();
  setupLoginForm();
  setupCadastroForm();
});

function setupTypeCards() {
  const typeCards = document.querySelectorAll(".type-card");

  typeCards.forEach((card) => {
    card.addEventListener("click", () => {
      const group = card.dataset.group;
      const value = card.dataset.value;

      document
        .querySelectorAll(`.type-card[data-group="${group}"]`)
        .forEach((item) => item.classList.remove("active"));

      card.classList.add("active");

      const hiddenInput =
        group === "login-role"
          ? document.getElementById("loginRole")
          : document.getElementById("registerRole");

      if (hiddenInput) hiddenInput.value = value;
    });
  });
}

function setupPasswordToggle() {
  const buttons = document.querySelectorAll(".toggle-password");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      const input = document.getElementById(targetId);

      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });
}

function setupPhoneMask() {
  const telefoneInput = document.getElementById("telefone");
  if (!telefoneInput) return;

  telefoneInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");

    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else if (value.length > 0) {
      value = value.replace(/^(\d*)/, "($1");
    }

    e.target.value = value;
  });
}

function setupCadastroForm() {
  const form = document.getElementById("cadastroForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome");
    const email = document.getElementById("email");
    const telefone = document.getElementById("telefone");
    const senha = document.getElementById("senha");
    const confirmarSenha = document.getElementById("confirmarSenha");
    const tipo = document.getElementById("registerRole")?.value || "cliente";

    let isValid = true;
    [nome, email, telefone, senha, confirmarSenha].forEach(clearFieldError);

    if (!nome.value.trim()) {
      setFieldError(nome, "Informe seu nome completo.");
      isValid = false;
    }

    if (!email.value.trim()) {
      setFieldError(email, "Informe seu e-mail.");
      isValid = false;
    } else if (!isValidEmail(email.value.trim())) {
      setFieldError(email, "Digite um e-mail válido.");
      isValid = false;
    }

    if (telefone.value.trim()) {
      const digits = telefone.value.replace(/\D/g, "");
      if (digits.length < 10) {
        setFieldError(telefone, "Digite um telefone válido.");
        isValid = false;
      }
    }

    if (!senha.value.trim()) {
      setFieldError(senha, "Informe uma senha.");
      isValid = false;
    } else if (senha.value.trim().length < 6) {
      setFieldError(senha, "A senha deve ter no mínimo 6 caracteres.");
      isValid = false;
    }

    if (!confirmarSenha.value.trim()) {
      setFieldError(confirmarSenha, "Confirme sua senha.");
      isValid = false;
    } else if (senha.value !== confirmarSenha.value) {
      setFieldError(confirmarSenha, "As senhas não coincidem.");
      isValid = false;
    }

    if (!isValid) return;

    try {
      await API.register({
        nome: nome.value.trim(),
        email: email.value.trim(),
        telefone: telefone.value.trim(),
        senha: senha.value.trim(),
        tipo
      });

      alert("Conta criada com sucesso!");
      window.location.href = "login.html";
    } catch (error) {
      if (error.message.includes("e-mail")) {
        setFieldError(email, error.message);
        return;
      }
      alert(error.message);
    }
  });
}

function setupLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail");
    const senha = document.getElementById("loginSenha");
    const tipoSelecionado = document.getElementById("loginRole")?.value || "cliente";

    let isValid = true;
    clearFieldError(email);
    clearFieldError(senha);

    if (!email.value.trim()) {
      setFieldError(email, "Informe seu e-mail.");
      isValid = false;
    } else if (!isValidEmail(email.value.trim())) {
      setFieldError(email, "Digite um e-mail válido.");
      isValid = false;
    }

    if (!senha.value.trim()) {
      setFieldError(senha, "Informe sua senha.");
      isValid = false;
    }

    if (!isValid) return;

    try {
      const { user } = await API.login({
        email: email.value.trim(),
        senha: senha.value.trim(),
        tipo: tipoSelecionado
      });

      localStorage.setItem("currentUser", JSON.stringify(user));

      if (user.tipo === "cliente") {
        window.location.href = "cliente.html";
      } else {
        window.location.href = "confeiteiro.html";
      }
    } catch (error) {
      alert(error.message);
    }
  });
}

function setFieldError(input, message) {
  if (!input) return;
  input.classList.add("input-error");
  const errorElement = input.closest(".form-group")?.querySelector(".error-message");
  if (errorElement) errorElement.textContent = message;
}

function clearFieldError(input) {
  if (!input) return;
  input.classList.remove("input-error");
  const errorElement = input.closest(".form-group")?.querySelector(".error-message");
  if (errorElement) errorElement.textContent = "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}