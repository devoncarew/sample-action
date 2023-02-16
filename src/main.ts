import path from 'path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as system from './system'
import * as versions from './versions'
import * as tc from '@actions/tool-cache'

// todo: if using the 2.19.x, determine the latest 2.19 version

// todo: "When enabled through env variables, create OIDC token for publishing
//       on pub.dev."

// todo: cache pub dirs?

async function run(): Promise<void> {
  try {
    // sdk
    let sdk: string = core.getInput('sdk')
    if (sdk.length === 0) {
      sdk = 'stable'
    }

    // flavor
    let flavor: string = core.getInput('flavor')
    if (flavor.length === 0) {
      flavor = sdk === 'main' ? 'raw' : 'release'
    } else if (flavor !== 'raw' && flavor !== 'release') {
      core.setFailed(`Unrecognized build flavor '${flavor}'.`)
      return
    }

    // os
    const os: string = system.getPlatform()

    // architecture
    let architecture: string = core.getInput('architecture')
    if (architecture.length === 0) {
      architecture = system.getArch()
    }

    // calculate version and channel
    let version: string
    let channel: string

    if (sdk === 'stable' || sdk === 'beta' || sdk === 'dev') {
      channel = sdk
      version = (await versions.getLatestVersion(channel, flavor)) as string
    } else if (sdk === 'main') {
      channel = 'be'
      version = (await versions.getLatestVersion(channel, flavor)) as string
    } else {
      version = sdk

      // Derive the channel from the version string.
      if (sdk.includes('dev')) {
        channel = 'dev'
      } else if (sdk.includes('beta')) {
        channel = 'beta'
      } else if (sdk.includes('main')) {
        core.setFailed('Versions cannot be specified for main channel builds.')
        return
      } else {
        channel = 'stable'
      }
    }

    core.info(
      `Installing the ${os}-${architecture} Dart SDK version ${version} from ` +
        `the ${channel} (${flavor}) channel.`
    )

    // Calculate url based on https://dart.dev/tools/sdk/archive#download-urls.
    const url =
      'https://storage.googleapis.com/dart-archive/' +
      `channels/${channel}/${flavor}/${version}/sdk/` +
      `dartsdk-${os}-${architecture}-release.zip`

    // use cached sdk, or download and cache the sdk
    const toolName = flavor === 'raw' ? 'dart-be' : 'dart'
    let sdkPath = tc.find(toolName, version, architecture)
    if (sdkPath) {
      core.info(`Using cached sdk from ${sdkPath}.`)
    } else {
      core.info(url)

      const archivePath = await tc.downloadTool(url)
      let extractedFolder = await tc.extractZip(archivePath)
      extractedFolder = path.join(extractedFolder, 'dart-sdk')

      sdkPath = await tc.cacheDir(
        extractedFolder,
        toolName,
        version,
        architecture
      )
    }

    let pubCache
    if (os === 'windows') {
      pubCache = path.join(process.env['USERPROFILE'] as string, '.pub-cache')
    } else {
      pubCache = path.join(process.env['HOME'] as string, '.pub-cache')
    }

    core.exportVariable('DART_HOME', sdkPath)
    core.addPath(path.join(sdkPath, 'bin'))
    core.exportVariable('PUB_CACHE', pubCache)
    core.addPath(path.join(pubCache, 'bin'))

    // Configure the outputs.
    core.setOutput('dart-home', sdkPath)
    core.setOutput('dart-version', version)

    // Report success; print version.
    await exec.exec('dart', ['--version'])
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
