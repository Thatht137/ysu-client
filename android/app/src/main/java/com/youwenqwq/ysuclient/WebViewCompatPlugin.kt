package com.youwenqwq.ysuclient

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.TypedValue
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WebViewCompat")
class WebViewCompatPlugin : Plugin() {

    companion object {
        private const val PREF_NAME = "webview_compat"
        private const val PREF_DISMISSED = "dismissed"
        private const val FULL_VERSION = 119
        private const val MIN_VERSION = 111
        private const val FAQ_URL = "https://ysu.welain.com/faq"
        private val WEBVIEW_PACKAGES = listOf(
            "com.google.android.webview",
            "com.android.webview",
            "com.google.android.webview.beta",
            "com.google.android.webview.dev",
            "com.google.android.webview.canary",
            "com.chrome.beta",
            "com.chrome.dev",
            "com.chrome.canary",
            "com.chrome",
        )
    }

    @PluginMethod
    fun check(call: PluginCall) {
        val ctx = context
        val version = getWebViewMajorVersion(ctx)

        if (version != null && version >= FULL_VERSION) {
            call.resolve()
            return
        }

        val prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        if (prefs.getBoolean(PREF_DISMISSED, false)) {
            call.resolve()
            return
        }

        val locale = call.getString("locale") ?: "zh"
        val strings = when (locale) {
            "en" -> EnStrings
            else -> ZhStrings
        }

        val message = buildMessage(version, strings)
        showDialog(ctx, version, prefs, strings, message)
        call.resolve()
    }

    private fun getWebViewMajorVersion(ctx: Context): Int? {
        for (packageName in WEBVIEW_PACKAGES) {
            try {
                val info = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    ctx.packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0))
                } else {
                    @Suppress("DEPRECATION")
                    ctx.packageManager.getPackageInfo(packageName, 0)
                }
                return parseMajorVersion(info.versionName)
            } catch (_: PackageManager.NameNotFoundException) {
                continue
            }
        }
        return null
    }

    private fun parseMajorVersion(versionName: String?): Int? {
        if (versionName.isNullOrBlank()) return null
        return versionName.split(".").firstOrNull()?.toIntOrNull()
    }

    private fun buildMessage(version: Int?, strings: DialogStrings): String {
        val versionText = version?.toString() ?: strings.unknownVersion
        return when {
            version == null -> strings.unknownMessage
            version < MIN_VERSION -> strings.criticalMessage(versionText)
            else -> strings.warningMessage(versionText)
        }
    }

    private fun showDialog(
        ctx: Context,
        version: Int?,
        prefs: SharedPreferences,
        strings: DialogStrings,
        message: String,
    ) {
        val density = ctx.resources.displayMetrics.density
        val paddingH = (24 * density).toInt()
        val paddingV = (20 * density).toInt()
        val gap = (16 * density).toInt()

        val container = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(paddingH, paddingV, paddingH, paddingV)
        }

        val messageView = TextView(ctx).apply {
            text = message
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        }
        container.addView(messageView)

        val spacer = LinearLayout(ctx).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                gap,
            )
        }
        container.addView(spacer)

        val checkBox = CheckBox(ctx).apply {
            text = strings.doNotShowAgain
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        }
        container.addView(checkBox)

        activity?.runOnUiThread {
            AlertDialog.Builder(ctx)
                .setTitle(strings.title)
                .setView(container)
                .setPositiveButton(strings.help) { _, _ ->
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(FAQ_URL))
                    ctx.startActivity(intent)
                }
                .setNegativeButton(strings.dismiss) { _, _ ->
                    if (checkBox.isChecked) {
                        prefs.edit().putBoolean(PREF_DISMISSED, true).apply()
                    }
                }
                .setCancelable(false)
                .show()
        }
    }

    private interface DialogStrings {
        val title: String
        val help: String
        val dismiss: String
        val doNotShowAgain: String
        val unknownVersion: String
        val unknownMessage: String
        fun criticalMessage(version: String): String
        fun warningMessage(version: String): String
    }

    private object ZhStrings : DialogStrings {
        override val title = "WebView 兼容性提示"
        override val help = "查看帮助"
        override val dismiss = "忽略"
        override val doNotShowAgain = "不再提醒"
        override val unknownVersion = "未知"
        override val unknownMessage = "无法检测您的 WebView 版本，应用可能无法正常显示。\n\n建议更新 Android System WebView 以获得最佳体验。"
        override fun criticalMessage(version: String) =
            "您当前的 WebView 版本（Chrome $version）过低，应用可能出现严重的样式错乱甚至无法渲染，强烈建议更新。\n\n最低兼容版本为 Chrome 111。"
        override fun warningMessage(version: String) =
            "您当前的 WebView 版本（Chrome $version）较低，部分样式（如标题栏透明效果、卡片边框等）可能未正确渲染，但不影响正常使用。\n\n建议更新至 Chrome 119+ 以获得完整的视觉体验。"
    }

    private object EnStrings : DialogStrings {
        override val title = "WebView Compatibility Warning"
        override val help = "View Help"
        override val dismiss = "Dismiss"
        override val doNotShowAgain = "Don't ask again"
        override val unknownVersion = "unknown"
        override val unknownMessage = "Unable to detect your WebView version. The app may not display correctly.\n\nPlease update Android System WebView for the best experience."
        override fun criticalMessage(version: String) =
            "Your WebView version (Chrome $version) is too low. The app may have severe style issues or fail to render. Please update.\n\nMinimum compatible version is Chrome 111."
        override fun warningMessage(version: String) =
            "Your WebView version (Chrome $version) is lower than recommended. Some styles (e.g. title bar transparency, card borders) may not render correctly, but the app remains usable.\n\nPlease update to Chrome 119+ for the full visual experience."
    }
}
