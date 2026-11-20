document.addEventListener("DOMContentLoaded", () => {
  const usersKey = "nexoUsuarios";
  const sessionKey = "nexoSesion";
  const sessionsKey = "nexo_sesiones";
  const deviceSessionKey = "nexo_session_id";
  const recoveryKey = "nexo_recuperacion";
  const defaultUsers = [
    { name: "Ciudadano", email: "ciudadano@nexo.mx", password: "Ciudadano1", role: "ciudadano" },
    { name: "Administrador", email: "admin@nexo.mx", password: "Admin123", role: "admin" },
  ];
  const menu = document.querySelector(".utility-menu");
  const searchForm = document.querySelector(".site-search");
  const searchInput = document.querySelector("#site-search-input");
  const searchableItems = document.querySelectorAll("[data-searchable]");
  const registerForm = document.querySelector("#register-form");
  const modal = document.querySelector("#modal");
  const modalContent = document.querySelector("#modal-content");
  const modalClose = document.querySelector("#modal-close");
  const modalLinks = document.querySelectorAll(".card-modal-link");
  const budgetYear = document.querySelector("#budget-year");
  const budgetRows = document.querySelectorAll("[data-budget-2025]");
  const budgetAdminPanel = document.querySelector("#budget-admin-panel");
  const budgetAccessNotice = document.querySelector("#budget-access-notice");
  const opportunityButtons = document.querySelectorAll(".opportunity-apply");
  const sessionArea = document.querySelector("#session-area");
  const sessionsPanel = document.querySelector("#sessions-panel");
  const recoveryForm = document.querySelector("#recover-form");
  const recoveryResetForm = document.querySelector("#recovery-reset-form");
  const recoveryMail = document.querySelector("#recovery-mail");

  const storedUsers = localStorage.getItem(usersKey);
  if (!storedUsers || JSON.parse(storedUsers).length === 0) {
    localStorage.setItem(usersKey, JSON.stringify(defaultUsers));
  }

  const getUsers = () => JSON.parse(localStorage.getItem(usersKey) || "[]");
  const getSessions = () => JSON.parse(localStorage.getItem(sessionsKey) || "[]");
  const saveSessions = (sessions) => localStorage.setItem(sessionsKey, JSON.stringify(sessions));
  const getCurrentSession = () => JSON.parse(sessionStorage.getItem(sessionKey) || "null");
  const protectedRoutes = new Set(["buzon.html", "chat.html", "oportunidades.html"]);
  const currentPage = window.location.pathname.split("/").pop().toLowerCase() || "index.html";

  const getValidSession = () => {
    const session = getCurrentSession();
    if (!session || !session.email || !session.sessionId || !session.role) {
      return null;
    }

    const activeSession = getSessions().some((item) =>
      item.email === session.email && item.sessionId === session.sessionId && item.rol === session.role,
    );
    return activeSession ? session : null;
  };

  const guardProtectedRoute = () => {
    if (!protectedRoutes.has(currentPage)) {
      return;
    }

    if (getValidSession()) {
      return;
    }

    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(deviceSessionKey);
    sessionStorage.setItem("nexoRouteMessage", "Debes iniciar sesión para acceder a esta sección");
    window.location.href = "login.html";
  };

  guardProtectedRoute();

  const showRouteMessage = () => {
    const routeMessage = sessionStorage.getItem("nexoRouteMessage");
    const loginStatus = document.querySelector("#login-status");
    if (routeMessage && loginStatus) {
      loginStatus.textContent = routeMessage;
      loginStatus.className = "form-status is-error";
      sessionStorage.removeItem("nexoRouteMessage");
    }
  };

  const configureBudgetAdminPanel = () => {
    if (!budgetAdminPanel || !budgetAccessNotice) {
      return;
    }

    const session = getValidSession();
    const isAdmin = session && session.role === "admin";
    budgetAdminPanel.hidden = !isAdmin;
    budgetAccessNotice.hidden = isAdmin;

    if (!isAdmin) {
      return;
    }

    budgetAdminPanel.querySelectorAll("[data-budget-editor]").forEach((input) => {
      input.addEventListener("input", () => {
        const row = document.querySelector(`[data-budget-category="${input.dataset.budgetEditor}"]`);
        const value = Number(input.value);
        if (row && Number.isFinite(value) && value >= 0 && value <= 100) {
          row.querySelector(".budget-value").textContent = `${value}%`;
        }
      });
    });
  };

  configureBudgetAdminPanel();
  const getDeviceName = () => {
    const userAgent = navigator.userAgent;
    if (/mobile|android|iphone|ipad/i.test(userAgent)) {
      return "Dispositivo móvil";
    }
    return "Computadora";
  };

  const renderSessions = () => {
    if (!sessionsPanel) {
      return;
    }

    const session = getValidSession();
    if (!session) {
      sessionsPanel.innerHTML = '<p class="sessions-empty">Inicia sesión para consultar tus dispositivos conectados.</p>';
      return;
    }

    const sessions = getSessions().filter((item) => item.email === session.email);
    if (sessions.length === 0) {
      sessionsPanel.innerHTML = '<p class="sessions-empty">No hay sesiones activas para este usuario.</p>';
      return;
    }

    const rows = sessions.map((item) => {
      const current = item.sessionId === session.sessionId;
      const action = current
        ? '<span class="current-device">Este dispositivo</span>'
        : `<button class="remote-logout" type="button" data-session-id="${item.sessionId}">Cerrar sesión remota</button>`;
      return `<tr><td>${item.dispositivo}</td><td>${new Date(item.fechaHora).toLocaleString("es-MX")}</td><td>${item.ip}</td><td>${action}</td></tr>`;
    }).join("");

    sessionsPanel.innerHTML = `<div class="sessions-table-wrap"><table class="sessions-table"><thead><tr><th>Dispositivo</th><th>Fecha y hora</th><th>IP</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    sessionsPanel.querySelectorAll(".remote-logout").forEach((button) => {
      button.addEventListener("click", () => {
        const remaining = getSessions().filter((item) => item.sessionId !== button.dataset.sessionId);
        saveSessions(remaining);
        renderSessions();

        const loginStatus = document.querySelector("#login-status");
        const recoveryMessage = sessionStorage.getItem("nexoRecoveryMessage");
        if (loginStatus && recoveryMessage) {
          loginStatus.textContent = recoveryMessage;
          loginStatus.className = "form-status is-success";
          sessionStorage.removeItem("nexoRecoveryMessage");
        }
      });
    });
  };

  const registerSession = (user) => {
    const oldSessionId = sessionStorage.getItem(deviceSessionKey);
    let sessions = getSessions().filter((item) => item.sessionId !== oldSessionId);
    const sessionId = crypto.randomUUID().slice(0, 8);
    const newSession = {
      sessionId,
      email: user.email,
      rol: user.role,
      dispositivo: getDeviceName(),
      fechaHora: new Date().toISOString(),
      ip: `192.0.2.${Math.floor(Math.random() * 254) + 1}`,
    };

    sessions.push(newSession);
    const otherUserSessions = sessions.filter((item) => item.email !== user.email);
    const userSessions = sessions
      .filter((item) => item.email === user.email)
      .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
      .slice(-2);
    sessions = [...otherUserSessions, ...userSessions];
    saveSessions(sessions);
    sessionStorage.setItem(deviceSessionKey, sessionId);
    sessionStorage.setItem(sessionKey, JSON.stringify({ name: user.name, email: user.email, role: user.role, sessionId }));
  };

  const renderSession = () => {
    if (!sessionArea) {
      return;
    }

    const session = getValidSession();
    sessionArea.innerHTML = "";

    if (!session) {
      return;
    }

    const name = document.createElement("span");
    name.className = "session-name";
    name.textContent = session.name;

    const role = document.createElement("span");
    role.className = "session-role";
    role.textContent = `[${session.role === "admin" ? "ADMIN" : "CIUDADANO"}]`;

    const logout = document.createElement("button");
    logout.className = "session-logout";
    logout.type = "button";
    logout.textContent = "Cerrar sesión";
    logout.addEventListener("click", () => {
      const currentSession = getValidSession();
      if (currentSession) {
        saveSessions(getSessions().filter((item) => item.sessionId !== currentSession.sessionId));
      }
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(deviceSessionKey);
      renderSession();
      renderSessions();
    });

    sessionArea.append(name, role, logout);
  };

  renderSession();
  renderSessions();
  showRouteMessage();

  window.addEventListener("storage", (event) => {
    if (event.key === sessionsKey) {
      if (!getValidSession()) {
        sessionStorage.removeItem(sessionKey);
        sessionStorage.removeItem(deviceSessionKey);
      }
      renderSession();
      renderSessions();
      if (!getValidSession() && protectedRoutes.has(currentPage)) {
        sessionStorage.setItem("nexoRouteMessage", "Tu sesión fue cerrada desde otro dispositivo");
        window.location.href = "login.html";
      }
    }
  });

  const modalViews = {
    guide: `
      <p class="section-index">Guía esencial</p>
      <h2 id="modal-title">Realiza tu trámite<br><em>en 3 pasos.</em></h2>
      <ol class="modal-list"><li><strong>Identifica el servicio</strong><span>Confirma qué trámite necesitas y quién lo ofrece.</span></li><li><strong>Prepara los requisitos</strong><span>Reúne documentos, formatos y comprobantes antes de acudir.</span></li><li><strong>Presenta y da seguimiento</strong><span>Entrega tu solicitud, conserva el folio y consulta su avance.</span></li></ol>`,
    checklist: `
      <p class="section-index">Ruta de aprendizaje</p>
      <h2 id="modal-title">Ciudadanía<br><em>en práctica.</em></h2>
      <div class="modal-checklist"><label><input type="checkbox"> Conozco mis derechos y responsabilidades.</label><label><input type="checkbox"> Consulto información pública confiable.</label><label><input type="checkbox"> Participo en una decisión comunitaria.</label><label><input type="checkbox"> Comparto lo aprendido con mi comunidad.</label></div>`,
    glossary: `
      <p class="section-index">Glosario público</p>
      <h2 id="modal-title">Palabras de lo<br><em>público.</em></h2>
      <dl class="modal-glossary"><div><dt>Transparencia</dt><dd>Que las decisiones y recursos públicos puedan conocerse.</dd></div><div><dt>Presupuesto</dt><dd>Plan que muestra cuánto dinero público se recibe y en qué se usa.</dd></div><div><dt>Participación</dt><dd>Intervenir con ideas y opiniones en asuntos de la comunidad.</dd></div><div><dt>Rendición de cuentas</dt><dd>Explicar y justificar cómo se tomaron decisiones.</dd></div></dl>`,
    transparencia: `<p class="section-index">Concepto / Derechos</p><h2 id="modal-title">Transparencia</h2><p class="modal-definition">Es el derecho de conocer cómo se toman las decisiones públicas y cómo se usan los recursos.</p><p class="modal-example"><strong>Ejemplo práctico</strong><br>Consultar en qué se gastó el presupuesto destinado a mejorar un parque.</p>`,
    acceso: `<p class="section-index">Concepto / Derechos</p><h2 id="modal-title">Acceso a la información</h2><p class="modal-definition">Es la posibilidad de solicitar información pública sin tener que explicar para qué la necesitas.</p><p class="modal-example"><strong>Ejemplo práctico</strong><br>Solicitar el contrato de una obra pública y recibir una respuesta oficial.</p>`,
    participacion: `<p class="section-index">Concepto / Derechos</p><h2 id="modal-title">Participación ciudadana</h2><p class="modal-definition">Son los mecanismos para opinar, proponer y vigilar las decisiones que afectan a tu comunidad.</p><p class="modal-example"><strong>Ejemplo práctico</strong><br>Participar en una consulta para decidir cómo mejorar un espacio público.</p>`,
  };

  const closeModal = () => {
    if (modal) {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
    }
  };

  modalLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (modal && modalContent) {
        modalContent.innerHTML = modalViews[link.dataset.modalContent];
        modal.hidden = false;
        document.body.classList.add("modal-open");
        modalClose?.focus();
      }
    });
  });

  modalClose?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeModal();
    }
  });

  if (budgetYear && budgetRows.length > 0) {
    budgetYear.addEventListener("change", () => {
      const year = budgetYear.value;
      budgetRows.forEach((row) => {
        row.querySelector(".budget-value").textContent = row.dataset[`budget${year}`];
      });
    });
  }

  if (opportunityButtons.length > 0) {
    opportunityButtons.forEach((button) => {
      button.addEventListener("click", () => {
        button.textContent = "Postulación confirmada";
        button.classList.add("is-confirmed");
        button.disabled = true;
      });
    });
  }

  if (menu) {
    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target)) {
        menu.removeAttribute("open");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        menu.removeAttribute("open");
      }
    });
  }

  if (searchForm && searchInput && searchableItems.length > 0) {
    const filterContent = () => {
      const query = searchInput.value.trim().toLowerCase();

      searchableItems.forEach((item) => {
        const matches = item.textContent.toLowerCase().includes(query);
        item.hidden = query !== "" && !matches;
      });
    };

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      filterContent();
    });

    searchInput.addEventListener("input", filterContent);
  }

  if (registerForm) {
    const fields = {
      name: {
        input: document.querySelector("#register-name"),
        error: document.querySelector("#register-name-error"),
      },
      email: {
        input: document.querySelector("#register-email"),
        error: document.querySelector("#register-email-error"),
      },
      password: {
        input: document.querySelector("#register-password"),
        error: document.querySelector("#register-password-error"),
      },
      role: {
        input: document.querySelector("#register-role"),
        error: document.querySelector("#register-role-error"),
      },
    };
    const status = document.querySelector("#register-status");

    const validateField = (fieldName) => {
      const field = fields[fieldName];
      const value = field.input.value.trim();
      let message = "";

      if (fieldName === "name" && !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/.test(value)) {
        message = "Escribe tu nombre y apellido, sin números ni caracteres especiales.";
      }

      if (fieldName === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        message = "Escribe un correo electrónico válido, por ejemplo: nombre@dominio.com.";
      }

      if (fieldName === "password" && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value)) {
        message = "La contraseña debe tener mínimo 8 caracteres, una letra y un número.";
      }

      if (fieldName === "role" && !["ciudadano", "admin"].includes(value)) {
        message = "Selecciona un tipo de usuario.";
      }

      field.error.textContent = message;
      field.input.setAttribute("aria-invalid", message !== "" ? "true" : "false");
      return message === "";
    };

    Object.keys(fields).forEach((fieldName) => {
      fields[fieldName].input.addEventListener("blur", () => validateField(fieldName));
      fields[fieldName].input.addEventListener("input", () => {
        if (fields[fieldName].input.getAttribute("aria-invalid") === "true") {
          validateField(fieldName);
        }
      });
    });

    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const valid = Object.keys(fields).map(validateField).every(Boolean);

      if (valid) {
        const users = getUsers();
        const email = fields.email.input.value.trim().toLowerCase();

        if (users.some((user) => user.email === email)) {
          fields.email.error.textContent = "Ya existe una cuenta con este correo.";
          fields.email.input.setAttribute("aria-invalid", "true");
          status.textContent = "Corrige los campos señalados para continuar.";
          status.className = "form-status is-error";
          return;
        }

        users.push({
          name: fields.name.input.value.trim(),
          email,
          password: fields.password.input.value,
          role: fields.role.input.value,
        });
        localStorage.setItem(usersKey, JSON.stringify(users));
        status.textContent = "Cuenta creada correctamente. Ya puedes iniciar sesión.";
        status.className = "form-status is-success";
      } else {
        status.textContent = "Corrige los campos señalados para continuar.";
        status.className = "form-status is-error";
      }
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  const namePattern = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

  if (recoveryForm && recoveryResetForm && recoveryMail) {
    const emailInput = document.querySelector("#recover-email");
    const emailError = document.querySelector("#recover-email-error");
    const status = document.querySelector("#recover-status");
    const codeInput = document.querySelector("#recovery-code");
    const passwordInput = document.querySelector("#recovery-password");
    const codeError = document.querySelector("#recovery-code-error");
    const passwordError = document.querySelector("#recovery-password-error");
    const resetStatus = document.querySelector("#recovery-reset-status");
    let recoveryRequest = JSON.parse(localStorage.getItem(recoveryKey) || "null");

    if (recoveryRequest && getUsers().some((user) => user.email === recoveryRequest.email)) {
      recoveryMail.innerHTML = `<strong>Correo simulado enviado</strong><span>Para ${recoveryRequest.email}</span><code>${recoveryRequest.code}</code>`;
      recoveryMail.hidden = false;
      recoveryResetForm.hidden = false;
    }

    recoveryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = emailInput.value.trim().toLowerCase();
      const emailIsValid = emailPattern.test(email);
      const userExists = getUsers().some((user) => user.email === email);

      emailError.textContent = !emailIsValid
        ? "Escribe un correo electrónico válido."
        : !userExists
          ? "No encontramos una cuenta con ese correo."
          : "";
      emailInput.setAttribute("aria-invalid", emailError.textContent ? "true" : "false");

      if (!emailIsValid || !userExists) {
        status.textContent = "Corrige el correo para continuar.";
        status.className = "form-status is-error";
        return;
      }

      recoveryRequest = {
        email,
        code: String(Math.floor(100000 + Math.random() * 900000)),
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(recoveryKey, JSON.stringify(recoveryRequest));
      recoveryMail.innerHTML = `<strong>Correo simulado enviado</strong><span>Para ${recoveryRequest.email}</span><code>${recoveryRequest.code}</code>`;
      recoveryMail.hidden = false;
      recoveryResetForm.hidden = false;
      status.textContent = "Código generado. Revisa el recuadro y continúa con el restablecimiento.";
      status.className = "form-status is-success";
    });

    recoveryResetForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const validCode = recoveryRequest
        && recoveryRequest.email
        && /^\d{6}$/.test(codeInput.value.trim())
        && codeInput.value.trim() === recoveryRequest.code;
      const validPassword = passwordPattern.test(passwordInput.value);

      codeError.textContent = validCode ? "" : "El código debe coincidir con el código recibido.";
      passwordError.textContent = validPassword ? "" : "La contraseña debe tener mínimo 8 caracteres, una letra y un número.";
      codeInput.setAttribute("aria-invalid", validCode ? "false" : "true");
      passwordInput.setAttribute("aria-invalid", validPassword ? "false" : "true");

      if (!validCode || !validPassword) {
        resetStatus.textContent = "Corrige los campos señalados para continuar.";
        resetStatus.className = "form-status is-error";
        return;
      }

      const users = getUsers().map((user) => recoveryRequest.email === user.email
        ? { ...user, password: passwordInput.value }
        : user);
      localStorage.setItem(usersKey, JSON.stringify(users));
      saveSessions(getSessions().filter((session) => session.email !== recoveryRequest.email));
      localStorage.removeItem(sessionKey);
      sessionStorage.removeItem(deviceSessionKey);
      localStorage.removeItem(recoveryKey);
      sessionStorage.setItem("nexoRecoveryMessage", "Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
      window.location.href = "login.html";
    });
  }

  const validateInput = (input, error, message, isValid) => {
    error.textContent = isValid ? "" : message;
    input.setAttribute("aria-invalid", isValid ? "false" : "true");
    return isValid;
  };

  const connectForm = (form, fields, successMessage, onValid) => {
    if (!form) {
      return;
    }

    const status = form.querySelector(".form-status");
    const validate = () => fields.map((field) => field.validate()).every(Boolean);

    fields.forEach((field) => {
      field.input.addEventListener("blur", field.validate);
      field.input.addEventListener("input", () => {
        if (field.input.getAttribute("aria-invalid") === "true") {
          field.validate();
        }
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const valid = validate();
      if (valid && onValid) {
        onValid(status);
        return;
      }
      status.textContent = valid ? successMessage : "Corrige los campos señalados para continuar.";
      status.className = `form-status ${valid ? "is-success" : "is-error"}`;
    });
  };

  const requiredField = (inputId, errorId, label) => {
    const input = document.querySelector(`#${inputId}`);
    const error = document.querySelector(`#${errorId}`);
    return {
      input,
      validate: () => validateInput(input, error, `${label} es obligatorio.`, input.value.trim() !== ""),
    };
  };

  const emailField = (inputId, errorId) => {
    const input = document.querySelector(`#${inputId}`);
    const error = document.querySelector(`#${errorId}`);
    return {
      input,
      validate: () => validateInput(input, error, "Escribe un correo electrónico válido.", emailPattern.test(input.value.trim())),
    };
  };

  const passwordField = (inputId, errorId) => {
    const input = document.querySelector(`#${inputId}`);
    const error = document.querySelector(`#${errorId}`);
    return {
      input,
      validate: () => validateInput(input, error, "La contraseña debe tener mínimo 8 caracteres, una letra y un número.", passwordPattern.test(input.value)),
    };
  };

  connectForm(
    document.querySelector("#inbox-form"),
    [
      requiredField("inbox-subject", "inbox-subject-error", "El asunto"),
      requiredField("inbox-message", "inbox-message-error", "El mensaje"),
    ],
    "Tu mensaje fue enviado al buzón ciudadano.",
  );

  connectForm(
    document.querySelector("#login-form"),
    [emailField("login-email", "login-email-error"), passwordField("login-password", "login-password-error")],
    "Sesión iniciada correctamente.",
    (status) => {
      const email = document.querySelector("#login-email").value.trim().toLowerCase();
      const password = document.querySelector("#login-password").value;
      const user = getUsers().find((candidate) => candidate.email === email && candidate.password === password);

      if (!user) {
        status.textContent = "El correo o la contraseña no son correctos.";
        status.className = "form-status is-error";
        return;
      }

      registerSession(user);
      renderSession();
      renderSessions();
      status.textContent = "Sesión iniciada correctamente.";
      status.className = "form-status is-success";
    },
  );

  connectForm(
    document.querySelector("#contact-form"),
    [
      {
        ...requiredField("contact-name", "contact-name-error", "El nombre"),
        validate: () => validateInput(document.querySelector("#contact-name"), document.querySelector("#contact-name-error"), "Escribe un nombre válido, sin números ni caracteres especiales.", namePattern.test(document.querySelector("#contact-name").value.trim())),
      },
      emailField("contact-email", "contact-email-error"),
      requiredField("contact-message", "contact-message-error", "El mensaje"),
    ],
    "Tu consulta fue enviada. Te responderemos pronto.",
  );

  const chatForm = document.querySelector("#chat-form");
  const chatInput = document.querySelector("#chat-input");
  const chatMessages = document.querySelector("#chat-messages");

  if (chatForm && chatInput && chatMessages) {
    chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const question = chatInput.value.trim();

      if (!question) {
        return;
      }

      const userMessage = document.createElement("p");
      userMessage.className = "chat-message chat-user";
      userMessage.textContent = question;
      chatMessages.append(userMessage);

      const normalizedQuestion = question.toLowerCase();
      let answer = "Puedo ayudarte con trámites, presupuesto y derechos. Prueba con una de esas palabras.";

      if (normalizedQuestion.includes("trámite") || normalizedQuestion.includes("tramite")) {
        answer = "En Trámites encontrarás requisitos, documentos y seguimiento paso a paso.";
      } else if (normalizedQuestion.includes("presupuesto")) {
        answer = "En Presupuesto puedes consultar una vista sencilla de cómo se distribuyen los recursos públicos.";
      } else if (normalizedQuestion.includes("derecho")) {
        answer = "En Derechos traducimos conceptos como transparencia y acceso a la información a lenguaje claro.";
      }

      const botMessage = document.createElement("p");
      botMessage.className = "chat-message chat-bot";
      botMessage.textContent = answer;
      chatMessages.append(botMessage);
      chatInput.value = "";
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }
});
