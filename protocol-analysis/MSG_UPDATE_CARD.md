# MSG_UPDATE_CARD

## Identidad

- Nombre: `MSG_UPDATE_CARD`
- Codigo: `0x07` (`7`)
- Direccion: `STOC_GAME_MSG`
- Rol: refrescar una sola carta dentro de una zona concreta

## Layout binario

Base:

- `+0`: `uint8 player`
- `+1`: `uint8 location`
- `+2`: `uint8 sequence`
- `+3...`: `Query`

No tiene tamano fijo. El resto del payload es un `Query` compuesto por bloques.

Referencia del parser en [messageHandlers.js:449](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:449)

## Como se interpreta `Query`

El proyecto usa `parseQuery()` para leer bloques:

- `uint16LE size`
- `uint32LE flag`
- `payload del bloque`

El parser actual extrae especialmente:

- `flags`
- `code`
- `position`

Referencia en [messageHandlers.js:294](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:294) y [messageHandlers.js:383](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:383)

## Ejemplo real

Traza real en [message-trace-16a7bbac-76b6-46d5-ad74-74a3729758f6.txt:121](/c:/Fix%20Mobile/visor/logs/message-trace-16a7bbac-76b6-46d5-ad74-74a3729758f6.txt:121)

```text
SEG_HEX: 550001070002045000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

Lectura de cabecera del payload:

- `00`: `player = 0`
- `02`: `location = 0x02`
- `04`: `sequence = 4`
- resto: `Query`

Interpretacion alta:

- se actualiza una carta concreta del jugador `0` en la zona `0x02`, secuencia `4`
- los detalles concretos dependen de los bloques `Query` presentes

## Parser actual

El parser devuelve:

- `player`
- `location`
- `sequence`
- `flags`
- `code`
- `position`

No expone hoy todos los subcampos posibles del `Query`, aunque `parseQueryBlockPayload()` conoce muchos mas.

## Uso actual en el viewer

Bloque principal en [viewer.html:3270](/c:/Fix%20Mobile/visor/front-end/viewer.html:3270)

Comportamiento actual:

1. resuelve `code` con `payload.code` o `state.pendingReveal`
2. calcula `currentFieldKey`
3. si la ubicacion es grave (`0x10`), actualiza `state.graves`
4. si hay `code` o `position`, refresca `state.field[currentStateFieldKey]`
5. si el `code` queda resuelto, limpia `state.pendingReveal`

En otras palabras:

- `MSG_UPDATE_CARD` es un refresh puntual de una sola carta
- se usa para completar o corregir informacion que `MSG_MOVE` por si solo no deja cerrada

## Relacion con otros mensajes

### `MSG_MOVE`

- suele indicar el desplazamiento entre zonas
- `MSG_UPDATE_CARD` termina de fijar atributos reales de la carta en su nueva ubicacion

### `MSG_UPDATE_DATA`

- `MSG_UPDATE_CARD` actualiza una sola carta
- `MSG_UPDATE_DATA` refresca una zona completa

## Dudas abiertas

- el parser conoce muchos flags de `Query`, pero el evento emitido solo publica `flags`, `code` y `position`
- cuando hagamos implementacion tecnica, conviene decidir si queremos exponer tambien `status`, `reason`, `owner`, `attack`, etc.

## Regla de implementacion recomendada

- tratar `MSG_UPDATE_CARD` como snapshot autoritativo de una sola carta
- no asumir que siempre traera `code`; a veces solo corrige `position` u otros flags
- mantener `MSG_MOVE` como fuente del traslado y `MSG_UPDATE_CARD` como fuente de refinamiento

## Estado de certeza

- confirmado: cabecera `player/location/sequence`
- confirmado: el resto es `Query`
- confirmado: el viewer lo usa para consolidar `field` y `grave`
- abierto: cuales subcampos extra del `Query` conviene exponer en el evento
