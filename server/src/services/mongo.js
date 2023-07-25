const mongoose = require('mongoose');

const MONGO_URL = 'mongodb://127.0.0.1:27017/NASA_PROJECT';

mongoose.connection.once('open', () => {
  console.log('MongoDb connection ready!');
});
mongoose.connection.on('error', (err) => {
  console.error('error');
});

async function mongoConnect() {
  await mongoose.connect(MONGO_URL);
}

module.exports = {
  mongoConnect,
};
