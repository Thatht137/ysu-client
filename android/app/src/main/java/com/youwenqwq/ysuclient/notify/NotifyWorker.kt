package com.youwenqwq.ysuclient.notify

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.youwenqwq.ysuclient.MainActivity
import com.youwenqwq.ysuclient.cache.UnifiedCache
import org.json.JSONArray
import org.json.JSONObject

/**
 * WorkManager Worker: 后台轮询成绩/考试变化。
 *
 * 每次执行时：
 * 1. 从 SharedPreferences 读取 CASTGC
 * 2. 使用 CASTGC 重新建立 JWXT 会话
 * 3. 拉取成绩/考试，diff 后发送通知
 */
class NotifyWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        const val TAG = "YsuNotifyWorker"
        const val WORK_NAME = "ysu_notify_work"
        const val CHANNEL_ID = "ysu_notify_channel"
        const val CHANNEL_NAME = "成绩/考试通知"
        const val NOTIFICATION_ID_BASE = 1000

        @Volatile
        private var nextNotificationId = NOTIFICATION_ID_BASE
    }

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        Log.d(TAG, "NotifyWorker started")

        try {
            // Check server config exists before proceeding
            if (UnifiedCache.getJsonObject(ctx, UnifiedCache.KEY_SERVER_CONFIG) == null) {
                Log.d(TAG, "No server config, skipping")
                return Result.success()
            }

            val castgc = UnifiedCache.getString(ctx, UnifiedCache.KEY_CASTGC, "")
            Log.d(TAG, "castgc=${if (castgc.isEmpty()) "NULL/EMPTY" else "PRESENT(len=${castgc.length})"}")
            if (castgc.isEmpty()) {
                Log.d(TAG, "No CASTGC, skipping")
                return Result.success()
            }

            val (_, checkGrades, checkExams) = NotifyHelper.getSettings(ctx)
            if (!checkGrades && !checkExams) {
                Log.d(TAG, "Nothing to check, skipping")
                return Result.success()
            }

            // 如果之前已经标记会话过期，跳过
            if (NotifyHelper.isSessionExpired(ctx)) {
                Log.d(TAG, "Session already expired, skipping")
                return Result.success()
            }

            // 1. 建立 JWXT 会话
            val sessionOk = NotifyHelper.establishSession(ctx, castgc)
            if (!sessionOk) {
                Log.w(TAG, "Failed to establish JWXT session, CASTGC expired")
                NotifyHelper.setSessionExpired(ctx, true)
                sendSessionExpiredNotification(ctx)
                return Result.success()
            }

            var hasChanges = false

            // 2. 检查成绩
            if (checkGrades) {
                try {
                    val newGrades = NotifyHelper.fetchGrades(ctx)
                    val cachedGrades = NotifyHelper.getCachedGrades(ctx)
                    val diff = NotifyHelper.diffGrades(cachedGrades, newGrades)

                    Log.d(TAG, "Grades: cached=${cachedGrades.size}, new=${newGrades.size}, diff=${diff.size}")

                    if (diff.isNotEmpty()) {
                        hasChanges = true
                        for (grade in diff) {
                            val courseName = grade.optString("course_name", "未知课程")
                            val score = grade.optString("score", "")
                            sendGradeNotification(ctx, courseName, score)
                        }
                    }

                    val arr = JSONArray()
                    for (g in newGrades) arr.put(g)
                    UnifiedCache.saveCachedGrades(ctx, arr)
                } catch (e: Exception) {
                    Log.e(TAG, "Error checking grades", e)
                }
            }

            // 3. 检查考试
            if (checkExams) {
                try {
                    val newExams = NotifyHelper.fetchExams(ctx)
                    val cachedExams = NotifyHelper.getCachedExams(ctx)
                    val diff = NotifyHelper.diffExams(cachedExams, newExams)

                    Log.d(TAG, "Exams: cached=${cachedExams.size}, new=${newExams.size}, diff=${diff.size}")

                    if (diff.isNotEmpty()) {
                        hasChanges = true
                        for (exam in diff) {
                            val name = exam.optString("name", "未知考试")
                            val date = exam.optString("exam_date", "")
                            val time = exam.optString("exam_time", "")
                            val location = exam.optString("exam_location", "")
                            sendExamNotification(ctx, name, date, time, location)
                        }
                    }

                    val arr = JSONArray()
                    for (e in newExams) arr.put(e)
                    UnifiedCache.saveCachedExams(ctx, arr)
                } catch (e: Exception) {
                    Log.e(TAG, "Error checking exams", e)
                }
            }

            Log.d(TAG, "NotifyWorker finished, hasChanges=$hasChanges")
        } catch (e: Exception) {
            Log.e(TAG, "NotifyWorker fatal error", e)
        }

        return Result.success()
    }

    // ─── Notifications ──────────────────────────────────────────────────────

    private fun createNotificationChannel(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "检测到新成绩发布或考试安排变更时推送通知"
        }
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(channel)
    }

    private fun getOpenAppIntent(ctx: Context): PendingIntent {
        val intent = Intent(ctx, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            ctx, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun sendGradeNotification(ctx: Context, courseName: String, score: String) {
        createNotificationChannel(ctx)
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val content = if (score.isNotEmpty()) "成绩: $score" else "新成绩已发布"

        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("新成绩发布")
            .setContentText("$courseName — $content")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(getOpenAppIntent(ctx))
            .setAutoCancel(true)
            .build()

        val id = synchronized(this) { nextNotificationId++ }
        nm.notify(id, notification)
    }

    private fun sendExamNotification(ctx: Context, name: String, date: String, time: String, location: String) {
        createNotificationChannel(ctx)
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val details = buildList {
            if (date.isNotEmpty()) add(date)
            if (time.isNotEmpty()) add(time)
            if (location.isNotEmpty()) add(location)
        }.joinToString(" ")

        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("考试安排更新")
            .setContentText("$name${if (details.isNotEmpty()) " — $details" else ""}")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(getOpenAppIntent(ctx))
            .setAutoCancel(true)
            .build()

        val id = synchronized(this) { nextNotificationId++ }
        nm.notify(id, notification)
    }

    private fun sendSessionExpiredNotification(ctx: Context) {
        createNotificationChannel(ctx)
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("会话已过期")
            .setContentText("请打开应用重新登录以恢复通知功能")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(getOpenAppIntent(ctx))
            .setAutoCancel(true)
            .build()

        nm.notify(NOTIFICATION_ID_BASE + 9999, notification)
    }
}
