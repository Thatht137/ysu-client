package com.youwenqwq.ysuclient.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import com.youwenqwq.ysuclient.R
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

class ScheduleWidgetHelper(private val context: Context) {

    data class WidgetCourse(
        val name: String,
        val classroom: String?,
        val weekDay: Int,
        val startSection: Int,
        val endSection: Int,
        val startTime: String?,
        val endTime: String?
    )

    data class WidgetWeekInfo(
        val week: Int,
        val weekday: Int,
        val term: String?,
        val date: String?
    )

    fun updateAllWidgets() {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = ComponentName(context, ScheduleWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
        for (appWidgetId in appWidgetIds) {
            updateWidget(appWidgetId, appWidgetManager)
        }
    }

    fun updateWidget(appWidgetId: Int, appWidgetManager: AppWidgetManager) {
        val (courses, weekInfo, hasSynced) = loadData()
        val syncInfo = loadSyncInfo()
        val todayCourses = filterTodayCourses(courses)
        val remainingCourses = getRemainingCourses(todayCourses)
        val hasCoursesToday = todayCourses.isNotEmpty()

        val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)

        // Choose layout based on width: <180dp is small, >=180dp is medium
        val isSmall = minWidth < 180

        val views = if (isSmall) {
            buildSmallWidget(remainingCourses, weekInfo, hasCoursesToday, hasSynced, syncInfo)
        } else {
            buildMediumWidget(remainingCourses, weekInfo, hasCoursesToday, hasSynced, syncInfo)
        }

        // Set click intent to open app schedule page via Deep Link
        val clickPendingIntent = WidgetConfig.createDeepLinkPendingIntent(
            context, appWidgetId, "ysuclient://schedule"
        )
        views.setOnClickPendingIntent(R.id.widget_container, clickPendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    data class SyncInfo(
        val hasSynced: Boolean,
        val lastSyncTime: Long,
        val syncReminderHours: Int
    )

    private fun buildSmallWidget(
        remainingCourses: List<WidgetCourse>,
        weekInfo: WidgetWeekInfo?,
        hasCoursesToday: Boolean,
        hasSynced: Boolean,
        syncInfo: SyncInfo
    ): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.schedule_widget_small)

        val weekdayName = getWeekdayName(Calendar.getInstance().get(Calendar.DAY_OF_WEEK))
        views.setTextViewText(R.id.widget_weekday, weekdayName)

        if (remainingCourses.isEmpty()) {
            views.setViewVisibility(R.id.widget_single_course, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_course_list, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_empty_state, android.view.View.VISIBLE)

            if (hasSynced && syncInfo.lastSyncTime > 0) {
                views.setViewVisibility(R.id.widget_remaining, android.view.View.VISIBLE)
                views.setTextViewText(R.id.widget_remaining, formatSyncAge(syncInfo.lastSyncTime))
            } else {
                views.setViewVisibility(R.id.widget_remaining, android.view.View.GONE)
            }

            val emptyText = when {
                !hasSynced -> context.getString(R.string.widget_empty_sync)
                hasCoursesToday -> context.getString(R.string.widget_empty_all_done)
                else -> context.getString(R.string.widget_empty_no_courses)
            }
            views.setTextViewText(R.id.widget_empty_text, emptyText)
        } else {
            views.setViewVisibility(R.id.widget_empty_state, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_remaining, android.view.View.VISIBLE)

            val remainingText = if (isSyncStale(syncInfo)) {
                formatSyncAge(syncInfo.lastSyncTime)
            } else {
                context.getString(R.string.widget_remaining_courses, remainingCourses.size)
            }
            views.setTextViewText(R.id.widget_remaining, remainingText)

            if (remainingCourses.size == 1) {
                // Single course: use compact wrap_content layout
                views.setViewVisibility(R.id.widget_single_course, android.view.View.VISIBLE)
                views.setViewVisibility(R.id.widget_course_list, android.view.View.GONE)

                bindCourseItem(views, remainingCourses[0], R.id.widget_single_course, R.id.widget_single_course_color_bar, R.id.widget_single_course_name, R.id.widget_single_course_detail)
            } else {
                // Two courses: use weight-based list layout
                views.setViewVisibility(R.id.widget_single_course, android.view.View.GONE)
                views.setViewVisibility(R.id.widget_course_list, android.view.View.VISIBLE)

                val displayCourses = remainingCourses.take(2)
                bindCourseItem(views, displayCourses.getOrNull(0), R.id.widget_course_1_container, R.id.widget_course_1_color_bar, R.id.widget_course_1_name, R.id.widget_course_1_detail)
                bindCourseItem(views, displayCourses.getOrNull(1), R.id.widget_course_2_container, R.id.widget_course_2_color_bar, R.id.widget_course_2_name, R.id.widget_course_2_detail)
            }
        }

        return views
    }

