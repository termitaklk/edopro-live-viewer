# MSG_ATTACK

## Identidad

- Nombre: `MSG_ATTACK`
- Codigo: `0x6E` (`110`)
- Direccion: `STOC_GAME_MSG`
- Rol: anunciar una declaracion de ataque

## Estado actual en el proyecto

Actualmente no existe parser dedicado ni consumo especifico para `MSG_ATTACK` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Evidencia observada

Las trazas encontradas son consistentes en longitud y sugieren un payload fijo de `18 bytes`.

## Ejemplos reales

Traza real en [message-trace-2e6609f0-ace1-4c05-96ed-a6635c89d425.txt:571](/c:/Fix%20Mobile/visor/logs/message-trace-2e6609f0-ace1-4c05-96ed-a6635c89d425.txt:571)

```text
SEG_HEX: 1600016e0104000000000100000000040200000008000000
```

Otra traza real en [message-trace-f20dfe41-e67e-48e5-be4f-a08bd484430e.txt:628](/c:/Fix%20Mobile/visor/logs/message-trace-f20dfe41-e67e-48e5-be4f-a08bd484430e.txt:628)

```text
SEG_HEX: 1600016e0004020000000100000000000000000000000000
```

## Interpretacion probable

La forma del payload sugiere dos bloques relacionados:

1. informacion del atacante
2. informacion del objetivo

En la primera traza se ve un patron claro:

- un primer bloque no nulo
- un segundo bloque que tambien parece apuntar a una carta en campo

En la segunda:

- el primer bloque sigue apuntando a un atacante
- el segundo bloque queda completamente en cero, lo que encaja con un ataque directo

Inferencia fuerte:

- `MSG_ATTACK` codifica al menos origen del ataque y objetivo
- el objetivo puede venir vacio o en cero si el ataque es directo

## Relacion con otros mensajes

### `MSG_BATTLE`

- `MSG_ATTACK` marca la declaracion
- `MSG_BATTLE` parece aportar los detalles de la confrontacion o del calculo posterior

### `MSG_NEW_PHASE`

- normalmente deberia aparecer dentro de `BATTLE PHASE`

## Regla de implementacion recomendada

- implementar parser conservador:
  - `rawPayloadHex`
  - `attacker` si se logra normalizar con seguridad
  - `target` si se logra normalizar con seguridad
- no derivar animaciones finales de ataque hasta fijar la estructura exacta

## Estado de certeza

- confirmado: hoy no esta implementado
- confirmado por trazas: payload estable de longitud fija
- inferencia fuerte: describe atacante y objetivo
- abierto: layout exacto de cada bloque y significado de los enteros intermedios
