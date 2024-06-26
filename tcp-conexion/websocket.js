const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');
    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
    });
});

function broadcast(message, uniqueId) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ message, uniqueId }));
        }
    });
}

module.exports = { broadcast };

