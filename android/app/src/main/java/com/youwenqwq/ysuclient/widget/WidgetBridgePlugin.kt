package com.youwenqwq.ysuclient.widget

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.youwenqwq.ysuclient.cache.UnifiedCache
import org.json.JSONArray

@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {

    @PluginMethod
    fun syncSchedule(call: PluginCall) {
        val coursesJson = call.getString("coursesJson", "[]")
        val currentWeekJson = call.getString("currentWeekJson", "")
        val syncReminderHours = call.getInt("syncReminderHours", 24) ?: 24
        val showNextDaySchedule = call.getBoolean("showNextDaySchedule", false) ?: false

        UnifiedCache.saveCachedSchedule(context, JSONArray(coursesJson))
        UnifiedCache.saveCachedCurrentWeek(context, currentWeekJson)
        UnifiedCache.putInt(context, UnifiedCache.KEY_SYNC_REMINDER_HOURS, syncReminderHours)
        UnifiedCache.putBoolean(context, UnifiedCache.KEY_SHOW_NEXT_DAY_SCHEDULE, showNextDaySchedule)

        // Trigger schedule widget update
        val scheduleHelper = ScheduleWidgetHelper(context)
        scheduleHelper.updateAllWidgets()

        call.resolve()
    }

    @PluginMethod
    fun syncWidgetSettings(call: PluginCall) {
        val syncReminderHours = call.getInt("syncReminderHours", 24) ?: 24
        val showNextDaySchedule = call.getBoolean("showNextDaySchedule", false) ?: false

        UnifiedCache.putInt(context, UnifiedCache.KEY_SYNC_REMINDER_HOURS, syncReminderHours)
        UnifiedCache.putBoolean(context, UnifiedCache.KEY_SHOW_NEXT_DAY_SCHEDULE, showNextDaySchedule)

        // Trigger schedule widget update so reminder text reflects new threshold
        val scheduleHelper = ScheduleWidgetHelper(context)
        scheduleHelper.updateAllWidgets()

        call.resolve()
    }

    @PluginMethod
    fun syncExams(call: PluginCall) {
        val examsJson = call.getString("examsJson", "[]")
        val syncReminderHours = call.getInt("syncReminderHours", 24) ?: 24

        UnifiedCache.saveCachedExams(context, JSONArray(examsJson))
        UnifiedCache.putBoolean(context, UnifiedCache.KEY_HAS_SYNCED_EXAMS, true)
        UnifiedCache.putLong(context, UnifiedCache.KEY_LAST_EXAM_SYNC_TIME, System.currentTimeMillis())
        UnifiedCache.putInt(context, UnifiedCache.KEY_SYNC_REMINDER_HOURS, syncReminderHours)

        // Trigger exam widget update
        val examHelper = ExamWidgetHelper(context)
        examHelper.updateAllWidgets()

        call.resolve()
    }
}
