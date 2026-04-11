# MSG_CHAIN_END

## Identidad

- Nombre: `MSG_CHAIN_END`
- Codigo: `0x4A` (`74`)
- Direccion: `STOC_GAME_MSG`
- Rol: marcar el final de la secuencia de cadena actual

## Estado actual en el proyecto

Actualmente no existe parser dedicado ni consumo especifico para `MSG_CHAIN_END` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Layout observado

Las trazas vistas son consistentes con un mensaje sin payload adicional.

Tamano minimo:

- `0 bytes` de payload

## Ejemplo real

Traza real en [message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:152](/c:/Fix%20Mobile/visor/logs/message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:152)

```text
SEG_HEX: 0200014a
```

Interpretacion:

- solo aparece el identificador del mensaje
- no hay campos extra despues de `4a`

## Relacion con otros mensajes

### `MSG_CHAINING`

- abre el flujo de construccion de cadena

### `MSG_CHAIN_SOLVED`

- despues de resolver el ultimo eslabon, `MSG_CHAIN_END` cierra el ciclo

## Regla de implementacion recomendada

- parser minimo sin payload
- usarlo para limpiar estado temporal de cadena en viewer o debug

## Estado de certeza

- confirmado por trazas: no se observa payload
- confirmado: hoy no esta implementado
