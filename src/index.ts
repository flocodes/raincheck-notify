/* eslint-disable import/first */
require('dotenv').config()
import { get_trips, write_forecasts } from './util/mysql'
import { get_trip_forecast } from './util/darksky'
import { notify_user } from './util/notify'

async function get_forecasts () {
  console.log(`${new Date().toISOString()}: Getting forecasts`)
  console.log('Getting trips from database')
  const trips = await get_trips(12 * 60).catch(error => Promise.reject(new Error(error)))

  if (!trips || trips.length === 0) {
    console.log('No trips to process')
    return
  }

  console.log(`Getting forecasts for ${trips.length} trips`)
  const forecasts = await Promise.all(trips.map(async trip => {
    const forecast = await get_trip_forecast(trip).catch(error => Promise.reject(new Error(error)))
    if (!forecast) {
      console.log(`No forecast for trip ${trip.id}`)
      return null
    }
    notify_user(trip, forecast)
    return forecast
  }))

  // So typescript knows 'validForecasts' only contains actually valid forecasts
  const filterForecasts = (forecast: HourlyForecast|null): forecast is HourlyForecast => {
    return forecast !== null
  }

  const validForecasts = forecasts.filter(filterForecasts)
  console.log(`Writing ${validForecasts.length} forecasts to database`)
  write_forecasts(validForecasts)
}

get_forecasts().catch(error => {
  console.log(error)
})
