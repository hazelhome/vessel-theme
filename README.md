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

## 📝 Usage

### Product Card Buy Button
The buy button automatically appears at the bottom of product cards and integrates with the existing quick add system.

### Variant Image Filtering
Add alt text to product images containing variant names (e.g., "Red Shirt", "Blue Dress") to enable automatic filtering.

### Product Stories
Add the "Product Stories" block to your product page through the theme editor to display product videos in an Instagram-style viewer. The block automatically detects and displays all video media associated with the product.

### Hiding Videos from Gallery
In the theme editor, go to the "Product Media" block settings and enable "Hide videos from gallery" to remove videos from the main image carousel. This is useful when using the Product Stories block to display videos separately.

---

## 📞 Support

For support and questions, contact the Hazel Home development team.

---

Made with ❤️ by Hazel Home

shopify theme dev --store=kqcqez-hq.myshopify.com