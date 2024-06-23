const net = require('net');
const uuid = require('uuid');
const { processMessages } = require('../tcp-conexion/validate'); // Importar la función de procesamiento
const messageHandlers = require('../messageshandler/messageHandlers'); // Importar los manejadores de mensajes

function establecer_conexion(id_room) {
    //const server_host = 'server.evolutionygo.com';
    const server_host = 'us.projectignis.org';
    //const server_host = '192.168.1.241';
    const server_port = 7911;
    const parte_1 = '290010';
    const player_name = '5700650062007300690074006500560069006500770000000000000000000000000000000000000035001254130000';
    const parte_2 = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000028010a00';

    function hexadecimalALittleEndian(hexadecimal) {
        const bytes = [];
        for (let i = 0; i < hexadecimal.length; i += 2) {
            bytes.unshift(hexadecimal.substr(i, 2));
        }

        // Rellenar con ceros a la izquierda si la longitud es menor que 4
        let littleEndian = bytes.join('');
        if (littleEndian.length < 4) {
            littleEndian = littleEndian.padStart(4, '0');
        }

        return littleEndian;
    }

    // Eliminar espacios en blanco
    const id_sin_espacios = id_room.replace(/\s/g, '');

    // Convertir el ID a decimal
    const id_decimal = parseInt(id_sin_espacios, 10);

    // Convertir el ID a hexadecimal y añadir ceros a la izquierda si es necesario
    let id_hexadecimal = id_decimal.toString(16);
    if (id_hexadecimal.length < 4) {
        id_hexadecimal = id_hexadecimal.padStart(4, '0');
    }

    // Convertir el ID a little endian
    const id_little_endian = hexadecimalALittleEndian(id_hexadecimal);

    const create_room_hex = parte_1 + player_name + id_little_endian + parte_2;
    console.log(`Recibido ID: ${id_little_endian}`);
    console.log(`Recibido ID2: ${create_room_hex}`);

    const client = new net.Socket();
    let messageCount = 0; // Contador de mensajes

    client.connect(server_port, server_host, () => {
        const client_id = uuid.v4();
        client.write(Buffer.from(create_room_hex, 'hex'));
        console.log(`Conectado al servidor con ID de sesión ${client_id}`);
    });

    client.on('data', (data) => {
        messageCount++; // Incrementar el contador de mensajes
        const hexData = data.toString('hex');
        console.log(`Mensaje ${messageCount}: ${hexData}`);
        
        // Procesar y validar los segmentos del mensaje
        const results = processMessages(hexData);
        results.forEach((result, index) => {
            console.log(`Segmento ${index + 1}: ${result.segment}`);
            console.log(`Tipo de Mensaje: ${result.messageName} (0x${result.messageType.toString(16)})`);
            console.log(`Longitud esperada: ${result.expectedLength}`);
            console.log(`Longitud actual: ${result.actualLength}`);
            console.log(`Es válido: ${result.isValid}`);

            // Ejecutar el manejador de mensaje correspondiente si es válido
            if (result.isValid && messageHandlers[result.messageType]) {
                console.log(`Es Tipo: ${result.messageType}`);
                console.log(`Es Segmento: ${result}`);
                messageHandlers[result.messageType](hexData);
            }
        });
    });

    client.on('end', () => {
        console.log('Conexión terminada con el servidor');
    });

    client.on('error', (err) => {
        console.error('Error durante la conexión:', err);
    });

    client.setTimeout(300000, () => {
        console.log('Tiempo de conexión finalizado.');
        client.end();
    });
}

module.exports = { establecer_conexion };


