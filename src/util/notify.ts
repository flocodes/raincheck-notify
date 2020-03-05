import sendgrid from '@sendgrid/mail'
import moment from 'moment-timezone'
import composeEmail from './email'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'INVALID_KEY'
if (SENDGRID_API_KEY === 'INVALID_KEY') {
  throw new Error('Environment variable "SENDGRID_API_KEY" must be set.')
}

const FROM_EMAIL_ADDRESS = process.env.FROM_EMAIL_ADDRESS || 'INVALID_ADDRESS'
if (FROM_EMAIL_ADDRESS === 'INVALID_ADDRESS') {
  throw new Error('Environment variable "FROM_EMAIL_ADDRESS" must be set.')
}

sendgrid.setApiKey(SENDGRID_API_KEY)

const SEND_NOTIFICATION_IMMEDIATELY = false

export async function notify_user (trip: Trip, forecast: HourlyForecast) {
  // Send at time the user wants to get notified at, or if we are behind on notifications,
  // send immediately (in 1 minute)
  const now = moment()
  now.add(1, 'minute')
  const send_at = moment(trip.notify_at.toISOString())
  send_at.year(now.year()).month(now.month()).date(now.date())
  let send_at_unix = null
  console.log(`Now: ${now.format()}, send at: ${send_at.format()}`)
  if (!SEND_NOTIFICATION_IMMEDIATELY && send_at.isAfter(now)) {
    send_at_unix = send_at.unix()
    console.log(`The message will not be sent until ${send_at.format()}`)
  }

  // TODO: Use user's timezone and display style (12/24h)
  const trip_start = moment.tz(trip.start, 'UTC').format('H:mm')
  const trip_end = moment.tz(trip.end, 'UTC').format('H:mm')
  // TODO: Add human-readable trip location descriptions

  // Create intuitive and numerical measure of precipitation intensity
  let precip_intensity_human = ''
  let precip_intensity = ''
  if (forecast.precip_probability && forecast.precip_intensity) {
    precip_intensity = `(${Math.round(100 * forecast.precip_intensity) / 100} mm/h)`
    if (forecast.precip_intensity < 2.5) precip_intensity_human = 'light '
    else if (forecast.precip_intensity < 7.6) precip_intensity_human = 'moderate '
    else if (forecast.precip_intensity < 50) precip_intensity_human = 'heavy '
    else precip_intensity_human = 'violent '
  }

  const temperature = Math.round(forecast.temperature)
  const precip_probability = Math.round(100 * forecast.precip_probability)

  // TODO : Use template, add icon and DarkSky attribution
  // The sendgrid module mail attributes deviate from the official API documentation and are listed here:
  // https://github.com/sendgrid/sendgrid-nodejs/blob/master/packages/helpers/classes/mail.js
  let message = composeEmail(
    FROM_EMAIL_ADDRESS,
    trip.email,
    forecast.icon, {
      name: trip.name,
      start: trip_start,
      end: trip_end,
      summary: forecast.summary || '',
      temperature: temperature,
      precipProbability: precip_probability,
      precipType: forecast.precip_type || 'precipitation',
      precipIntensity: precip_intensity,
      precipIntensityHuman: precip_intensity_human
    }
  )
  if (send_at_unix) message = Object.assign({ sendAt: send_at_unix }, message)
  sendgrid.send(message).then(([response, _body]) => {
    console.log(`Status: ${response.statusCode} -- ${response.statusMessage}`)
    if (response.statusCode !== 202) {
      for (const error of response.body.errors) {
        console.log(error)
      }
    }
  }).catch(error => {
    console.log(error)
  })
}
