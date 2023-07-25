const axios = require('axios');
const launchesDataBase = require('./launches.mongo');
const planets = require('./planets.mongo');
const launches = new Map();

const DEFAULT_FLIGHT_NUMBER = 100;

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

async function populateLaunches() {
  console.log('Dowloading launch data ...');
  const response = await axios.post(SPACEX_API_URL, {
    query: {},
    options: {
      pagination: false,

      populate: [
        {
          path: 'rocket',
          select: { name: 1 },
        },
        {
          path: 'payloads',
          select: {
            customers: 1,
          },
        },
      ],
    },
  });

  if (response.status !== 200) {
    console.log('Problem downloading launch data');
    throw new Error('Launch data download failed!');
  }

  const launchDocs = response.data.docs;
  for (const launchDoc of launchDocs) {
    const payloads = launchDoc['payloads'];
    const customers = payloads.flatMap((payload) => {
      return payload['customers'];
    });
    const launch = {
      flightNumber: launchDoc['flight_number'],
      mission: launchDoc['name'],
      rocket: launchDoc['rocket']['name'],
      launchDate: launchDoc['date_local'],
      upcoming: launchDoc['upcoming'],
      success: launchDoc['success'],
      customers,
    };

    await saveLaunch(launch);
  }
}
async function getLatestFlightNumber() {
  const latestLaunch = await launchesDataBase.findOne().sort('-flightNumber');
  if (!latestLaunch) {
    return DEFAULT_FLIGHT_NUMBER;
  }
  return latestLaunch.flightNumber;
}
async function getAllLaunches(skip, limit) {
  return await launchesDataBase.find({}, { _id: 0, __v: 0 }).sort({ flightNumber: 1 }).skip(skip).limit(limit);
}

async function saveLaunch(launch) {
  await launchesDataBase.findOneAndUpdate(
    {
      flightNumber: launch.flightNumber,
    },
    launch,
    { upsert: true }
  );
}
async function scheduleNewLaunch(launch) {
  const planet = await planets.find({
    keplerName: launch.target,
  });

  if (!planet.length) {
    throw new Error('No matching planet not found!');
  }
  const newFlightNumber = (await getLatestFlightNumber()) + 1;
  const newLaunch = Object.assign(launch, {
    success: true,
    upcoming: true,
    customers: ['Zero to Mastery', 'NASA'],
    flightNumber: newFlightNumber,
  });

  await saveLaunch(newLaunch);
}

async function loadLaunchData() {
  const firstLaunch = await findLaunch({
    flightNumber: 1,
    rocket: 'Falcon 1',
    mission: 'falconSat',
  });
  if (firstLaunch) {
    console.log('Launch data already loaded');
    return;
  } else {
    await populateLaunches();
  }
}

async function findLaunch(filter) {
  return await launchesDataBase.findOne(filter);
}

async function existsLaunchWithId(launchId) {
  return await launchesDataBase.findOne({
    flightNumber: launchId,
  });
}

async function abortLaunchById(launchId) {
  const aborted = await launchesDataBase.updateOne(
    {
      flightNumber: launchId,
    },
    {
      upcoming: false,
      succes: false,
    }
  );
  return aborted.acknowledged && aborted.modifiedCount === 1;
}
module.exports = {
  loadLaunchData,
  getAllLaunches,
  scheduleNewLaunch,
  existsLaunchWithId,
  abortLaunchById,
};
