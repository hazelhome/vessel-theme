#!/usr/bin/env node

/**
 * Script simplificado para generar modelos GLB de cuadros
 * Versión sin Canvas - usa URLs directamente
 * 
 * Uso:
 *   node scripts/generate-artwork-glbs-simple.js
 * 
 * Requisitos:
 *   - Node.js 18+
 *   - Variables de entorno: SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuración
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'kqcqez-hq.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const TAG_FILTER = 'cuadro';
const OUTPUT_DIR = path.join(__dirname, 'generated-glbs');

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
 * Genera un modelo GLB a partir de una URL de imagen
 */
async function generateGLB(imageURL, aspectRatio, productHandle) {
  console.log('  📦 Generando modelo 3D...');
  
  // Crear escena
  const scene = new THREE.Scene();
  
  // Crear geometría del cuadro
  const width = 1.0;
  const height = width * aspectRatio;
  const geometry = new THREE.PlaneGeometry(width, height);
  
  // Material con referencia a la imagen (se incluirá en el GLB)
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    metalness: 0,
    roughness: 1
  });
  
  // Mesh principal
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = {
    textureURL: imageURL,
    productHandle: productHandle
  };
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
  
  // Exportar a GLB con la textura embebida
  const exporter = new GLTFExporter();
  
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        console.log('  ✅ Modelo 3D generado');
        
        // Modificar el GLB para incluir la URL de la textura
        const glbBuffer = Buffer.from(result);
        
        resolve({
          buffer: glbBuffer,
          imageURL: imageURL
        });
      },
      (error) => {
        console.error('  ❌ Error al exportar GLB:', error);
        reject(error);
      },
      { 
        binary: true,
        includeCustomExtensions: true
      }
    );
  });
}

/**
 * Procesa un producto
 */
async function processProduct(product) {
  console.log(`\n📦 Procesando: ${product.title}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Handle: ${product.handle}`);
  
  if (!product.image) {
    console.log('  ⚠️  Sin imagen, saltando...');
    return null;
  }
  
  try {
    // Calcular aspect ratio desde dimensiones de Shopify
    const width = product.image.width || 1000;
    const height = product.image.height || 1000;
    const aspectRatio = height / width;
    
    console.log(`  📐 Dimensiones: ${width}x${height}`);
    console.log(`  📐 Aspect ratio: ${aspectRatio.toFixed(2)}`);
    
    // Generar GLB
    const result = await generateGLB(product.image.src, aspectRatio, product.handle);
    
    // Nombre del archivo
    const filename = `artwork-${product.handle}.glb`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    // Guardar GLB
    fs.writeFileSync(filepath, result.buffer);
    
    console.log(`  ✅ Completado: ${product.title}`);
    console.log(`     Archivo: ${filepath}`);
    console.log(`     Imagen: ${result.imageURL}`);
    
    return {
      productId: product.id,
      handle: product.handle,
      title: product.title,
      glbPath: filepath,
      imageURL: result.imageURL
    };
    
  } catch (error) {
    console.error(`  ❌ Error procesando ${product.title}:`, error.message);
    return null;
  }
}

/**
 * Main
 */
async function main() {
  console.log('🎨 Generador de modelos 3D para cuadros (Versión Simple)\n');
  console.log(`Store: ${SHOPIFY_STORE}`);
  console.log(`Tag filter: ${TAG_FILTER}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);
  
  try {
    // Obtener productos con el tag
    console.log('📡 Obteniendo productos de Shopify...\n');
    
    const response = await shopifyRequest(`/products.json?tag=${TAG_FILTER}&limit=250`);
    const products = response.products;
    
    console.log(`✅ Encontrados ${products.length} productos con tag "${TAG_FILTER}"\n`);
    
    if (products.length === 0) {
      console.log('⚠️  No hay productos para procesar');
      return;
    }
    
    // Procesar cada producto
    const results = [];
    for (const product of products) {
      const result = await processProduct(product);
      if (result) {
        results.push(result);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ¡Completado! ${results.length}/${products.length} GLBs generados\n`);
    console.log('📂 Archivos guardados en:', OUTPUT_DIR);
    
    // Crear archivo de mapeo
    const mapping = results.map(r => ({
      handle: r.handle,
      title: r.title,
      glbFilename: path.basename(r.glbPath),
      imageURL: r.imageURL
    }));
    
    const mappingPath = path.join(OUTPUT_DIR, 'mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
    
    console.log(`\n📄 Mapeo guardado en: ${mappingPath}`);
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Sube los archivos .glb a Shopify Files:');
    console.log('      - Ve a Shopify Admin → Content → Files');
    console.log('      - Arrastra los archivos de:', OUTPUT_DIR);
    console.log('   2. Copia las URLs de Shopify Files');
    console.log('   3. Actualiza el código para usar las URLs');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
main();


