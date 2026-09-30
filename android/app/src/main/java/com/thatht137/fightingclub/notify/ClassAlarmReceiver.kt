package com.thatht137.fightingclub.notify

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.thatht137.fightingclub.R
import com.thatht137.fightingclub.cache.UnifiedCache
import org.json.JSONArray
import org.json.JSONObject

class ClassAlarmReceiver : BroadcastReceiver() {

    companion object {
        const val TAG = "YsuClassAlarm"
        const val EXTRA_ALARM_ID = "alarm_id"
        const val EXTRA_ALARM_TIME = "alarm_time"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return
        val expectedTime = intent.getLongExtra(EXTRA_ALARM_TIME, 0L)
        try {
            synchronized(ClassAlarmManager) {
                val alarms = JSONArray(
                    UnifiedCache.getString(context, UnifiedCache.KEY_CLASS_ALARMS, "[]")
                )
                var alarmConfig: JSONObject? = null
                for (i in 0 until alarms.length()) {
                    val alarm = alarms.getJSONObject(i)
                    if (alarm.optString("alarmId") == alarmId) {
                        alarmConfig = alarm
                        break
                    }
                }
                if (alarmConfig == null) return
                val alarmTime = alarmConfig.getLong("alarmTime")
                val now = System.currentTimeMillis()
                if (intent.hasExtra(EXTRA_ALARM_TIME) && expectedTime != alarmTime) return
                if (now < alarmTime) return

                val updatedAlarms = JSONArray()
                for (i in 0 until alarms.length()) {
                    val alarm = alarms.getJSONObject(i)
                    if (alarm.optString("alarmId") != alarmId) updatedAlarms.put(alarm)
                }
                UnifiedCache.putString(context, UnifiedCache.KEY_CLASS_ALARMS, updatedAlarms.toString())

                val remindMinutes = alarmConfig.optInt("remindMinutes", 15)
                if (now >= alarmTime + remindMinutes * 60_000L) {
                    Log.d(TAG, "Class has already started; skipping delayed alarm $alarmId")
                    return
                }
                sendClassNotification(
                    context,
                    alarmId,
                    alarmConfig.optString("courseName", context.getString(R.string.notify_fallback_alarm_course)),
                    alarmConfig.optString("classroom", ""),
                    alarmConfig.optString("startTime", ""),
                    remindMinutes
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling class alarm", e)
        }
    }

    private fun sendClassNotification(
        ctx: Context,
        alarmId: String,
        courseName: String,
        classroom: String,
        startTime: String,
        remindMinutes: Int
    ) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val parts = buildList {
            if (startTime.isNotEmpty()) add(startTime)
            if (classroom.isNotEmpty()) add(classroom)
        }
        val content = if (parts.isNotEmpty()) {
            parts.joinToString(" · ")
        } else {
            ctx.getString(R.string.class_alarm_text, remindMinutes)
        }

        val notification = NativeNotifications.builder(ctx, NotificationKind.CLASSES)
            .setContentTitle(courseName)
            .setContentText(content)
            .build()

        nm.notify("class:$alarmId", 0, notification)
    }

}
