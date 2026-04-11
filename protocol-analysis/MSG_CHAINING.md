# MSG_CHAINING

## Identidad

- Nombre: `MSG_CHAINING`
- Codigo: `0x46` (`70`)
- Direccion: `STOC_GAME_MSG`
- Rol: anunciar que una carta o efecto entra en la cadena

## Estado actual en el proyecto

Actualmente no existe parser dedicado ni consumo especifico para `MSG_CHAINING` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Evidencia observada

Las trazas reales muestran al menos dos formas de payload:

1. una variante corta o `compact`
2. una variante larga o `extended`

Eso recuerda al patron que ya vemos en `MSG_MOVE` y `MSG_EQUIP`.

## Variante `compact`

Traza real en [message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:95](/c:/Fix%20Mobile/visor/logs/message-trace-1da53993-1118-4edd-bbb8-063dfa08287a.txt:95)

```text
SEG_HEX: 12000146cd70cb000002030a000203d00cb70c01
```

Lectura parcial del payload despues de `46`:

- `cd70cb00`: `code = 0x00CB70CD`
- resto del payload: estructura no cerrada todavia
- ultimo byte `01`: fuerte candidato a `chainIndex = 1`

Inferencia fuerte:

- incluye el `code` de la carta o efecto origen
- incluye informacion de ubicacion o posicion de la carta que encadena
- termina con un identificador de cadena o profundidad de cadena

## Variante `extended`

Traza real en [message-trace-1f2a8ee5-ac4e-46bb-8978-fabc5118e40d.txt:169](/c:/Fix%20Mobile/visor/logs/message-trace-1f2a8ee5-ac4e-46bb-8978-fabc5118e40d.txt:169)

```text
SEG_HEX: 2200014690d6c30300080200000005000000000802000000000000000000000001000000
```

Otra traza similar en [message-trace-f20dfe41-e67e-48e5-be4f-a08bd484430e.txt:1282](/c:/Fix%20Mobile/visor/logs/message-trace-f20dfe41-e67e-48e5-be4f-a08bd484430e.txt:1282)

```text
SEG_HEX: 22000146e24814050102030000000a0000000102030000000000208e4451000001000000
```

Lectura parcial:

- `90d6c303`: `code = 0x03C3D690`
- luego aparecen dos bloques que se parecen mucho a `loc_info`
- el tail `01000000` vuelve a parecer `chainIndex = 1`

Inferencia fuerte:

- la variante larga probablemente usa offsets anchos o `loc_info`
- puede incluir datos extra de descripcion, trigger o categoria del efecto

## Relacion con otros mensajes

### `MSG_CHAINED`

- `MSG_CHAINING` parece ser el alta del eslabon
- `MSG_CHAINED` confirma el indice agregado a la cadena

### `MSG_CHAIN_SOLVING`

- despues de construida la cadena, cada eslabon empieza a resolverse con `MSG_CHAIN_SOLVING`

### `MSG_CHAIN_END`

- el cierre de toda la secuencia llega con `MSG_CHAIN_END`

## Regla de implementacion recomendada

- tratar `MSG_CHAINING` como el mensaje que crea o anuncia un nuevo eslabon
- implementar parser conservador:
  - `code`
  - `rawPayloadHex`
  - `parserVariant`
  - `chainIndex` si se puede extraer con seguridad
- no derivar UI final de cadena hasta fijar el layout completo

## Estado de certeza

- confirmado: existe el mensaje y hoy no esta implementado
- confirmado: hay al menos dos variantes observadas en trazas reales
- inferencia fuerte: el payload incluye `code` y algun identificador de eslabon
- abierto: layout exacto intermedio y significado completo de todos los campos
