import time
import uasyncio as asyncio

print('3s delay, Ctrl+C now if needed...')
time.sleep(3)
print('Starting FAT-HW program...')

#try:
# now run main loop
import fathw
#except Exception as e:
#    print('fathw', repr(e))
#    asyncio.new_event_loop()

print('Exiting')