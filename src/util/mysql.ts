import * as mysql from 'mysql'

const DB_CONFIG: mysql.ConnectionConfig = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  timezone: 'Z',
}

/**
 * Create a connection to a MySQL database defined through `config`
 * @param config Config object as defined in the `mysql` module
 *
 * @returns A database connection as a promise
 */
export function mysql_connection (): Promise<mysql.Connection> {
  const connection = mysql.createConnection(DB_CONFIG)
  return new Promise((resolve, reject) => {
    connection.connect((error) => {
      if (error) {
        console.log('Error connecting to MySQL database.')
        reject(Error(error.message))
      }
      console.log(`Connected as ${connection.threadId}`)
      resolve(connection)
    })
  })
}

export function end_mysql_connection (connection: mysql.Connection) {
  connection.end((error) => {
    if (error) {
      console.log('Error ending MySQL database connection')
      console.log(error.message)
    }
  })
}

// Promise-based query
export function promise_query (connection: mysql.Connection, query: string): Promise<Array<any>> {
  return new Promise((resolve, reject) => {
    console.log(`Executing query ${query}`)
    connection.query(
      query,
      (error, results) => {
        if (error) {
          console.log(`Error executing query ${query}`)
          reject(error)
        }
        if (!results) return null
        // Convert RowDataPackets into JS objects
        const ret = []
        for (const result of results) {
          ret.push(Object.assign({}, result))
        }
        resolve(ret)
      }
    )
  })
}

/**
 * Get all trips with the corresponding user from the Trip database which users want to get notified
 * about in the time interval from now to in `interval` minutes
 *
 * @param db_config MySQL database configuration
 * @param interval Time interval in minutes
 *
 * @returns A list of trips with the user info flat in the object, as a promise
 */
export async function get_trips (interval: number): Promise<Array<Trip>> {
  const connection = await mysql_connection()
  const now = new Date()
  now.setUTCFullYear(1970, 0, 1)
  now.setSeconds(0, 0)
  const later = new Date()
  later.setUTCFullYear(1970, 0, 1)
  later.setMinutes(later.getMinutes() + interval, 0, 0)
  const from = now.toISOString()
  const to = later.toISOString()

  // TODO: Only get trips without forecasts for today
  const trips = await promise_query(
    connection,
    'SELECT Trip.*, User.email FROM `Trip` LEFT JOIN `User` ON Trip.user = User.id ' +
    `WHERE \`enabled\` = 1 AND \`notify_at\` >= "${from}" AND \`notify_at\` < "${to}"`
  )
  end_mysql_connection(connection)
  return trips
}

export async function write_forecasts (forecasts: Array<HourlyForecast>) {
  const connection = await mysql_connection()
  for (const forecast of forecasts) {
    const trip_id = forecast.trip
    delete forecast.trip
    if (forecast.date instanceof Date) forecast.date = forecast.date.toISOString().slice(0, -1)
    await promise_query(
      connection,
      `UPDATE \`Trip\` SET \`forecast\` = '${JSON.stringify(forecast)}' WHERE \`id\` = "${trip_id}";`
    ).catch(error => {
      console.log(`Could not write forecast for trip ${trip_id} to DB`)
      console.log(error.stack)
    })
  }
  end_mysql_connection(connection)
}

/*
// Async query -- Uses node.js util function "promisify"
const async_query_promisified = util.promisify(connection.query).bind(connection)
async function async_query(query: string) {
    return await async_query_promisified(query)
}

// Callback query
function cquery(query: string, callback?: Function) {
    connection.query(
        query,
        (error, results, fields) => {
            if (error) throw error
            //console.log(results)
            if (!callback) return
            return callback(results)
        }
    )
}
*/
