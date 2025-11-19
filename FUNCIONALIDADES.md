# Sistema de Gestión de Torneos de Racquetball - Funcionalidades

## Descripción General
Sistema completo de gestión de torneos de racquetball con captura de estadísticas en tiempo real, análisis detallado de rendimiento, y administración multi-torneo con control de roles jerárquico.

---

## 1. Gestión de Usuarios y Roles

### Roles del Sistema
- **SuperAdmin**: Acceso completo a la plataforma
- **Admin**: Administrador global
- **Tournament Admin**: Administrador de torneo específico
- **Organizador**: Gestiona recursos del torneo
- **Árbitro**: Valida resultados y gestiona partidos
- **Escrutador**: Captura estadísticas en tiempo real
- **Jugador**: Participa en torneos

### Funcionalidades de Usuarios
- Registro y autenticación segura con cifrado scrypt
- Asignación de roles por torneo (multi-tenant)
- Gestión de permisos jerárquica
- Perfiles de jugadores con estadísticas personalizadas

---

## 2. Gestión de Torneos

### Creación y Configuración
- Crear torneos con información completa (nombre, fechas, club, ubicación)
- Configuración de zona horaria por torneo (IANA timezone)
  - Soporte para México, USA, Latinoamérica y Europa
  - Zona por defecto: America/Mexico_City
- Modalidades: Singles y Doubles
- Estado del torneo: Programado, En Progreso, Completado, Cancelado
- Soporte exclusivo para Racquetball (Padel oculto en UI)

### Registro de Jugadores
- Registro manual de jugadores al torneo
- Importación masiva vía Excel
  - Plantilla descargable
  - Validación automática de datos
  - Creación automática de usuarios
- Asignación automática de roles de jugador

### Administración de Canchas
- Gestión de canchas disponibles
- Asignación de canchas a partidos
- Control de disponibilidad

---

## 3. Programación de Partidos

### Calendario Integrado
- Vista de calendario por torneo
- Filtrado por rol:
  - **Jugadores**: Solo ven sus propios partidos
  - **Admins**: Ven todos los partidos del torneo
  - **SuperAdmins**: Vista global de todos los torneos
- Respeta zona horaria del torneo
- Agrupación por torneo en vista global

### Creación de Partidos
- Partidos Singles: 2 jugadores
- Partidos Doubles: 4 jugadores (2 equipos de 2)
- Validación de jugadores únicos
- Asignación de canchas y horarios
- Estados: Programado, En Progreso, Completado, Cancelado

### Importación de Partidos
- Carga masiva vía Excel (Singles y Doubles)
- Validación de estructura
- Vista previa antes de confirmar
- Reporte detallado de resultados

---

## 4. Captura de Estadísticas en Tiempo Real

### Formato Open IRT (International Racquetball Tour)

#### Reglas de Juego
- **Puntuación solo del servidor**: Solo el jugador que saca puede anotar puntos
- **Sideout**: Cuando el receptor gana el rally, el saque cambia pero no se anota punto
- **Sets**: Mejor de 3 sets (primero en ganar 2)
- **Puntos por set**: 11 puntos (sets 1 y 2), 15 puntos (set de desempate)

#### Panel de Captura Dual
- **Panel del Servidor**: 
  - Botones de puntuación activos
  - Registro de aces (derecha/izquierda)
  - Control de faltas y doble falta
  - Tipos de tiro: Recto, Esquina, Cruzado, Punto
  
- **Panel del Receptor**:
  - Botones limitados (solo acciones válidas)
  - Sin opciones de saque (ace, falta, doble falta)
  - Registro de tipos de tiro para puntos ganados

#### Eventos Registrados
- **Puntos**: Con tipo de tiro asociado
- **Aces**: Por lado (derecha/izquierda)
- **Faltas**: Tracking individual
- **Doble Falta**: Detección automática (2 faltas en 5 segundos)
- **Errores**: Registro de errores no forzados
- **Winners**: Puntos ganadores
- **Sideout**: Cambio de servidor sin punto

#### Sistema de Timeouts
- 2 timeouts por set por equipo
- Control de tiempo (60 segundos)
- Indicador visual de timeouts usados

#### Sistema de Apelaciones
- Registro de apelaciones durante el partido
- Resultado: Concedida, Denegada, Pendiente
- Histórico por set

