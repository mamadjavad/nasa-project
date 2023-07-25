const http = require('http');
// require('dotenv').config();
const app = require('./app');

const { loadPlanetsData } = require('./models/planets.model');
const { loadLaunchData } = require('./models/lauches.model');

const PORT = process.env.PORT || 8000;
const { mongoConnect } = require('./services/mongo');

const server = http.createServer(app);

// mongoose.connection.once('open', () => {
//   console.log('MongoDb connection ready!');
// });
// mongoose.connection.on('error', (err) => {
//   console.error('error');
// });
async function startServer() {
  await mongoConnect();
  await loadPlanetsData();
  await loadLaunchData();
  server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
  });
}
startServer();
