# BÜRK · Torneo en directo — GUÍA PASO A PASO

Sistema de resultados en directo para el torneo Round Robin (5 grupos × 5 parejas,
cuadro principal + consolación). **Gratis, sin que los espectadores necesiten
cuenta de nada:** pinchan el enlace y ven el torneo.

## Qué contiene este paquete

| Archivo      | Qué es                                                                 |
|--------------|------------------------------------------------------------------------|
| `index.html` | **El visor público.** El enlace que compartes. Solo lectura, se actualiza solo cada 30 s. |
| `admin.html` | **Tu panel de organizador.** Aquí metes nombres y resultados, y publicas. |
| `datos.json` | El archivo de datos que conecta ambos. **No lo edites ni lo borres a mano.** |
| `GUIA.md`    | Esta guía.                                                              |

Cómo funciona: tú escribes en `admin.html` desde tu PC y pulsas **Guardar y
publicar**; eso actualiza `datos.json` en GitHub, y el visor público lo lee.
Los cambios tardan **menos de 1 minuto** en verse en la página pública.

---

## FASE 1 · Crear el repositorio y subir los archivos (~5 min)

1. Entra en **github.com** con tu cuenta.
2. Arriba a la derecha, pulsa **+** → **New repository**.
3. Rellena:
   - **Repository name:** `burk-torneo` (o el que quieras, sin espacios).
   - **Public** (obligatorio para que GitHub Pages sea gratis).
   - NO marques "Add a README".
4. Pulsa **Create repository**.
5. En la página del repositorio recién creado, pulsa el enlace
   **uploading an existing file** (o botón **Add file → Upload files**).
6. Arrastra los 4 archivos de este ZIP (`index.html`, `admin.html`,
   `datos.json`, `GUIA.md`).
7. Abajo, pulsa **Commit changes**.

✅ Comprobación: en la portada del repositorio ves los 4 archivos.

---

## FASE 2 · Activar GitHub Pages (~2 min)

1. En el repositorio, pestaña **Settings** (arriba).
2. Menú lateral izquierdo → **Pages**.
3. En **Build and deployment → Source**, elige **Deploy from a branch**.
4. En **Branch**, elige `main` y carpeta `/ (root)`. Pulsa **Save**.
5. Espera 1–2 minutos y recarga la página: arriba aparecerá tu dirección,
   del tipo:

   `https://TU-USUARIO.github.io/burk-torneo/`

✅ Comprobación: abre esa dirección en el navegador. Debe verse el visor
BÜRK con los grupos y "Pareja A1, A2…" de relleno. **Ese es el enlace
público** que compartirás.

Tu panel de organizador está en la misma dirección añadiendo `admin.html`:

   `https://TU-USUARIO.github.io/burk-torneo/admin.html`

> Nota: la página de admin también es visible públicamente, pero **sin tu
> token nadie puede escribir nada**. Aun así, no publiques ese enlace: es
> solo para ti.

---

## FASE 3 · Crear tu "llave" (token de GitHub) (~4 min)

El token es lo que permite a tu panel escribir en el repositorio. Se crea
una vez y se pega una vez en tu PC.

1. En GitHub, pulsa tu **foto de perfil** (arriba dcha.) → **Settings**.
2. Baja del todo en el menú izquierdo → **Developer settings**.
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
4. Rellena:
   - **Token name:** `torneo-burk`
   - **Expiration:** elige **Custom** y pon una fecha 2–3 días después
     del torneo (así caduca sola y te olvidas).
   - **Repository access:** marca **Only select repositories** y elige
     `burk-torneo`.
   - **Permissions → Repository permissions:** busca **Contents** y ponlo
     en **Read and write**. (Todo lo demás, sin tocar.)
5. Pulsa **Generate token** y **cópialo** (empieza por `github_pat_…`).
   ⚠️ Solo se muestra una vez: pégalo directamente en la Fase 4 o guárdalo
   en un lugar seguro. **No lo compartas con nadie.**

---

## FASE 4 · Configurar tu panel en el PC (~2 min)

1. En el **PC que usarás el día del torneo**, abre
   `https://TU-USUARIO.github.io/burk-torneo/admin.html`
   (guárdala en favoritos).
2. Se abrirá el recuadro **Conexión con GitHub** (si no, botón **⚙ Configuración**):
   - **Tu usuario de GitHub:** tu nombre de usuario (el de la URL).
   - **Nombre del repositorio:** `burk-torneo`.
   - **Token:** pega el `github_pat_…` de la Fase 3.
