# MSG_LPUPDATE

Estado: confirmado en referencia y parser actual; evidencia de traza real aislada todavia no confirmada con `SEG_HEX` etiquetado.

## Identidad

- Nombre: `MSG_LPUPDATE`
- Codigo decimal: `94`
- Codigo hexadecimal: `0x5E`
- Contenedor: `STOC_GAME_MSG (0x01)`

## Proposito funcional

Este mensaje representa una actualizacion absoluta de Life Points para un jugador.

No expresa un delta como `MSG_DAMAGE` o `MSG_RECOVER`. En cambio, trae el valor final de LP que debe quedar aplicado al jugador objetivo.

## Layout confirmado

Segun [EDOPRO_PROTOCOL_REFERENCE.md](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md#L492):

- `+0`: `uint8 player`
- `+1`: `uint32 new_lp`

Interpretacion:

- `player`: indice del jugador en el protocolo, esperado como `0` o `1`
- `new_lp`: LP finales del jugador, leidos en little-endian

Tamano minimo del payload:

- `1 + 4 = 5 bytes`

Tamano total del segmento dentro del stream:

- `2 bytes` longitud del segmento
- `1 byte` tipo `STOC_GAME_MSG`
- `1 byte` tipo de game message `0x5E`
- `5 bytes` payload de `MSG_LPUPDATE`

Tamano total esperado del segmento completo:

- `9 bytes`

Ejemplo de segmento teorico:

```text
07 00 01 5E 00 28 23 00 00
```

Desglose:

- `07 00`: longitud del segmento despues del prefijo de longitud = 7 bytes
- `01`: `STOC_GAME_MSG`
- `5E`: `MSG_LPUPDATE`
- `00`: player 0
- `28 23 00 00`: `0x00002328` little-endian = `9000`

## Parser actual

En [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js#L943) el parser actual hace esto:

```js
case COMMON_MSG.MSG_LPUPDATE:
    emit(context.uniqueId, 'game_msg', {
        roomId: context.roomId,
        type: 'MSG_LPUPDATE',
        rawType: gameMessageType,
        player: payload.length > 0 ? payload.readUInt8(0) : null,
        lp: payload.length >= 5 ? payload.readUInt32LE(1) : null,
        clientFlow: context.clientFlow,
    });
    break;
```

Confirmaciones derivadas:

- el proyecto ya lo interpreta como `uint8 + uint32LE`
- el campo emitido hacia el viewer es `lp`
- el parser no aplica transformacion extra ni heuristica

## Uso actual en el viewer

En [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html#L3117) el viewer lo consume asi:

```js
if (payload.type === 'MSG_LPUPDATE' && payload.player !== null && payload.lp !== null && payload.lp !== undefined) {
    const mappedPlayer = mapProtocolPlayer(payload.player);
    const lp = Number(payload.lp);
    if (Number.isFinite(lp) && lp >= 0) {
        state.playerLp[mappedPlayer] = lp;
    }
}
```

Interpretacion:

- `MSG_LPUPDATE` es tratado como estado autoritativo de LP
- sobrescribe el LP del jugador objetivo
- no suma ni resta
- no depende de `MSG_DAMAGE` ni de `MSG_RECOVER` para mantenerse consistente

## Relacion con otros mensajes

Mensajes cercanos:

- `MSG_DAMAGE (91)`: aplica `base - amount`
- `MSG_RECOVER (92)`: aplica `base + amount`
- `MSG_LPUPDATE (94)`: fija directamente `new_lp`

Lectura recomendada:

- `MSG_DAMAGE` y `MSG_RECOVER` son utiles para animacion o trazas
- `MSG_LPUPDATE` debe considerarse el mensaje mas fuerte cuando aparezca, porque trae el valor final

## Evidencia local disponible

Confirmado en:

- [EDOPRO_PROTOCOL_REFERENCE.md](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md#L492)
- [messages/COMMON_MSG.JS](/c:/Fix%20Mobile/visor/messages/COMMON_MSG.JS#L267)
- [messageshandler/messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js#L943)
- [front-end/viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html#L3117)

Observacion sobre trazas:

- en los logs actuales hay muchas apariciones de `0x5E` dentro de blobs grandes, pero en esta pasada no se encontro una muestra corta y aislada ya etiquetada como `GAME_MSG: MSG_LPUPDATE`
- por eso la estructura queda marcada como confirmada por referencia y parser, pero el ejemplo de traza real aislada queda pendiente

## Riesgos y dudas abiertas

- confirmar con un `SEG_HEX` limpio de una partida real para cerrar la ficha con evidencia binaria directa
- validar si existe alguna variante de cliente donde `player` no sea estrictamente `0/1`
- confirmar si en algun flujo moderno `MSG_LPUPDATE` puede llegar redundante junto a `MSG_DAMAGE` o `MSG_RECOVER` en el mismo cambio de estado

## Regla de implementacion recomendada

Si `MSG_LPUPDATE` aparece:

1. parsear `player` en offset `0`
2. parsear `new_lp` como `uint32LE` en offset `1`
3. actualizar el estado del jugador objetivo con ese valor exacto
4. preferir este valor sobre calculos inferidos a partir de mensajes delta

## Siguiente paso recomendado

Para la segunda fase, el mejor siguiente mensaje para analizar es `MSG_DAMAGE`, porque complementa esta ficha y permite documentar claramente la diferencia entre:

- mensaje delta
- mensaje absoluto

Modelo recomendado para implementar despues de documentar:

- `gpt-5.3-codex` si vamos a tocar parser, tests y consumidores del viewer
- `gpt-5.4` si queremos mas apoyo de razonamiento y redaccion tecnica junto con implementacion
