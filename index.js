const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { establecer_conexion } = require('./tcp-conexion/conexion');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'front-end')));

app.post('/api/idroom', (req, res) => {
    const { id } = req.body;
    console.log(`Recibido ID: ${id}`);
    establecer_conexion(id);
    res.send(`ID recibido: ${id}`);
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

app.use(cors());

// Inicia el servidor WebSocket
require('./tcp-conexion/websocket');



