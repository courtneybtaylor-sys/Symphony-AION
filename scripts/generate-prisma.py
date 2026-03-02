#!/usr/bin/env python3
import subprocess
import sys
import os

# Ensure we're in the right directory
project_dir = '/vercel/share/v0-project'

try:
    print(f'[Prisma] Generating Prisma client...')
    print(f'[Prisma] Working directory: {project_dir}')
    
    # Run npx prisma generate
    result = subprocess.run(
        ['npx', 'prisma', 'generate', '--verbose'],
        cwd=project_dir,
        env={**os.environ, 'PWD': project_dir},
        capture_output=False,
        text=True,
        timeout=120
    )
    
    if result.returncode == 0:
        print('[Prisma] ✓ Client generation completed successfully')
        sys.exit(0)
    else:
        print(f'[Prisma] ✗ Generation failed with code {result.returncode}')
        sys.exit(1)
        
except subprocess.TimeoutExpired:
    print('[Prisma] ✗ Generation timeout')
    sys.exit(1)
except Exception as e:
    print(f'[Prisma] ✗ Error: {e}')
    sys.exit(1)