    private fun buildMediumWidget(
        remainingCourses: List<WidgetCourse>,
        weekInfo: WidgetWeekInfo?,
        hasCoursesToday: Boolean,
        hasSynced: Boolean,
        syncInfo: SyncInfo
    ): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.schedule_widget_medium)

        val calendar = Calendar.getInstance()
        val month = calendar.get(Calendar.MONTH) + 1
        val day = calendar.get(Calendar.DAY_OF_MONTH)
        val weekdayName = getWeekdayName(calendar.get(Calendar.DAY_OF_WEEK))
        val weekText = weekInfo?.week?.let { context.getString(R.string.widget_week_number, it) } ?: ""
        val headerText = if (weekText.isNotEmpty()) {
            "$month.$day $weekdayName · $weekText"
        } else {
            "$month.$day $weekdayName"
        }

        views.setTextViewText(R.id.widget_header_date, headerText)

        if (remainingCourses.isEmpty()) {
            views.setViewVisibility(R.id.widget_course_grid, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_empty_state, android.view.View.VISIBLE)

            if (hasSynced && syncInfo.lastSyncTime > 0) {
                views.setViewVisibility(R.id.widget_header_remaining, android.view.View.VISIBLE)
                views.setTextViewText(R.id.widget_header_remaining, formatSyncAge(syncInfo.lastSyncTime))
            } else {
                views.setViewVisibility(R.id.widget_header_remaining, android.view.View.GONE)
            }

            val emptyText = when {
                !hasSynced -> context.getString(R.string.widget_empty_sync)
                hasCoursesToday -> context.getString(R.string.widget_empty_all_done)
                else -> context.getString(R.string.widget_empty_no_courses)
            }
            views.setTextViewText(R.id.widget_empty_text, emptyText)
        } else {
            views.setViewVisibility(R.id.widget_course_grid, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_empty_state, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_header_remaining, android.view.View.VISIBLE)

            val remainingText = if (isSyncStale(syncInfo)) {
                formatSyncAge(syncInfo.lastSyncTime)
            } else {
                context.getString(R.string.widget_remaining_courses, remainingCourses.size)
            }
            views.setTextViewText(R.id.widget_header_remaining, remainingText)

            val displayCourses = remainingCourses.take(4)
            bindCourseItem(views, displayCourses.getOrNull(0), R.id.widget_course_1_container, R.id.widget_course_1_color_bar, R.id.widget_course_1_name, R.id.widget_course_1_detail)
            bindCourseItem(views, displayCourses.getOrNull(1), R.id.widget_course_2_container, R.id.widget_course_2_color_bar, R.id.widget_course_2_name, R.id.widget_course_2_detail)
            bindCourseItem(views, displayCourses.getOrNull(2), R.id.widget_course_3_container, R.id.widget_course_3_color_bar, R.id.widget_course_3_name, R.id.widget_course_3_detail)
            bindCourseItem(views, displayCourses.getOrNull(3), R.id.widget_course_4_container, R.id.widget_course_4_color_bar, R.id.widget_course_4_name, R.id.widget_course_4_detail)
        }

        return views
    }

    private fun bindCourseItem(
        views: RemoteViews,
        course: WidgetCourse?,
        containerId: Int,
        colorBarId: Int,
        nameId: Int,
        detailId: Int
    ) {
        if (course == null) {
            views.setViewVisibility(containerId, android.view.View.GONE)
            return
        }

        views.setViewVisibility(containerId, android.view.View.VISIBLE)
        views.setTextViewText(nameId, course.name)

        val timeText = if (!course.startTime.isNullOrEmpty() && !course.endTime.isNullOrEmpty()) {
            "${course.startTime} - ${course.endTime}"
        } else {
            context.getString(R.string.widget_section_format, course.startSection, course.endSection)
        }

        val detailText = if (!course.classroom.isNullOrEmpty()) {
            "$timeText  ${course.classroom}"
        } else {
            timeText
        }
        views.setTextViewText(detailId, detailText)

        val color = WidgetConfig.getCourseColor(course.name)
        views.setInt(colorBarId, "setBackgroundColor", color)
    }

    private fun loadData(): Triple<List<WidgetCourse>, WidgetWeekInfo?, Boolean> {
        val prefs = context.getSharedPreferences(WidgetConfig.PREFS_NAME, Context.MODE_PRIVATE)
        val coursesJson = prefs.getString(WidgetConfig.KEY_COURSES, "[]") ?: "[]"
        val weekJson = prefs.getString(WidgetConfig.KEY_CURRENT_WEEK, "") ?: ""
        val hasSynced = prefs.getBoolean(WidgetConfig.KEY_HAS_SYNCED_SCHEDULE, false)

        val courses = parseCourses(coursesJson)
        val weekInfo = if (weekJson.isNotEmpty()) parseWeekInfo(weekJson) else null
        return Triple(courses, weekInfo, hasSynced)
    }

    private fun parseCourses(json: String): List<WidgetCourse> {
        return try {
            val array = JSONArray(json)
            List(array.length()) { i ->
                val obj = array.getJSONObject(i)
                WidgetCourse(
                    name = obj.optString("name", ""),
                    classroom = obj.optString("classroom").takeIf { it.isNotEmpty() },
                    weekDay = obj.optInt("week_day", 0),
                    startSection = obj.optInt("start_section", 0),
                    endSection = obj.optInt("end_section", 0),
                    startTime = obj.optString("start_time").takeIf { it.isNotEmpty() },
                    endTime = obj.optString("end_time").takeIf { it.isNotEmpty() }
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun parseWeekInfo(json: String): WidgetWeekInfo? {
        return try {
            val obj = JSONObject(json)
            WidgetWeekInfo(
                week = obj.optInt("week", 0),
                weekday = obj.optInt("weekday", 0),
                term = obj.optString("term").takeIf { it.isNotEmpty() },
                date = obj.optString("date").takeIf { it.isNotEmpty() }
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun filterTodayCourses(courses: List<WidgetCourse>): List<WidgetCourse> {
        val todayWeekday = Calendar.getInstance().get(Calendar.DAY_OF_WEEK)
        // Android Calendar: Sunday=1, Monday=2, ... Saturday=7
        // Our data: Monday=1, Tuesday=2, ... Sunday=7
        val mappedWeekday = when (todayWeekday) {
            Calendar.MONDAY -> 1
            Calendar.TUESDAY -> 2
            Calendar.WEDNESDAY -> 3
            Calendar.THURSDAY -> 4
            Calendar.FRIDAY -> 5
            Calendar.SATURDAY -> 6
            Calendar.SUNDAY -> 7
            else -> 1
        }
        return courses
            .filter { it.weekDay == mappedWeekday }
            .sortedBy { it.startSection }
    }

    private fun getRemainingCourses(courses: List<WidgetCourse>): List<WidgetCourse> {
        val calendar = Calendar.getInstance()
        val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
        val currentMinute = calendar.get(Calendar.MINUTE)
        val currentTimeMinutes = currentHour * 60 + currentMinute

        return courses.filter { course ->
            // Estimate end time from section number if no explicit time
            val endMinutes = if (!course.endTime.isNullOrEmpty()) {
                parseTimeToMinutes(course.endTime)
            } else {
                // Rough estimate: section 1 starts at 8:00, each section is ~45min with breaks
                // Section n ends around 8:00 + (n-1)*55 + 45 minutes
                8 * 60 + (course.endSection - 1) * 55 + 45
            }
            endMinutes == null || currentTimeMinutes < endMinutes
        }
    }

    private fun parseTimeToMinutes(timeStr: String): Int? {
        return try {
            val parts = timeStr.split(":")
            if (parts.size >= 2) {
                parts[0].toInt() * 60 + parts[1].toInt()
            } else null
        } catch (_: Exception) {
            null
        }
    }

    private fun loadSyncInfo(): SyncInfo {
        val prefs = context.getSharedPreferences(WidgetConfig.PREFS_NAME, Context.MODE_PRIVATE)
        val hasSynced = prefs.getBoolean(WidgetConfig.KEY_HAS_SYNCED_SCHEDULE, false)
        val lastSyncTime = prefs.getLong(WidgetConfig.KEY_LAST_SYNC_TIME, 0L)
        val syncReminderHours = prefs.getInt(WidgetConfig.KEY_SYNC_REMINDER_HOURS, 24)
        return SyncInfo(hasSynced, lastSyncTime, syncReminderHours)
    }

    private fun isSyncStale(syncInfo: SyncInfo): Boolean {
        if (!syncInfo.hasSynced || syncInfo.lastSyncTime <= 0) return false
        // 0 means always show the sync age (permanent reminder)
        if (syncInfo.syncReminderHours == 0) return true
        val elapsedMs = System.currentTimeMillis() - syncInfo.lastSyncTime
        val thresholdMs = syncInfo.syncReminderHours * 60L * 60L * 1000L
        return elapsedMs > thresholdMs
    }

    private fun formatSyncAge(lastSyncTime: Long): String {
        val elapsedMs = System.currentTimeMillis() - lastSyncTime
        val elapsedHours = elapsedMs / (60 * 60 * 1000)
        return when {
            elapsedHours < 1 -> context.getString(R.string.widget_sync_just_now)
            elapsedHours < 24 -> context.getString(R.string.widget_sync_hours_ago, elapsedHours.toInt())
            else -> {
                val elapsedDays = elapsedHours / 24
                context.getString(R.string.widget_sync_days_ago, elapsedDays.toInt())
            }
        }
    }

    private fun getWeekdayName(dayOfWeek: Int): String {
        return context.resources.getStringArray(R.array.weekday_names)[dayOfWeek - 1]
    }
}
