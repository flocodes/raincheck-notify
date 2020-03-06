import { DarkSky, Units, Exclude, Forecast } from 'darkskyapi-ts'
import * as moment from 'moment-timezone'
import { getForecastLocation } from './common'

// Get minutely forecast data in addition to hourly data if possible and overwrite hourly precipitation data
const DO_MINUTELY_FORECAST = true

const DARKSKY_API_SECRET = process.env.DARKSKY_API_SECRET || 'INVALID_SECRET'
if (DARKSKY_API_SECRET === 'INVALID_SECRET') {
  throw new Error('Environment variable "DARKSKY_API_SECRET" must be set.')
}

const darkSky = new DarkSky(DARKSKY_API_SECRET, { units: Units.SI })

/**
 * Get today's forecast for a trip, using hourly forecast data and minutely data, if available.
 *
 * TODO: Add wind speed
 * TODO: Incorporate alerts -- check if expiration date is after end of trip and notify the user
 *
 * @param trip The trip to get the forecast for
 *
 * @returns An HourlyForecast object or null if the forecast could not be retrieved
 */
export async function getTripForecast (trip: Trip): Promise<HourlyForecast | null> {
  const location = getForecastLocation(trip)
  const exclude = [Exclude.CURRENTLY, Exclude.DAILY]
  let requestMinutelyForecast = true
  if (!DO_MINUTELY_FORECAST || trip.end.getTime() - new Date().getTime() < 3600 * 1000) {
    exclude.push(Exclude.MINUTELY)
    requestMinutelyForecast = false
  }
  const forecast = await darkSky.forecast(location.lat, location.lon, {
    units: Units.SI,
    exclude
  })

  const hourlyForecast = getHourlyForecast(trip, forecast)
  console.log(`Hourly forecast for trip ${trip.id}:`)
  console.log(hourlyForecast)

  if (!hourlyForecast) return null

  if (requestMinutelyForecast) {
    const minutelyForecast = getMinutelyForecast(trip, forecast)
    console.log(`Minutely forecast for trip ${trip.id}:`)
    console.log(minutelyForecast)
    if (minutelyForecast) {
      console.log(`Replacing hourly forecast with minutely data for trip ${trip.id}`)
      hourlyForecast.precipIntensity = minutelyForecast?.precipIntensity
      hourlyForecast.precipProbability = minutelyForecast.precipProbability
      hourlyForecast.precipType = minutelyForecast?.precipType
    } else {
      console.log(`Requested minutely forecast for trip ${trip.id}, but could not determine minutely data. Using hourly forecast.`)
    }
  }
  return hourlyForecast
}

/**
 * Get the relevant parameters from an hourly forecast for a trip
 *
 * This is not ideal for short trips around full hours, e.g. from 17:50 to 18:10, as this will
 * return the maximum precipitation probability and intensity between 17:00 and 19:00.
 *
 * Should supplement this with minutely data when possible.
 *
 * @param trip The trip to get the forecast for
 * @param forecast A DarkSky forecast object that *must* contain hourly forecast data
 *
 * @returns The maximum precipitation probability, intensity, the most common precipitation type
 * and the average temperature
 */
