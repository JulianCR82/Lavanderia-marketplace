const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const androidDirectory = resolve(__dirname, '../android');
if (!existsSync(resolve(androidDirectory, 'gradlew.bat'))) {
  console.error('Genera Android primero: pnpm exec expo prebuild --platform android --no-install');
  process.exit(1);
}

// Keep Android Studio, Docker and the emulator usable on a 16 GB workstation.
// These flags affect this build only; generated Gradle files stay untouched.
const args = [
  'app:assembleDebug', '-x', 'lint', '-x', 'test',
  '--no-daemon', '--no-parallel', '--max-workers=2', '--build-cache',
  '-Dorg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m -XX:ActiveProcessorCount=2',
  '-Pkotlin.compiler.execution.strategy=in-process',
  '-PreactNativeArchitectures=x86_64',
  // SDK 58 supports this override for every native module. Its newer Ninja
  // handles the long node_modules paths that fail with CMake 3.22.1 / Ninja 1.10.
  '-Pandroid.cmakeVersion=3.31.6',
  '-PreactNativeDevServerPort=8081',
];
const env = { ...process.env, CMAKE_BUILD_PARALLEL_LEVEL: '2' };
const windows = process.platform === 'win32';
// Arguments are fixed above; no shell text comes from environment or user input.
const command = windows ? 'cmd.exe' : './gradlew';
const commandArgs = windows
  ? ['/d', '/s', '/c', `gradlew.bat ${args.map((value) => `"${value}"`).join(' ')}`]
  : args;
const result = spawnSync(command, commandArgs, {
  cwd: androidDirectory, env, stdio: 'inherit', windowsVerbatimArguments: windows,
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
