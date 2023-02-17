import fs from 'fs'
import path from 'path'

export function getVersionFromSdk(sdkPath: string): string | null {
  const versionFilePath = path.join(sdkPath, 'version')

  if (fs.existsSync(versionFilePath)) {
    return fs.readFileSync(versionFilePath, 'utf8').trim()
  } else {
    return null
  }
}
