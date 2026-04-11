# MSG_BATTLE

## Identidad

- Nombre: `MSG_BATTLE`
- Codigo: `0x6F` (`111`)
- Direccion: `STOC_GAME_MSG`
- Rol: describir los datos de una confrontacion de batalla

## Estado actual en el proyecto

Actualmente no existe parser dedicado ni consumo especifico para `MSG_BATTLE` en:

- [messageHandlers.js](/c:/Fix%20Mobile/visor/messageshandler/messageHandlers.js)
- [viewer.html](/c:/Fix%20Mobile/visor/front-end/viewer.html)

Hoy cae en `UNHANDLED`.

## Evidencia observada

Las trazas encontradas sugieren un payload fijo de `36 bytes`.

La estructura parece dividirse en dos mitades:

1. bloque del atacante con datos de batalla
2. bloque del defensor u objetivo con datos de batalla

## Ejemplos reales

Traza real en [message-trace-2e6609f0-ace1-4c05-96ed-a6635c89d425.txt:709](/c:/Fix%20Mobile/visor/logs/message-trace-2e6609f0-ace1-4c05-96ed-a6635c89d425.txt:709)

```text
SEG_HEX: 2800016f01040000000001000000b0040000200300000000040200000004000000b0040000d007000000
```

Otra traza real en [message-trace-f20dfe41-e67e-48e5-be4f-a08bd484430e.txt:760](/c:/Fix%20Mobile/visor/logs/message-trace-f20dfe41-e67e-48e5-be4f-a08bd484430e.txt:760)

```text
SEG_HEX: 2800016f0004020000000100000020030000000000000000000000000000000000000000000000000000
```

## Interpretacion probable

En la primera traza se distinguen dos zonas:

- un bloque inicial asociado al atacante
- un bloque final asociado al objetivo

Ademas aparecen enteros que encajan bien con valores de batalla:

- `b0040000` = `1200`
- `20030000` = `800`
- `d0070000` = `2000`

Inferencia fuerte:

- el mensaje incluye participantes y valores como `ATK` o `DEF`
- cuando el objetivo no existe o no se puede evaluar, la mitad final puede venir en cero

## Relacion con otros mensajes

### `MSG_ATTACK`

- `MSG_ATTACK` declara el ataque
- `MSG_BATTLE` parece aportar los numeros usados para la confrontacion

### `MSG_DAMAGE`

- despues de resolver la batalla, la perdida de LP puede llegar por `MSG_DAMAGE`

## Regla de implementacion recomendada

- implementar parser conservador:
  - `rawPayloadHex`
  - `attacker`
  - `target`
  - `attackerValueA`
  - `attackerValueB`
  - `targetValueA`
  - `targetValueB`
- no poner nombres finales como `atk` o `def` hasta validar cada offset con mas evidencia

## Estado de certeza

- confirmado: hoy no esta implementado
- confirmado por trazas: payload de longitud fija
- inferencia fuerte: combina participantes de batalla con estadisticas numericas
- abierto: mapa exacto de offsets y semantica definitiva de cada valor
