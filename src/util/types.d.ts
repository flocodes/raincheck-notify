declare interface Trip {
  /* eslint-disable camelcase */
  id: string
  enabled: Boolean
  name: string
  start: Date
  end: Date
  from_lat: number
  from_lon: number
  to_lat: number
  to_lon: number
  notify_at: Date
  email: string
  /* eslint-enable camelcase */
}

declare interface HourlyForecast {
  trip: string
  date: Date | string
  precipProbability: number
  temperature: number
  precipIntensity?: number
  precipType?: string
  icon?: string
  summary?: string
}

declare interface MinutelyForecast {
  precipProbability: number
  precipIntensity?: number
  precipType?: string
}

declare interface ForecastLocation {
  lat: number
  lon: number
}

declare interface TimedForecastLocation {
  lat: number
  lon: number
  time: Date
}
