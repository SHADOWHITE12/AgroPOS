import { io } from 'socket.io-client';

console.log("Conectando a WS:", window.location.hostname);
const socket = io(`http://${window.location.hostname}:3001`);

export default socket;
