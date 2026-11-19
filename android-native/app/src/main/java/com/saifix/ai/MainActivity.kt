package com.saifix.ai

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.BridgeActivity
import org.json.JSONObject
import java.lang.ref.WeakReference

class MainActivity : BridgeActivity() {

    companion object {
        private var activityRef: WeakReference<MainActivity>? = null
        private const val REQ_PERMS = 1001

        fun emitNativeEvent(eventJson: JSONObject) {
            val activity = activityRef?.get() ?: return
            activity.runOnUiThread {
                val webView: WebView = activity.bridge?.webView ?: return@runOnUiThread
                val js = "window.dispatchSaifixNativeEvent && window.dispatchSaifixNativeEvent(${eventJson.toString()});"
                webView.evaluateJavascript(js, null)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activityRef = WeakReference(this)

        bridge?.webView?.let { webView ->
            webView.settings.mediaPlaybackRequiresUserGesture = false
            webView.settings.domStorageEnabled = true
            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setAcceptThirdPartyCookies(webView, true)

            webView.addJavascriptInterface(SaifixNativeBridge(this), "SaifixNative")
            webView.webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        request.grant(request.resources)
                    }
                }
            }
        }

        requestRequiredRuntimePermissions()
        startVoiceForegroundServiceIfPermitted()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_PERMS) {
            startVoiceForegroundServiceIfPermitted()
        }
    }

    private fun startVoiceForegroundServiceIfPermitted() {
        val hasMic = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        if (!hasMic) return

        val serviceIntent = Intent(this, BackgroundVoiceService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (_: Exception) {
            // Avoid launch crash if foreground service restriction applies
        }
    }

    override fun onDestroy() {
        activityRef = null
        super.onDestroy()
    }

    private fun requestRequiredRuntimePermissions() {
        val perms = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.READ_CALL_LOG
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        val missing = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), REQ_PERMS)
        }
    }
}
