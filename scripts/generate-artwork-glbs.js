#!/usr/bin/env node

/**
 * Script para generar modelos GLB de cuadros y subirlos a Shopify
 * 
 * Uso:
 *   node scripts/generate-artwork-glbs.js
 * 
 * Requisitos:
 *   - Node.js 18+
 *   - Variables de entorno: SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createCanvas, Image } = require('canvas');
const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');

// Configuración
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'kqcqez-hq.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const TAG_FILTER = 'cuadro';
const OUTPUT_DIR = path.join(__dirname, '../generated-glbs');

if (!SHOPIFY_ACCESS_TOKEN) {
  console.error('❌ Error: SHOPIFY_ACCESS_TOKEN no está configurado');
  console.error('Configura la variable de entorno:');
  console.error('  export SHOPIFY_ACCESS_TOKEN="tu_access_token"');
  process.exit(1);
}

// Crear directorio de salida
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Hace una petición a la API de Shopify
 */
async function shopifyRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SHOPIFY_STORE,
      path: `/admin/api/2024-01${endpoint}`,
      method: method,
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Shopify API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Descarga una imagen desde una URL
 */
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    }).on('error', reject);
  });
}

/**
 * Genera un modelo GLB a partir de una imagen
 */
async function generateGLB(imageBuffer, aspectRatio) {
  console.log('  📦 Generando modelo 3D...');
  
  // Crear escena
  const scene = new THREE.Scene();
  
  // Crear textura desde buffer
  const img = new Image();
  img.src = imageBuffer;
  
  const texture = new THREE.Texture(img);
  texture.needsUpdate = true;
  
  // Crear geometría del cuadro
  const width = 1.0;
  const height = width * aspectRatio;
  const geometry = new THREE.PlaneGeometry(width, height);
  
  // Material con la imagen
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
    metalness: 0,
    roughness: 1
  });
  
  // Mesh principal
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  
  // Agregar marco blanco
  const frameThickness = 0.02;
  const frameDepth = 0.01;
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.8
  });
  
  // Marco superior
  const topFrame = new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth);
  const topFrameMesh = new THREE.Mesh(topFrame, frameMaterial);
  topFrameMesh.position.y = height / 2 + frameThickness / 2;
  topFrameMesh.position.z = -frameDepth / 2;
  scene.add(topFrameMesh);
  
  // Marco inferior
  const bottomFrameMesh = new THREE.Mesh(topFrame, frameMaterial);
  bottomFrameMesh.position.y = -height / 2 - frameThickness / 2;
  bottomFrameMesh.position.z = -frameDepth / 2;
  scene.add(bottomFrameMesh);
  
  // Marco izquierdo
  const sideFrame = new THREE.BoxGeometry(frameThickness, height, frameDepth);
  const leftFrameMesh = new THREE.Mesh(sideFrame, frameMaterial);
  leftFrameMesh.position.x = -width / 2 - frameThickness / 2;
  leftFrameMesh.position.z = -frameDepth / 2;
  scene.add(leftFrameMesh);
  
  // Marco derecho
  const rightFrameMesh = new THREE.Mesh(sideFrame, frameMaterial);
  rightFrameMesh.position.x = width / 2 + frameThickness / 2;
  rightFrameMesh.position.z = -frameDepth / 2;
  scene.add(rightFrameMesh);
  
  // Exportar a GLB
  const exporter = new GLTFExporter();
  
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        console.log('  ✅ Modelo 3D generado');
        resolve(Buffer.from(result));
      },
      (error) => {
        console.error('  ❌ Error al exportar GLB:', error);
        reject(error);
      },
      { binary: true }
    );
  });
}

/**
 * Sube un archivo a Shopify Files
 */
