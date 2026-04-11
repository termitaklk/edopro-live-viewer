# MSG_RECOVER

Estado: confirmado en referencia, parser actual y traza real aislada.

## Identidad

- Nombre: `MSG_RECOVER`
- Codigo decimal: `92`
- Codigo hexadecimal: `0x5C`
- Contenedor: `STOC_GAME_MSG (0x01)`

## Proposito funcional

Este mensaje representa una recuperacion de LP por delta.

No trae el LP final del jugador. Trae la cantidad de LP que debe sumarse al LP actual del jugador objetivo.

## Layout confirmado

Segun [EDOPRO_PROTOCOL_REFERENCE.md](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md#L486):

- `+0`: `uint8 player`
- `+1`: `uint32 amount`

Interpretacion:

- `player`: indice del jugador objetivo
- `amount`: cantidad de LP a sumar, leida en little-endian

Tamano minimo del payload:

- `5 bytes`

Tamano total esperado del segmento completo:

- `9 bytes`

## Ejemplo real de traza

Traza real encontrada en [message-trace-472fceee-dcd7-4f82-b617-795f9d15a39f.txt](/c:/Fix%20Mobile/visor/logs/message-trace-472fceee-dcd7-4f82-b617-795f9d15a39f.txt):

```text
GAME_MSG: MSG_RECOVER (0x5c)
SEG_HEX: 0700015c01e8030000
```

Desglose:

- `07 00`: longitud del segmento = 7 bytes
- `01`: `STOC_GAME_MSG`
- `5c`: `MSG_RECOVER`
- `01`: player 1
- `e8 03 00 00`: `0x000003E8` little-endian = `1000`

Interpretacion final:

- el jugador `1` recupera `1000` LP

Otro ejemplo real:

```text
SEG_HEX: 0700015c01c4090000
```

Desglose:

- `01`: player 1
- `c4 09 00 00`: `0x000009C4` = `2500`

## Parser actual

En [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js#L932):

```js
case COMMON_MSG.MSG_RECOVER:
    emit(context.uniqueId, 'game_msg', {
        roomId: context.roomId,
        type: 'MSG_RECOVER',
        rawType: gameMessageType,
        player: payload.length > 0 ? payload.readUInt8(0) : null,
        amount: payload.length >= 5 ? payload.readUInt32LE(1) : null,
        clientFlow: context.clientFlow,
    });
    break;
```

## Uso actual en el viewer

En [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html#L3109):

```js
if (payload.type === 'MSG_RECOVER' && payload.player !== null && payload.amount !== null && payload.amount !== undefined) {
    const mappedPlayer = mapProtocolPlayer(payload.player);
    const current = Number(state.playerLp[mappedPlayer]);
    const base = Number.isFinite(current) ? current : getFallbackLp(mappedPlayer);
    state.playerLp[mappedPlayer] = Math.max(0, base + Number(payload.amount));
}
```

Interpretacion:

- el viewer lo trata como delta positivo
- suma `amount` al LP actual
- si no hay LP previo confiable, usa fallback

## Relacion con otros mensajes

- `MSG_DAMAGE`: delta negativo
- `MSG_RECOVER`: delta positivo
- `MSG_LPUPDATE`: valor absoluto final

Regla practica:

- `MSG_RECOVER` puede hacer que un jugador supere el `start_lp`
- el HUD no debe usar eso para reescalar la barra del rival

## Riesgos y dudas abiertas

- confirmar si existen casos donde `MSG_RECOVER` aparezca sin `MSG_LPUPDATE` posterior
- validar si alguna variante de cliente reporta primero el valor absoluto y luego el delta

## Regla de implementacion recomendada

1. leer `player` en offset `0`
2. leer `amount` como `uint32LE` en offset `1`
3. calcular `lp_actual + amount`
4. si mas tarde llega `MSG_LPUPDATE`, preferir el valor absoluto
