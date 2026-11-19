package com.saifix.ai

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class SaifixAccessibilityService : AccessibilityService() {

    companion object {
        var instance: SaifixAccessibilityService? = null
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Live window events observed for node lookups
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }

    fun performControl(action: String, target: String, x: Float, y: Float): Boolean {
        return when (action.lowercase()) {
            "back" -> performGlobalAction(GLOBAL_ACTION_BACK)
            "home" -> performGlobalAction(GLOBAL_ACTION_HOME)
            "recents" -> performGlobalAction(GLOBAL_ACTION_RECENTS)
            "notifications" -> performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
            "tap_text" -> clickNodeByText(target)
            "tap_xy" -> if (x >= 0f && y >= 0f) dispatchTap(x, y) else false
            "scroll_down" -> dispatchSwipe(540f, 1500f, 540f, 600f)
            "scroll_up" -> dispatchSwipe(540f, 600f, 540f, 1500f)
            "swipe_left" -> dispatchSwipe(900f, 1000f, 180f, 1000f)
            "swipe_right" -> dispatchSwipe(180f, 1000f, 900f, 1000f)
            else -> false
        }
    }

    private fun clickNodeByText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        if (text.isBlank()) return false
        val matches = root.findAccessibilityNodeInfosByText(text)
        for (node in matches) {
            var current: AccessibilityNodeInfo? = node
            while (current != null) {
                if (current.isClickable) {
                    return current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                }
                current = current.parent
            }
        }
        return false
    }

    private fun dispatchTap(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 80))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    private fun dispatchSwipe(x1: Float, y1: Float, x2: Float, y2: Float): Boolean {
        val path = Path().apply {
            moveTo(x1, y1)
            lineTo(x2, y2)
        }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 260))
            .build()
        return dispatchGesture(gesture, null, null)
    }
}
