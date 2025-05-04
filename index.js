const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors middleware
const prodformrouter = require('./services/formulaire');
const path = require('path');

const app = express();

app.use(bodyParser.json({ limit: '50mb' })); // Increase limit to 50MB
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));   

app.use(express.json()); //
app.use(cors({
    origin: 'http://localhost:5173'
  }));
  
app.use('/ajouter', prodformrouter)


// Serve static files from "uploads" folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));





const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
