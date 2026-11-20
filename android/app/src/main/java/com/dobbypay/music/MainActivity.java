package com.dobbypay.music;

import android.content.Context;
import android.content.Intent;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        MediaPlaybackService.setCommandListener(this::dispatchMediaCommand);
        configureWebViewAudio();
        // Intercept system Back so the app goes to the previous screen instead of closing
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleHardwareBack();
            }
        });
    }

    private void handleHardwareBack() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            leaveAppWithoutKilling();
            return;
        }

        getBridge().getWebView().evaluateJavascript(
            "(function(){try{return (window.__handleAndroidBackButton&&window.__handleAndroidBackButton())?'handled':'unhandled';}catch(e){return 'unhandled';}})()",
            value -> runOnUiThread(() -> {
                String result = value == null ? "" : value;
                if (result.contains("handled")) {
                    return; // JS navigated to previous screen / closed a modal
                }
                long now = System.currentTimeMillis();
                if (now - lastBackPressTime < 2000) {
                    leaveAppWithoutKilling();
                } else {
                    lastBackPressTime = now;
                    android.widget.Toast.makeText(
                        MainActivity.this,
                        "Press back again to leave",
                        android.widget.Toast.LENGTH_SHORT
                    ).show();
                }
            })
        );
    }

    /** Prefer backgrounding so music can keep playing; do not force-kill. */
    private void leaveAppWithoutKilling() {
        try {
            moveTaskToBack(true);
        } catch (Exception e) {
            finish();
        }
    }

    private void dispatchMediaCommand(String command) {
        runOnUiThread(() -> {
            if (getBridge() == null || getBridge().getWebView() == null) return;
            String safe = command == null ? "" : command.replace("'", "");
            getBridge().getWebView().evaluateJavascript(
                "window.__mediaControl && window.__mediaControl('" + safe + "')",
                null
            );
        });
    }

    private void configureWebViewAudio() {
        if (getBridge() == null || getBridge().getWebView() == null) return;

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDomStorageEnabled(true);
        // Keep JS timers alive so track "ended" → next song still runs when screen is off
        webView.resumeTimers();

        webView.addJavascriptInterface(new PlaybackBridge(), "AndroidPlayback");
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void enterPiP() {
                runOnUiThread(() -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        try {
                            android.app.PictureInPictureParams.Builder builder =
                                new android.app.PictureInPictureParams.Builder();
                            builder.setAspectRatio(new android.util.Rational(16, 9));
                            enterPictureInPictureMode(builder.build());
                        } catch (Exception ignored) {}
                    }
                });
            }

            @JavascriptInterface
            public void openOverlaySettings() {
                runOnUiThread(() -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        try {
                            Intent intent = new Intent(
                                android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                android.net.Uri.parse("package:" + getPackageName())
                            );
                            startActivity(intent);
                        } catch (Exception ignored) {}
                    }
                });
            }

            /** Connected Bluetooth audio sink name, or empty if phone speaker / none. */
            @JavascriptInterface
            public String getConnectedBluetoothAudioDevice() {
                try {
                    AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                    if (am == null) return "";

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        AudioDeviceInfo[] devices = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                        for (AudioDeviceInfo device : devices) {
                            int type = device.getType();
                            boolean isBt =
                                type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
                                || type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
                                || type == AudioDeviceInfo.TYPE_BLE_HEADSET
                                || type == AudioDeviceInfo.TYPE_BLE_SPEAKER;
                            if (!isBt) continue;
                            CharSequence product = device.getProductName();
                            if (product != null) {
                                String name = product.toString().trim();
                                if (!name.isEmpty()) return name;
                            }
                        }
                    }

                    // Older / no product name: only report when A2DP/SCO is on
                    if (am.isBluetoothA2dpOn() || am.isBluetoothScoOn()) {
                        return "Bluetooth";
                    }
                } catch (Exception ignored) {}
                return "";
            }
        }, "AndroidBridge");
    }

    /**
     * Do NOT auto-enter PiP on lock / Home — that interrupts WebView audio
     * and breaks automatic next-song playback with the screen off.
     */
    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
    }

    @Override
    public void onPause() {
        super.onPause();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, android.content.res.Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "if (window.__setPipMode) { window.__setPipMode(" + isInPictureInPictureMode + "); } else { document.body.classList.toggle('in-pip-mode', " + isInPictureInPictureMode + "); }",
                null
            );
        }
    }

    private class PlaybackBridge {
        @JavascriptInterface
        public void startPlaybackService(String title, String artist) {
            updatePlayback(title, artist, true);
        }

        @JavascriptInterface
        public void updatePlayback(String title, String artist, boolean playing) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                    intent.setAction(MediaPlaybackService.ACTION_UPDATE);
                    intent.putExtra(MediaPlaybackService.EXTRA_TITLE, title != null ? title : "Playing");
                    intent.putExtra(MediaPlaybackService.EXTRA_ARTIST, artist != null ? artist : "");
                    intent.putExtra(MediaPlaybackService.EXTRA_PLAYING, playing);
                    ContextCompat.startForegroundService(MainActivity.this, intent);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void stopPlaybackService() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                    intent.setAction(MediaPlaybackService.ACTION_STOP);
                    startService(intent);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void keepTimersAlive() {
            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().resumeTimers();
                }
            });
        }
    }
}
