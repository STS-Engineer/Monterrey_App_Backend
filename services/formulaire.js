const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt= require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');


// Middleware to authenticate and extract user from JWT
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Authorization Header:", authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("Authorization header missing or invalid");
    return res.status(401).json({ message: 'Authorization token is missing' });
  }

  const token = authHeader.split(' ')[1];
  console.log("Extracted Token:", token);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded Token Payload:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("JWT Verification Error:", error.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Prevent duplicate names
  },
});

// File filter to allow only specific types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'video/mp4',
    'video/mpeg',
    'video/avi',
    'video/quicktime',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls or sometimes .csv
    'text/csv', // CSV from some sources
    'application/csv', // CSV from other tools
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};


// Initialize multer
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 10MB file size limit
});

JWT_SECRET='12345'
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Check if the user already exists
    const userExists = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into the database
    const result = await pool.query(
      'INSERT INTO "User" (email, password, role) VALUES ($1, $2, $3) RETURNING user_id',
      [email, hashedPassword, role]
    );

    res.status(201).json({ message: 'User created successfully', userId: result.rows[0].user_id });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});


router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare the password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '72h' }
    );

    res.status(200).json({ message: 'Login successful', token, role: user.role , user_id: user.user_id});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});



// Upload endpoint
router.post(  
  "/machines", authenticate, 
  upload.fields([
    { name: "machineimagefile", maxCount: 1 },
    { name: "files_3d", maxCount: 1 },
    { name: "files_2d", maxCount: 1 },
    { name: "spare_parts_list", maxCount: 1 },
    { name: 'electrical_diagram', maxCount: 1 },
    { name: 'cpk_data', maxCount: 1 },
    { name: 'validation_document', maxCount: 1 },
    { name: 'parameter_studies', maxCount: 1 },
    { name: "plc_program", maxCount: 1 },
    { name: "hmi_program", maxCount: 1 },
    { name: "other_programs", maxCount: 1 },
    { name: "machine_manual", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("Request Body:", req.body);
      console.log("Uploaded Files:", req.files);

      const {
        machine_ref,
        machine_name,
        brand,
        model,
        product_line,
        production_line,
        station,
        consumables,
        fixture_numbers,
        gage_numbers,
        tooling_numbers,
        production_rate,
        air_needed,
        air_pressure,
        air_pressure_unit,
        voltage,
        phases,
        amperage,
        frequency,
        water_cooling,
        water_temp,
        water_temp_unit,
        dust_extraction,
        fume_extraction,
        user_id
        

      } = req.body;

      const getFile = (field) =>
        req.files && req.files[field] ? req.files[field][0].filename : null;

      const machineimagefile = getFile("machineimagefile");
      const files_3d = getFile("files_3d");
      const files_2d = getFile("files_2d");
      const spare_parts_list = getFile("spare_parts_list");
      const electrical_diagram = getFile("electrical_diagram");
      const cpk_data = getFile("cpk_data");
      const validation_document = getFile("validation_document");
      const parameter_studies = getFile("parameter_studies");
      const plc_program = getFile("plc_program");
      const hmi_program = getFile("hmi_program");
      const other_programs = getFile("other_programs");
      const machine_manual = getFile("machine_manual");


   
      await pool.query("BEGIN");
      console.log('User ID:', user_id); // Verify it's logged correctly
      // SQL query with 22 placeholders
      const machineResult = await pool.query(
        `INSERT INTO "Machines" 
          (machine_ref,machine_name, brand, model, product_line, production_line, station,
          machineimagefile, files_3d, files_2d, spare_parts_list,electrical_diagram, plc_program, hmi_program, 
          other_programs, machine_manual, consumables, fixture_numbers, gage_numbers, tooling_numbers, 
          cpk_data, production_rate, validation_document, parameter_studies, air_needed, air_pressure,  air_pressure_unit,  voltage, phases, amperage,frequency,  water_cooling, water_temp,water_temp_unit, dust_extraction, fume_extraction) 
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36) 
        RETURNING machine_id`,
        [
          machine_ref,
          machine_name,
          brand,
          model,
          product_line,
          production_line,
          station,
          machineimagefile,
          files_3d,
          files_2d,
          spare_parts_list,
          electrical_diagram,
          plc_program,
          hmi_program,
          other_programs,
          machine_manual,
          consumables,
          fixture_numbers,
          gage_numbers,
          tooling_numbers,
          cpk_data,
          production_rate,
          validation_document,
          parameter_studies,
          air_needed,
          air_pressure,
          air_pressure_unit,
          voltage,
          phases,
          amperage,
          frequency,
          water_cooling,
          water_temp,
          water_temp_unit,
          dust_extraction,
          fume_extraction
        ]
      );

      const machine_id = machineResult.rows[0].machine_id;
      const actiondate = new Date();
      const parsedUserId = parseInt(user_id, 10); 

      //machinehistorique 
  
      await pool.query(
        `INSERT INTO "Machines_Hist" 
          (machine_id, machine_ref, machine_name, brand, model, product_line, production_line, station,
          machineimagefile, files_3d, files_2d, spare_parts_list, electrical_diagram, plc_program, hmi_program, 
          other_programs, machine_manual, consumables, fixture_numbers, gage_numbers, tooling_numbers, 
          cpk_data, production_rate, validation_document, parameter_studies, action_type, action_date, 
          user_id, air_needed, air_pressure, air_pressure_unit, voltage, phases, amperage, frequency, 
          water_cooling, water_temp, water_temp_unit, dust_extraction, fume_extraction) 
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
           $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40)`,
        [
          machine_id,
          machine_ref,
          machine_name,
          brand,
          model,
          product_line,
          production_line,
          station,
          machineimagefile,
          files_3d,
          files_2d,
          spare_parts_list,
          electrical_diagram,
          plc_program,
          hmi_program,
          other_programs,
          machine_manual,
          consumables,
          fixture_numbers,
          gage_numbers,
          tooling_numbers,
          cpk_data,
          production_rate,
          validation_document,
          parameter_studies,
          "CREATE",  // action_type
          new Date(), // action_date
          parsedUserId, 
          air_needed,
          air_pressure,
          air_pressure_unit,
          voltage,
          phases,
          amperage,
          frequency,
          water_cooling,
          water_temp,
          water_temp_unit,
          dust_extraction,
          fume_extraction,
        ]
      );
      
      


// const insertedProductId = productResult.rows[0].product_id;

// // 2. Insert into MachineProducts
// await pool.query(
//   `INSERT INTO "MachineProducts" (machine_id, product_id)
//    VALUES ($1, $2)`,
//   [machine_id, insertedProductId]
// );
      // Commit transaction
      await pool.query("COMMIT");

      // Send response with the created machine ID
      res.status(201).json({
        message: "Machine created successfully",
        machine_id,
      });
    } catch (error) {
      // Rollback the transaction if an error occurs
      await pool.query("ROLLBACK");
      console.error("Error creating machine:", error);
      res.status(500).json({ message: "Error creating machine" });
    }
  }
);

router.post("/stations", async (req, res) => {
  const { station, description, machine_id, user_id } = req.body;
  console.log("Received Station:", { station, description, machine_id }); 

  try {
    // Insert into Stations and get the inserted station_id
    const insertStationResult = await pool.query(
      `INSERT INTO "Stations" (station, description, machine_id)
       VALUES ($1, $2, $3)
       RETURNING id`, // assuming "id" is the primary key column
      [station, description, machine_id]
    );

    const station_id = insertStationResult.rows[0].id;

    // Insert into Station_Hist using the returned station_id
    await pool.query(
      `INSERT INTO "Station_Hist" 
       (station_id, machine_id, station_description, station_name, action_type, action_date, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [station_id, machine_id, description, station, 'CREATE', new Date(), user_id]
    );

    res.status(201).json({ message: "Station added successfully" });
  } catch (error) {
    console.error("Error inserting station:", error);
    res.status(500).json({ message: "Failed to insert station" });
  }
});


router.put("/stations/:id", async (req, res) => {
  const { id } = req.params; // This is the stationId sent from the frontend
  const { station, description, machine_id, user_id } = req.body;

  // Log received values for debugging
  console.log("Received data:", { id, station, description, machine_id });

  // Check if any required fields are missing or undefined
  if (!station || !description || !machine_id) {
    return res.status(400).json({ message: "Missing required fields: station, description, or machine_id" });
  }

  // Ensure that id and machine_id are numbers and valid
  const numericId = parseInt(id, 10); // Ensure id is a valid number
  const numericMachineId = parseInt(machine_id, 10); // Ensure machine_id is a valid number

  // If either id or machine_id is NaN, return an error
  if (isNaN(numericId) || isNaN(numericMachineId)) {
    return res.status(400).json({ message: "Invalid ID or Machine ID" });
  }

  console.log("Updating Station:", { id: numericId, station, description, machine_id: numericMachineId });

  try {
    // Execute the SQL update query
    const result = await pool.query(
      `UPDATE "Stations"
       SET station = $1,
           description = $2,
           machine_id = $3
       WHERE id = $4`,
      [station, description, numericMachineId, numericId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Station not found" });
    }

    await pool.query(
      `INSERT INTO "Station_Hist" 
       (station_id, machine_id, station_description, station_name, action_type, action_date, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [numericId, numericMachineId, description, station, 'UPDATE', new Date(), user_id]
    );
    



    res.status(200).json({ message: "Station updated successfully" });
  } catch (error) {
    console.error("Error updating station:", error);
    res.status(500).json({ message: "Failed to update station" });
  }
});



// Route to get stations by machine_id
router.get('/stations/:machine_id', async (req, res) => {
  const { machine_id } = req.params; // Extract machine_id from the URL parameter

  try {
    // Query to get stations related to the given machine_id
    const result = await pool.query(
      `SELECT * FROM "Stations" WHERE "machine_id" = $1`,
      [machine_id]
    );

    // If no stations are found for the given machine_id, return a 404 error
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No stations found for this machine.' });
    }

    // Return the stations in the response
    res.status(200).json(result.rows); // result.rows contains the fetched stations

  } catch (error) {
    console.error("Error fetching stations by machine_id:", error);
    res.status(500).json({ message: "Failed to fetch stations" });
  }
});

router.post("/machineproducts", async (req, res) => {
  const { machine_id, product_id, user_id } = req.body;
  console.log('Received request to link:', { machine_id, product_id }); // 🚨 Debug

  try {
    await pool.query(
      `INSERT INTO "MachineProducts" (machine_id, product_id) VALUES ($1, $2)`,
      [machine_id, product_id]
    );

    await pool.query(
      `INSERT INTO "MachineProducts_Hist" 
       (machine_id, product_id, action_type, action_date, user_id)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [machine_id, product_id, 'CREATE', user_id]
    );

    res.status(201).json({ message: "Machine product added and logged successfully" });
  } catch (error) {
    console.error("Error inserting machineproduct:", error);
    res.status(500).json({ message: "Failed to insert machineproduct" });
  }
});



router.put(
  "/machines/:id",
  upload.fields([
    { name: "machineimagefile", maxCount: 1 },
    { name: "files_3d", maxCount: 1 },
    { name: "files_2d", maxCount: 1 },
    { name: "spare_parts_list", maxCount: 1 },
    { name: 'electrical_diagram', maxCount: 1 },
    { name: 'cpk_data', maxCount: 1 },
    { name: 'validation_document', maxCount: 1 },
    { name: 'parameter_studies', maxCount: 1 },
    { name: "plc_program", maxCount: 1 },
    { name: "hmi_program", maxCount: 1 },
    { name: "other_programs", maxCount: 1 },
    { name: "machine_manual", maxCount: 1 },
  ]),
  async (req, res) => {
    const { id } = req.params;

    // Fix: use req.body instead of requestBody
    const cleanedBody = Object.fromEntries(
      Object.entries(req.body).map(([key, value]) => {
        return [key, value === 'null' ? null : value];
      })
    );

    const {
      machine_ref,
      machine_name,
      brand,
      model,
      product_line,
      production_line,
      station,
      consumables,
      fixture_numbers,
      gage_numbers,
      tooling_numbers,
      production_rate,
      air_needed,
      air_pressure,
      air_pressure_unit,
      voltage,
      phases,
      amperage,
      frequency,
      water_cooling,
      water_temp,
      water_temp_unit,
      dust_extraction,
      fume_extraction,
      user_id,
    } = cleanedBody;
    console.log(cleanedBody);

    const getFile = (field) =>
      req.files && req.files[field] ? req.files[field][0].filename : null;

    const machineimagefile = getFile("machineimagefile");
    const files_3d = getFile("files_3d");
    const files_2d = getFile("files_2d");
    const spare_parts_list = getFile("spare_parts_list");
    const electrical_diagram = getFile("electrical_diagram");
    const cpk_data = getFile("cpk_data");
    const validation_document = getFile("validation_document");
    const parameter_studies = getFile("parameter_studies");
    const plc_program = getFile("plc_program");
    const hmi_program = getFile("hmi_program");
    const other_programs = getFile("other_programs");
    const machine_manual = getFile("machine_manual");

    try {
      await pool.query("BEGIN");

      const updatedResult = await pool.query(
        `
        UPDATE "Machines" SET
          machine_ref = $1, machine_name = $2, brand = $3, model = $4, 
          product_line = $5, production_line = $6, station = $7,
          consumables = $8, fixture_numbers = $9, 
          gage_numbers = $10, tooling_numbers = $11, cpk_data = COALESCE($12, cpk_data), 
          production_rate = $13, validation_document = COALESCE($14, validation_document), parameter_studies = COALESCE($15, validation_document), 
          air_needed = $16, air_pressure = $17, air_pressure_unit = $18, 
          voltage = $19, phases = $20, amperage = $21, frequency = $22, 
          water_cooling = $23, water_temp = $24, water_temp_unit = $25, 
          dust_extraction = $26, fume_extraction = $27,
          machineimagefile = COALESCE($28, machineimagefile),
          files_3d = COALESCE($29, files_3d),
          files_2d = COALESCE($30, files_2d),
          spare_parts_list = COALESCE($31, spare_parts_list),
          electrical_diagram = COALESCE($32, electrical_diagram),
          plc_program = COALESCE($33, plc_program),
          hmi_program = COALESCE($34, hmi_program),
          other_programs = COALESCE($35, other_programs),
          machine_manual = COALESCE($36, machine_manual)
        WHERE machine_id = $37
        RETURNING *
      `,
        [
          machine_ref, machine_name, brand, model,
          product_line, production_line, station,
          consumables, fixture_numbers,
          gage_numbers, tooling_numbers, cpk_data,
          production_rate, validation_document, parameter_studies,
          air_needed, air_pressure, air_pressure_unit,
          voltage, phases, amperage, frequency,
          water_cooling, water_temp, water_temp_unit,
          dust_extraction, fume_extraction,
          machineimagefile, files_3d, files_2d,
          spare_parts_list, electrical_diagram, plc_program, hmi_program,
          other_programs, machine_manual,
          id
        ]
      );

      const updatedMachine = updatedResult.rows[0];
      const machine_id = updatedMachine.machine_id;
      const parsedUserId = user_id ? parseInt(user_id, 10) : null;

      await pool.query(
        `INSERT INTO "Machines_Hist" 
          (machine_id, machine_ref, machine_name, brand, model, product_line, production_line, station,
         machineimagefile, files_3d, files_2d, spare_parts_list, electrical_diagram, plc_program, hmi_program, 
          other_programs, machine_manual, consumables, fixture_numbers, gage_numbers, tooling_numbers, 
          cpk_data, production_rate, validation_document, parameter_studies, action_type, action_date, 
          user_id, air_needed, air_pressure, air_pressure_unit, voltage, phases, amperage, frequency, 
          water_cooling, water_temp, water_temp_unit, dust_extraction, fume_extraction) 
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
           $21, $22, $23, $24, $25, $26, NOW(), $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39)`, // 39 placeholders
        [
          machine_id,                // $1
          machine_ref,               // $2
          machine_name,              // $3
          brand,                     // $4
          model,                     // $5
          product_line,              // $6
          production_line,           // $7
          station,                   // $8
          machineimagefile || updatedMachine.machineimagefile, // $9
          files_3d || updatedMachine.files_3d, // $10
          files_2d || updatedMachine.files_2d, // $11
          spare_parts_list || updatedMachine.spare_parts_list, // $12
          electrical_diagram || updatedMachine.electrical_diagram, // $13
          plc_program || updatedMachine.plc_program, // $14
          hmi_program || updatedMachine.hmi_program, // $15
          other_programs || updatedMachine.other_programs, // $16
          machine_manual || updatedMachine.machine_manual, // $17
          consumables,               // $18
          fixture_numbers,           // $19
          gage_numbers,              // $20
          tooling_numbers,           // $21
          cpk_data || updatedMachine.cpk_data, // $22
          production_rate,           // $23
          validation_document || updatedMachine.validation_document, // $24
          parameter_studies || updatedMachine.parameter_studies, // $25
          "UPDATE",                  // $26 (action_type)
          parsedUserId,              // $27 (user_id)
          air_needed,                // $28
          air_pressure,              // $29
          air_pressure_unit,         // $30
          voltage,                   // $31
          phases,                    // $32
          amperage,                  // $33
          frequency,                 // $34
          water_cooling,             // $35
          water_temp,                // $36
          water_temp_unit,           // $37
          dust_extraction,           // $38
          fume_extraction            // $39
        ]
      );
      await pool.query("COMMIT");

      res.status(200).json(updatedMachine);
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error updating machine:", error);
      res.status(500).json({ message: "Error updating machine" });
    }
  }
);


router.delete('/machines/:machine_id', async (req, res) => {
  const { machine_id } = req.params;
  const { user_id } = req.body; // Get the user_id from the request body

  try {
    // Step 1: Retrieve the machine details before deletion
    const machineResult = await pool.query('SELECT * FROM "Machines" WHERE machine_id = $1', [machine_id]);

    // If the machine does not exist, return an error
    if (machineResult.rows.length === 0) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    const machine = machineResult.rows[0]; // Extract the machine data
    console.log('machinehist',machine);

    // Step 2: Delete the machine from the "Machines" table
    await pool.query('DELETE FROM "Machines" WHERE machine_id = $1', [machine_id]);

    // Step 3: Insert the deleted machine's data into the "Machines_Hist" table with action_type "DELETE"
    await pool.query(
     `INSERT INTO "Machines_Hist" 
          (machine_id, machine_ref, machine_name, brand, model, product_line, production_line, station,
          machineimagefile, files_3d, files_2d, spare_parts_list, electrical_diagram, plc_program, hmi_program, 
          other_programs, machine_manual, consumables, fixture_numbers, gage_numbers, tooling_numbers, 
          cpk_data, production_rate, validation_document, parameter_studies, action_type, action_date, 
          user_id, air_needed, air_pressure, air_pressure_unit, voltage, phases, amperage, frequency, 
          water_cooling, water_temp, water_temp_unit, dust_extraction, fume_extraction) 
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
           $21, $22, $23, $24, $25, $26, NOW(), $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39)`,
      [
        machine.machine_id,
        machine.machine_ref,
        machine.machine_name,
        machine.brand,
        machine.model,
        machine.product_line,
        machine.production_line,
        machine.station,
        machine.machineimagefile,
        machine.files_3d,
        machine.files_2d,
        machine.spare_parts_list,
        machine.electrical_diagram,
        machine.plc_program,
        machine.hmi_program,
        machine.other_programs,
        machine.machine_manual,
        machine.consumables,
        machine.fixture_numbers,
        machine.gage_numbers,
        machine.tooling_numbers,
        machine.cpk_data,
        machine.production_rate,
        machine.validation_document,
        machine.parameter_studies,
        "DELETE", // Action type set to DELETE
        user_id, // The user who performed the action
        machine.air_needed,
        machine.air_pressure,
        machine.air_pressure_unit,
        machine.voltage,
        machine.phases,
        machine.amperage,
        machine.frequency,
        machine.water_cooling,
        machine.water_temp,
        machine.water_temp_unit,
        machine.dust_extraction,
        machine.fume_extraction
      ]
    );

    // Successfully deleted
    res.json({ message: 'Machine deleted successfully', machine: machineResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting machine' });
  }
});

// GET /machines/:id/products
router.get("/machines/:id/product-ids", async (req, res) => {
  const machineId = parseInt(req.params.id, 10); // Convert string to integer

  try {
    const result = await pool.query(
      `SELECT machine_id, product_id
       FROM "MachineProducts"
       WHERE machine_id = $1`,
      [machineId]
    );

    res.status(200).json({
      machine_id: machineId,
      product_ids: result.rows.map(row => row.product_id), // Just return an array of IDs
    });
  } catch (error) {
    console.error("Error fetching product IDs:", error);
    res.status(500).json({ message: "Failed to fetch product IDs." });
  }
});





router.get("/machines/:machine_id", async (req, res) => {
  const { machine_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM "Machines" WHERE machine_id = $1`,
      [machine_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Machine not found" });
    }

    const machine = result.rows[0];
    res.status(200).json(machine);
  } catch (error) {
    console.error("Error fetching machine details:", error);
    res.status(500).json({ message: "Error fetching machine details" });
  }
});







