# BÜRK · Torneo en directo — GUÍA v4

Sistema completo de torneo Round Robin con **formato dinámico** (de 10 a 25
parejas), resultados en directo, grupos Oro y Consolación, y
**sorteo de premios entre jugadores**. Gratis y sin que los espectadores
necesiten cuenta de nada.

## Qué contiene este paquete

| Archivo      | Qué es                                                                    |
|--------------|---------------------------------------------------------------------------|
| `index.html` | **El visor público.** El enlace que compartes. Se actualiza solo cada 30 s.|
| `admin.html` | **Tu panel de organizador.** Inscripción, sorteos, resultados y publicación.|
| `torneo.js`  | La lógica del torneo (la comparten las dos páginas). No lo edites.        |
| `datos.json` | El archivo de datos. **No lo edites ni lo borres a mano.**                 |
| `GUIA.md`    | Esta guía.                                                                 |

Tus enlaces (guárdalos en favoritos):
- **Público:** `https://vitineska-cell.github.io/burk-torneo/`
- **Tu panel:** `https://vitineska-cell.github.io/burk-torneo/admin.html`

## Integración en burksport.com sin doble scroll

La página de WordPress debe utilizar este bloque de **HTML personalizado**. La
altura inicial de 1.400 px actúa como respaldo; `embed-parent.js` la adapta al
contenido visible para que el móvil use únicamente el scroll de burksport.com.

```html
<iframe
  id="burk-torneo-frame"
  src="https://vitineska-cell.github.io/burk-torneo/embed.html"
  style="width:100%; height:1400px; border:0; display:block;"
  loading="eager"
  title="Torneo BÜRK en directo">
</iframe>
<script src="https://vitineska-cell.github.io/burk-torneo/embed-parent.js"></script>
```

El ajuste solo modifica la altura exterior del `iframe`. No cambia estilos,
datos, pestañas ni funcionamiento del torneo.

---

## FASE 1 · Actualizar el repositorio (~3 min) — ÚNICO PASO TÉCNICO

Ya tienes hecho lo difícil (repositorio, GitHub Pages, token y conexión del
panel). Solo hay que sustituir los archivos por esta versión:

1. Entra en `github.com/vitineska-cell/burk-torneo`.
2. **Add file → Upload files**.
3. Arrastra los **5 archivos** de este ZIP. GitHub sustituye automáticamente
   los que se llaman igual.
4. **Commit changes**. En 1–2 minutos la web pública y tu panel serán la
   versión nueva.

Tu token y tu configuración **siguen funcionando sin tocar nada** (el panel
usa la misma configuración guardada en tu navegador).

> La versión 4 migra automáticamente los marcadores antiguos al nuevo modelo
> de sets. Las parejas, sus identificadores y los grupos ya sorteados se
> conservan. Si se carga una versión antigua, el panel avisará para volver a
> guardar y publicar la estructura actualizada.

---

## FASE 2 · Conoce tu panel (5 min de paseo)

Cinco pestañas, en el orden natural del torneo:

- **Inscripción** — título del torneo, nº de pistas, lista de parejas (con
  los **dos jugadores** de cada una: importante para el sorteo de premios),
  botón **Sortear grupos** y el **estimador de duración** (solo lo ves tú).
- **Resultados** — vista **POR TANDAS** (rondas de partidos simultáneos con
  su pista asignada: tu vista del día del torneo) y vista por grupo (A, B,
  C…) con la clasificación en vivo.
- **Clasificados** — los 8 del Grupo Oro y los de Consolación, con el
  criterio aplicado, y el botón **Generar cuadros**.
- **Cuadros** — cuartos, semis, final y partido por el 3.º/4.º puesto
  editables por sets; los ganadores y perdedores de semifinales avanzan solos
  al partido correspondiente.
- **Sorteo** — el sorteo de premios (ver Fase 5).

Y arriba siempre: **Guardar y publicar** (sube los cambios a la página
pública), **Copiar resumen** (texto para WhatsApp), **Cargar publicado** y
**⚙ Configuración**. El punto ámbar "Cambios sin publicar" te avisa si
tienes cosas pendientes de subir.

---

## FASE 3 · Ensayo general (esta semana, ~20 min)

Prueba el flujo completo con datos inventados:

1. **Inscripción:** pon un título, añade 18 parejas de prueba (basta un
   nombre corto por jugador) y observa cómo el contador te dice el formato
   (18 → grupos de 6+6+6) y el estimador la duración.
2. **Sortear grupos** → te lleva a Resultados con las tandas montadas.
3. Apunta 3–4 resultados válidos en la vista POR TANDAS, por ejemplo 15-8 o
   26-24, y comprueba la clasificación provisional.
4. **Guardar y publicar** → abre el enlace público desde un móvil (ideal:
   de alguien sin cuenta de nada) y comprueba que se ve todo.
5. Completa el resto de resultados de prueba (puedes repetir 15-8). Cuando
   estén todos validados, ve a **Clasificados → Generar cuadros** y apunta un
   cuarto de final.
6. **Sorteo:** escribe un premio ("Televisión"), pulsa Sortear, mira la
   animación, publica y comprueba que el ganador sale en la pestaña
   Sorteos de la página pública.
7. Para dejarlo limpio: en Inscripción, elimina las parejas de prueba
   (confirmará que se borra todo) y **Guardar y publicar**.

---

## FASE 4 · Inscripción real

Según te confirmen parejas, ve añadiéndolas en Inscripción con el nombre de
sus dos jugadores. Puedes publicar cuando quieras: la página pública
mostrará "Inscripción en curso" con la lista de parejas — buen escaparate
previo. **No pulses Sortear grupos hasta el cierre de inscripción.**

