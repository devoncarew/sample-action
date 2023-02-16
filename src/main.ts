import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as system from './system'
import * as tc from '@actions/tool-cache'

// todo: if using the 2.19.x, determine the latest 2.19 version

// todo: if using a channel (stable), determine version

// todo: "When enabled through env variables, create OIDC token for publishing
//       on pub.dev."

async function run(): Promise<void> {
  try {
    let sdk: string = core.getInput('sdk')
    if (sdk.length === 0) {
      sdk = 'stable'
    }

    let architecture: string = core.getInput('architecture')
    if (architecture.length === 0) {
      architecture = system.getArch()
    }

    const os: string = system.getPlatform()

    let version: string
    let channel: string

    if (sdk === 'stable' || sdk === 'beta' || sdk === 'dev' || sdk === 'main') {
      version = 'latest'
      channel = sdk
    } else {
      version = sdk
      channel = 'stable'

      // Derive the channel from the version string
      if (sdk.includes('dev')) {
        channel = 'dev'
      } else if (sdk.includes('beta')) {
        channel = 'beta'
      } else if (sdk.includes('main')) {
        core.setFailed(
          'Versions cannot be specified for builds from the main channel.'
        )
        return
      }
    }

    let flavor: string = core.getInput('flavor')
    if (flavor.length === 0) {
      flavor = sdk === 'main' ? 'raw' : 'release'
    } else if (flavor !== 'raw' && flavor !== 'release') {
      core.setFailed(`Unrecognized build flavor '${flavor}'.`)
      return
    }

    core.info(
      `Installing Dart SDK version '${version}' from the ${channel} channel (${flavor}) on ${os}-${architecture}`
    )

    // Calculate download Url based on
    // https://dart.dev/tools/sdk/archive#download-urls.
    const prefix = 'https://storage.googleapis.com/dart-archive/channels'
    const build = `sdk/dartsdk-${os}-${architecture}-release.zip`
    let url: string
    if (sdk === 'main') {
      url = `${prefix}/be/raw/latest/${build}`
    } else {
      url = `${prefix}/${channel}/${flavor}/${version}/${build}`
    }

    // todo: use flavor, ...
    let sdkPath = tc.find('dart', version, architecture)
    if (sdkPath) {
      core.info(`Using cached sdk from ${sdkPath}.`)
    } else {
      core.info(`Downloading ${url}...`)

      const archivePath = await tc.downloadTool(url)
      const extractedFolder = await tc.extractZip(archivePath, 'dart-sdk')

      // todo: include flavor, ...
      sdkPath = await tc.cacheDir(
        extractedFolder,
        'dart',
        version, // todo: resolve to the actual version
        architecture
      )
    }

    let pubCache = `${process.env.HOME}/.pub-cache`
    if (os === 'windows') {
      pubCache = `${process.env.USERPROFILE}\\.pub-cache`
    }

    core.exportVariable('DART_HOME', sdkPath)
    core.addPath(sdkPath + core.toPlatformPath('/bin'))
    core.exportVariable('PUB_CACHE', pubCache)
    core.addPath(pubCache + core.toPlatformPath('/bin'))

    // Configure the outputs.
    core.setOutput('dart-version', version)

    // Report success; print version.
    core.info('Successfully installed Dart SDK:')
    await exec.exec('dart', ['--version'], {
      cwd: sdkPath + core.toPlatformPath('/bin')
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
