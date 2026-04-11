# MSG_DAMAGE

Estado: confirmado en referencia, parser actual y traza real aislada.

## Identidad

- Nombre: `MSG_DAMAGE`
- Codigo decimal: `91`
- Codigo hexadecimal: `0x5B`
- Contenedor: `STOC_GAME_MSG (0x01)`

## Proposito funcional

Este mensaje representa una reduccion de LP por delta.

No trae el LP final del jugador. Trae la cantidad de dano que debe restarse al LP actual del jugador objetivo.

## Layout confirmado

Segun [EDOPRO_PROTOCOL_REFERENCE.md](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md#L480):

- `+0`: `uint8 player`
- `+1`: `uint32 amount`

Interpretacion:

- `player`: indice del jugador en el protocolo, normalmente `0` o `1`
- `amount`: cantidad de LP a restar, leida en little-endian

Tamano minimo del payload:

- `5 bytes`

Tamano total esperado del segmento completo:

- `2 bytes` longitud
- `1 byte` `STOC_GAME_MSG`
- `1 byte` `0x5B`
- `5 bytes` payload
- total: `9 bytes`

## Ejemplo real de traza

Traza real en [message-trace-3eab395e-a3d0-4edc-ac34-2e3e95aadc0f.txt](/c:/Fix%20Mobile/visor/logs/message-trace-3eab395e-a3d0-4edc-ac34-2e3e95aadc0f.txt):

```text
GAME_MSG: MSG_DAMAGE (0x5b)
SEG_HEX: 0700015b00d0070000
```

Desglose:

- `07 00`: longitud del segmento = 7 bytes
- `01`: `STOC_GAME_MSG`
- `5b`: `MSG_DAMAGE`
- `00`: player 0
- `d0 07 00 00`: `0x000007D0` little-endian = `2000`

Interpretacion final:

- el jugador `0` recibe `2000` de dano

## Parser actual

En [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js#L921):

```js
case COMMON_MSG.MSG_DAMAGE:
    emit(context.uniqueId, 'game_msg', {
        roomId: context.roomId,
        type: 'MSG_DAMAGE',
        rawType: gameMessageType,
        player: payload.length > 0 ? payload.readUInt8(0) : null,
        amount: payload.length >= 5 ? payload.readUInt32LE(1) : null,
        clientFlow: context.clientFlow,
    });
    break;
```

## Uso actual en el viewer

En [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html#L3103):

```js
if (payload.type === 'MSG_DAMAGE' && payload.player !== null && payload.amount !== null && payload.amount !== undefined) {
    const mappedPlayer = mapProtocolPlayer(payload.player);
    const current = Number(state.playerLp[mappedPlayer]);
    const base = Number.isFinite(current) ? current : getFallbackLp(mappedPlayer);
    state.playerLp[mappedPlayer] = Math.max(0, base - Number(payload.amount));
}
```

Interpretacion:

- el viewer lo trata como delta
- toma el LP actual del jugador
- resta `amount`
- hace clamp minimo a `0`

## Relacion con otros mensajes

- `MSG_DAMAGE`: resta un delta
- `MSG_RECOVER`: suma un delta
- `MSG_LPUPDATE`: fija el LP final absoluto

Regla practica:

- `MSG_DAMAGE` sirve para reflejar el cambio inmediato
- si despues llega `MSG_LPUPDATE`, ese valor absoluto debe considerarse mas fuerte

## Riesgos y dudas abiertas

- confirmar si en todos los flujos `player` siempre llega en coordenadas absolutas `0/1`
- verificar si algunos clientes pueden emitir `MSG_DAMAGE` y `MSG_LPUPDATE` casi consecutivos para el mismo evento

## Regla de implementacion recomendada

1. leer `player` en offset `0`
2. leer `amount` como `uint32LE` en offset `1`
3. calcular `lp_actual - amount`
4. hacer clamp minimo a `0`
5. si existe luego `MSG_LPUPDATE`, preferir ese valor final
