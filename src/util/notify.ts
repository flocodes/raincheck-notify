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

export async function notifyUser (trip: Trip, forecast: HourlyForecast) {
  // Send at time the user wants to get notified at, or if we are behind on notifications,
  // send immediately (in 1 minute)
  const now = moment()
  now.add(1, 'minute')
  const sendAt = moment(trip.notify_at.toISOString())
  sendAt.year(now.year()).month(now.month()).date(now.date())
  let sendAtUnix = null
  console.log(`Now: ${now.format()}, send at: ${sendAt.format()}`)
  if (!SEND_NOTIFICATION_IMMEDIATELY && sendAt.isAfter(now)) {
    sendAtUnix = sendAt.unix()
    console.log(`The message will not be sent until ${sendAt.format()}`)
  }

  // TODO: Use user's timezone and display style (12/24h)
  const tripStart = moment.tz(trip.start, 'UTC').format('H:mm')
  const tripEnd = moment.tz(trip.end, 'UTC').format('H:mm')

  // Create intuitive and numerical measure of precipitation intensity
  let precipIntensityHuman = ''
  let precipIntensity = ''
  if (forecast.precipProbability && forecast.precipIntensity) {
    precipIntensity = `(${Math.round(100 * forecast.precipIntensity) / 100} mm/h)`
    if (forecast.precipIntensity < 2.5) precipIntensityHuman = 'light '
    else if (forecast.precipIntensity < 7.6) precipIntensityHuman = 'moderate '
    else if (forecast.precipIntensity < 50) precipIntensityHuman = 'heavy '
    else precipIntensityHuman = 'violent '
  }

  const temperature = Math.round(forecast.temperature)
  const precipProbability = Math.round(100 * forecast.precipProbability)

  // The sendgrid module mail attributes deviate from the official API documentation and are listed here:
  // https://github.com/sendgrid/sendgrid-nodejs/blob/master/packages/helpers/classes/mail.js
  let message = composeEmail(
    FROM_EMAIL_ADDRESS,
    trip.email,
    forecast.icon, {
      name: trip.name,
      start: tripStart,
      end: tripEnd,
      summary: forecast.summary || '',
      temperature: temperature,
      precipProbability: precipProbability,
      precipType: forecast.precipType || 'precipitation',
      precipIntensity: precipIntensity,
      precipIntensityHuman: precipIntensityHuman
    }
  )
  if (sendAtUnix) message = Object.assign({ sendAt: sendAtUnix }, message)
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
