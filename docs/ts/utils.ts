export const sleep = async (ms: number) => await new Promise(r => setTimeout(r, ms))

export const waitFor = async function waitFor (f: () => any) {
  while (!f()) await sleep(100 + Math.random() * 25)
  return f()
}

export const waitForTimeout = async function waitFor (f: () => any, timeoutSec: number) {
  let totalTimeMs = 0
  while (!f() && totalTimeMs < timeoutSec * 1000) {
    const delayMs = 100 + Math.random() * 25
    totalTimeMs += delayMs
    await sleep(delayMs)
  }
  return f()
}

/**
 * Helper function to convert a value into an enum value

 */
export function Parse (enumtype: any, enumvalue: any): any {
  for (const enumName in enumtype) {
    if (enumtype[enumName] == enumvalue) {
      /* jshint -W061 */
      return eval(enumtype + '.' + enumName)
    }
  }
  return null
}

/**
 * Helper function to dump arraybuffer as hex string
 */
export function buf2hex (buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join(' ')
}

function hex2buf (input: string): ArrayBuffer {
  if (typeof input !== 'string') {
    throw new TypeError('Expected input to be a string')
  }
  const hexstr = input.replace(/\s+/g, '')
  if ((hexstr.length % 2) !== 0) {
    throw new RangeError('Expected string to be an even number of characters')
  }

  const view = new Uint8Array(hexstr.length / 2)

  for (let i = 0; i < hexstr.length; i += 2) {
    view[i / 2] = parseInt(hexstr.substring(i, i + 2), 16)
  }

  return view.buffer
}
