# Generador de Modelos 3D para Cuadros

Script para generar automáticamente modelos GLB de todos los productos con tag `cuadro` y subirlos a Shopify.

## 📋 Requisitos

- Node.js 18+
- Access Token de Shopify con permisos:
  - `read_products`
  - `write_products` (para metafields)
  - `write_files` (para subir GLBs)

## 🚀 Instalación

```bash
cd scripts
npm install
```

## ⚙️ Configuración

### 1. Obtener Access Token de Shopify

1. Ve a Shopify Admin → Apps → "Develop apps"
2. Crea una nueva app o usa una existente
3. En "API credentials", genera un Access Token con los permisos necesarios
4. Copia el token

### 2. Configurar variables de entorno

```bash
export SHOPIFY_STORE="kqcqez-hq.myshopify.com"
export SHOPIFY_ACCESS_TOKEN="shpat_xxxxxxxxxxxxx"
```

O crea un archivo `.env`:

```bash
SHOPIFY_STORE=kqcqez-hq.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
```

## 📦 Uso

### Generar GLBs de todos los productos

```bash
npm run generate
```

Esto va a:
1. ✅ Conectarse a Shopify
2. ✅ Buscar todos los productos con tag `cuadro`
3. ✅ Por cada producto:
   - Descargar la imagen principal
   - Generar un modelo GLB con marco blanco
   - Guardarlo en `generated-glbs/artwork-{product_id}.glb`
4. ✅ Mostrar la ruta de cada archivo generado

### Subir los GLBs a Shopify

**Opción A: Manual (más simple)**
1. Ve a Shopify Admin → Content → Files
2. Sube todos los archivos `.glb` de la carpeta `generated-glbs/`
3. Copia las URLs de cada archivo

**Opción B: Automático (próximamente)**
El script puede subir automáticamente usando la API de Files de Shopify.

## 📝 Formato del GLB generado

Cada modelo incluye:
- ✅ Plano 3D con la textura del cuadro
- ✅ Marco blanco 3D (4 bordes)
- ✅ Dimensiones correctas según aspect ratio
- ✅ Material realista (mate, sin brillo)
- ✅ Listo para ARCore/ARKit

## 🔗 Integración con Model Viewer

Una vez generados y subidos los GLBs, actualiza el código para usarlos:

```javascript
// En wall-preview-model-viewer.js
const glbUrl = product.metafields?.custom?.ar_model_url;

if (glbUrl) {
  // Usar GLB pre-generado
  this.modelViewer.src = glbUrl;
} else {
  // Fallback: generar on-the-fly
  await this.generateArtworkModel(imageURL);
}
```

## 🐛 Troubleshooting

### Error: "SHOPIFY_ACCESS_TOKEN no está configurado"
Asegúrate de exportar la variable de entorno o crear el archivo `.env`

### Error al descargar imágenes
Verifica que los productos tengan imágenes asociadas

### Error al generar GLB
Asegúrate de tener Node.js 18+ instalado

## 📊 Output

Los archivos se guardan en:
```
vessel/
  scripts/
    generated-glbs/
      artwork-123456789.glb
      artwork-987654321.glb
      ...
```

## 🎯 Próximas mejoras

- [ ] Subida automática a Shopify Files
- [ ] Actualización automática de metafields
- [ ] Procesamiento paralelo para más velocidad
- [ ] Re-generar solo si la imagen cambió
- [ ] Soporte para múltiples imágenes por producto