router.get('/machines', async (req, res) => {
  try {
    // Fetch all machines from the database
    const result = await pool.query(`
      SELECT * FROM "Machines"
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching machines' });
  }
});


router.get('/users', async (req, res) => {
  try {
    // Fetch all machines from the database
    const result = await pool.query(`
      SELECT * FROM utilisateur
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching machines' });
  }
});



router.get('/machinesproducts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "MachineProducts"');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching MachineProducts' });
  }
});

router.get('/machines/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM machine WHERE machine_id  = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching machine details' });
  }
});


 
// File download endpoint
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('File download error:', err);
      res.status(500).json({ message: 'Error downloading file' });
    }
  });
});

router.post('/Products', async (req, res) => {
  const { product_id, product_description, user_id } = req.body;
  console.log('REQ BODY:', req.body);  // Log to check if user_id is passed correctly

  if (!user_id) {
    console.error('User ID is missing in the request.');
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    await pool.query('BEGIN');

    const productResult = await pool.query(
      'INSERT INTO "Products" (product_id,product_description) VALUES ($1, $2) RETURNING *',
      [product_id, product_description]
    );

    const newProduct = productResult.rows[0];

    await pool.query(
      'INSERT INTO "Products_Hist" (product_id, description, action_type, action_date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        newProduct.product_id,
        newProduct.product_description,
        'CREATE',
        new Date(),
        user_id,
      ]
    );

    await pool.query('COMMIT');

    res.status(201).json({
      message: 'Product added successfully',
      product: newProduct,
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error adding product:', err);
    res.status(500).json({ message: 'Error adding product' });
  }
});


router.post('/Productss', async (req, res) => {
  const { product_id, product_description, user_id } = req.body;
  console.log('REQ BODY:', req.body);  // Log to check if user_id is passed correctly

  if (!user_id) {
    console.error('User ID is missing in the request.');
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    await pool.query('BEGIN');

    const productResult = await pool.query(
      'INSERT INTO "Products" (product_id,product_description) VALUES ($1, $2) RETURNING *',
      [product_id, product_description]
    );

    const newProduct = productResult.rows[0];

    await pool.query(
      'INSERT INTO "Products_Hist" (product_id, description, action_type, action_date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        newProduct.product_id,
        newProduct.product_description,
        'UPDATE',
        new Date(),
        user_id,
      ]
    );

    await pool.query('COMMIT');

    res.status(201).json({
      message: 'Product added successfully',
      product: newProduct,
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error adding product:', err);
    res.status(500).json({ message: 'Error adding product' });
  }
});




router.get('/Products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Products"');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching Products' });
  }
});

