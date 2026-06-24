import { useState, useMemo } from 'react'
import moment from 'moment'
import { ChevronDown, ChevronUp, Calendar, Clock, MapPin, Users, BarChart3 } from 'lucide-react'

export default function YearView({ date, events, onEventClick, onDateClick, onMonthClick }) {
  const [expandedMonths, setExpandedMonths] = useState({})
  const [showSummary, setShowSummary] = useState(false)

  const currentYear = moment(date).year()
  const today = moment()

  // Safely filter valid events
  const validEvents = useMemo(() => {
    if (!Array.isArray(events)) return []
    return events.filter(event => {
      if (!event) return false
      // ✅ Check if event has a valid date (either start, fromDate, or toDate)
      const hasValidDate = event.start || event.fromDate || event.toDate
      return !!hasValidDate
    })
  }, [events])

  // ✅ Get the effective date for an event (for filtering)
  const getEventStart = (event) => {
    if (event.fromDate) {
      return moment(event.fromDate)
    }
    if (event.start) {
      return moment(event.start)
    }
    return null
  }

  // ✅ Get the end date for an event (for date ranges)
  const getEventEnd = (event) => {
    if (event.toDate) {
      return moment(event.toDate)
    }
    if (event.end) {
      return moment(event.end)
    }
    return getEventStart(event)
  }

  // ✅ Check if event falls within a month
  const isEventInMonth = (event, monthStart, monthEnd) => {
    const eventStart = getEventStart(event)
    if (!eventStart) return false
    
    const eventEnd = getEventEnd(event)
    
    // Check if event overlaps with the month
    return eventStart.isSameOrBefore(monthEnd, 'day') && 
           eventEnd.isSameOrAfter(monthStart, 'day')
  }

  // ✅ Check if event falls on a specific date
  const isEventOnDate = (event, date) => {
    const eventStart = getEventStart(event)
    if (!eventStart) return false
    
    const eventEnd = getEventEnd(event)
    
    return date.isBetween(eventStart, eventEnd, 'day', '[]')
  }

  const getEventsForMonth = (monthIndex) => {
    const monthStart = moment().year(currentYear).month(monthIndex).startOf('month')
    const monthEnd = moment().year(currentYear).month(monthIndex).endOf('month')

    return validEvents.filter(event => {
      try {
        return isEventInMonth(event, monthStart, monthEnd)
      } catch (error) {
        return false
      }
    })
  }

  const getEventsForDate = (date) => {
    return validEvents.filter(event => {
      try {
        return isEventOnDate(event, date)
      } catch (error) {
        return false
      }
    })
  }

  const monthlyStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => ({
      month: monthIndex,
      eventCount: getEventsForMonth(monthIndex).length
    }))
  }, [validEvents, currentYear])

  // Get event title safely
  const getEventTitle = (event) => {
    if (event.title) return event.title
    if (event.department) return `${event.department} - ${event.auditType || 'Audit'}`
    if (event.auditType) return event.auditType
    return 'Audit Event'
  }

  // Get event color based on status or type
  const getEventColor = (event) => {
    if (event.status === 'COMPLETED' || event.isFullyCompleted) return 'bg-emerald-500'
    if (event.status === 'SUBMITTED' || event.isSubmitted) return 'bg-blue-500'
    if (event.status === 'PENDING_APPROVAL') return 'bg-yellow-500'
    if (event.status === 'APPROVED') return 'bg-green-500'
    if (event.status === 'REJECTED') return 'bg-red-500'
    if (event.status === 'CHANGE_REQUESTED') return 'bg-orange-500'
    if (event.isDateRange) return 'bg-purple-500'
    if (event.auditType === '5S Audit') return 'bg-blue-500'
    if (event.auditType === 'IATF 16949') return 'bg-yellow-500'
    if (event.auditType === 'Process Audit') return 'bg-green-500'
    if (event.auditType === 'Product Audit') return 'bg-pink-500'
    if (event.auditType === 'ISO 9001') return 'bg-indigo-500'
    return 'bg-purple-500'
  }

  // ✅ Check if event is overdue
  const isEventOverdue = (event) => {
    if (!event) return false
    const status = event.status || 'SCHEDULED'
    if (status === 'COMPLETED' || status === 'APPROVED' || status === 'SUBMITTED') return false
    const eventEnd = getEventEnd(event)
    return eventEnd && eventEnd.isBefore(today)
  }

  const toggleMonthExpansion = (monthIndex) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthIndex]: !prev[monthIndex]
    }))
  }

  const renderMiniCalendar = (monthIndex) => {
    const monthStart = moment().year(currentYear).month(monthIndex).startOf('month')
    const monthEnd = moment().year(currentYear).month(monthIndex).endOf('month')
    const calendarStart = monthStart.clone().startOf('week')
    const calendarEnd = monthEnd.clone().endOf('week')

    const weeks = []
    let currentWeek = calendarStart.clone()

    while (currentWeek.isSameOrBefore(calendarEnd, 'day')) {
      const week = []
      for (let i = 0; i < 7; i++) {
        const day = currentWeek.clone().add(i, 'day')
        week.push(day)
      }
      weeks.push(week)
      currentWeek.add(1, 'week')
    }

    return (
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={index} className="h-6 flex items-center justify-center font-medium text-gray-500 text-center">
            {day}
          </div>
        ))}

        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const isCurrentMonth = day.month() === monthIndex
            const isToday = day.isSame(today, 'day')
            const dayEvents = getEventsForDate(day)
            const hasEvents = dayEvents.length > 0

            // ✅ Check if any event is overdue on this date
            const hasOverdue = dayEvents.some(e => isEventOverdue(e))
            const hasCompleted = dayEvents.some(e => e.status === 'COMPLETED' || e.isFullyCompleted)

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                onClick={() => {
                  if (hasEvents) {
                    // If there are events, show them
                    if (onDateClick) {
                      onDateClick(day.toDate())
                    }
                  }
                }}
                className={`
                  h-8 flex flex-col items-center justify-center relative cursor-pointer rounded-sm transition-colors
                  ${isCurrentMonth ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-400'}
                  ${isToday ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                  ${hasEvents && !isToday ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100' : ''}
                  ${hasOverdue && !isToday ? 'bg-red-50 border border-red-200 hover:bg-red-100' : ''}
                  ${hasCompleted && !isToday && !hasOverdue ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100' : ''}
                  ${hasEvents ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                {hasEvents && (
                  <div className="absolute top-0 left-0 right-0 flex space-x-0.5 px-0.5">
                    {dayEvents.slice(0, 2).map((event, idx) => {
                      if (!event) return null
                      return (
                        <div
                          key={event.id || idx}
                          className={`h-1 flex-1 ${getEventColor(event)} rounded-sm`}
                          title={getEventTitle(event)}
                        />
                      )
                    })}
                    {dayEvents.length > 2 && <div className="h-1 flex-1 bg-gray-400 rounded-sm" />}
                  </div>
                )}

                <span className={`text-xs font-medium ${hasEvents ? 'mt-1' : ''}`}>
                  {day.date()}
                </span>
              </div>
            )
          })
        )}
      </div>
    )
  }

  const renderExpandedMonth = (monthIndex) => {
    const monthEvents = getEventsForMonth(monthIndex)
    const groupedEvents = {}

    monthEvents.forEach(event => {
      if (!event) return
      const eventStart = getEventStart(event)
      if (!eventStart) return
      try {
        const dateKey = eventStart.format('YYYY-MM-DD')
        if (!groupedEvents[dateKey]) {
          groupedEvents[dateKey] = []
        }
        groupedEvents[dateKey].push(event)
      } catch (error) {
        console.warn('Error grouping event:', error)
      }
    })

    const sortedDates = Object.keys(groupedEvents).sort()

    return (
      <div className="mt-4 bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
        {sortedDates.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No events this month</p>
        ) : (
          <div className="space-y-3">
            {sortedDates.map(dateKey => {
              const dateEvents = groupedEvents[dateKey]
              const eventDate = moment(dateKey)

              return (
                <div key={dateKey} className="space-y-1">
                  <div className="text-xs font-medium text-gray-700 border-b border-gray-200 pb-1">
                    {eventDate.format('MMM DD, dddd')}
                  </div>
                  <div className="space-y-1">
                    {dateEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick && onEventClick(event)}
                        className="flex items-center gap-2 p-2 bg-white rounded-md hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200 text-xs"
                      >
                        <div className={`w-2 h-2 rounded-full ${getEventColor(event)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {getEventTitle(event)}
                          </div>
                          <div className="text-gray-500">
                            {event.isDateRange 
                              ? `${event.fromDate ? moment(event.fromDate).format('MMM DD') : ''} → ${event.toDate ? moment(event.toDate).format('MMM DD, YYYY') : ''}`
                              : (event.start ? moment(event.start).format('h:mm A') : 'Time TBD')
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {event.isDateRange && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                              Range
                            </span>
                          )}
                          {event.status && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              event.status === 'COMPLETED' || event.isFullyCompleted ? 'bg-emerald-100 text-emerald-700' :
                              event.status === 'SUBMITTED' || event.isSubmitted ? 'bg-blue-100 text-blue-700' :
                              event.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                              event.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                              event.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {event.status === 'COMPLETED' ? '✓ Done' :
                               event.status === 'SUBMITTED' ? 'Pending' :
                               event.status === 'PENDING_APPROVAL' ? 'Pending' : 
                               event.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Calculate statistics safely
  const totalEvents = validEvents.length
  const pendingEvents = validEvents.filter(e => e.status === 'PENDING_APPROVAL' || e.status === 'SUBMITTED').length
  const approvedEvents = validEvents.filter(e => e.status === 'APPROVED').length
  const completedEvents = validEvents.filter(e => e.status === 'COMPLETED' || e.isFullyCompleted).length
  const scheduledEvents = validEvents.filter(e => e.status === 'SCHEDULED' && !e.isFullyCompleted && !e.isSubmitted).length

  return (
    <div className="min-h-max flex flex-col bg-white overflow-auto">
      {/* Year Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{currentYear}</h1>
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Summary</span>
              {showSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {totalEvents} audits
            </span>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {showSummary && (
        <div className="p-4 flex-shrink-0">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              {currentYear} Audit Summary
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{totalEvents}</div>
                <div className="text-xs text-gray-500">Total Audits</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-yellow-600">{pendingEvents}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-600">{approvedEvents}</div>
                <div className="text-xs text-gray-500">Approved</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">{completedEvents}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{scheduledEvents}</div>
                <div className="text-xs text-gray-500">Scheduled</div>
              </div>
            </div>

            {/* Monthly Distribution */}
            <div className="bg-white rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Monthly Distribution</h4>
              <div className="flex items-end justify-between gap-1 h-24">
                {monthlyStats.map(({ month: monthIndex, eventCount }) => {
                  const maxEvents = Math.max(...monthlyStats.map(s => s.eventCount), 1)
                  const height = (eventCount / maxEvents) * 100

                  return (
                    <div key={monthIndex} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-200 rounded-t flex flex-col justify-end relative" style={{ height: '70px' }}>
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-300"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${moment().month(monthIndex).format('MMM')}: ${eventCount} audits`}
                        />
                        {eventCount > 0 && (
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 text-[10px] font-medium text-gray-600">
                            {eventCount}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 font-medium">
                        {moment().month(monthIndex).format('MMM')}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Months Grid */}
      <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const monthName = moment().month(monthIndex).format('MMMM')
              const monthEvents = getEventsForMonth(monthIndex)
              const isExpanded = expandedMonths[monthIndex]
              const isCurrentMonth = moment().year(currentYear).month(monthIndex).isSame(today, 'month')

              return (
                <div
                  key={monthIndex}
                  className={`bg-white rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                    isCurrentMonth ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="p-2.5 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <button
                          onClick={() => onMonthClick && onMonthClick(moment().year(currentYear).month(monthIndex).toDate())}
                          className={`text-sm font-semibold hover:text-blue-600 transition-colors ${
                            isCurrentMonth ? 'text-blue-600' : 'text-gray-800'
                          }`}
                        >
                          {monthName}
                        </button>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {monthEvents.length} audit{monthEvents.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleMonthExpansion(monthIndex)}
                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5">
                    {renderMiniCalendar(monthIndex)}
                    {isExpanded && renderExpandedMonth(monthIndex)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}