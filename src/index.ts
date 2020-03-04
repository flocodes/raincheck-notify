/* eslint-disable import/first */
require('dotenv').config()
import { get_trips, write_forecasts } from './util/mysql'
import { get_trip_forecast } from './util/darksky'
import { notify_user } from './util/notify'

async function get_forecasts () {
  const trips = await get_trips(12 * 60)
  console.log('Trips:')
  console.log(trips)

  if (!trips || trips.length === 0) return

  // TODO: Get forecasts in parallel
  const forecasts = []
  for (const trip of trips) {
    const forecast = await get_trip_forecast(trip)
    if (!forecast) {
      console.log(`No forecast for trip ${trip.id}`)
      continue
    }
    console.log(`Forecast for trip ${trip.id}:`)
    console.log(forecast)
    notify_user(trip, forecast)
    if (forecast) forecasts.push(forecast)
  }
  write_forecasts(forecasts)
}

get_forecasts()

/*
const forecast = {
  trip: 'ck6f1o2b1003s0781f8nx068t',
  precip_probability: 0.46,
  temperature: 10.64,
  date: new Date('2020-02-09T00:00:00.000Z'),
  precip_intensity: 1.2465,
  precip_type: 'rain',
  icon: 'rain',
  summary: 'Possible Light Rain and Dangerously Windy'
}
*/
