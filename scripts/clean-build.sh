#!/bin/bash
# Clean build cache and rebuild Symphony-AION

echo "Cleaning build artifacts..."
rm -rf .next node_modules/.cache

echo "Reinstalling dependencies..."
npm install

echo "Generating Prisma client..."
npm run prisma:generate

echo "Building Next.js application..."
npm run build

echo "Build complete! Starting development server..."
npm run dev
