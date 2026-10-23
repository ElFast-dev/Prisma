# Requisitos delta: kernel numérico Ridge aislado

## ADDED Requirements

### Requirement: Kernel numérico Ridge determinista y aislado

Prisma DEBE mantener el escalado de características, la vectorización, el kernel de similitud, la factorización Cholesky, el entrenamiento y la predicción Ridge en un módulo numérico puro. La extracción NO DEBE cambiar escalas, regularización, coeficientes, límites de puntuación, resultados de evaluación ni el perfil activo de recomendaciones.

#### Scenario: Predicción determinista con vectores ortogonales

- DADO un conjunto sintético con una película Drama puntuada 8 y otra Comedia puntuada 4, vectores de características ortogonales y `alpha=1`
- CUANDO se construye el kernel, se entrena Ridge y se predicen ambos vectores
- ENTONCES el kernel permanece diagonal `[[1,0],[0,1]]`, los coeficientes son aproximadamente `[1,-1]` y las predicciones son aproximadamente 7 para Drama y 5 para Comedia

#### Scenario: Separación de responsabilidades

- DADO `js/recommendations/ridge-kernel.js`
- CUANDO se inspecciona la arquitectura
- ENTONCES sus operaciones solo dependen de entradas numéricas y mapas de características, sin DOM, almacenamiento, red ni acceso al perfil real