Consejo: si cambias parejas después de sortear, el panel te avisará de que
hay que rehacer el sorteo (y se borran los resultados). Es la red de
seguridad para que nunca haya grupos incoherentes.

---

## FASE 5 · El día del torneo (guion)

1. **Cierre de inscripción** → pestaña Inscripción → **Sortear grupos** →
   **Guardar y publicar**. La gente ya ve su grupo y el horario por tandas
   en el móvil. (¿No te gusta cómo ha quedado el reparto? Puedes volver a
   sortear mientras no haya resultados.)
2. **Fase de grupos:** vista POR TANDAS. Cada tanda te dice qué partido va
   en qué pista. Apunta marcadores y publica cada pocos partidos.
3. **Sorteos de premios cuando toque:** pestaña Sorteo → escribe el premio
   ("Televisión", "Pala BÜRK"…) → **Sortear** → animación y ganador en
   grande, con su premio → **Guardar y publicar** para que salga en la
   página pública. Quien ya ha ganado no puede repetir; puedes hacer tantos
   sorteos como premios tengáis. Si te equivocas, cada premio tiene una ✕
   para anularlo.
4. **Fin de grupos:** cuando estén validados los 50 partidos, Clasificados →
   revisa los cruces → **Generar cuadros** → publicar. El botón permanece
   bloqueado mientras falte algún resultado.
5. **Cuadros:** apunta cuartos, semis, final y 3.º/4.º puesto; con menos de 16 parejas los
   mejores de consolación tendrán "pase directo" automático. Al decidirse
   las semifinales, sus perdedores aparecen automáticamente en el partido por
   el 3.º/4.º puesto. La página pública muestra los campeones y el podio.
6. En cualquier momento, **Copiar resumen** → WhatsApp.

**Red de seguridad:** todo lo que escribes queda guardado en tu navegador
aunque se corte internet; al volver la conexión, Guardar y publicar.

---

## Cómo funciona el formato dinámico (referencia)

- Con P parejas se forman grupos de **5, 6 o 7** — así **todas las parejas
  juegan mínimo 4 partidos**, como se anunció en la inscripción.
- Round robin dentro de cada grupo. Clasificación por victorias; empates
  dentro del grupo por enfrentamiento directo; comparación entre grupos de
  distinto tamaño por % de victorias y diferencia media de puntos.
- Con 25 parejas, el **Grupo Oro** recibe los 5 primeros y los 3 mejores
  segundos. El **Grupo Consolación** recibe los 2 segundos restantes, los 5
  terceros y el mejor cuarto.
- Con otros tamaños admitidos, los 8 primeros del orden por posiciones van a
  Oro y los 8 siguientes a Consolación; si faltan parejas se aplican pases
  directos.
- El horario se organiza en **tandas**: rondas de partidos simultáneos en
  todas las pistas, calculadas para que ninguna pareja juegue dos veces
  seguidas sin descanso y ninguna pista se quede parada sin necesidad.

Duración estimada (5 pistas · 15 min por tanda · 15 min entre fases) — la
misma tabla que tienes en el panel, donde puedes ajustar los parámetros:

| Parejas | Grupos    | Partidos | Duración estimada |
|---------|-----------|----------|-------------------|
| 15      | 5+5+5     | 45       | ~3 h 45 min       |
| 18      | 6+6+6     | 61       | ~4 h 30 min       |
| 20      | 5+5+5+5   | 56       | ~4 h 15 min       |
| 21      | 6+5+5+5   | 61       | ~4 h 30 min       |
| 23      | 6+6+6+5   | 71       | ~5 h              |
| 25      | 5×5       | 66       | ~4 h 45 min       |

Ojo al detalle: 18–19 o 23–24 parejas dan MÁS partidos que 20 o 25, porque
los grupos de 6 y 7 crecen rápido en cruces. No incluye pausas para comida
o entrega de premios.

## Reglas de puntuación

- **Fase de grupos:** 1 set a 15.
- **Cuartos de final de Oro y Consolación:** 1 set a 15.
- **Consolación completa**, incluido su 3.º/4.º puesto: 1 set a 15.
- **Semifinales, final y 3.º/4.º puesto de Oro:** mejor de 3 sets; los dos
  primeros a 15 y el tercero, si hace falta, a 11.
- Todos los sets se ganan por 2 puntos y no tienen límite. Son válidos 15-13,
  16-14 o 26-24. Se rechazan 15-14, 14-12 y 26-23.
- El tercer set solo se habilita cuando los dos primeros sets quedan 1-1.

---

## Problemas comunes

- **"He publicado pero la página pública no cambia"** → espera 1–2 minutos
  y recarga (GitHub Pages tarda un poco en desplegar).
- **"Error de permisos" al publicar** → token mal pegado, caducado o sin el
  permiso Contents · Read and write. Crea uno nuevo (perfil → Settings →
  Developer settings → Fine-grained tokens) y actualízalo en ⚙.
- **"Los datos publicados son de la versión antigua"** al Cargar publicado
  → carga los datos, comprueba el aviso de migración y pulsa Guardar y
  publicar. No se borran parejas ni grupos.
- **"Marcador no válido"** → comprueba el objetivo del set y que exista una
  diferencia de 2. Si se supera 15 u 11, el resultado debe acabar exactamente
  con 2 puntos de diferencia.
- **He cambiado de PC / borrado el navegador** → vuelve a poner usuario,
  repositorio y token en ⚙ Configuración.
- **Quiero empezar de cero** → elimina las parejas en Inscripción (o carga
  publicado si lo publicado estaba limpio) y Guardar y publicar.

---

*Sistema creado para BÜRK Pickleball. Coste de mantenimiento: 0 €.*
