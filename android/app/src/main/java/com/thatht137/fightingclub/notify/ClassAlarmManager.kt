package com.thatht137.fightingclub.notify

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.thatht137.fightingclub.cache.UnifiedCache
import org.json.JSONArray

object ClassAlarmManager {
    private const val TAG = "YsuClassAlarmManager"

    fun scheduleAlarms(context: Context, alarmsJson: String) {
        try {
            val alarms = JSONArray(alarmsJson)
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            cancelAllAlarms(context)
            UnifiedCache.putString(context, UnifiedCache.KEY_CLASS_ALARMS, alarmsJson)

            // Check if exact alarms are permitted (API 31+)
            val canUseExact = android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.S
                    || alarmManager.canScheduleExactAlarms()

            for (i in 0 until alarms.length()) {
                val alarm = alarms.getJSONObject(i)
                val alarmId = alarm.optString("alarmId", "")
                val alarmTime = alarm.optLong("alarmTime", 0L)

                if (alarmId.isEmpty() || alarmTime <= 0L) continue

                val intent = Intent(context, ClassAlarmReceiver::class.java).apply {
                    putExtra(ClassAlarmReceiver.EXTRA_ALARM_ID, alarmId)
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    alarmId.hashCode(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                if (canUseExact) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        alarmTime,
                        pendingIntent
                    )
                } else {
                    // Fallback: inexact alarm, may be deferred ~15 min in doze
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        alarmTime,
                        pendingIntent
                    )
                }
                Log.d(TAG, "Scheduled alarm $alarmId at $alarmTime (exact=$canUseExact)")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling alarms", e)
        }
    }

    fun cancelAllAlarms(context: Context) {
        try {
            val alarmsJson = UnifiedCache.getString(context, UnifiedCache.KEY_CLASS_ALARMS, "[]")
            val alarms = JSONArray(alarmsJson)
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            for (i in 0 until alarms.length()) {
                val alarm = alarms.getJSONObject(i)
                val alarmId = alarm.optString("alarmId", "")
                if (alarmId.isEmpty()) continue

                val intent = Intent(context, ClassAlarmReceiver::class.java).apply {
                    putExtra(ClassAlarmReceiver.EXTRA_ALARM_ID, alarmId)
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    alarmId.hashCode(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
            }

            UnifiedCache.putString(context, UnifiedCache.KEY_CLASS_ALARMS, "[]")
            Log.d(TAG, "All alarms cancelled")
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling alarms", e)
        }
    }
}