router.post('/facilities', async (req, res) => {
  const { 
    air_needed, air_pressure, air_pressure_unit, voltage, phases, amperage, 
    frequency, water_cooling, water_temp, water_temp_unit, dust_extraction, 
    fume_extraction, machine_id 
  } = req.body;

  try {
    // Check if the machine_id exists in the Machines table
    const machineResult = await pool.query('SELECT * FROM machine WHERE machine_id = $1', [machine_id]);

    // If the machine does not exist, return an error
    if (machineResult.rows.length === 0) {
      return res.status(400).json({ message: 'Machine ID does not exist' });
    }

  

    // Start transaction for facilities insertion
    await pool.query('BEGIN');

    // Insert the facility requirements, referencing the machine_id
    const facilityResult = await pool.query(
      'INSERT INTO "FacilitiesRequirements" (air_needed, air_pressure, air_pressure_unit, voltage, phases, amperage, frequency, water_cooling, water_temp, water_temp_unit, dust_extraction, fume_extraction, machine_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [air_needed, air_pressure, air_pressure_unit, voltage, phases, amperage, frequency, water_cooling, water_temp, water_temp_unit, dust_extraction, fume_extraction, machine_id]
    );

    // Commit transaction
    await pool.query('COMMIT');

    // Send success response with the last machine details
    res.status(201).json({ 
      message: 'Facilities requirements added successfully', 
      facility: facilityResult.rows[0] 
    });
  } catch (err) {
    // Rollback in case of an error
    await pool.query('ROLLBACK');
    console.error('Error adding facilities:', err);
    res.status(500).json({ message: 'Error adding facilities' });
  }
});



