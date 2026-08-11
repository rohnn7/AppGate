package com.appgate

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Detection only at this build-order step (§12 step 5): log foreground
 * transitions into watched-looking packages, nothing else. Cache lookup and
 * overlay enforcement land in later steps.
 */
class AppGateAccessibilityService : AccessibilityService() {

    private var lastForegroundPackage: String? = null

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
    }

    override fun onInterrupt() {
        // No ongoing operation to interrupt at this step.
    }

    companion object {
        private const val TAG = "AppGate"
    }
}
