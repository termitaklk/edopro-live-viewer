# MSG_NEW_PHASE

Estado: confirmado en referencia, parser actual y traza real aislada.

## Identidad

- Nombre: `MSG_NEW_PHASE`
- Codigo decimal: `41`
- Codigo hexadecimal: `0x29`
- Contenedor: `STOC_GAME_MSG (0x01)`

## Proposito funcional

Este mensaje indica la fase actual del turno.

No cambia el propietario del turno. Solo cambia la fase del duelo dentro del turno activo.

## Layout confirmado

Segun [EDOPRO_PROTOCOL_REFERENCE.md](/c:/Fix%20Mobile/visor/EDOPRO_PROTOCOL_REFERENCE.md#L420):

- `+0`: `uint16 phase`

Lectura:

- `phase` se lee como `uint16LE`

Valores de fase documentados:

- `0x01` `DRAW`
- `0x02` `STANDBY`
- `0x04` `MAIN1`
- `0x08` `BATTLE_START`
- `0x10` `BATTLE_STEP`
- `0x20` `DAMAGE`
- `0x40` `DAMAGE_CAL`
- `0x80` `BATTLE`
- `0x100` `MAIN2`
- `0x200` `END`

Tamano minimo del payload:

- `2 bytes`

Tamano total esperado del segmento completo:

- `2 bytes` longitud
- `1 byte` `STOC_GAME_MSG`
- `1 byte` `0x29`
- `2 bytes` payload
- total: `6 bytes`

## Ejemplo real de traza

Traza real en [message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt](/c:/Fix%20Mobile/visor/logs/message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:62):

```text
GAME_MSG: MSG_NEW_PHASE (0x29)
SEG_HEX: 040001290100
```

Desglose:

- `04 00`: longitud del segmento = 4 bytes
- `01`: `STOC_GAME_MSG`
- `29`: `MSG_NEW_PHASE`
- `01 00`: `0x0001` little-endian = `DRAW`

Otro ejemplo real del mismo archivo:

```text
SEG_HEX: 040001290200
```

Interpretacion:

- `02 00` = `STANDBY`

## Parser actual

En [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js#L885):

```js
case COMMON_MSG.MSG_NEW_PHASE:
    emit(context.uniqueId, 'game_msg', {
        roomId: context.roomId,
        type: 'MSG_NEW_PHASE',
        rawType: gameMessageType,
        phase: payload.length >= 2 ? payload.readUInt16LE(0) : null,
        clientFlow: context.clientFlow,
    });
    break;
```

## Uso actual en el viewer

En [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html#L3063):

```js
if (payload.type === 'MSG_NEW_PHASE') {
    state.phase = `phase:${payload.phase}`;
    if (normalizePhaseCode(state.phase) === 'bp') {
        state.battlePhaseSeen = true;
    }
}
```

Interpretacion:

- guarda la fase como string `phase:<codigo>`
- el viewer luego normaliza ese codigo para activar botones o estados visuales
- si la fase normalizada es batalla, marca `battlePhaseSeen`

## Relacion con otros mensajes

- `MSG_NEW_TURN`: cambia el jugador activo
- `MSG_NEW_PHASE`: cambia la fase dentro de ese turno
- `time_limit`: actualiza reloj, pero no define fase

Regla practica:

- `MSG_NEW_PHASE` nunca debe usarse para inferir cambio de turno por si solo

## Riesgos y dudas abiertas

- verificar si existen fases menos comunes no listadas en la referencia local
- revisar si todos los flujos modernos mantienen exactamente el mismo set de codigos

## Regla de implementacion recomendada

1. leer `phase` como `uint16LE` en offset `0`
2. mapear el codigo a fase legible
3. actualizar solo el estado de fase
4. no tocar `turnPlayer`
