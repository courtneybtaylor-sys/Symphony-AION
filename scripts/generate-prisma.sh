#!/bin/bash

# Prisma Client Generation Script
# Generates the Prisma client from the schema before build

set -e

echo "📋 Installing dependencies..."
npm install

echo "🔄 Generating Prisma client..."
npx prisma generate

echo "✅ Prisma client generated successfully"
