const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { establecer_conexion } = require('./tcp-conexion/conexion');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'front-end')));

app.post('/api/idroom', (req, res) => {
    const { id } = req.body;
    const uniqueId = uuidv4();
    console.log(`Recibido ID: ${id} con uniqueId: ${uniqueId}`);
    establecer_conexion(id, uniqueId);
    res.send(`ID recibido: ${id} con uniqueId: ${uniqueId}`);
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

app.use(cors());

// Inicia el servidor WebSocket
require('./tcp-conexion/websocket');



