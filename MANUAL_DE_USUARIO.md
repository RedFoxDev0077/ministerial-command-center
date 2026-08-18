# Manual de Usuario
## Sistema de Gestión Documental Ministerial
### Ministerio de Transporte, Tecnología, Correos y Telecomunicaciones
### República de Guinea Ecuatorial

**Versión**: 1.0
**Fecha de Publicación**: 5 de febrero de 2026
**Estado del Proyecto**: 65% Completado (Fases 1-5 Implementadas)

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Panel Principal](#panel-principal)
4. [Gestión de Documentos](#gestión-de-documentos)
5. [Flujo de Trabajo de Entrada](#flujo-de-trabajo-de-entrada)
6. [Flujo de Trabajo de Salida](#flujo-de-trabajo-de-salida)
7. [Expedientes](#expedientes)
8. [Plazos y Recordatorios](#plazos-y-recordatorios)
9. [Archivo de Documentos](#archivo-de-documentos)
10. [Seguridad y Auditoría](#seguridad-y-auditoría)
11. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

### ¿Qué es el Sistema de Gestión Documental Ministerial?

El Sistema de Gestión Documental Ministerial es una plataforma digital diseñada para gestionar el ciclo de vida completo de los documentos oficiales del Ministerio de Transporte, Tecnología, Correos y Telecomunicaciones de Guinea Ecuatorial.

### Características Principales

- ✅ **Gestión de Documentos de Entrada y Salida**
- ✅ **Flujo de Trabajo Automatizado** (11 etapas entrada, 6 etapas salida)
- ✅ **Protocolo de Firma Ministerial** (8 etapas)
- ✅ **Gestión de Expedientes** (agrupación de documentos relacionados)
- ✅ **Control de Plazos y Recordatorios Automáticos**
- ✅ **Sistema de Archivo Digital**
- ✅ **Auditoría Completa** de todas las acciones
- ✅ **OCR y Análisis con IA** (extracción automática de datos)
- ✅ **Generación de Documentos con IA**
- ✅ **Conversión de Formatos** (Word ↔ PDF)

### Roles de Usuario

| Rol | Permisos | Descripción |
|-----|----------|-------------|
| **ADMIN** | Acceso completo | Administradores del sistema |
| **GABINETE** | Firma de documentos (solo Ministro) | Personal del gabinete ministerial |
| **REVISOR** | Revisión y edición | Revisores de documentos |
| **LECTOR** | Solo lectura | Consulta de documentos |

---

## Acceso al Sistema

### Inicio de Sesión

1. Abra su navegador web (Chrome, Firefox, Edge)
2. Navegue a la URL del sistema: `https://your-domain.gq`
3. Ingrese su **nombre de usuario**
4. Ingrese su **contraseña**
5. Haga clic en **"Iniciar Sesión"**

![Pantalla de Login]

### Recuperación de Contraseña

Si olvidó su contraseña:

1. Haga clic en **"¿Olvidó su contraseña?"**
2. Ingrese su correo electrónico
3. Recibirá un enlace de restablecimiento
4. Siga las instrucciones del correo

### Horario de Operación

**Horario Laboral**: 8:00 AM - 6:00 PM
**Días**: Lunes a Viernes
**Zona Horaria**: África/Malabo

> ⚠️ **Nota**: Los recordatorios automáticos solo se envían durante el horario laboral.

---

## Panel Principal

### Vista General del Dashboard

El panel principal muestra:

1. **Bandeja de Entrada**: Documentos asignados a usted
2. **Bandeja de Salida**: Documentos que ha creado
3. **Estadísticas**: Resumen de documentos por estado
4. **Plazos Próximos**: Documentos con fechas límite cercanas
5. **Notificaciones**: Alertas y avisos importantes

### Navegación

**Menú Lateral**:
- 📥 **Bandeja de Entrada**: Documentos recibidos
- 📤 **Bandeja de Salida**: Documentos creados
- ➕ **Nueva Entrada**: Registrar nuevo documento
- 📁 **Expedientes**: Gestión de casos
- 📂 **Archivo**: Documentos archivados
- ⏰ **Plazos**: Control de fechas límite
- 🔒 **Auditoría**: Registro de acciones
- 🔐 **Seguridad**: Gestión de usuarios (solo ADMIN)

---

## Gestión de Documentos

### Crear Nuevo Documento

#### Documento de Entrada

1. Haga clic en **"Nueva Entrada"** en el menú lateral
2. Complete el formulario:
   - **Título**: Asunto del documento
   - **Número de Documento**: Ej. 025-MT-038-051
   - **Origen**: Remitente del documento
   - **Tipo**: Oficio, Decreto, Carta, etc.
   - **Prioridad**: Alta, Media, Baja
   - **Fecha de Recepción**: Fecha en que se recibió
   - **Archivos**: Adjunte el documento (PDF, DOCX, etc.)

3. Haga clic en **"Crear Documento"**

#### Documento de Salida

1. Haga clic en **"Bandeja de Salida"**
2. Haga clic en **"Nuevo Documento"**
3. Complete el formulario:
   - **Título**: Asunto del documento
   - **Destinatario**: A quién va dirigido
   - **Tipo**: Oficio, Decreto, Resolución, etc.
   - **Contenido**: Redacte el contenido o use el asistente de IA
   - **Archivos**: Adjunte documentos si es necesario

4. Haga clic en **"Crear Documento"**

### Editar Documento

1. Localice el documento en la bandeja correspondiente
2. Haga clic en el icono de **menú (⋮)**
3. Seleccione **"Editar"**
4. Modifique los campos necesarios
5. Haga clic en **"Guardar Cambios"**

> ⚠️ **Nota**: Solo puede editar documentos en etapas iniciales. Los documentos firmados no se pueden editar.

### Asignar Documento

1. Localice el documento
2. Haga clic en el icono de **menú (⋮)**
3. Seleccione **"Asignar"**
4. Seleccione el **departamento** o **usuario responsable**
5. Agregue notas si es necesario
6. Haga clic en **"Asignar Documento"**

### Adjuntar Archivos

**Formatos Permitidos**:
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- Imágenes (.jpg, .png)

**Tamaño Máximo**: 50 MB por archivo

**Proceso**:
1. Haga clic en **"Adjuntar Archivo"**
2. Seleccione el archivo de su computadora
3. Espere a que se cargue (verá una barra de progreso)
4. El archivo aparecerá en la lista de adjuntos

### Reemplazar Archivo

Si necesita actualizar un archivo:

1. Localice el archivo en el documento
2. Haga clic en **"Reemplazar"**
3. Seleccione el nuevo archivo
4. Confirme el reemplazo
5. El sistema guarda el historial de versiones

### Convertir Formato

**Word → PDF**:
1. Localice el archivo Word
2. Haga clic en **"Convertir a PDF"**
3. El sistema generará automáticamente el PDF
4. Descargue el archivo convertido

**PDF → Word**:
1. Localice el archivo PDF
2. Haga clic en **"Convertir a Word"**
3. El sistema generará el DOCX
4. Descargue el archivo convertido

---

## Flujo de Trabajo de Entrada

### Etapas del Flujo de Entrada (11 Etapas)

```
1. PENDIENTE → 2. ENTRADA MANUAL → 3. RECIBIDO →
4. REGISTRO → 5. DISTRIBUCIÓN → 6. ANÁLISIS →
7. BORRADOR DE RESPUESTA → 8. REVISIÓN →
9. PROTOCOLO DE FIRMA → 10. CONFIRMACIÓN → 11. ARCHIVADO
```

### Etapa 1: Pendiente

**Estado Inicial** del documento recién creado.

**Acciones Disponibles**:
- Editar información básica
- Asignar responsable
- Adjuntar archivos

### Etapa 2: Entrada Manual - Sello de Entrada

**Responsable**: Personal de secretaría

**Proceso**:
1. Localice el documento en estado PENDIENTE
2. Haga clic en **menú (⋮)** → **"Sello de entrada"**
3. Complete el formulario:
   - **Fecha de Entrada**: Fecha en que se recibió físicamente
   - **Hora de Entrada**: Hora de recepción (formato 24h)
   - **Imagen del Sello**: Adjunte foto del sello físico (opcional)
   - **Notas**: Observaciones adicionales

4. Haga clic en **"Aplicar Sello"**

**Resultado**: El documento avanza a la etapa RECIBIDO.

> 📝 **Importante**: Esta etapa registra oficialmente la entrada del documento al ministerio.

### Etapa 3-5: Recibido, Registro, Distribución

Estas etapas son procesadas administrativamente:

- **RECIBIDO**: Documento confirmado en el sistema
- **REGISTRO**: Número oficial asignado
- **DISTRIBUCIÓN**: Asignado al departamento responsable

**Para avanzar**:
1. Haga clic en **menú (⋮)** → **"Cambiar Estado"**
2. Seleccione la siguiente etapa
3. Agregue notas si es necesario
4. Confirme el cambio

### Etapa 6-8: Análisis, Borrador, Revisión

**Etapa de ANÁLISIS**:
- Revise el contenido del documento
- Identifique las acciones requeridas
- Use el **Panel de IA** para análisis automático

**Etapa de BORRADOR DE RESPUESTA**:
- Redacte la respuesta al documento
- Use el **Generador de IA** para ayuda en la redacción
- Adjunte el borrador de respuesta

**Etapa de REVISIÓN**:
- El revisor verifica el contenido
- Realiza correcciones necesarias
- Aprueba o solicita cambios

### Etapa 9: Protocolo de Firma (8 Sub-etapas)

**⚠️ IMPORTANTE: Solo el Ministro puede firmar documentos**

El protocolo de firma consta de 8 etapas:

#### Sub-Etapa 1: Preparación

1. Localice el documento en etapa REVISIÓN
2. Haga clic en **menú (⋮)** → **"Protocolo de Firma"**
3. Verifique que todos los campos están completos

#### Sub-Etapa 2: Firma del Ministro

> 🔐 **Restricción de Seguridad**: Solo usuarios con rol GABINETE y autorización ministerial pueden firmar.

1. En el diálogo de Protocolo de Firma, vaya a la pestaña **"1. Firma"**
2. Complete:
   - **Tipo de Firma**: Digital, Manual, o Ambas
   - **Fecha de Firma**: Fecha en que se firma
   - **Imagen de Firma**: Adjunte la imagen de la firma (opcional)
   - **Notas**: Observaciones del Ministro

3. Haga clic en **"Firmar Documento"**

**Si no es el Ministro**: Verá un mensaje de error "Solo el Ministro puede firmar documentos".

#### Sub-Etapa 3-7: Proceso de Sellado

1. Vaya a la pestaña **"2. Sello"**
2. Complete:
   - **Fecha de Sello**: Fecha de aplicación
   - **Aplicado por**: Nombre del funcionario
   - **Imagen de Sello**: Foto del sello oficial (opcional)

3. Haga clic en **"Aplicar Sello"**

> 📝 **Nota**: Para documentos de salida, el sello es obligatorio. Para entrada, es opcional.

#### Sub-Etapa 8: Finalizar Protocolo

1. Vaya a la pestaña **"3. Finalizar"**
2. Revise el resumen del protocolo:
   - ✅ Documento firmado
   - ✅ Sello aplicado (si requerido)
   - ✅ Todos los campos completos

3. Haga clic en **"Completar Protocolo"**

**Resultado**:
- Documentos de ENTRADA → Avanzan a CONFIRMACIÓN
- Documentos de SALIDA → Avanzan a IMPRESO Y ENVIADO

### Etapa 10: Confirmación (Solo Entrada)

**Registrar Confirmación de Recepción**:

1. Localice el documento firmado
2. Haga clic en **menú (⋮)** → **"Confirmación"**
3. Complete el formulario:
   - **Tipo de Confirmación**:
     - **MANUAL**: Confirmación verbal o telefónica
     - **STAMP**: Sello de recibido
     - **DIGITAL**: Confirmación electrónica
   - **Fecha de Confirmación**
   - **Confirmado por**: Nombre del receptor
   - **PDF de Confirmación**: Adjunte documento escaneado (opcional)
   - **Notas**: Observaciones adicionales

4. Haga clic en **"Registrar Confirmación"**

**Notificaciones**: El sistema enviará notificaciones automáticas a:
- Creador del documento
- Responsable asignado
- Departamento involucrado

### Etapa 11: Archivado

**Estado Final** del documento.

Para archivar un documento:
1. Haga clic en **menú (⋮)** → **"Archivar"**
2. Confirme la acción
3. El documento se moverá a la sección **Archivo**

> 📁 Los documentos archivados son de solo lectura y se conservan permanentemente.

---

## Flujo de Trabajo de Salida

### Etapas del Flujo de Salida (6 Etapas)

```
1. PENDIENTE → 2. BORRADOR → 3. REVISIÓN →
4. PROTOCOLO DE FIRMA → 5. IMPRESO Y ENVIADO → 6. ARCHIVADO
```

### Etapa 1: Pendiente

Documento recién creado, en proceso de redacción inicial.

### Etapa 2: Borrador

**Redacción del Documento**:

1. Abra el documento
2. Haga clic en **"Editar Contenido"**
3. Redacte el contenido o use el **Asistente de IA**:
   - Haga clic en **"Generar con IA"**
   - Ingrese las instrucciones (ej. "Oficio de respuesta a solicitud de permiso")
   - El sistema generará un borrador automáticamente
   - Revise y edite según sea necesario

4. Adjunte documentos de soporte
5. Guarde los cambios

### Etapa 3: Revisión

El documento pasa a revisión por el personal autorizado.

**Como Revisor**:
1. Abra el documento
2. Revise el contenido cuidadosamente
3. Si necesita cambios:
   - Haga clic en **"Solicitar Cambios"**
   - Agregue comentarios específicos
   - El documento regresa a BORRADOR

4. Si está aprobado:
   - Haga clic en **"Aprobar para Firma"**
   - El documento avanza a PROTOCOLO DE FIRMA

### Etapa 4: Protocolo de Firma

Mismo proceso que los documentos de entrada (ver sección anterior).

**Diferencia Importante**:
- Para documentos de SALIDA, el **sello es obligatorio**
- No se puede completar el protocolo sin aplicar el sello

### Etapa 5: Impreso y Enviado

**Registrar Envío**:

1. Una vez impreso y enviado el documento físico
2. Haga clic en **menú (⋮)** → **"Registrar Envío"**
3. Complete:
   - **Fecha de Envío**
   - **Método**: Correo, Mensajero, Email, etc.
   - **Número de Seguimiento** (si aplica)
   - **Enviado por**: Nombre del funcionario

4. Haga clic en **"Confirmar Envío"**

### Etapa 6: Archivado

Estado final (mismo proceso que documentos de entrada).

---

## Expedientes

### ¿Qué es un Expediente?

Un **expediente** es una agrupación de documentos relacionados entre sí que forman un caso o proyecto específico.

**Ejemplo**: Expediente de "Renovación de Licencia de Transporte XYZ" puede contener:
- Solicitud inicial (entrada)
- Informes de análisis (internos)
- Oficio de respuesta (salida)
- Documentos de soporte

### Crear Expediente

1. Haga clic en **"Expedientes"** en el menú lateral
2. Haga clic en **"Nuevo Expediente"**
3. Complete el formulario:
   - **Título**: Nombre descriptivo del expediente
   - **Número de Expediente**: Código único (auto-generado o manual)
   - **Descripción**: Resumen del caso
   - **Departamento Responsable**
   - **Estado**: Abierto, En Proceso, Cerrado
   - **Fecha de Inicio**

4. Haga clic en **"Crear Expediente"**

### Asignar Documentos a Expediente

**Método 1: Desde el Documento**
1. Abra el documento
2. Haga clic en **menú (⋮)** → **"Asignar a Expediente"**
3. Seleccione el expediente de la lista
4. Haga clic en **"Asignar"**

**Método 2: Desde el Expediente**
1. Abra el expediente
2. Haga clic en **"Agregar Documento"**
3. Busque y seleccione el documento
4. Haga clic en **"Agregar"**

### Ver Documentos de un Expediente

1. Abra el expediente
2. En la pestaña **"Documentos"** verá:
   - Lista de todos los documentos asociados
   - Estado de cada documento
   - Fechas importantes
   - Acceso rápido a cada documento

### Cerrar Expediente

Cuando el caso está completo:

1. Abra el expediente
2. Haga clic en **"Cerrar Expediente"**
3. Agregue notas de cierre
4. Confirme la acción

> 📁 Los expedientes cerrados se archivan pero permanecen consultables.

---

## Plazos y Recordatorios

### Establecer Plazo de Respuesta

1. Abra el documento
2. Haga clic en **"Establecer Plazo"**
3. Complete:
   - **Fecha Límite**: Fecha en que se debe responder
   - **Tipo de Plazo**:
     - **BUSINESS_HOURS**: Se calculan solo horas laborales
     - **CALENDAR_DAYS**: Días de calendario
   - **Horas de Trabajo**: Si es BUSINESS_HOURS, ingrese las horas
   - **Notas**: Observaciones sobre el plazo

4. Haga clic en **"Guardar Plazo"**

### Cálculo de Plazos en Horas Laborales

El sistema calcula automáticamente plazos considerando:

- **Horario Laboral**: 8:00 AM - 6:00 PM (10 horas/día)
- **Días Laborales**: Lunes a Viernes
- **Días Festivos**: Se excluyen automáticamente
- **Zona Horaria**: África/Malabo

**Ejemplo**:
- Si establece un plazo de **20 horas laborales** el **lunes a las 3:00 PM**:
  - Lunes 3:00 PM → 6:00 PM = 3 horas (quedan 17)
  - Martes 8:00 AM → 6:00 PM = 10 horas (quedan 7)
  - Miércoles 8:00 AM → 3:00 PM = 7 horas
  - **Fecha límite**: Miércoles a las 3:00 PM

### Recordatorios Automáticos

**Sistema de Recordatorios**:
- Se envía **1 recordatorio** por documento
- **24 horas después** de que vence el plazo
- **Solo durante horario laboral** (8 AM - 6 PM, Lunes-Viernes)
- Si el recordatorio cae en fin de semana, se envía el lunes siguiente

**Contenido del Recordatorio**:
- Número de documento
- Título del documento
- Fecha límite vencida
- Enlace directo al documento

**Canales**:
- ✉️ **Email**: Correo electrónico al responsable
- 🔔 **Notificación en Sistema**: Alerta en el panel

### Ver Plazos Próximos

1. Haga clic en **"Plazos"** en el menú lateral
2. Verá una lista de documentos con plazos:
   - 🔴 **Vencidos**: En rojo
   - 🟡 **Próximos a vencer** (< 3 días): En amarillo
   - 🟢 **Vigentes**: En verde

3. Haga clic en un documento para abrirlo

### Extensión de Plazo

Si necesita extender un plazo:

1. Abra el documento
2. Haga clic en **"Modificar Plazo"**
3. Ingrese la nueva fecha límite
4. Agregue justificación
5. Haga clic en **"Actualizar Plazo"**

> 📝 **Nota**: Las extensiones de plazo quedan registradas en la auditoría.

---

## Archivo de Documentos

### Acceder al Archivo

1. Haga clic en **"Archivo"** en el menú lateral
2. Verá todos los documentos archivados

### Buscar en el Archivo

**Filtros Disponibles**:
- **Rango de Fechas**: Desde - Hasta
- **Tipo de Documento**: Oficio, Decreto, Carta, etc.
- **Dirección**: Entrada / Salida
- **Departamento**: Departamento responsable
- **Número de Documento**: Búsqueda por número

**Búsqueda por Texto**:
1. Ingrese palabras clave en el campo de búsqueda
2. El sistema buscará en:
   - Títulos
   - Contenido (si fue procesado con OCR)
   - Notas y comentarios

### Visualizar Documento Archivado

1. Localice el documento en el archivo
2. Haga clic para abrir
3. Verá toda la información en **modo de solo lectura**
4. Puede descargar los archivos adjuntos

### Restaurar Documento

Si necesita reabrir un documento archivado:

1. Abra el documento archivado
2. Haga clic en **"Restaurar"** (solo ADMIN)
3. Seleccione la etapa a la que desea regresar
4. Confirme la acción

> ⚠️ **Precaución**: Esta acción requiere permisos de ADMIN y queda registrada en auditoría.

---

## Seguridad y Auditoría

### Panel de Auditoría

El sistema registra **todas las acciones** realizadas.

**Acceder a la Auditoría**:
1. Haga clic en **"Auditoría"** en el menú lateral (requiere permisos)
2. Verá el registro completo de acciones

**Información Registrada**:
- 👤 **Usuario**: Quién realizó la acción
- 📅 **Fecha y Hora**: Cuándo se realizó
- 🔧 **Acción**: Qué se hizo (crear, editar, firmar, etc.)
- 📄 **Documento**: Sobre qué documento
- 📝 **Detalles**: Información adicional

**Filtrar Auditoría**:
- Por usuario
- Por tipo de acción
- Por rango de fechas
- Por documento específico

### Seguridad de Documentos

**Niveles de Acceso**:
1. **Creador**: Puede editar (en etapas iniciales)
2. **Responsable Asignado**: Puede gestionar el documento
3. **Departamento**: Miembros pueden ver y colaborar
4. **Otros**: Solo lectura (si tienen permisos)

**Acciones Sensibles Registradas**:
- ✍️ Firma de documentos
- 🔒 Cambios de permisos
- 📥 Descargas de archivos
- 🗑️ Eliminaciones (no permitido, solo archivo)
- ♻️ Restauraciones de archivo

### Gestión de Usuarios (Solo ADMIN)

1. Haga clic en **"Seguridad"** en el menú lateral
2. Haga clic en **"Usuarios"**

**Crear Usuario**:
1. Haga clic en **"Nuevo Usuario"**
2. Complete:
   - Nombre completo
   - Email
   - Rol (ADMIN, GABINETE, REVISOR, LECTOR)
   - Departamento
   - Contraseña inicial

3. Haga clic en **"Crear Usuario"**

**Modificar Permisos**:
1. Localice el usuario
2. Haga clic en **"Editar"**
3. Modifique rol o departamento
4. Guarde cambios

**Desactivar Usuario**:
1. Localice el usuario
2. Haga clic en **"Desactivar"**
3. Confirme la acción

> 🔐 Los usuarios desactivados no pueden iniciar sesión pero sus acciones históricas se conservan.

---

## Preguntas Frecuentes

### Generales

**P: ¿Puedo acceder al sistema desde mi teléfono?**
R: Sí, el sistema es responsive y funciona en dispositivos móviles. Sin embargo, algunas funciones avanzadas funcionan mejor en computadora.

**P: ¿Cómo cambio mi contraseña?**
R: Haga clic en su nombre de usuario (esquina superior derecha) → "Mi Perfil" → "Cambiar Contraseña".

**P: ¿El sistema funciona sin internet?**
R: No, el sistema requiere conexión a internet para funcionar.

### Documentos

**P: ¿Puedo eliminar un documento?**
R: No se pueden eliminar documentos por trazabilidad. Solo se pueden archivar.

**P: ¿Qué hago si adjunté un archivo incorrecto?**
R: Use la función "Reemplazar Archivo" para actualizar el documento. El sistema mantiene un historial de versiones.

**P: ¿Cuál es el tamaño máximo de archivo?**
R: 50 MB por archivo. Para archivos más grandes, contacte al administrador.

**P: ¿Qué formatos de archivo se aceptan?**
R: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), e imágenes (.jpg, .png).

### Flujo de Trabajo

**P: ¿Puedo saltarme una etapa del flujo?**
R: No, el flujo de trabajo debe seguirse secuencialmente para mantener la trazabilidad.

**P: Cometí un error al firmar un documento, ¿puedo deshacerlo?**
R: No. La firma es una acción final. Contacte al administrador si hay un error crítico.

**P: ¿Por qué no puedo firmar un documento?**
R: Solo el Ministro puede firmar documentos. Si usted es el Ministro y no puede firmar, verifique sus permisos con el administrador.

### Plazos

**P: ¿Cuántos recordatorios recibiré?**
R: Solo 1 recordatorio, enviado 24 horas después del vencimiento del plazo.

**P: ¿Puedo desactivar los recordatorios?**
R: No, los recordatorios son parte del sistema de gestión. Sin embargo, solo se envía uno por documento.

**P: ¿Los plazos incluyen fines de semana?**
R: Si seleccionó "BUSINESS_HOURS", los fines de semana y festivos se excluyen automáticamente.

### IA y OCR

**P: ¿Qué hace la función de OCR?**
R: OCR (Reconocimiento Óptico de Caracteres) extrae texto automáticamente de imágenes y PDFs escaneados.

**P: ¿Es precisa la generación de IA?**
R: El asistente de IA es una herramienta de apoyo. **Siempre revise y edite** el contenido generado antes de usar oficialmente.

**P: ¿Qué información analiza la IA?**
R: La IA puede extraer: remitente, destinatario, fecha, asunto, tipo de documento, y resumen del contenido.

### Seguridad

**P: ¿Quién puede ver mis documentos?**
R: Solo usuarios con permisos adecuados: creador, responsable asignado, miembros del departamento, y administradores.

**P: ¿Están encriptados los documentos?**
R: Sí, todas las conexiones usan HTTPS y los archivos se almacenan de forma segura.

**P: ¿Cuánto tiempo se guardan los registros de auditoría?**
R: Indefinidamente. Todos los registros se conservan para cumplimiento y trazabilidad.

---

## Soporte Técnico

### Contacto

**Administrador del Sistema**: [Nombre del Admin]
**Email**: admin@ministerio-transporte.gq
**Teléfono**: [Número de Contacto]
**Horario de Soporte**: Lunes a Viernes, 8:00 AM - 6:00 PM

### Reportar un Problema

Si encuentra un error o problema:

1. Tome una captura de pantalla del error
2. Anote qué estaba haciendo cuando ocurrió
3. Envíe un email a soporte con:
   - Descripción del problema
   - Captura de pantalla
   - Fecha y hora del incidente
   - Su nombre de usuario

---

## Glosario de Términos

| Término | Definición |
|---------|------------|
| **Bandeja de Entrada** | Lista de documentos recibidos o asignados |
| **Bandeja de Salida** | Lista de documentos creados por el usuario |
| **Expediente** | Agrupación de documentos relacionados |
| **OCR** | Reconocimiento Óptico de Caracteres |
| **Protocolo de Firma** | Proceso de 8 etapas para firma ministerial |
| **Sello de Entrada** | Registro oficial de recepción de documento |
| **Confirmación** | Verificación de recepción por el destinatario |
| **Plazo** | Fecha límite para responder un documento |
| **Auditoría** | Registro de todas las acciones en el sistema |
| **IA** | Inteligencia Artificial para análisis y generación |

---

## Apéndice: Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + N` | Nuevo documento |
| `Ctrl + S` | Guardar cambios |
| `Ctrl + F` | Buscar |
| `Esc` | Cerrar diálogo |
| `Ctrl + P` | Imprimir |

---

## Changelog

### Versión 1.0 (5 de febrero de 2026)
- ✅ Documentación inicial completa
- ✅ Cobertura de Fases 1-5 implementadas
- ✅ Flujos de trabajo de entrada y salida
- ✅ Protocolo de firma ministerial
- ✅ Sistema de plazos y recordatorios
- ✅ Gestión de expedientes
- ✅ Funciones de IA y OCR

---

**Sistema de Gestión Documental Ministerial**
**Ministerio de Transporte, Tecnología, Correos y Telecomunicaciones**
**República de Guinea Ecuatorial**
**© 2026 - Todos los derechos reservados**
