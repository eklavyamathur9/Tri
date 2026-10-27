import os from 'node:os';
import { linuxPlatform } from './linux.js';
import { windowsPlatform } from './windows.js';

const platform = os.platform() === 'win32' ? windowsPlatform : linuxPlatform;
export default platform;
export const isWindows = os.platform() === 'win32';
export const isLinux = os.platform() === 'linux';
export const isMac = os.platform() === 'darwin';
