# MSG_CHAIN_SOLVING

## Identidad

- Nombre: `MSG_CHAIN_SOLVING`
- Codigo: `0x48` (`72`)
- Direccion: `STOC_GAME_MSG`
- Rol: indicar que un eslabon concreto de la cadena empieza a resolverse

## Estado actual en el proyecto

Actualmente no existe parser dedicado ni consumo especifico para `MSG_CHAIN_SOLVING` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Layout observado

Las trazas vistas son consistentes con:

- `+0`: `uint8 chainIndex`

Tamano minimo:

- `1 byte` de payload

## Ejemplos reales

Traza real en [message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:107](/c:/Fix%20Mobile/visor/logs/message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:107)

```text
SEG_HEX: 0300014801
```

Interpretacion:

- `chainIndex = 1`

Otra traza real en [message-trace-f3e7b157-ce23-4274-9d26-d47de9822f97.txt:544](/c:/Fix%20Mobile/visor/logs/message-trace-f3e7b157-ce23-4274-9d26-d47de9822f97.txt:544)

```text
SEG_HEX: 0300014802
```

Interpretacion:

- `chainIndex = 2`

## Relacion con otros mensajes

### `MSG_CHAINED`

- `MSG_CHAINED` anuncia que el eslabon ya fue agregado
- `MSG_CHAIN_SOLVING` marca el inicio de su resolucion

### `MSG_CHAIN_SOLVED`

- despues de este mensaje suele llegar `MSG_CHAIN_SOLVED` con el mismo indice

## Regla de implementacion recomendada

- parser minimo:
  - `chainIndex`
- en una UI de cadena, usarlo para marcar el eslabon activo

## Estado de certeza

- confirmado por trazas: payload de `1 byte`
- inferencia fuerte: el indice identifica el eslabon en resolucion
- confirmado: hoy no esta implementado
