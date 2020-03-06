/**
 * (Currently unused) Get an array of time-location combinations for a trip to get forecasts for.
 *
 * This could be a future, more advanced trip forecast implementation, where not just a single
 * location is used to check a trip's forecast and the forecast is checked for precipitation
 * within the trip time frame.
 * Instead, the forecast could be checked for a series of locations like this:
 * time intervals:          start<---><--->...<--->end
 * locations:      from_{lat,lon}  x    x       x  to_{lat,lon}
 *
 * This might be useful for long trips.
 *
 * @param trip Trip to get forecast locations for
 */
export function getForecastLocations (trip: Trip): Array<TimedForecastLocation> {
  const lat = (trip.from_lat + trip.to_lat) / 2
  const lon = (trip.from_lon + trip.to_lon) / 2
  // Need to use getTime() in arithmetic so typescript does not complain about wrong type
  const t = new Date(trip.start.getTime())
  t.setMilliseconds(
    trip.start.getMilliseconds() + trip.end.getTime() - trip.start.getTime()
  )
  t.setMilliseconds(0)
  t.setSeconds(0)
  return [{ time: trip.start, lat, lon }]
}

/**
 * Get a characteristic location of a trip to get a forecast for.
 * Currently just using the center of the trip. Bad for trips deviating a lot from a straight line.
 *
 * @param trip Trip to get the location for
 */
export function getForecastLocation (trip: Trip): ForecastLocation {
  const lat = (trip.from_lat + trip.to_lat) / 2
  const lon = (trip.from_lon + trip.to_lon) / 2
  return { lat, lon }
}
