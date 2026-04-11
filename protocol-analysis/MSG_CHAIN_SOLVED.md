# MSG_CHAIN_SOLVED

## Identidad

- Nombre: `MSG_CHAIN_SOLVED`
- Codigo: `0x49` (`73`)
- Direccion: `STOC_GAME_MSG`
- Rol: indicar que un eslabon concreto de la cadena ya termino de resolverse

## Estado actual en el proyecto

Actualmente no existe parser dedicado ni consumo especifico para `MSG_CHAIN_SOLVED` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Layout observado

Las trazas vistas son consistentes con:

- `+0`: `uint8 chainIndex`

Tamano minimo:

- `1 byte` de payload

## Ejemplo real

Traza real en [message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:137](/c:/Fix%20Mobile/visor/logs/message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:137)

```text
SEG_HEX: 0300014901
```

Interpretacion:

- `chainIndex = 1`

## Relacion con otros mensajes

### `MSG_CHAIN_SOLVING`

- usa el mismo indice del eslabon que esta resolviendose

### `MSG_CHAIN_END`

- cuando ya no quedan eslabones por resolver, la secuencia termina con `MSG_CHAIN_END`

## Regla de implementacion recomendada

- parser minimo:
  - `chainIndex`
- si se implementa una vista de cadena, usarlo para marcar el eslabon como resuelto

## Estado de certeza

- confirmado por trazas: payload de `1 byte`
- confirmado: hoy no esta implementado
- abierto: falta una traza con mas de un eslabon resuelto para validar orden completo
