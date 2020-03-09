/* eslint-disable import/first */
require('dotenv').config()
import { getTrips, writeForecasts } from './util/mysql'
import { getTripForecast } from './util/darksky'
import { notifyUser } from './util/notify'

const NOTIFICATION_INTERVAL = Number(process.env.NOTIFICATION_INTERVAL || 60)

async function getForecasts () {
  console.log(`${new Date().toISOString()}: Getting forecasts`)
  console.log('Getting trips from database')
  const trips = await getTrips(NOTIFICATION_INTERVAL).catch(error => Promise.reject(new Error(error)))

  if (!trips || trips.length === 0) {
    console.log('No trips to process')
    return
  }

  console.log(`Getting forecasts for ${trips.length} trips`)
  const forecasts = await Promise.all(trips.map(async trip => {
    const forecast = await getTripForecast(trip).catch(error => Promise.reject(new Error(error)))
    if (!forecast) {
      console.log(`No forecast for trip ${trip.id}`)
      return null
    }
    notifyUser(trip, forecast)
    return forecast
  }))

  // So typescript knows 'validForecasts' only contains actually valid forecasts
  const filterForecasts = (forecast: HourlyForecast|null): forecast is HourlyForecast => {
    return forecast !== null
  }

  const validForecasts = forecasts.filter(filterForecasts)
  console.log(`Writing ${validForecasts.length} forecasts to database`)
  writeForecasts(validForecasts)
}

getForecasts().catch(error => {
  console.log(error)
})
