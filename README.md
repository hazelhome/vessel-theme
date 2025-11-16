# Hazel Home - Vessel Theme

Modern Shopify theme for Hazel Home with enhanced product cards and quick add functionality.

## 🚀 Features

- ✅ Enhanced product cards with bottom buy buttons
- ✅ Quick add integration with popup modals  
- ✅ Variant image filtering
- ✅ Responsive design
- ✅ Accessibility compliant

## 📦 Installation

1. Download the theme files
2. Upload to your Shopify admin
3. Customize through the theme editor

## ⭐ Custom Features

### Product Card Buy Button
- Integrated with existing quick add system
- Shows popup for variant selection
- Fallback to product page for complex products

### Variant Image Filter
- Filters product images based on selected variants
- Uses alt text for image association
- Smooth transitions and animations

### Product Stories
- Instagram-style stories viewer for product videos
- Automatic video detection from product media
- Progress indicators and navigation controls
- Touch/click navigation and keyboard support
- Autoplay with pause/resume functionality

### Media Gallery Options
- Option to hide videos from product image carousel
- Configurable through theme editor settings
- Videos can be displayed separately in Product Stories block

### Wall Preview System (for "cuadro" tagged products)
Two complementary modes for visualizing artwork on walls:

**Modo Foto:**
- Upload a photo of your wall
- Drag and drop artwork to position
- Resize with slider maintaining aspect ratio
- Download preview image

**Modo AR (Live Preview):**
- Real-time camera feed with live artwork overlay
- Drag & drop to position artwork anywhere
- Touch and mouse support for desktop and mobile
- Smooth animations with interpolation
- Multi-layer shadow effects for realistic depth
- Adjustable size with +/- controls
- Capture/download functionality
- Instant load time (< 0.5s)
- No heavy ML libraries - optimized for performance
- 60 FPS smooth rendering with requestAnimationFrame
- Professional gradient UI with pulsing animations

**Features:**
- ✅ Real-time camera access (environment-facing on mobile)
- ✅ Drag & drop artwork positioning
- ✅ Multi-layer shadows for depth perception
- ✅ Smooth position interpolation
- ✅ Frame border effects
- ✅ Professional gradient UI
- ✅ Touch and mouse controls
- ✅ Size adjustment controls
- ✅ Screenshot/download functionality
- ⚡ 60 FPS rendering

**Future Phases:**
- Phase 2: Depth estimation for realistic sizing based on distance
- Phase 3: 3D perspective transform and dynamic shadows based on lighting

## 🛠️ Development

Built with modern web standards and Shopify best practices.

### Workflow

**Development Branch:**
```bash
git checkout develop
shopify theme dev --store=kqcqez-hq.myshopify.com
```

**Production Branch:**
```bash
git checkout production
shopify theme push --store=kqcqez-hq.myshopify.com
```

**Merging to Production:**
```bash
git checkout production
git merge develop
git push origin production
```

### Running the Development Server

```bash
shopify theme dev --store=kqcqez-hq.myshopify.com
```

### Troubleshooting

#### File Watcher Limit Error (ENOSPC)

If you encounter `ENOSPC: System limit for number of file watchers reached`, increase the limit:

**Temporary fix (until reboot):**
```bash
sudo sysctl fs.inotify.max_user_watches=524288
```

**Permanent fix:**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Key Files Modified:
- `snippets/product-card.liquid` - Enhanced product card with buy button
- `assets/product-card-buy-button.js` - JavaScript for quick add integration
- `sections/product-information.liquid` - Product page layout
- `assets/variant-image-filter.js` - Image filtering functionality
- `blocks/product-stories.liquid` - Instagram-style stories viewer
- `assets/product-stories.js` - Stories viewer functionality
- `snippets/wall-preview-modal.liquid` - Photo mode wall preview
- `assets/wall-preview.js` - Photo mode drag & drop functionality
- `assets/wall-preview.css` - Photo mode styles
- `snippets/wall-preview-ar-modal.liquid` - AR mode interface
- `assets/wall-preview-ar.js` - AR mode with TensorFlow.js ML
- `assets/wall-preview-ar.css` - AR mode styles
- `blocks/_product-media-gallery.liquid` - Integrated wall preview buttons

## 📝 Usage

### Product Card Buy Button
The buy button automatically appears at the bottom of product cards and integrates with the existing quick add system.

### Variant Image Filtering
Add alt text to product images containing variant names (e.g., "Red Shirt", "Blue Dress") to enable automatic filtering.

### Product Stories
Add the "Product Stories" block to your product page through the theme editor to display product videos in an Instagram-style viewer. The block automatically detects and displays all video media associated with the product.

### Hiding Videos from Gallery
In the theme editor, go to the "Product Media" block settings and enable "Hide videos from gallery" to remove videos from the main image carousel. This is useful when using the Product Stories block to display videos separately.

### Wall Preview System
The wall preview system appears automatically for products tagged with "cuadro". Two buttons will be displayed below the product gallery:

**To use Modo Foto:**
1. Click "Modo Foto" button
2. Upload a photo of your wall
3. Drag the artwork to position it
4. Use the size slider to adjust dimensions
5. Click capture to download the preview

**To use Modo AR:**
1. Click "Modo AR" button
2. Grant camera access when prompted
3. Wait for AI models to load (~3-5 seconds first time)
4. Point camera at a wall
5. AI will automatically detect free space and place artwork
6. Use +/- buttons to adjust size
7. Click capture to save the AR view

**Requirements:**
- Product must have "cuadro" tag
- For AR mode: Modern browser with camera support (Chrome, Safari, Firefox)
- For AR mode: HTTPS connection (required by browsers for camera access)

---

## 📞 Support

For support and questions, contact the Hazel Home development team.

---

Made with ❤️ by Hazel Home

shopify theme dev --store=kqcqez-hq.myshopify.com