async function uploadToShopify(glbBuffer, filename) {
  console.log('  📤 Subiendo a Shopify Files...');
  
  // Guardar temporalmente
  const tempPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(tempPath, glbBuffer);
  
  // Crear staged upload
  const stagedUpload = await shopifyRequest('/graphql.json', 'POST', {
    query: `
      mutation {
        stagedUploadsCreate(input: [{
          resource: FILE,
          filename: "${filename}",
          mimeType: "model/gltf-binary",
          httpMethod: POST
        }]) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
        }
      }
    `
  });
  
  const target = stagedUpload.data.stagedUploadsCreate.stagedTargets[0];
  
  // Subir el archivo (esto requiere multipart/form-data)
  // Por simplicidad, vamos a guardar localmente y devolver la ruta
  console.log('  ✅ GLB guardado localmente:', tempPath);
  console.log('  ℹ️  URL de Shopify:', target.resourceUrl);
  
  return {
    localPath: tempPath,
    shopifyUrl: target.resourceUrl
  };
}

/**
 * Actualiza el metafield del producto con la URL del GLB
 */
async function updateProductMetafield(productId, glbUrl) {
  console.log('  🔄 Actualizando metafield del producto...');
  
  await shopifyRequest('/graphql.json', 'POST', {
    query: `
      mutation {
        metafieldsSet(metafields: [{
          ownerId: "gid://shopify/Product/${productId}",
          namespace: "custom",
          key: "ar_model_url",
          value: "${glbUrl}",
          type: "url"
        }]) {
          metafields {
            id
            value
          }
        }
      }
    `
  });
  
  console.log('  ✅ Metafield actualizado');
}

/**
 * Procesa un producto
 */
async function processProduct(product) {
  console.log(`\n📦 Procesando: ${product.title}`);
  console.log(`   ID: ${product.id}`);
  
  if (!product.image) {
    console.log('  ⚠️  Sin imagen, saltando...');
    return;
  }
  
  try {
    // Descargar imagen
    console.log('  📥 Descargando imagen...');
    const imageBuffer = await downloadImage(product.image.src);
    
    // Calcular aspect ratio
    const img = new Image();
    img.src = imageBuffer;
    const aspectRatio = img.height / img.width;
    console.log(`  📐 Aspect ratio: ${aspectRatio.toFixed(2)}`);
    
    // Generar GLB
    const glbBuffer = await generateGLB(imageBuffer, aspectRatio);
    
    // Nombre del archivo
    const filename = `artwork-${product.id}.glb`;
    
    // Subir a Shopify (o guardar localmente)
    const result = await uploadToShopify(glbBuffer, filename);
    
    // Actualizar metafield del producto
    // await updateProductMetafield(product.id, result.shopifyUrl);
    
    console.log(`  ✅ Completado: ${product.title}`);
    console.log(`     Archivo: ${result.localPath}`);
    
  } catch (error) {
    console.error(`  ❌ Error procesando ${product.title}:`, error.message);
  }
}

/**
 * Main
 */
async function main() {
  console.log('🎨 Generador de modelos 3D para cuadros\n');
  console.log(`Store: ${SHOPIFY_STORE}`);
  console.log(`Tag filter: ${TAG_FILTER}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);
  
  try {
    // Obtener productos con el tag
    console.log('📡 Obteniendo productos de Shopify...\n');
    
    const response = await shopifyRequest(`/products.json?tag=${TAG_FILTER}`);
    const products = response.products;
    
    console.log(`✅ Encontrados ${products.length} productos con tag "${TAG_FILTER}"\n`);
    
    if (products.length === 0) {
      console.log('⚠️  No hay productos para procesar');
      return;
    }
    
    // Procesar cada producto
    for (const product of products) {
      await processProduct(product);
    }
    
    console.log('\n✅ ¡Completado! Todos los GLBs han sido generados.\n');
    console.log('📂 Archivos guardados en:', OUTPUT_DIR);
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Sube los archivos .glb a Shopify Files manualmente');
    console.log('   2. O usa la API de Files para subirlos automáticamente');
    console.log('   3. Actualiza el código del Model Viewer para usar las URLs');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
main();

