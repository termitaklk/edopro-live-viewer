# MSG_CHAINED

## Identidad

- Nombre: `MSG_CHAINED`
- Codigo: `0x47` (`71`)
- Direccion: `STOC_GAME_MSG`
- Rol: confirmar el indice del eslabon que acaba de entrar a la cadena

## Estado actual en el proyecto

Actualmente no existe parser dedicado ni consumo especifico para `MSG_CHAINED` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Layout observado

Todas las trazas vistas son consistentes con un payload minimo de `1 byte`:

- `+0`: `uint8 chainIndex`

Tamano minimo:

- `1 byte` de payload

## Ejemplos reales

Traza real en [message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:98](/c:/Fix%20Mobile/visor/logs/message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:98)

```text
SEG_HEX: 0300014701
```

Interpretacion:

- `chainIndex = 1`

Otra traza real en [message-trace-f3e7b157-ce23-4274-9d26-d47de9822f97.txt:499](/c:/Fix%20Mobile/visor/logs/message-trace-f3e7b157-ce23-4274-9d26-d47de9822f97.txt:499)

```text
SEG_HEX: 0300014702
```

Interpretacion:

- `chainIndex = 2`

## Relacion con otros mensajes

### `MSG_CHAINING`

- `MSG_CHAINING` parece describir la fuente del efecto
- `MSG_CHAINED` parece confirmar que ese efecto ya ocupa un indice concreto en la cadena

### `MSG_CHAIN_SOLVING`

- cuando empiece la resolucion, el mismo `chainIndex` vuelve a aparecer en `MSG_CHAIN_SOLVING`

## Regla de implementacion recomendada

- parser minimo:
  - `chainIndex`
- usarlo para depuracion, logs y futura UI de cadena

## Estado de certeza

- confirmado por trazas: payload de `1 byte`
- confirmado: representa un indice de cadena
- confirmado: hoy no esta implementado
