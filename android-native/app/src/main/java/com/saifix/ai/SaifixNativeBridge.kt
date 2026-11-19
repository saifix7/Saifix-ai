package com.saifix.ai

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.webkit.JavascriptInterface
import org.json.JSONObject

class SaifixNativeBridge(private val context: Context) {

    @JavascriptInterface
    fun isNativeApk(): Boolean = true

    @JavascriptInterface
    fun openApp(appNameOrPackage: String): String {
        val query = appNameOrPackage.trim().lowercase()
        val pm = context.packageManager

        val directIntent = pm.getLaunchIntentForPackage(appNameOrPackage.trim())
        if (directIntent != null) {
            directIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(directIntent)
            return JSONObject().apply {
                put("ok", true)
                put("label", appNameOrPackage)
            }.toString()
        }

        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val apps = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.queryIntentActivities(mainIntent, PackageManager.ResolveInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION")
            pm.queryIntentActivities(mainIntent, 0)
        }

        val match = apps.firstOrNull { info ->
            val label = info.loadLabel(pm).toString().lowercase()
            val pkg = info.activityInfo.packageName.lowercase()
            label == query || label.contains(query) || pkg.contains(query)
        }

        return if (match != null) {
            val launch = pm.getLaunchIntentForPackage(match.activityInfo.packageName)
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launch)
                JSONObject().apply {
                    put("ok", true)
                    put("label", match.loadLabel(pm).toString())
                    put("packageName", match.activityInfo.packageName)
                }.toString()
            } else {
                JSONObject().apply {
                    put("ok", false)
                    put("error", "App found but cannot be launched.")
                }.toString()
            }
        } else {
            JSONObject().apply {
                put("ok", false)
                put("error", "No installed app matched '$appNameOrPackage'.")
            }.toString()
        }
    }

    @JavascriptInterface
    fun controlScreen(actionJson: String): String {
        val service = SaifixAccessibilityService.instance
            ?: return JSONObject().apply {
                put("ok", false)
                put("executed", "none")
                put("error", "Enable Saifix AI Screen Control in Android Accessibility Settings.")
            }.toString()

        return try {
            val payload = JSONObject(actionJson)
            val action = payload.optString("action", "")
            val target = payload.optString("target", "")
            val x = payload.optDouble("x", -1.0).toFloat()
            val y = payload.optDouble("y", -1.0).toFloat()
            val success = service.performControl(action, target, x, y)
            JSONObject().apply {
                put("ok", success)
                put("executed", action)
                if (!success) put("error", "Could not execute '$action' on current screen.")
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("ok", false)
                put("executed", "error")
                put("error", e.message ?: "Screen control failed")
            }.toString()
        }
    }

    @JavascriptInterface
    fun setBackgroundService(enabled: Boolean, title: String?): String {
        val intent = Intent(context, BackgroundVoiceService::class.java).apply {
            if (!title.isNullOrBlank()) putExtra("title", title)
        }
        if (enabled) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } else {
            context.stopService(intent)
        }
        return JSONObject().put("ok", true).toString()
    }

    @JavascriptInterface
    fun requestAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }
}
