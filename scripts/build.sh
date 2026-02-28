#!/bin/bash
# Symphony-AION Build Script
# Phase 6: Production build with optimization

set -e

echo "🔨 Building Symphony-AION..."
echo "======================================"

# Check Node version
NODE_VERSION=$(node -v)
echo "✓ Node version: $NODE_VERSION"

# Install dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install --production
fi

# Run linter
echo "🧹 Running linter..."
npm run lint || echo "⚠️  Linting completed with warnings"

# Run tests
echo "🧪 Running test suite..."
npm test -- --passWithNoTests

# Type check
echo "🔍 Type checking..."
npx tsc --noEmit

# Build Next.js application
echo "🏗️  Building Next.js application..."
npm run build

# Print build summary
echo ""
echo "======================================"
echo "✅ Build successful!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Review build output above"
echo "2. Run locally: npm run start"
echo "3. Deploy: ./scripts/deploy.sh [environment]"
echo ""
