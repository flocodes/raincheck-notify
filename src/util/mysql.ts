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
 * @returns A database connection as a promise if connection is sucessful
 */
export function mysqlConnection (): Promise<mysql.Connection> {
  const connection = mysql.createConnection(DB_CONFIG)
  return new Promise<mysql.Connection>((resolve, reject) => {
    connection.connect((error) => {
      if (error) {
        console.log('Error connecting to MySQL database.')
        reject(Error(error.message))
      }
      console.log(`Connected as ${connection.threadId}`)
      resolve(connection)
    })
  }).catch(error => Promise.reject(new Error(`Could not connect to MySQL database: ${error}`)))
}

export function endMysqlConnection (connection: mysql.Connection) {
  connection.end((error) => {
    if (error) {
      console.log('Error ending MySQL database connection')
      console.log(error.message)
    }
  })
}

// Promise-based query
export function promiseQuery (connection: mysql.Connection, query: string): Promise<Array<any>> {
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
export async function getTrips (interval: number): Promise<Array<Trip>|null> {
  const connection = await mysqlConnection().catch(error => Promise.reject(new Error(error)))
  const now = new Date()
  now.setUTCFullYear(1970, 0, 1)
  now.setSeconds(0, 0)
  const later = new Date()
  later.setUTCFullYear(1970, 0, 1)
  later.setMinutes(later.getMinutes() + interval, 0, 0)
  const from = now.toISOString()
  const to = later.toISOString()

  const trips = await promiseQuery(
    connection,
    'SELECT Trip.*, User.email FROM `Trip` LEFT JOIN `User` ON Trip.user = User.id ' +
    `WHERE \`enabled\` = 1 AND \`notify_at\` >= "${from}" AND \`notify_at\` < "${to}"`
  )
  endMysqlConnection(connection)
  return trips
}

export async function writeForecasts (forecasts: Array<HourlyForecast>) {
  const connection = await mysqlConnection().catch(error => Promise.reject(new Error(error)))
  for (const forecast of forecasts) {
    const tripId = forecast.trip
    delete forecast.trip
    if (forecast.date instanceof Date) forecast.date = forecast.date.toISOString().slice(0, -1)
    await promiseQuery(
      connection,
      `UPDATE \`Trip\` SET \`forecast\` = '${JSON.stringify(forecast)}' WHERE \`id\` = "${tripId}";`
    ).catch(error => {
      console.log(`Could not write forecast for trip ${tripId} to DB`)
      console.log(error.stack)
    })
  }
  endMysqlConnection(connection)
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
