# MSG_SHUFFLE_HAND

## Identidad

- Nombre: `MSG_SHUFFLE_HAND`
- Codigo: `0x21` (`33`)
- Direccion: `STOC_GAME_MSG`
- Rol: informar que la mano de un jugador fue reordenada o barajada

## Layout binario

Segun el parser actual:

- `+0`: `uint8 player`
- `+1`: `uint32LE count`
- luego: `count * uint32LE code`

Referencia en [messageHandlers.js:577](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js:577)

## Ejemplo real

Traza real en [message-trace-16a7bbac-76b6-46d5-ad74-74a3729758f6.txt:127](/c:/Fix%20Mobile/visor/logs/message-trace-16a7bbac-76b6-46d5-ad74-74a3729758f6.txt:127)

```text
SEG_HEX: 1800012100050000000000000000000000000000000000000000
```

Lectura del payload:

- `00`: `player = 0`
- `05000000`: `count = 5`
- luego `5` entradas `code = 0`

Interpretacion:

- la mano del jugador `0` se reordena
- en estas trazas no se revelan ids reales utiles

## Parser actual

El parser devuelve:

- `player`
- `count`
- `cards`

## Uso actual en el viewer

Bloque principal en [viewer.html:3125](/c:/Fix%20Mobile/visor/front-end/viewer.html:3125)

Comportamiento actual:

1. toma la mano actual del jugador
2. la mezcla localmente con Fisher-Yates
3. actualiza `state.hands[player]`
4. renderiza y dispara `animateHandShuffle(player)`

Observacion importante:

- el viewer actual no usa `payload.cards`
- se comporta como si `MSG_SHUFFLE_HAND` solo indicara que hubo shuffle, no el orden exacto final

## Relacion con otros mensajes

### `MSG_DRAW`

- `MSG_DRAW` cambia el tamano de la mano
- `MSG_SHUFFLE_HAND` cambia el orden interno

### `MSG_CONFIRM_CARDS`

- en algunos flujos, `MSG_CONFIRM_CARDS` puede revelar temporalmente cartas
- `MSG_SHUFFLE_HAND` vuelve a desordenar la mano despues

## Dudas abiertas

- la referencia local dice que EDOPro puede traer `code` reales tras el shuffle, pero en muchas trazas locales llegan como `0`
- cuando implementemos la version tecnica, habra que decidir si confiar en `payload.cards` cuando no vengan en cero

## Regla de implementacion recomendada

- usar `MSG_SHUFFLE_HAND` como evento de reordenamiento
- si en el futuro aparecen `code` reales fiables, permitir sincronizar el orden exacto
- mientras tanto, tratarlo como shuffle de placeholders y no como revelado

## Estado de certeza

- confirmado: `player`
- confirmado: `count`
- confirmado: el viewer hoy solo lo usa para mezclar visualmente la mano
- abierto: si `cards` debe usarse como orden autoritativo en todos los flujos