router.get('/facilities/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM "FacilitiesRequirements" WHERE id= $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Facilities not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching machine details' });
  }
});

router.get('/facilities/machine/:machine_id', async (req, res) => {
  const { machine_id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM "FacilitiesRequirements" WHERE machine_id = $1', 
      [machine_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No facilities found for this machine' });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching facilities' });
  }
});


router.post('/failure', async (req, res) => {
  const {  failure_desc , solution, failure_date, status, resolved_date, executor, creator} = req.body;

  try {
    // Check if the machine_id exists in the Machines table
    const machineResult = await pool.query('SELECT * FROM machine WHERE machine_id = $1', [machine_id]);

    // If the machine does not exist, return an error
    if (machineResult.rows.length === 0) {
      return res.status(400).json({ message: 'Machine ID does not exist' });
    }

  const  machine_id = machineResult.rows[0].machine_id;
    // Start transaction
    await pool.query('BEGIN');

    // Insert the facility requirements
    const facilityResult = await pool.query(
      'INSERT INTO "FailureLog" (air_needed, failure_desc , solution, failure_date, status, resolved_date, executor, creator) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [machine_id, failure_desc , solution, failure_date, status, resolved_date, executor, creator]
    );

    // Commit transaction
    await pool.query('COMMIT');

    res.status(201).json({ 
      message: 'Facilities requirements added successfully', 
      machine: machineResult.rows[0], 
      facility: facilityResult.rows[0] 
    });
  } catch (err) {
    // Rollback in case of an error
    await pool.query('ROLLBACK');
    console.error('Error adding machine and product:', err);
    res.status(500).json({ message: 'Error adding machine and product' });
  }
});

