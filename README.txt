# AutoNexus | Módulo ERP de Gestión de Calidad (QM)

AutoNexus QM es una aplicación full-stack transaccional con arquitectura de microservicios, diseñada bajo los estándares visuales e interactivos de un sistema ERP corporativo (Brutalist UI). 

Este módulo digitaliza el proceso de control de calidad en entornos logísticos e industriales, permitiendo el ingreso, trazabilidad y dictamen técnico de componentes mecánicos para eliminar la dependencia de registros manuales y hojas de cálculo.

## Impacto de Negocio y Casos de Uso
- **Trazabilidad Inmutable:** Seguimiento del ciclo de vida de los materiales (lote, estado, operario y fecha exacta).
- **Control de Cuellos de Botella:** Dashboards en tiempo real que visibilizan la carga de trabajo operativa por inspector y la distribución de estados de calidad.
- **Interoperabilidad:** Exportación instantánea del data grid a CSV para su integración con Power BI, Excel u otros módulos del ERP.
- **Workflow Estricto:** Restricciones de sistema que exigen la documentación obligatoria del "motivo de falla" ante cualquier rechazo de material.

## Stack Tecnológico
La solución está completamente contenerizada para garantizar su portabilidad y escalabilidad en cualquier infraestructura.

* **Frontend:** React, Tailwind CSS (Diseño ERP estático de alta densidad de datos), Recharts, Lucide Icons.
* **Backend:** Node.js, Express (API RESTful).
* **Base de Datos:** MySQL 8.0 (Relacional).
* **DevOps / Infraestructura:** Docker & Docker Compose.

## Arquitectura del Sistema
El sistema se compone de 3 contenedores independientes conectados por una red interna:
1. `db`: Motor MySQL pre-configurado con esquemas de validación y un seed masivo de registros de prueba (2024-2025).
2. `backend`: Servidor API que expone los endpoints transaccionales (CRUD) y procesa los cálculos de las métricas.
3. `frontend`: Cliente web reactivo con diseño industrial, filtros multi-criterio y generación de reportes en el navegador.

## Instalación y Despliegue Local

Asegúrate de tener [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y ejecutándose en tu máquina.

1. Clona este repositorio:
   ```bash
   git clone [https://github.com/tu-usuario/autonexus-qm-erp.git](https://github.com/tu-usuario/autonexus-qm-erp.git)
   cd autonexus-qm-erp