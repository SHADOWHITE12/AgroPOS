import React, { useState } from 'react';
import socket from '../socket';
import Swal from 'sweetalert2';
import FarmBackground from './FarmBackground';

function Login({ onLoginComplete }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!username || !password) {
            Swal.fire('Error', 'Debe ingresar usuario y contraseña', 'error');
            return;
        }

        setIsLoading(true);

        socket.emit('login', { username, password }, (response) => {
            setIsLoading(false);
            if (response.success) {
                // Success
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });
                Toast.fire({
                    icon: 'success',
                    title: `¡Bienvenido, ${response.user.nombre}!`
                });
                onLoginComplete(response.user);
            } else {
                // Failure
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: response.message || 'Credenciales inválidas'
                });
            }
        });
    };

    return (
        <div className="login-screen">
            <FarmBackground />

            <div className="login-card">
                <div className="login-avatar-container">
                    <div className="login-avatar-bg">
                        <div className="login-avatar-inner">
                            🚜
                        </div>
                    </div>
                </div>

                <div className="login-header">
                    <h1 className="login-title">agro</h1>
                    <p className="login-subtitle">Welcome back! Login to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-input-group">
                        <label className="login-label">Username *</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your Username"
                            className="login-input"
                            autoFocus
                        />
                    </div>

                    <div className="login-input-group">
                        <label className="login-label">Password *</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your Password"
                            className="login-input"
                        />
                    </div>

                    <div className="login-options">
                        <label className="login-remember">
                            <input type="checkbox" className="login-checkbox" />
                            <span className="login-remember-text">Remember me</span>
                        </label>
                        <a href="#" className="login-forgot">Forgot Password?</a>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="login-btn"
                    >
                        {isLoading ? 'VERIFICANDO...' : 'ACCEDER'}
                    </button>

                    <div className="login-footer">
                        <p className="login-footer-text">
                            Don't have an account? <a href="#" className="login-footer-link">Sign Up</a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
