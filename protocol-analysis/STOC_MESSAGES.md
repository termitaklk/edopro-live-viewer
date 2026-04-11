# Mensajes STOC de EDOPro (Server To Client)

## Description
Aparte de los `MSG_` propios del simulador lógico del duelo (ocgcore), EDOPro encapsula y transmite sus propios estados de red usando opcodes `STOC_`.
En el stream principal, el primer byte dictamina si se lee un STOC, y cuando es `STOC_GAME_MSG (0x1)`, el sub-byte es el `MSG_` tradicional de OCG.

## Lista de Mensajes Clave STOC

### 1. Manejo de Inicio y Revanchas
- `STOC_TYPE_CHANGE (0x13)`: Envía el tipo de jugador que es el cliente (Host, Guest, Spectator).
- `STOC_DUEL_START (0x15)`: Comando de red que inicia oficialmente la transición de Lobby a Tablero de Duelo.
- `STOC_CATCHUP (0xf0)`: El servidor envía este paquete para indicar que está enviando un bloque masivo de actualización de estado para "poner al día" a un espectador o alguien que se reconecta a mitad de partida. Evita/Desactiva animaciones temporales.
- `STOC_REMATCH (0xf1)` / `STOC_WAITING_REMATCH (0xf2)`: Fin de Match y prompts para revancha.
- `STOC_DUEL_END (0x16)`: Destruye la vista de duelo y devuelve a todos al Lobby o finaliza la sesión.
- `STOC_CHANGE_SIDE (0x7)` / `STOC_WAITING_SIDE (0x8)`: Inicia el estado de Siding Phase entre duelos de un Best of 3.

### 2. Mensajes Sociales y Lobby
- `STOC_CHAT (0x19)` o `STOC_CHAT_2 (0xf3)`: Mensajes de texto entre los usuarios y logs globales del servidor (Chat del sistema).
- `STOC_HS_PLAYER_ENTER (0x20)`: Un jugador ha entrado a la sala virtual del lobby.
- `STOC_HS_PLAYER_CHANGE (0x21)`: Un jugador ha cambiado su estado (Ready, Not Ready, se movió a Espectador o salió).
- `STOC_HS_WATCH_CHANGE (0x22)`: Se altera el conteo de espectadores en la sala.

### 3. Fases Especiales
- `STOC_SELECT_HAND (0x3)`: Prompt pidiendo a ambos jugadores jugar Piedra, Papel o Tijera (RPS).
- `STOC_HAND_RESULT (0x5)`: Revela ambas selecciones del RPS.
- `STOC_SELECT_TP (0x4)`: Prompt preguntando a un jugador si desea ir primero o segundo.
- `STOC_TP_RESULT (0x6)`: Informa quién se ha decidido que empiece (Player 0 o Player 1).
- `STOC_TIME_LIMIT (0x18)`: Constantemente inyectado en el duelo para actualizar los temporizadores (turnos y pool de tiempo de cada jugador).
- `STOC_ERROR_MSG (0x2)`: Error fatal que cerrará la sala y debe ser impreso (ej. Join Error, Deck Error, Version Error).
- `STOC_NEW_REPLAY (0x30)` / `STOC_REPLAY (0x17)`: Modos de reproducción offline.
