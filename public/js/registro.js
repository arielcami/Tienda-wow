// registro.js - Controlador del formulario de registro usando Axios y SweetAlert2

class RegistroController {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.username = document.getElementById('username');
        this.password = document.getElementById('password');
        this.confirmPassword = document.getElementById('confirmPassword');
        this.submitBtn = document.getElementById('submitBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');

        // Cargar Axios desde CDN si no está disponible
        if (typeof axios === 'undefined') {
            this.loadAxios().then(() => this.init());
        } else {
            this.init();
        }
    }

    loadAxios() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    init() {
        // Configurar toggles de contraseña
        this.setupPasswordToggles();

        // Configurar validaciones en tiempo real
        this.setupRealTimeValidation();

        // Configurar envío del formulario
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setupPasswordToggles() {
        const togglePassword = document.getElementById('togglePassword');
        const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

        togglePassword.addEventListener('click', () => {
            this.togglePasswordVisibility(this.password, togglePassword);
        });

        toggleConfirmPassword.addEventListener('click', () => {
            this.togglePasswordVisibility(this.confirmPassword, toggleConfirmPassword);
        });
    }

    togglePasswordVisibility(input, toggle) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);

        // Cambiar icono
        const icon = toggle.querySelector('i');
        if (type === 'text') {
            icon.className = 'fas fa-eye-slash';
            toggle.setAttribute('title', 'Ocultar contraseña');
        } else {
            icon.className = 'fas fa-eye';
            toggle.setAttribute('title', 'Mostrar contraseña');
        }
    }

    setupRealTimeValidation() {
        // Validación de username
        this.username.addEventListener('input', () => {
            this.validateUsername();
            this.hideError();
        });

        // Validación de password
        this.password.addEventListener('input', () => {
            this.validatePassword();
            this.validatePasswordMatch();
            this.hideError();
        });

        // Validación de confirmación
        this.confirmPassword.addEventListener('input', () => {
            this.validatePasswordMatch();
            this.hideError();
        });
    }

    validateUsername() {
        const value = this.username.value.trim();
        const lengthReq = document.getElementById('req-length');
        const spacesReq = document.getElementById('req-spaces');

        // Validar longitud
        if (value.length >= 3 && value.length <= 16) {
            lengthReq.classList.add('valid');
            lengthReq.classList.remove('invalid');
        } else {
            lengthReq.classList.add('invalid');
            lengthReq.classList.remove('valid');
        }

        // Validar espacios
        if (!value.includes(' ')) {
            spacesReq.classList.add('valid');
            spacesReq.classList.remove('invalid');
        } else {
            spacesReq.classList.add('invalid');
            spacesReq.classList.remove('valid');
        }

        return value.length >= 3 && value.length <= 16 && !value.includes(' ');
    }

    validatePassword() {
        const value = this.password.value;
        const minLengthReq = document.getElementById('req-min-length');

        // Validar longitud mínima
        if (value.length >= 8) {
            minLengthReq.classList.add('valid');
            minLengthReq.classList.remove('invalid');
            return true;
        } else {
            minLengthReq.classList.add('invalid');
            minLengthReq.classList.remove('valid');
            return false;
        }
    }

    validatePasswordMatch() {
        const password = this.password.value;
        const confirm = this.confirmPassword.value;
        const matchReq = document.getElementById('req-match');

        if (password === confirm && password.length > 0) {
            matchReq.classList.add('valid');
            matchReq.classList.remove('invalid');
            return true;
        } else {
            matchReq.classList.add('invalid');
            matchReq.classList.remove('valid');
            return false;
        }
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.style.display = 'block';

        // Scroll to error
        this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    showLoading() {
        this.submitBtn.disabled = true;
        this.submitBtn.innerHTML = '<div class="loading"></div> Creando cuenta...';
    }

    hideLoading() {
        this.submitBtn.disabled = false;
        this.submitBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>CREAR CUENTA';
    }

    async showSuccess(message) {
        await Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: message,
            confirmButtonText: 'Iniciar Sesión',
            confirmButtonColor: '#0070dd',
            backdrop: 'rgba(0, 0, 0, 0.8)',
            allowOutsideClick: false,
            allowEscapeKey: false
        });

        // Redirigir a login después de cerrar el SweetAlert
        window.location.href = '/auth/login';
    }

    showWarning(message) {
        Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: message,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#ff9800',
            backdrop: 'rgba(0, 0, 0, 0.7)'
        });
    }

    showErrorAlert(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonText: 'Reintentar',
            confirmButtonColor: '#dc3545',
            backdrop: 'rgba(0, 0, 0, 0.7)'
        });
    }

    async handleSubmit(event) {
        event.preventDefault();

        // Ocultar errores previos
        this.hideError();

        // Validar todo
        const isUsernameValid = this.validateUsername();
        const isPasswordValid = this.validatePassword();
        const isPasswordMatch = this.validatePasswordMatch();

        if (!isUsernameValid) {
            this.showWarning('El nombre de usuario debe tener entre 3 y 16 caracteres sin espacios');
            this.username.focus();
            return;
        }

        if (!isPasswordValid) {
            this.showWarning('La contraseña debe tener al menos 8 caracteres');
            this.password.focus();
            return;
        }

        if (!isPasswordMatch) {
            this.showWarning('Las contraseñas no coinciden');
            this.confirmPassword.focus();
            return;
        }

        // Mostrar loading
        this.showLoading();

        try {
            const response = await axios.post('/auth/register', {
                username: this.username.value.trim(),
                password: this.password.value,
                confirmPassword: this.confirmPassword.value
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                // Éxito
                await this.showSuccess(response.data.message);
            } else {
                // Error del servidor
                this.showErrorAlert(response.data.message || 'Error al crear la cuenta');
                this.hideLoading();
            }

        } catch (error) {
            this.hideLoading();

            if (error.response) {
                // Error de respuesta del servidor
                const errorMsg = error.response.data?.message || 'Error en el servidor';
                this.showErrorAlert(errorMsg);

                if (error.response.status === 400 && error.response.data?.message?.includes('ya está en uso')) {
                    this.username.focus();
                    this.username.select();
                }
            } else if (error.request) {
                // Error de red
                this.showErrorAlert('Error de conexión. Verifica tu internet e intenta nuevamente.');
            } else {
                // Error en la configuración
                this.showErrorAlert('Error inesperado: ' + error.message);
            }

            console.error('Error en registro:', error);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new RegistroController();
});