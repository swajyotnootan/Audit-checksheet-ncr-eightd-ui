import { Clock, MapPin, Users, Calendar as CalendarIcon, Tag } from 'lucide-react'
import moment from 'moment'

export default function EventList({ events, onEventClick, currentDate, detailed = false }) {
  // Group events by date
  const groupEventsByDate = (events) => {
    const groups = {}
    
    events.forEach(event => {
      const dateKey = moment(event.start).format('YYYY-MM-DD')
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
    })
    
    // Sort events within each group by start time
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => new Date(a.start) - new Date(b.start))
    })
    
    return groups
  }

  const getCategoryColor = (category) => {
    const colors = {
      work: 'bg-blue-500',
      personal: 'bg-green-500',
      health: 'bg-yellow-500',
      education: 'bg-purple-500'
    }
    return colors[category] || 'bg-gray-500'
  }

  const formatTime = (date) => {
    return moment(date).format('h:mm A')
  }

  const formatDate = (date) => {
    const eventDate = moment(date)
    const today = moment()
    const tomorrow = moment().add(1, 'day')
    
    if (eventDate.isSame(today, 'day')) {
      return 'Today'
    } else if (eventDate.isSame(tomorrow, 'day')) {
      return 'Tomorrow'
    } else if (eventDate.isSame(today, 'week')) {
      return eventDate.format('dddd')
    } else {
      return eventDate.format('MMM DD, YYYY')
    }
  }

  const isEventToday = (date) => {
    return moment(date).isSame(moment(), 'day')
  }

  const isEventPast = (date) => {
    return moment(date).isBefore(moment(), 'day')
  }

  const groupedEvents = groupEventsByDate(events)
  const sortedDates = Object.keys(groupedEvents).sort()

  if (events.length === 0) {
    return (
      <div className="p-6 text-center">
        <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">No events found</h3>
        <p className="text-gray-500">
          {detailed ? 'No events match your current filters.' : 'Create your first event to get started.'}
        </p>
      </div>
    )
  }

  return (
    <div className={`${detailed ? 'space-y-6' : 'space-y-4'} ${detailed ? 'p-6' : 'p-4'}`}>
      {sortedDates.map(dateKey => {
        const dateEvents = groupedEvents[dateKey]
        const eventDate = moment(dateKey)
        
        return (
          <div key={dateKey} className="space-y-3">
            {/* Date Header - FIXED: Better text colors */}
            <div className="flex items-center space-x-3">
              <div className={`text-sm font-semibold ${
                isEventToday(eventDate) ? 'text-blue-600' : 
                isEventPast(eventDate) ? 'text-gray-500' : 'text-gray-800'
              }`}>
                {formatDate(eventDate)}
              </div>
              <div className="flex-1 h-px bg-gray-200"></div>
              <div className="text-xs text-gray-500">
                {dateEvents.length} {dateEvents.length === 1 ? 'event' : 'events'}
              </div>
            </div>

            {/* Events for this date */}
            <div className="space-y-2">
              {dateEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`
                    group cursor-pointer rounded-lg border transition-all duration-200 hover:shadow-md
                    ${detailed ? 'p-4' : 'p-3'}
                    ${isEventPast(event.start) ? 'opacity-75' : ''}
                    ${isEventToday(event.start) ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}
                  `}
                >
                  <div className="flex items-start space-x-3">
                    {/* Category Color Indicator */}
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getCategoryColor(event.category)}`} />
                    
                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title and Time - FIXED: Better text colors */}
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-semibold truncate ${detailed ? 'text-base' : 'text-sm'} ${
                          isEventPast(event.start) ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {event.title}
                        </h4>
                        <div className={`flex items-center text-xs font-medium ${
                          isEventPast(event.start) ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(event.start)}
                        </div>
                      </div>

                      {/* Details - FIXED: Better text colors */}
                      {detailed && (
                        <div className="space-y-1">
                          {event.description && (
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          
                          <div className="flex items-center flex-wrap gap-3 text-xs text-gray-600">
                            {event.location && (
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                                <span className="truncate max-w-24">{event.location}</span>
                              </div>
                            )}
                            
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center">
                                <Users className="h-3 w-3 mr-1 text-gray-500" />
                                <span>{event.attendees.length}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center">
                              <Tag className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="capitalize">{event.category}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Compact view details - FIXED: Better text colors */}
                      {!detailed && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            {event.location && (
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                                <span className="truncate max-w-20">{event.location}</span>
                              </div>
                            )}
                            
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center">
                                <Users className="h-3 w-3 mr-1 text-gray-500" />
                                <span>{event.attendees.length}</span>
                              </div>
                            )}
                          </div>
                          
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            event.priority === 'high' ? 'bg-red-100 text-red-700' :
                            event.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {event.priority}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}