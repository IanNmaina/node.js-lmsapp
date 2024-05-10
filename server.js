const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { check, validationResult } = require('express-validator');
const app = express();

// Configure session middleware
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ' ',
    database: 'learning_management_system'
});

connection.connect();

// Serve static files from the default directory
app.use(express.static(__dirname));

// Set up middleware to parse incoming JSON data
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Registration route
app.post('/register', [
    // Validate email and username fields
    check('email').isEmail(),
    check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),

    // Custom validation to check if email and username are unique
    check('email').custom(async (value) => {
        const sql = 'SELECT * FROM users WHERE email = ?';
        connection.query(sql, [value], (err, result) => {
            if (err) {
                throw new Error(err.message);
            }
            if (result.length > 0) {
                throw new Error('Email already exists');
            }
        });
    }),
    check('username').custom(async (value) => {
        const sql = 'SELECT * FROM users WHERE username = ?';
        connection.query(sql, [value], (err, result) => {
            if (err) {
                throw new Error(err.message);
            }
            if (result.length > 0) {
                throw new Error('Username already exists');
            }
        });
    }),
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    // Create a new user object
    const newUser = {
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        full_name: req.body.full_name
    };

    // Save the new user to the database
    const sql = 'INSERT INTO users SET ?';
    connection.query(sql, newUser, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'User registered successfully' });
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logout successful');
});

//Dashboard route
app.get('/dashboard.html', (req, res) => {
    // Assuming you have middleware to handle user authentication and store user information in req.user
    const userFullName = req.user.full_name;
    res.render('dashboard', { fullName: userFullName });
});


// Route to retrieve course content
app.get('/course/:id', (req, res) => {
    const courseId = req.params.id;
    const sql = 'SELECT * FROM courses WHERE id = ?';
    connection.query(sql, [courseId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Send course content as JSON response
        res.json(result);
    });
});

// Start server
const PORT = process.env.PORT || 3306;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
