const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt'); // Used for password hashing 
const db = require('./database'); // SQLite connection

// Set up stuff for web server
const app = express();
const PORT = 3000;

// Middleware to handle any form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
    secret: 'mysecretkey', // Can leave mysecretkey for the extent of this project. Would change for anything else
    resave: false,
    saveUninitialized: true
}));

// Serve static files from 'public' directory
app.use(express.static('public'));

// Route to serve the home page (or deny if not logged in)
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

// Route to handle login with given email and pass credentials
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // check to see if user exists
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
                // If match, set the user session and redirect to home page
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

// Route to handle logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => { // If logging out, make sure to destroy session data
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

// Route to create a new post
app.post('/posts', (req, res) => {
    const { title, content, tag } = req.body;
    const userId = req.session.userId;

    // Put title, content, etc. into posts table for that post
    db.run('INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)', 
    [title, content, userId], function (err) {
        if (err) {
            return res.status(500).send('Error creating post.');
        }
        
        const postId = this.lastID;

        // Check for tag
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

// Route to fetch all the tags for a post
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

    // Update the post in the database with new title/content
    db.run('UPDATE posts SET title = ?, content = ? WHERE id = ? AND user_id = ?', 
    [title, content, postId, userId], function(err) {
        if (err) {
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

// Route to delete a post
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

// Need a route to get all the comments for a post
app.get('/posts/:postId/comments', (req, res) => {
    const postId = req.params.postId;
    
    db.all(`
        SELECT comments.*, users.username 
        FROM comments 
        JOIN users ON comments.user_id = users.id
        WHERE post_id = ? 
        ORDER BY comments.created_at DESC
    `, [postId], (err, comments) => {
        if (err) {
            console.error('Error fetching comments:', err);
            return res.status(500).json({ error: 'Failed to fetch comments' });
        }
        res.json(comments);
    });
});

// Route for posting a comment under a post
app.post('/posts/:postId/comments', (req, res) => {
    const postId = req.params.postId;
    const userId = req.session.userId; // Assuming user session contains the logged-in user ID
    const { comment } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.run(`
        INSERT INTO comments (comment, post_id, user_id) 
        VALUES (?, ?, ?)
    `, [comment, postId, userId], function(err) {
        if (err) {
            console.error('Error creating comment:', err);
            return res.status(500).json({ error: 'Failed to create comment' });
        }
        res.status(201).json({ message: 'Comment added successfully' });
    });
});

// Route to edit a comment
app.put('/posts/:postId/comments/:commentId', (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.session.userId;
    const comment = req.body.comment; 

    // fetch the comment to check the user_id
    db.get(`SELECT user_id FROM comments WHERE id = ?`, [commentId], (err, existingComment) => {
        if (err) {
            console.error('Error fetching comment:', err);
            return res.status(500).json({ error: 'Failed to fetch comment' });
        }
        // make sure comment exists to edit
        if (!existingComment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Check if the logged-in user is the owner of the comment
        if (existingComment.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized: You can only edit your own comments' });
        }

        // Proceed to update the comment if the user is authorized
        db.run(`UPDATE comments SET comment = ? WHERE id = ?`, [comment, commentId], function(err) {
            if (err) {
                console.error('Error updating comment:', err);
                return res.status(500).json({ error: 'Failed to update comment' });
            }
            res.status(200).json({ message: 'Comment updated successfully' });
        });
    });
});

// Route to delete a comment
app.delete('/posts/:postId/comments/:commentId', (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.session.userId; // Get the logged-in user's ID from the session

    // Process should be largely similar to editing a comment. Just make sure comment exists and belongs to user
    db.get(`SELECT user_id FROM comments WHERE id = ?`, [commentId], (err, comment) => {
        if (err) {
            console.error('Error fetching comment:', err);
            return res.status(500).json({ error: 'Failed to fetch comment' });
        }

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // 
        if (comment.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized: You can only delete your own comments' });
        }

        // 
        db.run(`DELETE FROM comments WHERE id = ?`, [commentId], function(err) {
            if (err) {
                console.error('Error deleting comment:', err);
                return res.status(500).json({ error: 'Failed to delete comment' });
            }
            res.status(200).json({ message: 'Comment deleted successfully' });
        });
    });
});

// Route to get any posts by a specific tag. Will be used for tag search
app.get('/posts/tag/:tag', (req, res) => {
    const tag = req.params.tag;

    db.all(`
        SELECT posts.*, users.username 
        FROM posts 
        JOIN post_tags ON posts.id = post_tags.post_id 
        JOIN tags ON post_tags.tag_id = tags.id 
        JOIN users ON posts.user_id = users.id 
        WHERE tags.name = ? 
        ORDER BY posts.created_at DESC
    `, [tag], (err, posts) => {
        if (err) {
            console.error('Error fetching posts by tag:', err);
            return res.status(500).json({ error: 'Failed to fetch posts' });
        }
        res.json(posts);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
