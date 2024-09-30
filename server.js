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
    const { title, content, tag } = req.body;
    const userId = req.session.userId;

    db.run('INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)', 
    [title, content, userId], function (err) {
        if (err) {
            return res.status(500).send('Error creating post.');
        }
        
        const postId = this.lastID;

        if (tag) {
            // Insert tag into 'tags' table if it doesn't already exist
            db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tag], function(err) {
                if (err) {
                    return res.status(500).send('Error creating tag.');
                }

                // Get the tag ID
                db.get('SELECT id FROM tags WHERE name = ?', [tag], (err, row) => {
                    if (err || !row) {
                        return res.status(500).send('Error associating tag.');
                    }

                    const tagId = row.id;

                    // Insert into 'post_tags' to associate tag with the post
                    db.run('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId], function(err) {
                        if (err) {
                            return res.status(500).send('Error associating tag with post.');
                        }

                        res.redirect('/home'); // Redirect back to home after posting
                    });
                });
            });
        } else {
            res.redirect('/home');
        }
    });
});

// Read all posts with the username and created_at
app.get('/posts', (req, res) => {
    const query = `
        SELECT posts.id, posts.title, posts.content, posts.created_at, users.username
        FROM posts
        INNER JOIN users ON posts.user_id = users.id
        ORDER BY posts.created_at DESC;
    `;

    db.all(query, [], (err, posts) => {
        if (err) {
            return res.status(500).send('Error fetching posts.');
        }
        res.json(posts); // Return posts with username and created_at
    });
});

app.get('/posts/:postId/tags', (req, res) => {
    const postId = req.params.postId;
    db.all(`
        SELECT tags.name 
        FROM tags 
        JOIN post_tags ON tags.id = post_tags.tag_id
        WHERE post_tags.post_id = ?`, 
    [postId], (err, rows) => {
        if (err) {
            return res.status(500).send('Error fetching tags.');
        }
        res.json(rows);
    });
});

// Route to serve the edit post page
app.get('/edit-post/:postId', (req, res) => {
    const postId = req.params.postId;
    const userId = req.session.userId;

    db.get('SELECT * FROM posts WHERE id = ? AND user_id = ?', [postId, userId], (err, post) => {
        if (err || !post) {
            return res.status(404).send('Post not found or you are not authorized to edit this post.');
        }
        res.sendFile(__dirname + '/public/editPost.html'); // Serve editPost.html
    });
});

// Route to handle editing a post
app.post('/posts/:postId/edit', (req, res) => {
    const postId = req.params.postId;
    const { title, content } = req.body;
    const userId = req.session.userId;

    console.log(`Editing post with ID: ${postId}`); // Debug log
    console.log(`New title: ${title}, New content: ${content}`); // Debug log

    db.run('UPDATE posts SET title = ?, content = ? WHERE id = ? AND user_id = ?', 
    [title, content, postId, userId], function(err) {
        if (err) {
            console.error('Error updating post:', err); // Debug log
            return res.status(500).send('Error updating post.');
        }
        res.redirect('/home'); // Redirect back to home after editing
    });
});

// Route to fetch a single post's data
app.get('/posts/:postId', (req, res) => {
    const postId = req.params.postId;

    db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, post) => {
        if (err) {
            return res.status(500).send('Error fetching post.');
        }
        res.json(post);
    });
});

app.delete('/posts/:postId', (req, res) => {
    const postId = req.params.postId;
    const userId = req.session.userId;

    db.run('DELETE FROM posts WHERE id = ? AND user_id = ?', [postId, userId], function(err) {
        if (err) {
            return res.status(500).send('Error deleting post.');
        }
        res.sendStatus(200); // Send success response
    });
});

app.get('/posts/:postId/comments', (req, res) => {
    const postId = req.params.postId;
    db.all('SELECT * FROM comments WHERE post_id = ?', [postId], (err, comments) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch comments' });
        }
        res.json(comments);
    });
});

app.post('/posts/:postId/comments', (req, res) => {
    const postId = req.params.postId;
    const { comment } = req.body;
    const userId = 1; // Replace with the actual user ID of the logged-in user

    db.run('INSERT INTO comments (comment, post_id, user_id) VALUES (?, ?, ?)', [comment, postId, userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add comment' });
        }
        res.status(201).json({ id: this.lastID }); // Return the ID of the new comment
    });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