3. Pulsa **Probar conexión** → debe decir "✓ Conexión correcta".
4. Pulsa **Guardar configuración**.

La configuración queda guardada en ese navegador: no tendrás que volver a
tocarla. El estado arriba pasará a "Conexión lista".

---

## FASE 5 · Prueba general (esta semana, ~15 min)

1. En el panel, pestaña **Parejas**: escribe los nombres reales de las 25
   parejas (o unos cuantos de prueba).
2. Pestaña **Resultados**: elige el grupo A y apunta un marcador de prueba
   (p. ej. 11 – 7). Verás la clasificación recalcularse al instante.
3. Pulsa **Guardar y publicar** → debe salir "✓ Publicado".
4. Abre el **enlace público** desde tu móvil (mejor aún: pídeselo a alguien
   sin cuenta de GitHub ni de nada). En menos de 1 minuto deben verse los
   nombres y el resultado de prueba.
5. Si todo va bien, borra el marcador de prueba (déjalo vacío) y vuelve a
   **Guardar y publicar**.

✅ Si esta fase funciona, el día del torneo funcionará igual.

---

## FASE 6 · Enlace en la web de BÜRK y difusión (~10 min)

**Opción A (recomendada para este torneo): botón en la web.**
En WordPress/WooCommerce: crea una página o entrada "Torneo en directo"
y añade un bloque **Botones** con el texto "🔴 Resultados en directo"
enlazando a `https://TU-USUARIO.github.io/burk-torneo/`.

**Opción B (más integrada, para más adelante): incrustado en tu web.**
En la página de WordPress, añade un bloque **HTML personalizado** y pega:

```html
<iframe src="https://TU-USUARIO.github.io/burk-torneo/"
        style="width:100%;height:1600px;border:0;" loading="lazy"
        title="Torneo BÜRK en directo"></iframe>
```

**Difusión:** manda el enlace público al grupo de WhatsApp del torneo.
Si quieres un QR para imprimir en la mesa de organización, pídemelo y te
lo genero.

---

## FASE 7 · El día del torneo

Tu flujo desde el PC:

1. Abre `admin.html` (favoritos). El estado debe decir "Conexión lista".
2. Ve apuntando marcadores en **Resultados**. Consejo: la vista
   **POR JORNADA** te enseña los 10 partidos de cada ronda organizados por
   pista, tal y como se juegan.
3. Pulsa **Guardar y publicar** cada vez que quieras actualizar la página
   pública (p. ej. al cerrar cada jornada, o cada pocos partidos).
   El aviso ámbar "Cambios sin publicar" te recuerda si tienes cosas
   pendientes de subir.
4. Al terminar los grupos: pestaña **Clasificados** → revisa los 8+8 →
   **Generar cuadros** → **Guardar y publicar**.
5. Apunta cuartos, semis y final en **Cuadros** (los ganadores pasan solos
   de ronda) y publica. Cuando haya campeón, la página pública lo anuncia
   con un banner dorado.
6. En cualquier momento, **Copiar resumen** te da el texto con
   clasificaciones y resultados listo para pegar en WhatsApp.

**Red de seguridad:** todo lo que escribes se guarda también en tu
navegador aunque se corte internet; cuando vuelva la conexión, pulsa
Guardar y publicar y listo.

---

## Problemas comunes

- **"He publicado pero la página pública no cambia"** → espera 1–2 minutos
  y recarga. GitHub Pages tarda un poco en desplegar cada cambio.
- **"Error de permisos" al publicar** → el token está mal pegado, caducado,
  o le falta el permiso Contents · Read and write. Crea uno nuevo (Fase 3)
  y actualízalo en ⚙ Configuración.
- **"No se encuentra el repositorio"** → revisa en ⚙ que el usuario y el
  nombre del repositorio están escritos exactamente igual que en GitHub.
- **He cambiado de PC / borrado el navegador** → vuelve a hacer la Fase 4
  en el nuevo navegador (necesitarás el token; si no lo guardaste, crea otro).
- **Quiero empezar de cero** → pestaña Parejas → "Reiniciar torneo" →
  Guardar y publicar.
- **"Cargar publicado"** → trae al panel la última versión publicada. Útil
  si escribiste desde otro sitio o quieres descartar cambios locales.

---

*Sistema creado para BÜRK Pickleball. Coste de mantenimiento: 0 €.*
