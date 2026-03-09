# Sistema de Gestión POS y ERP - Agropecuaria

## 1. Arquitectura de Datos (Modelado de Base de Datos)
Definimos las entidades principales según los requerimientos:

### `Inventario Maestro`
- **ID**: UUID (PK)
- **Nombre**: String
- **Categoría**: Enum (Alimento, Medicina, Ferretería, Agrícola)
- **Stock Unidad Cerrada**: Integer (ej. cantidad de sacos/frascos/rollos)
- **Stock Detallado**: Float (ej. kg/ml/unidades sueltas netas)
- **Peso/Volumen por unidad**: Float (ej. 40 si es un saco de 40kg)
- **Unidad de Medida**: String (kg, ml, g, L, m)
- **Precio Costo**: Float
- **Precio Venta Detal (Base)**: Float
- **Precio Venta Mayorista**: Float
- **Punto de Reorden**: Float (Umbral de alerta)

### `Clientes`
- **ID**: UUID (PK)
- **Nombre**: String
- **Cédula/RIF**: String (Unique)
- **Teléfono**: String
- **Límite de Crédito**: Float
- **Saldo Deudor**: Float

### `Ventas`
- **ID**: UUID (PK)
- **Fecha**: DateTime
- **Caja**: Integer (1 o 2)
- **Tasa de Cambio del día**: Float (Tasa BCV o paralela de referencia)
- **Método de Pago**: Enum (Punto, Biopago, Pago Móvil, Efectivo Bs, Efectivo $, Crédito)
- **Subtotal**: Float
- **Descuento por Divisa ($)**: Float
- **Ajuste por Negociación Manual**: Float (Positivo o Negativo)
- **Total Final**: Float

### `Detalle de Venta`
- **ID**: UUID (PK)
- **Venta_ID**: UUID (FK a Ventas)
- **Producto_ID**: UUID (FK a Inventario Maestro)
- **Tipo de Venta**: Enum (Cerrada, Fracción)
- **Cantidad**: Float
- **Precio Unitario**: Float
- **Subtotal**: Float

### `Registro de Mermas`
- **ID**: UUID (PK)
- **Fecha**: DateTime
- **Producto_ID**: UUID (FK a Inventario Maestro)
- **Cantidad perdida (kg/ml)**: Float
- **Motivo**: String (Derrame, Error pesaje, etc.)

### `Buzón de Notificaciones`
- **ID**: UUID (PK)
- **Fecha**: DateTime
- **Mensaje**: String (Ej. "Reponer Alimento Perro 20Kg")
- **Producto_ID**: UUID (FK a Inventario Maestro)
- **Estado**: Enum (Pendiente, Resuelta)


## 2. Lógica y Automatizaciones Críticas

1. **Fraccionamiento Universal ("Abrir Unidad"):**
   - Transacción atómica: `UPDATE Inventario SET Stock_Unidad_Cerrada = Stock_Unidad_Cerrada - 1, Stock_Detallado = Stock_Detallado + Peso_Volumen_Por_Unidad WHERE ID = ?`

2. **Calculadora de Despacho (Venta por Monto Bs):**
   - Input: $Monto_{Bs}$.
   - Fórmula: $Cantidad\_A\_Servir = \frac{Monto_{Bs} / Tasa\_De\_Cambio}{Precio\_Gramo\_O\_Ml}$.
   - La balanza/vendedor es informado de los gramos/ml exactos.

3. **Descuento Automático Efectivo $:**
   - Si método = "Efectivo $", aplicar porcentaje global predefinido de descuento al Subtotal.

4. **Campo de Negociación:**
   - El supervisor en caja puede editar directamente el "Total Final" en caso de redondeo o acuerdo. La diferencia se guarda en la columna `Ajuste por Negociación Manual`.

5. **Afectación de Stock:**
   - Detalle Venta (Cerrada) -> `Stock_Unidad_Cerrada -= Cantidad`
   - Detalle Venta (Fracción) -> `Stock_Detallado -= Cantidad`
   - Merma -> `Stock_Detallado -= Cantidad`

6. **Créditos:**
   - Si método de pago = 'Crédito', verificar `Saldo_Deudor + Total_Final <= Limite_Credito`.
   - Sumar al `Saldo_Deudor` del cliente.


## 3. Vistas y Dashboards (Reportes)

- **Buzón de Compras:** Consulta: `SELECT * FROM Inventario WHERE (Stock_Unidad_Cerrada * Peso_Volumen_Por_Unidad + Stock_Detallado) < Punto_Reorden`.
- **Reporte de Pedidos Semanales:** Productos agrupados por `SUM(Cantidad)` en `Detalle de Venta` filtrados por los últimos 7 días.
- **Cierre de Caja Dual:** Sumatoria de `Total Final` agrupado por `Caja`, `Método de Pago` y `Moneda`.
- **Análisis de Rentabilidad:** Ganancia = `SUM(Total Final de la Venta) - SUM(Precio Costo del Detalle)`.

---
## Diseño UI (Inspirado en Referencia Visual)
El diseño (como ChecknGo en la imagen) será de temática verde (Agro). Tendrá:
- **Panel Izquierdo:** Búsqueda rápida de productos (sacos y fracciones separadas), visualización visual del stock.
- **Panel Derecho (Caja/Checkout):** Listado del carrito actual, selección rápida de Cliente (para crédito), Panel matemático (Subtotal, Tax, Calculadora de Despacho, Descuento $ Automático, Input de Total Negociado).
- **Barra Inferior/Botones:** Botones grandes y visibles para los diferentes métodos de pago y el botón de "Hacer Pago".
- **Toggle Dark Mode:** Para operación en entornos menos iluminados o nocturnos del local.