document.addEventListener("DOMContentLoaded", () => {
  // Mobile menu toggle
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
  const navbar = document.querySelector(".navbar")

  if (mobileMenuBtn && navbar) {
    mobileMenuBtn.addEventListener("click", () => {
      navbar.classList.toggle("mobile-menu-open")
    })
  }

  // Chatbot button
  const chatbotBtn = document.querySelector(".chatbot-btn")

  if (chatbotBtn) {
    chatbotBtn.addEventListener("click", () => {
      alert("¡Chatbot en desarrollo! Pronto podrás hacer consultas en tiempo real.")
    })
  }

  // Animación para elementos al hacer scroll
  const animateElements = document.querySelectorAll(".animate-on-scroll")

  if (animateElements.length > 0) {
    const checkScroll = () => {
      animateElements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top
        const windowHeight = window.innerHeight

        if (elementTop < windowHeight - 100) {
          element.classList.add("animate-fadeIn")
        }
      })
    }

    window.addEventListener("scroll", checkScroll)
    checkScroll() // Check on load
  }

  // Validación de formulario de login
  const loginForm = document.getElementById("login-form")

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const username = document.getElementById("username").value
      const password = document.getElementById("password").value
      let isValid = true

      // Validación simple
      if (!username) {
        showError("username", "El nombre de usuario es requerido")
        isValid = false
      } else {
        clearError("username")
        showSuccess("username", "¡Nombre de usuario válido!")
      }

      if (!password) {
        showError("password", "La contraseña es requerida")
        isValid = false
      } else if (password.length < 6) {
        showWarning("password", "La contraseña es demasiado corta")
        isValid = false
      } else {
        clearError("password")
        showSuccess("password", "¡Contraseña válida!")
      }

      if (isValid) {
        // Mostrar mensaje de éxito global
        const formMessage = document.getElementById("form-message") || document.createElement("div")
        formMessage.id = "form-message"
        formMessage.className = "mt-4"
        formMessage.innerHTML = createAlertHTML(
          "success",
          "Inicio de sesión exitoso. Redirigiendo al panel de administración...",
        )
        loginForm.appendChild(formMessage)

        // Aquí se enviaría el formulario al backend
        setTimeout(() => {
          window.location.href = "/admin-dashboard"
        }, 2000)
      }
    })
  }

  // Funciones auxiliares para validación
  function showError(fieldId, message) {
    const field = document.getElementById(fieldId)
    const errorElement = document.getElementById(`${fieldId}-error`)

    field.classList.add("border-red-500")

    if (errorElement) {
      errorElement.innerHTML = createAlertHTML("error", message)
    } else {
      const error = document.createElement("div")
      error.id = `${fieldId}-error`
      error.className = "mt-2"
      error.innerHTML = createAlertHTML("error", message)
      field.parentNode.appendChild(error)
    }
  }

  function clearError(fieldId) {
    const field = document.getElementById(fieldId)
    const errorElement = document.getElementById(`${fieldId}-error`)

    field.classList.remove("border-red-500")

    if (errorElement) {
      errorElement.innerHTML = ""
    }
  }

  function showSuccess(fieldId, message) {
    const field = document.getElementById(fieldId)
    const successElement = document.getElementById(`${fieldId}-success`)

    if (successElement) {
      successElement.innerHTML = createAlertHTML("success", message)
    } else {
      const success = document.createElement("div")
      success.id = `${fieldId}-success`
      success.className = "mt-2"
      success.innerHTML = createAlertHTML("success", message)
      field.parentNode.appendChild(success)
    }

    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
      if (document.getElementById(`${fieldId}-success`)) {
        document.getElementById(`${fieldId}-success`).innerHTML = ""
      }
    }, 3000)
  }

  function showInfo(fieldId, message) {
    const field = document.getElementById(fieldId)
    const infoElement = document.getElementById(`${fieldId}-info`)

    if (infoElement) {
      infoElement.innerHTML = createAlertHTML("info", message)
    } else {
      const info = document.createElement("div")
      info.id = `${fieldId}-info`
      info.className = "mt-2"
      info.innerHTML = createAlertHTML("info", message)
      field.parentNode.appendChild(info)
    }
  }

  function showWarning(fieldId, message) {
    const field = document.getElementById(fieldId)
    const warningElement = document.getElementById(`${fieldId}-warning`)

    if (warningElement) {
      warningElement.innerHTML = createAlertHTML("warning", message)
    } else {
      const warning = document.createElement("div")
      warning.id = `${fieldId}-warning`
      warning.className = "mt-2"
      warning.innerHTML = createAlertHTML("warning", message)
      field.parentNode.appendChild(warning)
    }
  }

  // Función para crear el HTML de la alerta según el tipo
  function createAlertHTML(type, message) {
    const types = {
      success: {
        bgClass: "bg-green-100 dark:bg-green-900",
        borderClass: "border-green-500 dark:border-green-700",
        textClass: "text-green-900 dark:text-green-100",
        hoverClass: "hover:bg-green-200 dark:hover:bg-green-800",
        iconColor: "text-green-600",
      },
      info: {
        bgClass: "bg-blue-100 dark:bg-blue-900",
        borderClass: "border-blue-500 dark:border-blue-700",
        textClass: "text-blue-900 dark:text-blue-100",
        hoverClass: "hover:bg-blue-200 dark:hover:bg-blue-800",
        iconColor: "text-blue-600",
      },
      warning: {
        bgClass: "bg-yellow-100 dark:bg-yellow-900",
        borderClass: "border-yellow-500 dark:border-yellow-700",
        textClass: "text-yellow-900 dark:text-yellow-100",
        hoverClass: "hover:bg-yellow-200 dark:hover:bg-yellow-800",
        iconColor: "text-yellow-600",
      },
      error: {
        bgClass: "bg-red-100 dark:bg-red-900",
        borderClass: "border-red-500 dark:border-red-700",
        textClass: "text-red-900 dark:text-red-100",
        hoverClass: "hover:bg-red-200 dark:hover:bg-red-800",
        iconColor: "text-red-600",
      },
    }

    const style = types[type]

    return `
      <div
        role="alert"
        class="${style.bgClass} border-l-4 ${style.borderClass} ${style.textClass} p-2 rounded-lg flex items-center transition duration-300 ease-in-out ${style.hoverClass} transform hover:scale-105"
      >
        <svg
          stroke="currentColor"
          viewBox="0 0 24 24"
          fill="none"
          class="h-5 w-5 flex-shrink-0 mr-2 ${style.iconColor}"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          ></path>
        </svg>
        <p class="text-xs font-semibold">${message}</p>
      </div>
    `
  }

  // Galería de imágenes
  const galleryItems = document.querySelectorAll(".gallery-item")

  if (galleryItems.length > 0) {
    galleryItems.forEach((item) => {
      item.addEventListener("click", function () {
        const imgSrc = this.querySelector("img").src
        const modal = document.createElement("div")
        modal.className = "gallery-modal"
        modal.innerHTML = `
          <div class="gallery-modal-content">
            <span class="gallery-modal-close">&times;</span>
            <img src="${imgSrc}" alt="Imagen ampliada">
          </div>
        `

        document.body.appendChild(modal)

        const closeBtn = modal.querySelector(".gallery-modal-close")
        closeBtn.addEventListener("click", () => {
          document.body.removeChild(modal)
        })

        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            document.body.removeChild(modal)
          }
        })
      })
    })
  }

  // Validación de formulario de contacto
  const contactForm = document.getElementById("contact-form")

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const name = document.getElementById("name").value
      const email = document.getElementById("email").value
      const phone = document.getElementById("phone").value
      const subject = document.getElementById("subject").value
      const message = document.getElementById("message").value
      let isValid = true

      // Validación de campos
      if (!name) {
        showError("name", "El nombre es requerido")
        isValid = false
      } else {
        clearError("name")
      }

      if (!email) {
        showError("email", "El correo electrónico es requerido")
        isValid = false
      } else if (!validateEmail(email)) {
        showError("email", "Por favor ingresa un correo electrónico válido")
        isValid = false
      } else {
        clearError("email")
      }

      if (!phone) {
        showWarning("phone", "Es recomendable proporcionar un número de teléfono")
      } else if (!validatePhone(phone)) {
        showWarning("phone", "El formato del teléfono no es válido")
      } else {
        clearError("phone")
      }

      if (!subject) {
        showError("subject", "Por favor selecciona un asunto")
        isValid = false
      } else {
        clearError("subject")
      }

      if (!message) {
        showError("message", "El mensaje es requerido")
        isValid = false
      } else if (message.length < 10) {
        showWarning("message", "Tu mensaje es muy corto, por favor proporciona más detalles")
        isValid = false
      } else {
        clearError("message")
      }

      if (isValid) {
        // Mostrar mensaje de éxito global
        const formMessage = document.getElementById("form-message") || document.createElement("div")
        formMessage.id = "form-message"
        formMessage.className = "mt-4"
        formMessage.innerHTML = createAlertHTML(
          "success",
          "¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto.",
        )
        contactForm.appendChild(formMessage)

        // Aquí se enviaría el formulario al backend
        // Limpiar el formulario después de enviar
        contactForm.reset()

        // Eliminar el mensaje después de 5 segundos
        setTimeout(() => {
          formMessage.innerHTML = ""
        }, 5000)
      }
    })
  }

  // Funciones de validación
  function validateEmail(email) {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase())
  }

  function validatePhone(phone) {
    const re = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
    return re.test(String(phone))
  }
})