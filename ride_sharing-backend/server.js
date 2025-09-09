const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize Express app
const app = express();

app.use(cors());
app.use(bodyParser.json());

const PORT = 5000;
const SECRET = 'your_jwt_secret';

// In-memory users and rides storage
const users = {};
const rideShares = [];
const rideBookings = [];

const indiaLocations = {
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Noida"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangalore", "Hubli", "Belgaum"],
  "West Bengal": ["Kolkata", "Asansol", "Siliguri", "Durgapur", "Howrah"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Vasant Kunj", "Saket"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"]
};

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Signup endpoint
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.status(400).send('User exists');
  const hashed = await bcrypt.hash(password, 8);
  users[username] = { password: hashed };
  res.send('Signup successful');
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user) return res.status(400).send('Invalid username or password');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).send('Invalid username or password');
  const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Share Ride endpoint - separate start and destination locations
app.post('/share-ride', authenticateToken, (req, res) => {
  const {
    startState, startCity, startPoint,
    destState, destCity, destPoint,
    dateTime, availableSeats
  } = req.body;

  if (!startState || !startCity || !startPoint || !destState || !destCity || !destPoint || !dateTime || !availableSeats) {
    return res.status(400).send('Missing required ride details');
  }

  // Validate existence in predefined data
  if (!indiaLocations[startState] || !indiaLocations[startState].includes(startCity)) {
    return res.status(400).send('Invalid starting state or city');
  }
  if (!indiaLocations[destState] || !indiaLocations[destState].includes(destCity)) {
    return res.status(400).send('Invalid destination state or city');
  }

  rideShares.push({
    username: req.user.username,
    startState, startCity, startPoint,
    destState, destCity, destPoint,
    dateTime,
    availableSeats
  });

  res.send('Ride shared successfully');
});

// Get available rides endpoint
app.get('/available-rides', authenticateToken, (req, res) => {
  // For simplicity returns all ride shares currently stored
  res.json(rideShares);
});

// Book Ride endpoint
app.post('/book-ride', authenticateToken, (req, res) => {
  const { startState, startCity, startPoint, destState, destCity, destPoint, dateTime, seatsRequired } = req.body;

  if (!startState || !startCity || !startPoint || !destState || !destCity || !destPoint || !dateTime || !seatsRequired) {
    return res.status(400).send('Missing required booking details');
  }

  if (!indiaLocations[startState] || !indiaLocations[startState].includes(startCity)) {
    return res.status(400).send('Invalid starting state or city');
  }
  if (!indiaLocations[destState] || !indiaLocations[destState].includes(destCity)) {
    return res.status(400).send('Invalid destination state or city');
  }

  rideBookings.push({
    username: req.user.username,
    startState, startCity, startPoint,
    destState, destCity, destPoint,
    dateTime,
    seatsRequired
  });

  res.send('Ride booking request added successfully');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
