#  Apizaco Macro-Traffic Simulator Pro

Plataforma interactiva de simulación macroscópica de tráfico urbano y análisis de redes viales para la ciudad de **Apizaco, Tlaxcala**. 

Desarrollado con **TypeScript (HTML5 Canvas API)**, aplicando modelos de **Teoría de Juegos (Equilibrio de Nash vs. Óptimo Social)** y la función de impedancia **BPR (Bureau of Public Roads)**.

---

##  Características Principales

- **Simulación Multi-Agente Heterogénea:** Modelado dinámico con variabilidad de flota (Autos particulares, Autobuses y Camiones de Carga).
- **Control Adaptativo de Semáforos:** Algoritmo de sincronización en tiempo real basado en colas de espera vs. semáforo de tiempo fijo.
- **Respuesta a Incidentes en Tiempo Real:** Detección de clics para generar accidentes (` ACCIDENTE`) y cierres de vía (` CERRADO`) con re-enrutamiento automático de vehículos.
- **Modelos Duales de Ruteo:**
  - *Instinto Individual (User Equilibrium / Nash):* Principio 1 de Wardrop.
  - *IA Ruteadora (System Optimal):* Principio 2 de Wardrop.
- **Analytics & Exportación:** Generador integrado de reportes científicos en **CSV** con Niveles de Servicio (LOS - Level of Service) e impedancia BPR.
- **Capas Visuales:** Heatmap de fricción térmica y motor de cámara con **Pan & Zoom** interactivo.

---

##  Modelo Matemático (Función BPR)

La impedancia vial para cada tramo $i$ se calcula mediante:

$$t_i = t_0 \cdot \left(1 + \alpha \cdot \left(\frac{v_i}{c_i}\right)^\beta\right)$$

Donde:
- $t_0$: Tiempo de viaje a flujo libre.
- $v_i$: Flujo vehicular actual (vehículos/hora).
- $c_i$: Capacidad de diseño de la vía.
- $\alpha = 0.15, \beta = 4.0$: Parámetros BPR estándar de calibración urbana.
