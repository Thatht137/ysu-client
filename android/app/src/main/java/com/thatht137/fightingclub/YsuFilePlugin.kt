package com.thatht137.fightingclub

import android.content.Intent
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

@CapacitorPlugin(name = "YsuFile")
class YsuFilePlugin : Plugin() {

    companion object {
        private const val APK_DIR_NAME = "ysu_apk_update"
    }

    private fun getApkDir(): File? {
        val parent = context.externalCacheDir ?: return null
        val dir = File(parent, APK_DIR_NAME)
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    @PluginMethod
    fun downloadApk(call: PluginCall) {
        val urlStr = call.getString("url") ?: return call.reject("Missing url")
        val fileName = call.getString("fileName") ?: "app-update.apk"

        val dir = getApkDir()
        if (dir == null) {
            call.reject("External storage unavailable")
            return
        }

        // 清理�?APK 文件
        dir.listFiles()?.filter { it.extension == "apk" }?.forEach { it.delete() }

        val dest = File(dir, fileName)

        // 在后台线程执行下�?
        Thread {
            var conn: HttpURLConnection? = null
            try {
                val url = URL(urlStr)
                conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 15000
                conn.readTimeout = 15000
                conn.connect()

                if (conn.responseCode != HttpURLConnection.HTTP_OK) {
                    call.reject("HTTP ${conn.responseCode}")
                    return@Thread
                }

                val total = conn.contentLength
                var downloaded = 0
                var lastPercent = -1

                conn.inputStream.use { input ->
                    FileOutputStream(dest).use { output ->
                        val buffer = ByteArray(65536)
                        var read: Int
                        while (input.read(buffer).also { read = it } != -1) {
                            output.write(buffer, 0, read)
                            downloaded += read
                            if (total > 0) {
                                val percent = (downloaded * 100 / total)
                                if (percent != lastPercent) {
                                    lastPercent = percent
                                    val data = JSObject().put("percent", percent)
                                    notifyListeners("downloadProgress", data)
                                }
                            }
                        }
                    }
                }

                val result = JSObject().put("path", dest.absolutePath)
                call.resolve(result)
            } catch (e: Exception) {
                dest.delete() // 清理部分下载的文�?
                call.reject("Download failed: ${e.message}", e)
            } finally {
                conn?.disconnect()
            }
        }.start()
    }

    @PluginMethod
    fun installApk(call: PluginCall) {
        val path = call.getString("path") ?: return call.reject("Missing path")
        val file = File(path)
        if (!file.exists()) {
            call.reject("APK file not found")
            return
        }

        try {
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Install failed: ${e.message}", e)
        }
    }

    @PluginMethod
    fun clearDirectory(call: PluginCall) {
        val dir = getApkDir()
        if (dir == null) {
            call.reject("External storage unavailable")
            return
        }
        dir.listFiles()?.forEach { it.delete() }
        call.resolve()
    }
}
