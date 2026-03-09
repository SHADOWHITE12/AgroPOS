import { io } from "socket.io-client";

const defaultProducts = [
    { id: 1, name: 'Maíz Amarillo Granel', price: 0.45, stock: 85, metric: 'kg', icon: '🌽', stockPercent: 85, stockStatus: 'stock-ok' },
    { id: 2, name: 'Sorgo Especial', price: 0.38, stock: 120, metric: 'kg', icon: '🌾', stockPercent: 100, stockStatus: 'stock-ok' },
    { id: 3, name: 'Concentrado Aves Saco', price: 25.0, stock: 5, metric: 'sacos', icon: '🐔', stockPercent: 25, stockStatus: 'stock-low' },
    { id: 4, name: 'Alimento Ganado 40kg', price: 32.0, stock: 1, metric: 'sacos', icon: '🐄', stockPercent: 5, stockStatus: 'stock-critical' },
    { id: 5, name: 'Medicina Veterinaria 1L', price: 15.0, stock: 0, metric: 'un', icon: '💉', stockPercent: 0, stockStatus: 'stock-critical' },
    { id: 6, name: 'Melaza Bidón', price: 12.5, stock: 24, metric: 'un', icon: '🏺', stockPercent: 60, stockStatus: 'stock-ok' },
];

const socket = io("http://localhost:3001");

socket.on('connect', () => {
    console.log("Connected to server. Restoring test items...");

    // Broadcast the default data backward to the server
    socket.emit("update_products", defaultProducts);

    setTimeout(() => {
        console.log("Done. Disconnecting.");
        socket.disconnect();
        process.exit(0);
    }, 1000);
});