router.get('/failures', async (req, res) => {
  try {
    // Fetch all machines from the database
    const result = await pool.query(`
      SELECT * FROM failure
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching machines' });
  }
});
router.get('/failure/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM "FacilitiesRequirements" WHERE requirement_id  = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Facilities not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching machine details' });
  }
});


// Create a maintenance entry
router.post('/maintenance', async (req, res) => {
  const {
    task_name,
    task_description,
    maintenace_type,
    start_date,  // Added start date
    end_date,    // Added end date
    status,
    executor,
    creator
  } = req.body;

  try {
    // Start transaction
    await pool.query('BEGIN');
    
    // Fetch the first machine_id from the machine table
    const machineresult = await pool.query('SELECT machine_id FROM machine LIMIT 1');
    // Check if any result was returned
   if (machineresult.rows.length === 0) {
  throw new Error("No machine found");
    }
    const machine_id = machineresult.rows[0].machine_id;

    // Insert into maintenance table
 // Insert into the maintenance table
const maintenanceResult = await pool.query(
  `INSERT INTO maintenance 
  (task_name, task_description, maintenace_type, start_date, end_date, status, executor, creator, machine_id) 
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
  RETURNING *`,
  [task_name, task_description, maintenace_type, start_date, end_date, status, executor, creator, machine_id]
);

    // Commit transaction
    await pool.query('COMMIT');

    res.status(201).json({
      message: 'Maintenance record added successfully',
      maintenance: maintenanceResult.rows[0],
    });
  } catch (err) {
    // Rollback in case of an error
    await pool.query('ROLLBACK');
    console.error('Error adding maintenance record:', err);
    res.status(500).json({ message: 'Error adding maintenance record' });
  }
});

// Fetch all maintenance records
// Fetch all maintenance events
router.get('/maintenance', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT maintenance_id, task_name, maintenace_type, start_date, end_date 
       FROM maintenance 
       ORDER BY start_date ASC`
    );

    // Format the response to match FullCalendar's expected format
    const formattedEvents = result.rows.map(event => ({
      id: event.id,
      title: `${event.maintenace_type} - ${event.task_name}`,
      start: event.start_date,
      end: event.end_date
    }));

    res.status(200).json(formattedEvents);
  } catch (err) {
    console.error('Error fetching maintenance events:', err);
    res.status(500).json({ message: 'Error fetching maintenance events' });
  }
});

module.exports = router;
