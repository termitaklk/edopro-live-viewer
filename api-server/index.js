const express = require('express');
const bodyParser = require('body-parser');
const { establecer_conexion } = require('../tcp-conexion/conexion');

const app = express();
const PORT = 3000;

// Middleware para analizar el cuerpo de las solicitudes POST
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Ruta para recibir el ID a través de una solicitud POST en /api/idroom
app.post('/api/idroom', (req, res) => {
    const { id } = req.body;
    console.log(`Recibido ID: ${id}`);
    establecer_conexion(id);
    res.send(`ID recibido: ${id}`);
});

// Inicia el servidor en el puerto especificado
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

const cors = require('cors');
app.use(cors());

