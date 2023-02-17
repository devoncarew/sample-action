import {arch, platform} from 'os'

// Returns 'linux', 'windows', or 'macos'.
export function getPlatform(): string {
  return platform() === 'win32'
    ? 'windows'
    : platform() === 'darwin'
    ? 'macos'
    : 'linux'
}

// Returns 'x64', 'ia32', 'arm', or 'arm64'.
export function getArch(): string {
  const supported = ['x64', 'ia32', 'arm', 'arm64']
  return supported.includes(arch()) ? arch() : 'x64'
}
