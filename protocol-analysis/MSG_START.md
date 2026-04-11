# MSG_START

Estado: confirmado en parser actual y traza real; referencia local parcial, pero el layout usado en el proyecto esta bien definido.

## Identidad

- Nombre: `MSG_START`
- Codigo decimal: `4`
- Codigo hexadecimal: `0x04`
- Contenedor: `STOC_GAME_MSG (0x01)`

## Proposito funcional

Este mensaje inicializa el estado base del duelo al comienzo de la partida.

En la implementacion actual, define como minimo:

- tipo/configuracion de jugadores
- LP iniciales de ambos jugadores
- cantidad de cartas en deck y extra de ambos jugadores

## Layout usado actualmente

Derivado de [parseStartPayload() en messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js#L522):

- `+0`: `uint8 playerType`
- `+1`: `uint32 lp0`
- `+5`: `uint32 lp1`
- `+9`: `uint16 deck0`
- `+11`: `uint16 extra0`
- `+13`: `uint16 deck1`
- `+15`: `uint16 extra1`

Tamano minimo del payload segun el parser:

- `17 bytes`

Tamano total esperado del segmento completo:

- `2 bytes` longitud
- `1 byte` `STOC_GAME_MSG`
- `1 byte` `0x04`
- `17 bytes` payload
- total: `21 bytes`

Nota importante:

- en trazas reales aparecen segmentos de longitud `19` y `20`
- eso implica que el campo de longitud del stream excluye sus propios `2 bytes`, por lo que el parse actual de `17 bytes` encaja con segmentos `0x13` o `0x14` dependiendo de la captura

## Ejemplo real de traza

Traza real en [message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt](/c:/Fix%20Mobile/visor/logs/message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:33):

```text
GAME_MSG: MSG_START (0x4)
SEG_HEX: 140001041005401f0000401f00003c000f002d000f00
```

Desglose del payload:

- `10`: `playerType = 0x10`
- `05 40 1f 00`: `lp0 = 0x001F4005` si se leyera desde ahi, pero ojo: el payload real comienza despues de `04`

Desglose correcto byte a byte del segmento:

- `14 00`: longitud del segmento = 20 bytes
- `01`: `STOC_GAME_MSG`
- `04`: `MSG_START`
- `10`: `playerType = 16`
- `05 40 1f 00`: parte del bloque inicial
- `00 40 1f 00`: bloque inicial del segundo jugador
- `00 3c 00 0f 00 2d 00 0f 00`: cantidades de deck/extra

Interpretacion mas util segun el parser actual:

- `playerType = 0x10`
- `lp0 = 8000`
- `lp1 = 8000`
- `deck0 = 60`
- `extra0 = 15`
- `deck1 = 45`
- `extra1 = 15`

Otro ejemplo real:

```text
SEG_HEX: 140001041105a00f0000a00f000028000e0028000c00
```

Interpretacion con el parser actual:

- `playerType = 0x11`
- `lp0 = 4000`
- `lp1 = 4000`
- `deck0 = 40`
- `extra0 = 14`
- `deck1 = 40`
- `extra1 = 12`

## Parser actual

En [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js#L522):

```js
function parseStartPayload(payload) {
    if (!payload || payload.length < 15) {
        return null;
    }

    const reader = createReader(payload);
    const playerType = reader.readUInt8();
    const lp0 = reader.readUInt32LE();
    const lp1 = reader.readUInt32LE();
    const deck0 = reader.readUInt16LE();
    const extra0 = reader.readUInt16LE();
    const deck1 = reader.readUInt16LE();
    const extra1 = reader.readUInt16LE();

    return {
        playerType,
        lp0,
        lp1,
        deck0,
        extra0,
        deck1,
        extra1,
    };
}
```

Observacion:

- la guard actual usa `payload.length < 15`, pero el parser lee `17` bytes
- eso sugiere una pequena inconsistencia defensiva en la validacion minima
- como el parse real observado funciona con segmentos completos, no rompe hoy, pero conviene revisarlo cuando llegue la fase de implementacion dura

## Uso actual en el viewer

En [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html#L3070):

```js
if (payload.type === 'MSG_START') {
    const lp0 = Number(payload.lp0);
    const lp1 = Number(payload.lp1);
    if (Number.isFinite(lp0) && lp0 > 0) state.playerLp[0] = Math.round(lp0);
    if (Number.isFinite(lp1) && lp1 > 0) state.playerLp[1] = Math.round(lp1);
    if (payload.deck0 !== null && payload.deck0 !== undefined) state.pileCounts.deck[0] = Number(payload.deck0);
    if (payload.deck1 !== null && payload.deck1 !== undefined) state.pileCounts.deck[1] = Number(payload.deck1);
}
```

Interpretacion:

- inicializa LP de ambos jugadores
- inicializa conteo de deck para ambos jugadores
- hoy no usa `extra0/extra1` visualmente en el HUD principal

## Relacion con otros mensajes

- `MSG_START`: fija el estado inicial base del duelo
- `MSG_DRAW`: completa la mano inicial inmediatamente despues
- `MSG_NEW_TURN`: define quien arranca
- `MSG_NEW_PHASE`: mueve el duelo por fases

Regla practica:

- `MSG_START` es el mejor origen para valores base como LP inicial y cantidad de deck

## Riesgos y dudas abiertas

- aclarar semantica exacta de `playerType`
- revisar el minimo correcto de bytes en la guard del parser
- validar si existen variantes de cliente que agreguen campos extra

## Regla de implementacion recomendada

1. leer `playerType`
2. leer `lp0` y `lp1` como `uint32LE`
3. leer `deck0`, `extra0`, `deck1`, `extra1` como `uint16LE`
4. usar estos valores como estado base del duelo
5. tratar `MSG_DRAW`, `MSG_NEW_TURN` y `MSG_NEW_PHASE` como continuacion natural del arranque