function getHourlyForecast (trip: Trip, forecast: Forecast): HourlyForecast | null {
  if (!forecast.hourly) {
    console.log(`The forecast for trip with ID ${trip.id} does not contain hourly data.`)
    return null
  }

  // Set up time comparison between trip and forecast
  const today = new Date().getUTCDay()
  console.log(`Trip ${trip.id} start ${trip.start.toISOString()}, end ${trip.end.toISOString()}.`)
  const tripStartHour = trip.start.getUTCHours()
  const tripEndHour = trip.end.getUTCHours()
  const tripMiddleHour = Math.floor(0.5 * (tripStartHour + tripEndHour))

  // Extract data for time points from hourly data
  let precipIntensity = 0
  let precipProbability = 0
  const precipTypes = {
    rain: 0,
    snow: 0,
    sleet: 0
  }
  let temperature = 0
  let icon = null
  let summary = null
  let count = 0
  for (const point of forecast.hourly.data) {
    // DarkSky returns a UNIX time with a time zone
    // Unix time = Time in seconds since 01.01.1970
    // JS time = Time in *milli*seconds since 01.01.1970
    // => Need to multiply DarkSky time by 1000, then apply time zone
    const pointDate = moment.tz(point.time * 1000, forecast.timezone).toDate()
    const pointHour = pointDate.getUTCHours()
    if (pointDate.getUTCDay() === today && pointHour >= tripStartHour && pointHour <= tripEndHour) {
      console.log(
        `Using point ${pointDate.toISOString()} for trip ${trip.id} forecast: ` +
        `PI ${point.precipIntensity}, PP ${point.precipProbability}, PT ${point.precipType}, T ${point.temperature}.`
      )
      count++
      if (point.precipIntensity > precipIntensity) precipIntensity = point.precipIntensity
      if (point.precipProbability > precipProbability) precipProbability = point.precipProbability
      if (point.precipType) precipTypes[point.precipType]++
      temperature += point.temperature
      if (pointHour === tripMiddleHour) {
        icon = point.icon
        summary = point.summary
      }
    }
  }

  // Sanity check: Does the forecast contain data relevant for the trip?
  if (count === 0) {
    console.log(`Could not get an hourly forecast for trip with ID ${trip.id}.`)
    return null
  }

  // Compute the return value
  temperature /= count
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  const ret: HourlyForecast = { trip: trip.id, precipProbability: precipProbability, temperature, date }
  if (precipIntensity) ret.precipIntensity = precipIntensity
  const precipType = getPrecipType(precipTypes)
  if (precipType) ret.precipType = precipType
  if (icon) ret.icon = icon
  if (summary) ret.summary = summary
  return ret
}

/**
 * Get the maximum values of a minute-by-minute forecast for a trip as supplemental information to
 * get a more accurate forecast of precipitation including only the actual trip time, not the
 * the whole hours of the trip.
 *
 * Using only the hourly forecast, a trip from 17:50 to 18:10 includes data from 17:00 to 19:00.
 *
 * The minutely forecast only contains precipitation data, so this cannot be used standalone
 * and must be combined with an hourly forecast.
 *
 * Additionally, the minutely forecast is only available an hour in advance, so this can only
 * be used for short trips with a short time between notification and trip.
 *
 * @param trip
 * @param forecast A DarkSky forecast object that *must* contain minutely forecast data
 *
 * @returns The maximum precipitation probability, intensity and the most common precipitation
 * type during the trip
 */
function getMinutelyForecast (trip: Trip, forecast: Forecast): MinutelyForecast | null {
  if (!forecast.minutely) {
    console.log(`The forecast for trip with ID ${trip.id} does not contain minutely data.`)
    return null
  }

  // Set date of trip start and end to today
  const tripStart = new Date()
  tripStart.setUTCHours(trip.start.getUTCHours(), trip.start.getUTCMinutes(), 0, 0)
  const tripEnd = new Date()
  tripEnd.setUTCHours(trip.end.getUTCHours(), trip.end.getUTCMinutes(), 0, 0)

  // Extract data for time points from minutely data
  let precipProbability = 0
  let precipIntensity = 0
  const precipTypes = {
    rain: 0,
    snow: 0,
    sleet: 0
  }
  let count = 0
  for (const point of forecast.minutely.data) {
    const pointDate = moment.tz(point.time * 1000, forecast.timezone).toDate()
    if (pointDate > tripStart && pointDate < tripEnd) {
      console.log(
        `Using point ${pointDate.toISOString()} for trip ${trip.id} forecast: ` +
        `PI ${point.precipIntensity}, PP ${point.precipProbability}, PT ${point.precipType}.`
      )
      count++
      if (point.precipProbability > precipProbability) precipProbability = point.precipProbability
      if (point.precipIntensity > precipIntensity) precipIntensity = point.precipIntensity
      if (point.precipType) precipTypes[point.precipType]++
    }
  }

  // Sanity check: Does the forecast contain data relevant for the trip?
  if (count === 0) {
    console.log(`Could not get a minutely forecast for trip with ID ${trip.id}.`)
    return null
  }

  // Compute the return value
  const ret: MinutelyForecast = { precipProbability: precipProbability }
  if (precipIntensity) ret.precipIntensity = precipIntensity
  const precipType = getPrecipType(precipTypes)
  if (precipType) ret.precipType = precipType
  return ret
}

function getPrecipType (precipTypes: { [k: string]: number }) {
  let precipType = null
  let maxCount = 0
  for (const [key, value] of Object.entries(precipTypes)) {
    if (value > maxCount) {
      precipType = key
      maxCount = value
    }
  }
  return precipType
}
