import os from 'os'

export function getPlatform(): string {
  const plat: string = os.platform()

  // return either 'linux', 'windows', or 'macos'
  if (plat === 'win32') {
    return 'windows'
  } else if (plat === 'darwin') {
    return 'macos'
  } else {
    return 'linux'
  }
}

export function getArch(): string {
  // return 'x64', 'ia32', 'arm', or 'arm64'
  const supported = ['x64', 'ia32', 'arm', 'arm64']

  const arch: string = os.arch()
  if (supported.includes(arch)) {
    return arch
  } else {
    return 'x64'
  }
}
