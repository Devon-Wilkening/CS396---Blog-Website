const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database'); // SQLite connection

const app = express();
const PORT = 3000;

// Middleware for parsing form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true
}));

// Serve static files from 'public' directory
app.use(express.static('public'));

app.get('/home', (req, res) => {
    if (!req.session.userId) {
        return res.status(403).send('You must be logged in to view this page.');
    }
    res.sendFile(__dirname + '/public/home.html'); // Serve home.html
});

// Route to serve the login page as the default
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/login.html'); // Serve login.html as the default page
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            return res.status(500).send('Error logging in.');
        }
        if (!user) {
            return res.status(400).send('User not found.');
        }

        try {
            // Compare the entered password with the hashed password in the database
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                // Set the user session
                req.session.userId = user.id;
                req.session.username = user.username;
                res.redirect('./home')
            } else {
                res.status(400).send('Incorrect password.');
            }
        } catch (error) {
            res.status(500).send('Error logging in.');
        }
    });
});

// Route to serve the registration page
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html'); // Serve register.html when users visit /register
});

// Registration route (handles form submission from register.html)
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Hash the password for security
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store the user in the database
        db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
        [username, email, hashedPassword], 
        function (err) {
            if (err) {
                console.error('Error registering user:', err.message);
                return res.status(500).send('Error registering user.');
            }
            res.send('User registered successfully! You can now <a href="/">login</a>.');
        });
    } catch (error) {
        res.status(500).send('Error registering user.');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out.');
        }
        res.redirect('/'); // Redirect to login page
    });
})

// Route to serve the post creation page
app.get('/create-post', (req, res) => {
    if (!req.session.userId) {
        return res.status(403).send('You must be logged in to create a post.');
    }
    res.sendFile(__dirname + '/public/createPost.html'); // Serve createPost.html
});

// Create a new post
app.post('/posts', (req, res) => {
    const { title, content } = req.body;
    const userId = req.session.userId;

    db.run('INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)', 
    [title, content, userId], function(err) {
        if (err) {
            return res.status(500).send('Error creating post.');
        }
        res.redirect('/home'); // Redirect back to home after posting
    });
});

// Read all posts
app.get('/posts', (req, res) => {
    db.all('SELECT * FROM posts', [], (err, posts) => {
        if (err) {
            return res.status(500).send('Error fetching posts.');
        }
        res.json(posts); // Return posts as JSON
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