#### Faltas Técnicas
- Registro de faltas técnicas por jugador/equipo
- **Auto-terminación a las 3 faltas técnicas**
- Descuento automático de puntos
- Victoria automática al oponente
- Indicador visual de faltas acumuladas

#### Función Deshacer
- Revertir la última acción
- Restaura estado previo del marcador
- Elimina el último evento registrado
- Manejo especial para faltas técnicas

### WebSocket en Tiempo Real
- Sincronización automática entre dispositivos
- Actualizaciones instantáneas del marcador
- Broadcast de eventos a todos los conectados

---

## 5. Gestión de Sesiones de Captura

### Estados de Sesión
- **Activa**: Captura en progreso
- **Completada**: Partido finalizado, datos bloqueados

### Completar Sesión
Al finalizar una sesión:
1. **Se bloquea la sesión** - No se pueden agregar más eventos
2. **Se actualiza el partido**:
   - Estado: Completado
   - Ganador del partido
   - Sets ganados por cada jugador/equipo
   - Puntos finales
3. **Se actualizan estadísticas de jugadores**:
   - Partidos jugados
   - Victorias y derrotas
   - Sets ganados y perdidos

### Validaciones de Integridad
- Sesiones completadas no se pueden modificar
- No se pueden agregar eventos a sesiones completadas
- Datos bloqueados para garantizar precisión

---

## 6. Módulo de Estadísticas

### Tabla de Jugadores
Muestra estadísticas completas de todos los jugadores:

#### Columna: Victorias/Derrotas
- Partidos ganados
- Partidos perdidos
- Total de partidos jugados
- Indicadores visuales con badges de colores

#### Columna: Sets
- Sets ganados
- Sets perdidos
- Total de sets jugados

#### Columna: Puntos
- Total de puntos anotados en partidos completados

#### Columna: Aces
- Total de aces
- Desglose por lado:
  - Derecha (D)
  - Izquierda (I)

#### Columna: Doble Faltas (D.F.)
- Total de doble faltas

#### Columna: Efectividad de Saque
- Porcentaje: Aces / (Aces + Doble Faltas)
- Badge codificado por colores:
  - Verde: ≥70% (excelente)
  - Amarillo: ≥50% (bueno)
  - Gris: <50% (necesita mejorar)
- Fracción: Aces/Total intentos

#### Columna: Tipos de Tiro
Desglose completo con porcentajes:
- **Recto (R)**: Cantidad y porcentaje del total
- **Esquina (E)**: Cantidad y porcentaje del total
- **Cruzado (C)**: Cantidad y porcentaje del total
- **Punto (P)**: Cantidad y porcentaje del total
- Total de tiros registrados

### Pestañas del Módulo

#### 1. Estadísticas Personales
- Partidos ganados
- Duración promedio de partidos
- Racha de victorias actual
- Historial de últimos 5 partidos
- Porcentaje de victoria
- Total de partidos
- Mejor racha

#### 2. Tabla de Jugadores
- Ranking por puntos totales
- Métricas completas de todos los jugadores
- Ordenamiento automático por rendimiento
- Badges informativos con total de jugadores

#### 3. Capturas Realizadas (Solo Admins)
- Lista de todas las sesiones completadas
- Información del partido (jugadores, torneo)
- Resultado final
- Duración del partido
- Fecha de finalización

### Filtrado de Datos
- **Solo sesiones completadas**: Garantiza precisión de datos
- **Sincronización automática**: Actualización en tiempo real
- **Alcance por torneo**: Opción de filtrar por torneo específico o global

---

## 7. Generación de Brackets

### Funcionalidades
- Generación automática de llaves de torneo
- Seguridad transaccional
- Eliminación simple o doble
- Actualización automática conforme avanzan los partidos

---

## 8. Importación Masiva (Excel)

### Importación de Jugadores
- Plantilla Excel descargable
- Campos: Nombre, Email, Teléfono
- Creación automática de usuarios
- Registro automático en el torneo
- Validación Zod completa
- Reporte de errores detallado
- Vista previa de resultados

### Importación de Partidos
- Plantilla Excel descargable
- Soporte para Singles y Doubles
- Campos: Jugadores, Fecha, Hora, Cancha
- Validación de jugadores existentes
- Validación de unicidad de jugadores en Doubles
- Creación automática de partidos programados
- Vista previa antes de confirmar

---

## 9. Seguridad y Permisos

### Autenticación
- Sistema de sesiones con PostgreSQL
- Cifrado de contraseñas con scrypt
- Tokens de sesión seguros
- Validación en cada endpoint

