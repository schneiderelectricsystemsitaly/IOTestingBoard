import uasyncio as asyncio
from os import remove, stat
from machine import freq
import test
import gc


def file_or_dir_exists(filename):
    try:
        stat(filename)
        return True
    except OSError:
        return False


if file_or_dir_exists('test_results.txt'):
    remove('test_results.txt')

gc.collect()
freq(160000000)
asyncio.run(test.main())

