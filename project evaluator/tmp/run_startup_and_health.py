import asyncio
import os
import json

# Ensure local package resolution
import sys
sys.path.insert(0, '.')

import main as evaluator_main

async def do_startup_and_health():
    # Run startup_event (sets openai client and last_error)
    try:
        await evaluator_main.startup_event()
    except Exception as e:
        print('startup_event raised', e)
    h = await evaluator_main.health()
    print(json.dumps(h, indent=2))

asyncio.run(do_startup_and_health())
