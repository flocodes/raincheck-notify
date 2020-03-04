declare interface Trip {
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
}

declare interface HourlyForecast {
  trip: string
  date: Date | string
  precip_probability: number
  temperature: number
  precip_intensity?: number
  precip_type?: string
  icon?: string
  summary?: string
}

declare interface MinutelyForecast {
  precip_probability: number
  precip_intensity?: number
  precip_type?: string
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
