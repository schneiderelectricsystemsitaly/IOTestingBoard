import os
import subprocess


def copy_files(directory, dest_dir, orig_dir=None):
    if orig_dir == None:
        orig_dir = dest_dir
    print(directory, dest_dir)
    output = subprocess.check_output(['ampy', '-p', 'COM10', 'ls', directory]).decode("utf-8")
    files = output.split('\n')

    for f in files:
        if "." in f:
            command = ['ampy', '-p', 'COM10', 'get', f[:-1], os.path.join(dest_dir, f[len(directory) + 1:-1])]
            print(command)
            subprocess.check_output(command)
        else:
            if len(f) > 0:
                copy_files(f[:-1], orig_dir + f[:-1].replace('/', '\\'), orig_dir)


copy_files('', 'D:\\GitHub\\SE_HW_FAT\\docs\\Smart IOBoard\\firmware')
