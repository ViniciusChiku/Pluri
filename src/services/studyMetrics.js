// Local-midnight YYYY-MM-DD string for a given Date, avoiding UTC day-shift bugs.
export function toLocalDateString(date) {
  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().split('T')[0]
}

// Sunday-start week boundary, matching CalendarView's week layout.
function startOfWeek(date) {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  start.setHours(0, 0, 0, 0)
  return start
}

export function getWeeklyStudyMinutes(sessions, referenceDate = new Date()) {
  if (!sessions || sessions.length === 0) return 0

  const weekStartStr = toLocalDateString(startOfWeek(referenceDate))
  const weekEndStr = toLocalDateString(referenceDate)

  return sessions.reduce((acc, session) => {
    const sessionDate = session.date_studied
    if (sessionDate >= weekStartStr && sessionDate <= weekEndStr) {
      return acc + (session.duration_minutes || 0)
    }
    return acc
  }, 0)
}

export function hasAnySessionOnDates(sessions, dateStrs) {
  if (!sessions || sessions.length === 0) return false
  const sessionDates = new Set(sessions.map(s => s.date_studied))
  return dateStrs.some(d => sessionDates.has(d))
}

export function getDailyProgressByLanguage(languages, sessions, referenceDate = new Date()) {
  const todayStr = toLocalDateString(referenceDate)

  return languages
    .filter(lang => lang.target_weekly_minutes)
    .map(lang => {
      const goalMinutes = Math.max(1, Math.round(lang.target_weekly_minutes / 7))
      const doneMinutes = sessions
        .filter(s => s.language === lang.name && s.date_studied === todayStr)
        .reduce((acc, s) => acc + (s.duration_minutes || 0), 0)

      return {
        name: lang.name,
        doneMinutes,
        goalMinutes,
        isMet: doneMinutes >= goalMinutes
      }
    })
}

export function calculateStreak(sessions, referenceDate = new Date()) {
  if (!sessions || sessions.length === 0) return 0
  const dates = [...new Set(sessions.map(s => s.date_studied))].sort().reverse()

  const todayStr = toLocalDateString(referenceDate)
  const yesterdayStr = toLocalDateString(new Date(referenceDate.getTime() - 86400000))

  let startIdx = dates.indexOf(todayStr)
  if (startIdx === -1) {
    startIdx = dates.indexOf(yesterdayStr)
  }
  if (startIdx === -1) return 0

  let streak = 1
  let currentDateObj = new Date(dates[startIdx])
  currentDateObj = new Date(currentDateObj.getTime() + currentDateObj.getTimezoneOffset() * 60000)

  for (let i = startIdx + 1; i < dates.length; i++) {
    currentDateObj.setDate(currentDateObj.getDate() - 1)
    const expectedDateStr = toLocalDateString(currentDateObj)
    if (dates[i] === expectedDateStr) {
      streak++
    } else {
      break
    }
  }
  return streak
}
