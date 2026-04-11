# Mensajes Faltantes por Documentar (Opcionales)

Tras repasar la totalidad del código y los constantes (`ocgapi_constants.h`) de EDOPRO, resulta que de unos **~100 opcodes totales**, hemos documentado alrededor de **40**. Los que faltan se pueden agrupar en varias categorías. 

Para un **Visor/Espectador**, muchos de estos no son importantes (como los de interactuar con menús de UI), pero otros relativos a Tokens, Contadores o Dados sí podrían ser visualmente útiles.

## 1. Eventos Relevantes para el Visor / Espectador
Podrían requerir animación o actualizar el UI público:
- `MSG_FLIPSUMMONING (64)` y `MSG_FLIPSUMMONED (65)`: Invocaciones por Volteo (similar a Normal/Special Summon).
- `MSG_ADD_COUNTER (101)` y `MSG_REMOVE_COUNTER (102)`: Manipulación de contadores (Spell Counters, etc) en cartas vivas.
- `MSG_TOSS_COIN (130)` y `MSG_TOSS_DICE (131)`: Lanzado de monedas y dados, con sus resultados.
- `MSG_ROCK_PAPER_SCISSORS (132)`: Piedra Papel o Tijera (generalmente al inicio del duelo para elegir turno).
- `MSG_CHAIN_NEGATED (75)`: Cuando no sólo se desactiva el eslabón, sino que se niega directamente la carta y se destruye a veces.
- `MSG_DAMAGE_STEP_START (113)` y `MSG_DAMAGE_STEP_END (114)`: Banderas útiles para UI indicando sub-fases de combate.
- `MSG_REMOVE_CARDS (190)`: Borrado completo masivo de cartas (se envían fuera de juego).
- `MSG_SWAP (55)`, `MSG_TAG_SWAP (161)`: Intercambio de control o de compañero de Tag duel.

## 2. Eventos Exclusivos de Interfaz / Control de Jugador (Poco útiles para Visores)
Están pensados solo para el jugador que tiene que "jugar/elegir", por lo que en el Visor usualmente no hacen animaciones, se omiten, y simplemente después llega un MSG de la acción (p.ej. un `MSG_MOVE` resultante).
- `MSG_WAITING (3)`: El servidor te indica que estás esperando que el oponente actúe.
- `MSG_SELECT_BATTLECMD (10)`, `MSG_SELECT_IDLECMD (11)`: Muestra UI para elegir qué hacer en tu turno o en tu Battle Phase.
- `MSG_SELECT_EFFECTYN (12)`, `MSG_SELECT_YESNO (13)`, `MSG_SELECT_OPTION (14)`: Ventanas de Diálogo emergentes ("¿Quieres activar...?").
- `MSG_SELECT_CARD (15)`, `MSG_SELECT_CHAIN (16)`, `MSG_SELECT_PLACE (18)`, `MSG_SELECT_POSITION (19)`: Pide al jugador elegir una carta en pantalla, un eslabón o zona de campo.
- `MSG_SELECT_TRIBUTE (20)`, `MSG_SELECT_SUM (23)`: Sacrificios.

## 3. Anuncios (Declares) y Otros
- `MSG_ANNOUNCE_RACE (140)`, `MSG_ANNOUNCE_ATTRIB (141)`, `MSG_ANNOUNCE_CARD (142)`, `MSG_ANNOUNCE_NUMBER (143)`: "Declara el nombre de una carta..."
- `MSG_RETRY (1)`, `MSG_UNDO (192)`: Usuales en simuladores offline/singles para deshacer acciones locales.

---
**Conclusión de Revisión:** Las estructuras documentadas de daños, robos, movimientos, summmons y cadenas están completas y son robustas. Pero si en el futuro notas que faltan animaciones en Monedas o Contadores, es porque pertenecen a los opcodes de la Sección 1.
