const BT_LABEL_RE =
  /bluetooth|buds|airpods|headset|earphone|earbud|galaxy buds|redmi buds|realme buds|oppo|jbl|boat|sony|wh-|\ba2dp\b/i;

const BUILTIN_RE =
  /default|speaker|communications|built-?in|internal|earpiece|receiver|hdmi|wired|usb|handset/i;

function cleanLabel(label) {
  return String(label || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^Default\s*-\s*/i, '')
    .trim();
}

function looksLikeBluetooth(label) {
  const name = cleanLabel(label);
  if (!name) return false;
  if (BUILTIN_RE.test(name) && !BT_LABEL_RE.test(name)) return false;
  return BT_LABEL_RE.test(name);
}

/** Native Android bridge (Capacitor WebView). */
function readAndroidBluetoothName() {
  try {
    const bridge = typeof window !== 'undefined' ? window.AndroidBridge : null;
    if (!bridge || typeof bridge.getConnectedBluetoothAudioDevice !== 'function') return '';
    const name = bridge.getConnectedBluetoothAudioDevice();
    return cleanLabel(name);
  } catch {
    return '';
  }
}

/** Browser / WebView: scan audiooutput devices for a Bluetooth-looking sink. */
async function readWebBluetoothName() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return '';
  }
  try {
    // Labels are often empty until a prior media permission; try quietly.
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter((d) => d.kind === 'audiooutput' && d.label);
    const bt = outputs.find((d) => looksLikeBluetooth(d.label));
    if (bt) return cleanLabel(bt.label);
    return '';
  } catch {
    return '';
  }
}

/**
 * Returns the connected Bluetooth audio device name, or '' if none.
 * Prefer native Android detection; fall back to mediaDevices labels on web.
 */
export async function getConnectedBluetoothDeviceName() {
  const native = readAndroidBluetoothName();
  if (native) return native;
  return readWebBluetoothName();
}
