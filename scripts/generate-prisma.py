#!/usr/bin/env python3
import subprocess
import sys
import os

os.chdir('/vercel/share/v0-project')

try:
    print('[Prisma] Generating Prisma client...')
    result = subprocess.run(['npx', 'prisma', 'generate'], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print('[Prisma Error]:', result.stderr)
    if result.returncode == 0:
        print('[Prisma] Client generation completed successfully')
    else:
        print(f'[Prisma] Generation failed with code {result.returncode}')
        sys.exit(result.returncode)
except Exception as e:
    print(f'[Prisma] Error: {e}')
    sys.exit(1)
