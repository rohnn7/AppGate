package com.appgate

import android.accessibilityservice.AccessibilityService
import android.graphics.PixelFormat
import android.util.Log
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.Button
import android.widget.TextView

/**
 * Detection (§10.1) + overlay enforcement (§10.2). At this build-order step
 * (§12 step 6) the overlay is wired to a single hardcoded package to prove the
 * WindowManager mechanics — touch swallowing, back consumption, "Go home" —
 * work before real cache-driven mode logic lands in step 7.
 */
class AppGateAccessibilityService : AccessibilityService() {

    private var lastForegroundPackage: String? = null
    private var overlayView: View? = null

    private val windowManager: WindowManager
        get() = getSystemService(WINDOW_SERVICE) as WindowManager

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "Service connected")
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

        // Step 6 stub: hardcoded target proves the overlay mechanics work.
        // Real cache-driven BLOCK/MESSAGE logic replaces this in step 7.
        if (packageName == HARDCODED_TEST_PACKAGE) {
            showOverlay(
                title = "Blocked",
                message = "Hardcoded test overlay (build-order step 6). Real block logic lands in step 7.",
                showContinue = false,
            )
        }
    }

    override fun onInterrupt() {
        // No ongoing operation to interrupt.
    }

    override fun onDestroy() {
        super.onDestroy()
        removeOverlay()
    }

    private fun showOverlay(title: String, message: String, showContinue: Boolean) {
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
                // Grace-period timestamp wiring lands in step 8.
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

        windowManager.addView(view, params)
        view.requestFocus()
        overlayView = view
    }

    private fun removeOverlay() {
        overlayView?.let { windowManager.removeView(it) }
        overlayView = null
    }

    companion object {
        private const val TAG = "AppGate"
        private const val HARDCODED_TEST_PACKAGE = "com.instagram.android"
    }
}
