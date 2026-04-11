# MSG_SHUFFLE_DECK

## Identidad

- Nombre: `MSG_SHUFFLE_DECK`
- Codigo: `0x20` (`32`)
- Direccion: `STOC_GAME_MSG`
- Rol: informar que el deck de un jugador fue barajado

## Estado actual en el proyecto

Actualmente no existe parser dedicado para `MSG_SHUFFLE_DECK` en [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js). Tampoco hay logica dedicada en [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html).

Hoy cae en la ruta `UNHANDLED`.

## Layout observado

Por trazas reales, el payload parece ser:

- `+0`: `uint8 player`

## Ejemplo real

Traza real en [message-trace-16a7bbac-76b6-46d5-ad74-74a3729758f6.txt:139](/c:/Fix%20Mobile/visor/logs/message-trace-16a7bbac-76b6-46d5-ad74-74a3729758f6.txt:139)

```text
SEG_HEX: 0300012000
```

Lectura:

- `20`: `MSG_SHUFFLE_DECK`
- `00`: `player = 0`

Tambien existe la variante para jugador `1`, por ejemplo en [message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:4805](/c:/Fix%20Mobile/visor/logs/message-trace-04788585-0380-4bc3-9333-c0caff6c2f82.txt:4805) con `SEG_HEX: 0300012001`.

## Uso actual en el viewer

No hay efecto de estado dedicado.

Como hoy no modelamos orden real de deck carta por carta, esto no rompe el visor principal. El impacto real es mas bien semantico:

- invalida cualquier supuesto sobre orden interno del deck

## Relacion con otros mensajes

### `MSG_DRAW`

- despues de `MSG_SHUFFLE_DECK`, futuros robos siguen siendo validos
- como el viewer no conoce el orden exacto del deck, no necesita rehacer nada visible

### `MSG_CONFIRM_DECKTOP`

- si mas adelante implementamos mensajes de top-deck, `MSG_SHUFFLE_DECK` deberia invalidar cache o predicciones previas

## Dudas abiertas

- confirmar si el payload es siempre solo `player`
- confirmar si existen variantes compat/no-compat con mas datos

## Regla de implementacion recomendada

- agregar parser minimo con `player`
- usarlo para logging y para invalidar cualquier estado futuro que dependa del orden del deck
- no intentar reconstruir cartas del deck solo por este mensaje

## Estado de certeza

- bastante probable: payload de `1 byte` con `player`
- confirmado: hoy no hay parser ni consumo dedicado
- abierto: si existen variantes mas largas en otros flujos
