import uasyncio as asyncio
from os import remove, stat
import test
import gc


def file_or_dir_exists(filename):
    try:
        os.stat(filename)
        return True
    except OSError:
        return False


if file_or_dir_exists('test_results.txt'):
    remove('test_results.txt')

gc.collect()
asyncio.run(test.main())

