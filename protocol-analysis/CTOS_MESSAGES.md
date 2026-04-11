# Mensajes CTOS (Client To Server)

## Description
A diferencia de los mensajes `STOC_` o `MSG_` que son emitidos por el **Servidor (Server/Core)** hacia el Cliente (Visor/Jugador), los mensajes `CTOS_` (Client To Server) son aquellos que el jugador envía voluntariamente hacia el servidor para interactuar con la partida o sala.
En el caso de un Visor puramente espectador, no suele enviar ninguno de estos más allá de unirse a la sala o enviar chat, pero para un cliente completo son vitales.

## Lista de Mensajes Clave CTOS

### Interacción de Duelo
- `CTOS_RESPONSE (0x1)`: Responde a un prompt de decisión o selección pedido por el servidor (ej: enviar la elección en `MSG_SELECT_CARD`).
- `CTOS_TIME_CONFIRM (0x15)`: Ocasionalmente el cliente debe mandar confirmación de que su temporizador está en sincronía con el servidor (Heartbeat de reloj).
- `CTOS_SURRENDER (0x14)`: El jugador hace clic en el botón de rendirse.

### Decisiones de Inicio (Piedra, Papel o Tijeras)
- `CTOS_HAND_RESULT (0x3)`: Envía qué símbolo elegiste en el Piedra, Papel, Tijera.
- `CTOS_TP_RESULT (0x4)`: Tras ganar el RPS, envías 1 para ir primero o 0 para ir segundo.

### Mensajes Sociales y de Sala (Lobby)
- `CTOS_PLAYER_INFO (0x10)`: Envía el Nickname/Avatar.
- `CTOS_CREATE_GAME (0x11)` / `CTOS_JOIN_GAME (0x12)`: Solicitudes iniciales al servidor.
- `CTOS_LEAVE_GAME (0x13)`: Salir de la sala.
- `CTOS_CHAT (0x16)`: El jugador envía un string al chat público o privado.
- `CTOS_UPDATE_DECK (0x2)`: En el lobby, informa al host del hash o validación del deck (en EDOPro se verifica si las cartas son legales).

### Gestión de Host
- `CTOS_HS_TODUELIST (0x20)` / `CTOS_HS_TOOBSERVER (0x21)`: Pedir pasarse a un slot de duelista o espectador.
- `CTOS_HS_READY (0x22)` / `CTOS_HS_NOTREADY (0x23)`: Marcar casilla de "Listo".
- `CTOS_HS_KICK (0x24)`: Siendo host, expulsar a un índice.
- `CTOS_HS_START (0x25)`: Siendo host, dar "Comenzar" duelo.
- `CTOS_REMATCH_RESPONSE (0xf0)`: Pedir o aceptar Revancha.
