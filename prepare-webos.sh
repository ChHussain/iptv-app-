#!/bin/bash

# webOS Packaging Helper Script
# This script prepares the IPTV app for webOS deployment

echo "🚀 Preparing IPTV App for webOS Packaging..."

# Create a temporary directory for webOS build
BUILD_DIR="webos-build"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

echo "📁 Creating webOS build directory..."

# Copy essential files for webOS
cp -r css/ $BUILD_DIR/
cp -r js/ $BUILD_DIR/

# Copy only essential HTML files (exclude test files)
echo "📄 Copying essential HTML files..."
for html_file in index.html home.html player.html settings.html epg.html; do
    if [ -f "$html_file" ]; then
        cp "$html_file" $BUILD_DIR/
        echo "  ✓ Copied $html_file"
    fi
done

# Copy configuration files
echo "⚙️ Copying configuration files..."
cp appinfo.json $BUILD_DIR/
cp package.json $BUILD_DIR/

# Copy assets
echo "🖼️ Copying assets..."
cp *.png $BUILD_DIR/

# Copy webOS-specific portal test file and essential scripts
cp webos-portal-test.js $BUILD_DIR/
cp test-specified-portals.js $BUILD_DIR/

# Remove files that might cause packaging issues
echo "🗑️ Removing problematic files..."
rm -f $BUILD_DIR/js/mock-portal-test.js 2>/dev/null || true

# Remove test and development files from js directory
rm -f $BUILD_DIR/test-*.html $BUILD_DIR/cors-test.html $BUILD_DIR/test_portal.html 2>/dev/null || true

# Copy webOS-specific files
echo "📋 Copying webOS configuration files..."
if [ -f ".webosignore" ]; then
    cp .webosignore $BUILD_DIR/
fi

# Validate that essential files exist
echo "✅ Validating build structure..."
REQUIRED_FILES=("appinfo.json" "index.html" "js/auth.js" "js/api.js" "webos-portal-test.js")

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$BUILD_DIR/$file" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ❌ $file missing"
        exit 1
    fi
done

# Show final build structure
echo ""
echo "📊 Final webOS build structure:"
find $BUILD_DIR -type f -name "*.js" -o -name "*.html" -o -name "*.json" | sort

echo ""
echo "🎯 webOS build prepared in $BUILD_DIR/"
echo ""
echo "Next steps:"
echo "1. cd $BUILD_DIR"
echo "2. ares-package ."
echo "3. ares-install *.ipk"
echo "4. ares-launch com.iptv.webos"
echo ""
echo "Note: If minification errors persist, try:"
echo "  ares-package . --no-minify"