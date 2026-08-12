package com.appgate

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.graphics.PixelFormat
import android.util.Log
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.Button
import android.widget.TextView
import java.io.File

/**
 * Detection (§10.1) + overlay enforcement (§10.2), driven by AppGateConfigCache.
 * graceUntil is deliberately in-memory only, native-side, and resets if the
 * service restarts (§3.2) — it never crosses to JS and is never persisted.
 */
class AppGateAccessibilityService : AccessibilityService() {

    private var lastForegroundPackage: String? = null
    private var overlayView: View? = null
    private val graceUntil = mutableMapOf<String, Long>()

    private val windowManager: WindowManager
        get() = getSystemService(WINDOW_SERVICE) as WindowManager

    override fun onServiceConnected() {
        super.onServiceConnected()

        // Some OEM skins (observed on MIUI) don't reliably apply the
        // accessibility_service_config.xml meta-data — dumpsys accessibility
        // showed eventTypes= empty despite the manifest declaration, so no
        // events were ever delivered. Set it programmatically as well so this
        // doesn't depend on the manifest path working.
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100
            flags = AccessibilityServiceInfo.DEFAULT
        }

        // Populate the cache from disk in case the service is starting after a
        // reboot, when JS (and therefore loadConfig()) has never run (§4).
        val configFile = File(filesDir, "appgate_config.json")
        if (configFile.exists()) {
            AppGateConfigCache.configJson = configFile.readText()
        }
        Log.d(TAG, "Service connected, cache has ${AppGateConfigCache.parsed().size} entries")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val packageName = event?.packageName?.toString() ?: return
        if (packageName == applicationContext.packageName || packageName == "com.android.systemui") {
            return
        }
        // Only act on a transition into a package, not every event fired while
        // already inside it (§10.1).
        if (packageName == lastForegroundPackage) {
            return
        }
        lastForegroundPackage = packageName
        Log.d(TAG, "Foreground: $packageName")

        val app = AppGateConfigCache.parsed().find { it.packageName == packageName }
        if (app == null) {
            Log.d(TAG, "$packageName not gated (cache has ${AppGateConfigCache.parsed().size} entries)")
            return
        }
        val now = System.currentTimeMillis()

        when (app.mode) {
            "BLOCK" -> {
                Log.d(TAG, "$packageName is BLOCK, blockUntilMillis=${app.blockUntilMillis}, now=$now")
                if (app.blockUntilMillis != null && now < app.blockUntilMillis) {
                    Log.d(TAG, "Blocking $packageName")
                    showOverlay(
                        title = "Blocked",
                        message = "This app is blocked right now.",
                        showContinue = false,
                        packageName = packageName,
                    )
                } else {
                    Log.d(TAG, "$packageName block expired or unset, letting it open")
                }
            }
            "MESSAGE" -> {
                val grace = graceUntil[packageName] ?: 0L
                Log.d(TAG, "$packageName is MESSAGE, grace=$grace, now=$now")
                if (now > grace) {
                    Log.d(TAG, "Showing message for $packageName")
                    showOverlay(
                        title = "Wait",
                        message = app.message ?: "",
                        showContinue = true,
                        packageName = packageName,
                    )
                }
            }
            else -> Log.w(TAG, "$packageName has unrecognized mode: '${app.mode}'")
        }
    }

    override fun onInterrupt() {
        // No ongoing operation to interrupt.
    }

    override fun onDestroy() {
        super.onDestroy()
        removeOverlay()
    }

    private fun showOverlay(title: String, message: String, showContinue: Boolean, packageName: String) {
        // Always remove any existing overlay before adding a new one — leaking
        // overlay views is the most common crash source here (§10.2).
        removeOverlay()

        val view = LayoutInflater.from(this).inflate(R.layout.overlay_block, null)
        view.findViewById<TextView>(R.id.overlay_title).text = title
        view.findViewById<TextView>(R.id.overlay_message).text = message

        val primaryButton = view.findViewById<Button>(R.id.overlay_primary_button)
        primaryButton.text = if (showContinue) "Go back" else "Go home"
        primaryButton.setOnClickListener {
            performGlobalAction(GLOBAL_ACTION_HOME)
            removeOverlay()
        }

        val secondaryButton = view.findViewById<Button>(R.id.overlay_secondary_button)
        if (showContinue) {
            secondaryButton.visibility = View.VISIBLE
            secondaryButton.setOnClickListener {
                graceUntil[packageName] = System.currentTimeMillis() + GRACE_PERIOD_MILLIS
                removeOverlay()
            }
        } else {
            secondaryButton.visibility = View.GONE
        }

        view.isFocusableInTouchMode = true
        view.setOnKeyListener { _, keyCode, _ -> keyCode == KeyEvent.KEYCODE_BACK }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.OPAQUE,
        )

        try {
            windowManager.addView(view, params)
            view.requestFocus()
            overlayView = view
        } catch (e: Exception) {
            // Most likely missing SYSTEM_ALERT_WINDOW / "display over other
            // apps" not actually granted despite canDrawOverlays() — surface
            // it loudly instead of failing silently.
            Log.e(TAG, "Failed to add overlay for $packageName", e)
        }
    }

    private fun removeOverlay() {
        overlayView?.let { windowManager.removeView(it) }
        overlayView = null
    }

    companion object {
        private const val TAG = "AppGate"
        private const val GRACE_PERIOD_MILLIS = 5 * 60 * 1000L
    }
}