### Autorización
- Verificación de rol global (SuperAdmin)
- Verificación de rol por torneo
- Helpers de permisos:
  - `isSuperAdmin()`
  - `canManageTournament()`
  - `canAssignRole()`
- Validación en frontend y backend

### Restricciones
- Jugadores solo ven sus datos y partidos
- Organizadores gestionan su torneo
- Árbitros y Escrutadores capturan estadísticas
- Tournament Admins controlan todo su torneo
- SuperAdmins acceso total

---

## 10. Características Técnicas

### Frontend
- **React 18** con TypeScript
- **Vite** para desarrollo rápido
- **TailwindCSS** + **shadcn/ui** para UI
- **React Query** para manejo de estado del servidor
- **Wouter** para enrutamiento
- **React Hook Form** + **Zod** para formularios
- **date-fns-tz** para manejo de zonas horarias
- WebSockets para tiempo real

### Backend
- **Express.js** con TypeScript
- **PostgreSQL** (Neon serverless)
- **Drizzle ORM** type-safe
- **Passport.js** para autenticación
- **Zod** para validación
- **WebSocket** (ws) para tiempo real
- **xlsx** para procesamiento de Excel

### Base de Datos
- Esquema relacional completo
- Índices optimizados
- Restricciones de integridad referencial
- Soporte para transacciones
- Tablas principales:
  - users
  - tournaments
  - matches
  - courts
  - playerStats
  - matchStatsSessions
  - matchEvents
  - tournamentRegistrations
  - tournamentRoles
  - scheduledMatches

---

## 11. Optimizaciones

### Rendimiento
- Carga perezosa de componentes
- Caché de queries con React Query
- Índices de base de datos
- Paginación en listados grandes

### UX
- Skeletons durante carga
- Toasts para feedback inmediato
- Validación en tiempo real
- Actualizaciones optimistas
- Diseño responsivo (móvil + desktop)
- Optimizado para iPhone 14 Pro Max y iPad Air

### Integridad de Datos
- Validación Zod en frontend y backend
- Prevención de modificaciones a sesiones completadas
- Transacciones de base de datos
- Rollback automático en errores
- Logs detallados para debugging

---

## 12. Flujo Completo de Uso

### 1. Configuración Inicial
1. SuperAdmin crea el torneo
2. Configura zona horaria
3. Agrega canchas disponibles
4. Asigna roles de Tournament Admin

### 2. Preparación del Torneo
1. Tournament Admin importa jugadores vía Excel
2. Se crean usuarios automáticamente
3. Se asignan roles de jugador
4. Se programan partidos manualmente o vía Excel

### 3. Durante el Torneo
1. Escrutador/Árbitro inicia sesión de captura
2. Registra eventos en tiempo real
3. Sistema calcula automáticamente:
   - Marcador
   - Cambios de servidor
   - Fin de sets
   - Ganador del partido
4. Se detectan automáticamente:
   - Doble faltas
   - Victoria por 3 faltas técnicas
   - Fin del partido

### 4. Finalización del Partido
1. Se completa la sesión
2. Se bloquean los datos
3. Se actualizan estadísticas de jugadores
4. Se marca el partido como completado
5. Datos disponibles inmediatamente en módulo de estadísticas

### 5. Análisis Post-Torneo
1. Consulta de tabla de jugadores
2. Análisis de efectividad de saque
3. Revisión de tipos de tiro
4. Comparación de rendimiento
5. Exportación de datos (futuro)

---

## 13. Próximas Mejoras Sugeridas

### Estadísticas Avanzadas
- [ ] Filtro de estadísticas por tipo de partido (Singles/Doubles)
- [ ] Gráficas de rendimiento histórico
- [ ] Comparación entre jugadores
- [ ] Análisis de tendencias

### Funcionalidades Adicionales
- [ ] Sistema de mensajería entre usuarios
- [ ] Notificaciones push
- [ ] Compartir estadísticas públicas
- [ ] Exportación a PDF
- [ ] Integración con redes sociales
- [ ] Sistema de rankings automático

### Mobile
- [ ] App nativa iOS/Android
- [ ] Modo offline
- [ ] Sincronización automática

---

## Desarrollado con ❤️ para GB Sport

**Versión**: 1.0  
**Última actualización**: Noviembre 2025  
**Stack**: React + TypeScript + Express + PostgreSQL + Drizzle ORM
