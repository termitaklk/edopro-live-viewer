# MSG_NEW_TURN

Estado: confirmado en referencia, parser actual y traza real aislada.

## Identidad

- Nombre: `MSG_NEW_TURN`
- Codigo decimal: `40`
- Codigo hexadecimal: `0x28`
- Contenedor: `STOC_GAME_MSG (0x01)`

## Proposito funcional

Este mensaje indica que empieza un nuevo turno y define quien es el jugador activo.

Para el visor actual, este mensaje es la fuente autoritativa de `turnPlayer`.

## Layout confirmado

Segun [EDOPRO_PROTOCOL_REFERENCE.md](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md#L416):

- `+0`: `uint8 player`

Interpretacion:

- `player`: indice del jugador al que pertenece el nuevo turno

Tamano minimo del payload:

- `1 byte`

Tamano total esperado del segmento completo:

- `2 bytes` longitud
- `1 byte` `STOC_GAME_MSG`
- `1 byte` `0x28`
- `1 byte` payload
- total: `5 bytes`

## Ejemplo real de traza

Traza real en [message-trace-57e97ffb-db0b-468d-8513-26ab2169f316.txt](/c:/Fix%20Mobile/visor/logs/message-trace-57e97ffb-db0b-468d-8513-26ab2169f316.txt):

```text
GAME_MSG: MSG_NEW_TURN (0x28)
SEG_HEX: 0300012800
```

Desglose:

- `03 00`: longitud del segmento = 3 bytes
- `01`: `STOC_GAME_MSG`
- `28`: `MSG_NEW_TURN`
- `00`: player 0

Interpretacion final:

- comienza un nuevo turno del jugador `0`

## Parser actual

En [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js#L875):

```js
case COMMON_MSG.MSG_NEW_TURN:
    emit(context.uniqueId, 'game_msg', {
        roomId: context.roomId,
        type: 'MSG_NEW_TURN',
        rawType: gameMessageType,
        player: payload.length > 0 ? payload.readUInt8(0) : null,
        clientFlow: context.clientFlow,
    });
    break;
```

## Uso actual en el viewer

En [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html#L3050):

```js
if (payload.type === 'MSG_NEW_TURN') {
    const nextTurn = (state.turnCount ?? 0) + 1;
    const mappedTurnPlayer = mapProtocolPlayer(payload.player);
    clearTurnLog(`TURN TRACE RESET | turn=${nextTurn} | activePlayer=P${mappedTurnPlayer}`);
    state.battlePhaseSeen = false;
    if (state.startingPlayer === null || state.startingPlayer === undefined) {
        state.startingPlayer = mappedTurnPlayer;
    }
    state.turnPlayer = mappedTurnPlayer;
    state.turnCount = nextTurn;
    state.playerTimeUpdatedAt[mappedTurnPlayer] = state.playerTimeUpdatedAt[mappedTurnPlayer] || Date.now();
}
```

Interpretacion:

- incrementa el contador de turnos
- fija `turnPlayer`
- inicializa `startingPlayer` si es el primer turno observado
- prepara el reloj del jugador activo

## Relacion con otros mensajes

- `MSG_NEW_TURN`: define propiedad del turno
- `time_limit`: actualiza tiempo restante, pero no debe cambiar `turnPlayer`
- `MSG_NEW_PHASE`: cambia la fase dentro del turno

Regla practica:

- si hay conflicto entre `MSG_NEW_TURN` y `time_limit`, `MSG_NEW_TURN` es la fuente de verdad para el jugador activo

## Riesgos y dudas abiertas

- confirmar si todos los clientes usan siempre `0/1` como indices absolutos
- seguir validando la interaccion entre `turnPlayer` y `perspectivePlayer` a nivel visual, aunque el mensaje en si ya esta claro

## Regla de implementacion recomendada

1. leer `player` en offset `0`
2. convertirlo a indice de jugador interno
3. asignarlo a `turnPlayer`
4. incrementar `turnCount`
5. no permitir que `time_limit` reemplace esta propiedad
