package com.dobbypay.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

/**
 * Foreground media notification and MediaSession.
 * Lock-screen and Bluetooth buttons (play, pause, next, previous)
 * are forwarded to the WebView player.
 */
public class MediaPlaybackService extends Service {
    public static final String CHANNEL_ID = "dobbypay_playback";
    public static final int NOTIFICATION_ID = 4401;
    public static final String ACTION_START = "com.dobbypay.music.START_PLAYBACK";
    public static final String ACTION_UPDATE = "com.dobbypay.music.UPDATE_PLAYBACK";
    public static final String ACTION_STOP = "com.dobbypay.music.STOP_PLAYBACK";
    public static final String ACTION_PLAY = "com.dobbypay.music.PLAY";
    public static final String ACTION_PAUSE = "com.dobbypay.music.PAUSE";
    public static final String ACTION_NEXT = "com.dobbypay.music.NEXT";
    public static final String ACTION_PREV = "com.dobbypay.music.PREV";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_PLAYING = "playing";

    public interface CommandListener {
        void onMediaCommand(String command);
    }

    private static CommandListener commandListener;

    public static void setCommandListener(CommandListener listener) {
        commandListener = listener;
    }

    private PowerManager.WakeLock wakeLock;
    private MediaSession mediaSession;
    private String title = "Playing music";
    private String artist = "Spotify";
    private boolean isPlaying = true;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DobbyPayMusic::PlaybackWakeLock");
            wakeLock.setReferenceCounted(false);
        }

        mediaSession = new MediaSession(this, "DobbyPayMusic");
        mediaSession.setFlags(
            MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                handleTransport(ACTION_PLAY);
            }

            @Override
            public void onPause() {
                handleTransport(ACTION_PAUSE);
            }

            @Override
            public void onSkipToNext() {
                handleTransport(ACTION_NEXT);
            }

            @Override
            public void onSkipToPrevious() {
                handleTransport(ACTION_PREV);
            }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP.equals(action)) {
            if (mediaSession != null) mediaSession.setActive(false);
            stopForeground(STOP_FOREGROUND_REMOVE);
            releaseWakeLock();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (intent != null) {
            String nextTitle = intent.getStringExtra(EXTRA_TITLE);
            String nextArtist = intent.getStringExtra(EXTRA_ARTIST);
            if (nextTitle != null && !nextTitle.trim().isEmpty()) title = nextTitle;
            if (nextArtist != null) artist = nextArtist;
        }

        if (ACTION_PLAY.equals(action) || ACTION_PAUSE.equals(action)
            || ACTION_NEXT.equals(action) || ACTION_PREV.equals(action)) {
            handleTransport(action);
            return START_STICKY;
        }

        if (ACTION_UPDATE.equals(action) && intent != null && intent.hasExtra(EXTRA_PLAYING)) {
            isPlaying = intent.getBooleanExtra(EXTRA_PLAYING, true);
        } else if (!ACTION_UPDATE.equals(action)) {
            isPlaying = true;
        }

        publish();
        return START_STICKY;
    }

    private void handleTransport(String action) {
        if (ACTION_PLAY.equals(action) || ACTION_NEXT.equals(action) || ACTION_PREV.equals(action)) {
            isPlaying = true;
        } else if (ACTION_PAUSE.equals(action)) {
            isPlaying = false;
        }
        publish();
        CommandListener listener = commandListener;
        if (listener == null) return;
        if (ACTION_PLAY.equals(action)) listener.onMediaCommand("play");
        else if (ACTION_PAUSE.equals(action)) listener.onMediaCommand("pause");
        else if (ACTION_NEXT.equals(action)) listener.onMediaCommand("next");
        else if (ACTION_PREV.equals(action)) listener.onMediaCommand("prev");
    }

    private void publish() {
        acquireWakeLock();
        publishSession();
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void publishSession() {
        if (mediaSession == null) return;
        long actions = PlaybackState.ACTION_PLAY
            | PlaybackState.ACTION_PAUSE
            | PlaybackState.ACTION_PLAY_PAUSE
            | PlaybackState.ACTION_SKIP_TO_NEXT
            | PlaybackState.ACTION_SKIP_TO_PREVIOUS;
        PlaybackState state = new PlaybackState.Builder()
            .setActions(actions)
            .setState(
                isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                PlaybackState.PLAYBACK_POSITION_UNKNOWN,
                isPlaying ? 1f : 0f
            )
            .build();
        mediaSession.setPlaybackState(state);
        mediaSession.setMetadata(new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, "DobbyPay Music")
            .build());
        mediaSession.setPlaybackToLocal(new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build());
        mediaSession.setActive(true);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Playback controls on the lock screen and Bluetooth devices");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private PendingIntent commandIntent(String action, int requestCode) {
        Intent intent = new Intent(this, MediaPlaybackService.class);
        intent.setAction(action);
        return PendingIntent.getService(
            this,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private Notification buildNotification() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            launch != null ? launch : new Intent(this, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int playIcon = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playLabel = isPlaying ? "Pause" : "Play";
        String playAction = isPlaying ? ACTION_PAUSE : ACTION_PLAY;

        Notification.MediaStyle style = new Notification.MediaStyle()
            .setMediaSession(mediaSession.getSessionToken())
            .setShowActionsInCompactView(0, 1, 2);

        Notification.Builder builder = new Notification.Builder(this)
            .setContentTitle(title)
            .setContentText(artist)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setStyle(style)
            .addAction(android.R.drawable.ic_media_previous, "Previous", commandIntent(ACTION_PREV, 11))
            .addAction(playIcon, playLabel, commandIntent(playAction, 12))
            .addAction(android.R.drawable.ic_media_next, "Next", commandIntent(ACTION_NEXT, 13));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setChannelId(CHANNEL_ID);
        }

        return builder.build();
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(6 * 60 * 60 * 1000L);
            }
        } catch (Exception ignored) {}
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
