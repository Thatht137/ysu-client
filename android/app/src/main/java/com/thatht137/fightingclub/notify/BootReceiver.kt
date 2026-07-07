package com.thatht137.fightingclub.notify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.thatht137.fightingclub.cache.UnifiedCache

/**
 * Reschedule class alarms after device reboot.
 *
 * AlarmManager alarms are cleared on reboot. This receiver restores
 * the saved alarm configuration from UnifiedCache.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "YsuBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val pendingResult = goAsync()
        try {
            val alarmsJson = UnifiedCache.getString(context, UnifiedCache.KEY_CLASS_ALARMS, "[]")
            if (alarmsJson == "[]") return

            Log.d(TAG, "Rescheduling class alarms after reboot")
            ClassAlarmManager.scheduleAlarms(context, alarmsJson)
        } finally {
            pendingResult.finish()
        }
    }
}
