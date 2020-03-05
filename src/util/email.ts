import mjml2html from 'mjml'
import fs from 'fs'

interface ContentVars {
  name: string,
  start: string,
  end: string,
  summary: string,
  temperature: number,
  precipProbability: number,
  precipType: string,
  precipIntensity: string,
  precipIntensityHuman: string,
}

function getPlainContent (vars: ContentVars): string {
  return (
    `The forecast for your trip "${vars.name}" from ${vars.start} to ${vars.end} is:\n` +
    `${vars.summary} with an average temperature of ${vars.temperature}&deg;C\n` +
    `${vars.precipProbability}% chance of ${vars.precipIntensityHuman}` +
    `${vars.precipType} ${vars.precipIntensity}\n\n` +
    'This email was sent by Raincheck. If you do not want to receive further email notifications, ' +
    'you can delete your account at __TODO__ \n\n' +
    'Forecast powered by DarkSky: https://darksky.net/poweredby/\n'
  )
}

// This depends on there being an image attachment with CID "forecastImage"
function getHtmlContent (vars: ContentVars): string {
  /* eslint-disable max-len */
  const { html, errors } = mjml2html(`
  <mjml>
    <mj-head>
      <mj-font name="Roboto" href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" />
      <mj-style>
        .roboto div {
          font-family: 'Roboto', sans-serif !important;
        }
        .bold div {
          font-weight: 700 !important;
        }
        .head div {
          font-size: 24px !important;
        }
        .body div {
          font-size: 16px !important;
          line-height: 1.2 !important;
        }
        .foot div {
          font-size: 12px !important;
        }
        .shadow div {
          box-shadow: 0 4px 2px -2px rgba(0, 0, 0, .5);
        }
        .noshadow div {
          box-shadow: none !important;
        }
        .white div, .link a {
          color: white !important;
        }
        .noline a {
          text-decoration: none;
        }
      </mj-style>
    </mj-head>
    <mj-body css-class="roboto">
      <mj-section padding="0" css-class="shadow white body link noline bold">
        <mj-column background-color="#388e3c" padding="16px 16px" css-class="noshadow">
          <mj-text padding="0"><a href="TODO">Raincheck (TODO: Link)</a></mj-text>
        </mj-column>
      </mj-section>
      <mj-section padding="16px 8px 16px 8px">
          <mj-column padding="0">
            <mj-text padding="0 0 16px 0" align="center" css-class="body">The forecast for your trip "${vars.name}" from ${vars.start} to ${vars.end} is</mj-text>
            <mj-image padding="0 0 16px 0" width="100px" src="cid:forecastImage"/>
            <mj-text padding="0 0 8px 0" align="center" css-class="bold head">${vars.summary}</mj-text>
            <mj-text padding="0 0 8px 0" align="center" css-class="body">${vars.temperature}&deg;C</mj-text>
            <mj-text padding="0" align="center" css-class="body">${vars.precipProbability}% chance of ${vars.precipIntensityHuman}${vars.precipType} ${vars.precipIntensity}</mj-text>
          </mj-column>
      </mj-section>
      <mj-section padding="0" css-class="foot shadow white link">
        <mj-column padding="16px 16px" background-color="#388e3c" css-class="noshadow">
          <mj-text padding="0 0 16px 0">This email was sent by Raincheck. If you do not want to receive further email notifications, you can delete your account at <a href="TODO">TODO: DELETE LINK.</a></mj-text>
          <mj-text padding="0">Forecast <a href="https://darksky.net/poweredby/">powered by DarkSky.</a></mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>
  `)
  /* eslint-enable max-len */
  if (!(errors === undefined || errors === null || errors !== [])) {
    console.log('There were errors generating an HTML email from MJML source:')
    console.log(errors.toString())
  }
  return html
}

function forecastImage (name?: string): string|undefined {
  let path = 'static/'
  /* eslint-disable indent,no-multi-spaces */
  path +=
    (name === 'clear-day')             ? 'wi-day-sunny.png'
    : (name === 'clear-night')         ? 'wi-night-clear.png'
    : (name === 'rain')                ? 'wi-rain.png'
    : (name === 'snow')                ? 'wi-snow.png'
    : (name === 'sleet')               ? 'wi-sleet.png'
    : (name === 'wind')                ? 'wi-strong-wind.png'
    : (name === 'fog')                 ? 'wi-fog.png'
    : (name === 'cloudy')              ? 'wi-cloudy.png'
    : (name === 'partly-cloudy-day')   ? 'wi-day-cloudy.png'
    : (name === 'partly-cloudy-night') ? 'wi-night-alt-cloudy.png'
    : (name === 'hail')                ? 'wi-hail.png'
    : (name === 'thunderstorm')        ? 'wi-thunderstorm.png'
    : (name === 'tornado')             ? 'wi-tornado.png'
    : 'wi-na.png'
  /* eslint-enable */
  try {
    return fs.readFileSync(path).toString('base64')
  } catch (error) {
    console.log(`Could not retrieve forecast forecast image ${path}:`)
    console.log(error)
  }
}

// This is used in the HTML email
function getAttachments (icon?: string) {
  const image = forecastImage(icon)
  if (!image) return []
  return [{
    content: image,
    filename: 'forecastImage.png',
    type: 'image/png',
    disposition: 'inline',
    content_id: 'forecastImage'
  }]
}

export default function composeEmail (fromEmail: string, to: string, icon: string|undefined, vars: ContentVars) {
  return {
    to: to,
    from: {
      email: fromEmail,
      name: 'Raincheck'
    },
    subject: `${vars.summary} during ${vars.name} at ${vars.start}`,
    content: [{
      type: 'text/plain',
      value: getPlainContent(vars)
    }, {
      type: 'text/html',
      value: getHtmlContent(vars)
    }],
    attachments: getAttachments(icon)
  }
}
