import { io } from 'socket.io-client';

// En producción: el frontend es servido por el mismo servidor Node (monolito),
// así que conectamos a window.location.origin (sin puerto específico).
// En desarrollo: el backend corre en localhost:3001.
const BACKEND_URL = import.meta.env.PROD
    ? window.location.origin
    : `http://${window.location.hostname}:3001`;

console.log("Conectando a WS:", BACKEND_URL);
const socket = io(BACKEND_URL);

export default socket;
