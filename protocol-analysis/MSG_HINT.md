# MSG_HINT (0x2)

## Description
Este mensaje se utiliza para enviar avisos, preguntas (prompts) y resaltos a la interfaz gráfica del jugador. Puede desde lanzar un mensaje indicando que el oponente activó un efecto, hasta pedir una confirmación o resaltar una carta temporalmente.

## Payload / Buffer Structure
- `uint8_t` type (determina el comportamiento del Hint)
- `uint8_t` player (el jugador al que va dirigido, 0 o 1)
- `uint64_t` data (o `uint32_t` en compat_mode). Representa un código de error, código de carta, u otra ID dependiendo del `type`.

## Hint Types (según `ocgapi_constants.h`)
- `HINT_EVENT (1)`: Define el `event_string` actual.
- `HINT_MESSAGE (2)`: Lanza un popup de mensaje al jugador.
- `HINT_SELECTMSG (3)`: Define el `select_hint` actual para una pantalla de selección posterior.
- `HINT_OPSELECTED (4)`: Imprime en el log qué eligió el oponente.
- `HINT_EFFECT (5)`: Avisa que un efecto se activó indicando el código de la misma.
- `HINT_RACE (6)`, `HINT_ATTRIB (7)`, `HINT_CODE (8)`, `HINT_NUMBER (9)`: Imprime en log de chat eventos de razas, atributos, códigos devueltos numéricos.
- `HINT_CARD (10)`: Se usa para resaltar una carta activada u originadora en el cliente, mostrando su imagen y reproduciendo el sonido de Activación.
- `HINT_ZONE (11)`: Imprime "Player X selected Y zone".
