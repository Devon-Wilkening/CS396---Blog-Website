document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();

    document.getElementById('postForm').addEventListener('submit', async (e) => {
        e.preventDefault();
    
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const tag = document.getElementById('postTag').value;
    
        const response = await fetch('/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, tag }) // Include the tag in the request
        });
    
        if (response.ok) {
            window.location.href = '/home'; // Redirect to home page after posting
        } else {
            alert('Error creating post.');
        }
    });    
});

// Function to load all the posts onto the user's home screen 
function loadPosts() {
    fetch('/posts')
        .then(response => response.json())
        .then(posts => {
            const postsDiv = document.getElementById('posts');
            postsDiv.innerHTML = ''; // Clear previous posts
            posts.forEach(post => {
                const postDiv = document.createElement('div');

                // Get all tags for a post
                fetch(`/posts/${post.id}/tags`)
                    .then(response => response.json())
                    .then(tags => {
                        const tagList = tags.map(tag => tag.name).join(', ');

                        // Create buttons for editing and deleting
                        const editButton = document.createElement('button');
                        editButton.textContent = 'Edit';
                        editButton.onclick = () => {
                            // Redirect to the edit page
                            window.location.href = `/edit-post/${post.id}`;
                        };

                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = 'Delete';
                        deleteButton.onclick = () => deletePost(post.id);

                        // Create comment section
                        const commentInput = document.createElement('input');
                        commentInput.placeholder = 'Add a comment...';
                        commentInput.type = 'text';
                        commentInput.id = `comment-input-${post.id}`;

                        const commentButton = document.createElement('button');
                        commentButton.textContent = 'Comment';
                        commentButton.onclick = () => addComment(post.id);

                        const commentsDiv = document.createElement('div');
                        commentsDiv.id = `comments-${post.id}`;

                        // Display post content, tags, username, time, etc.
                        postDiv.innerHTML = `
                            <h2>${post.title}</h2>
                            <p>${post.content}</p>
                            <p>Posted by <strong>${post.username}</strong> on ${new Date(post.created_at + 'Z').toLocaleString()}</p> 
                            <p>Tags: ${tagList || 'None'}</p>
                        `;

                        // Append buttons and comment input to the post
                        postDiv.appendChild(editButton);
                        postDiv.appendChild(deleteButton);
                        postDiv.appendChild(commentInput);
                        postDiv.appendChild(commentButton);
                        postDiv.appendChild(commentsDiv);
                        postsDiv.appendChild(postDiv);

                        // Load existing comments for this post
                        loadComments(post.id);
                    });
            });
        })
        .catch(error => {
            console.error('Error fetching posts:', error);
        });
}

function loadComments(postId) {
    fetch(`/posts/${postId}/comments`)
        .then(response => response.json())
        .then(comments => {
            const commentsDiv = document.getElementById(`comments-${postId}`);
            commentsDiv.innerHTML = ''; // Clear previous comments
            comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.innerHTML = `
                    <p><strong>${comment.username}</strong> commented: 
                    "<span id="comment-text-${comment.id}">${comment.comment}</span>" - 
                    <em>${new Date(comment.created_at + 'Z').toLocaleString()}</em></p>
                `;

                // Create Edit button for comments
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit Comment';
                editButton.onclick = () => {
                    const newComment = prompt('Edit your comment:', comment.comment);
                    if (newComment !== null && newComment.trim() !== '') {
                        editComment(comment.id, postId, newComment);
                    }
                };

                // Create Delete button for comments
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete Comment';
                deleteButton.onclick = () => deleteComment(comment.id, postId);

                commentDiv.appendChild(editButton);
                commentDiv.appendChild(deleteButton);
                commentsDiv.appendChild(commentDiv);
            });
        })
        .catch(error => {
            console.error('Error fetching comments:', error);
        });
}

// add comment
function addComment(postId) {
    const commentInput = document.getElementById(`comment-input-${postId}`);
    const comment = commentInput.value;

    if (comment.trim() === '') {
        alert('Comment cannot be empty!');
        return;
    }

    fetch(`/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to add comment');
        }
        commentInput.value = ''; // clear the comment
        loadComments(postId); // Reload comments after adding
    })
    .catch(error => {
        console.error('Error adding comment:', error);
    });
}


// edit an existing comment
function editComment(commentId, postId, newComment) {
    fetch(`/posts/${postId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: newComment })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Failed to edit comment');
            });
        }
        loadComments(postId); // Reload comments after editing
    })
    .catch(error => {
        alert(error.message); 
        console.error('Error editing comment:', error);
    });
}

// delete a comment
function deleteComment(commentId, postId) {
    fetch(`/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Failed to delete comment');
            });
        }
        // Reload comments after deletion
        loadComments(postId);
    })
    .catch(error => {
        alert(error.message); // Display the error message to the user
        console.error('Error deleting comment:', error);
    });
}

// search for existing posts by their associated tag(s)
function searchByTag(tag) {
    fetch(`/posts/tag/${tag}`)
        .then(response => response.json())
        .then(posts => {
            const postsDiv = document.getElementById('posts');
            postsDiv.innerHTML = ''; // Clear previous posts
            if (posts.length === 0) {
                postsDiv.innerHTML = '<p>No posts found for this tag.</p>';
            } else {
                posts.forEach(post => {
                    const postDiv = document.createElement('div');
                    postDiv.innerHTML = `
                        <h2>${post.title}</h2>
                        <p>${post.content}</p>
                        <p>Posted by <strong>${post.username}</strong> on ${new Date(post.created_at + 'Z').toLocaleString()}</p>
                    `;
                    postsDiv.appendChild(postDiv);
                });
            }
            // Show the return home button so that users can get back
            document.getElementById('returnHomeButton').style.display = 'inline-block';
        })
        .catch(error => {
            console.error('Error fetching posts by tag:', error);
        });
}

// general fetch posts function to display on home
async function fetchPosts() {
    const response = await fetch('/posts');
    const posts = await response.json();

    const postList = document.getElementById('postList');
    postList.innerHTML = ''; // Clear previous posts

    posts.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.content}</p>
            <p>Posted by <strong>${post.username}</strong> on ${new Date(post.created_at).toLocaleString()}</p>
            <button onclick="editPost(${post.id})">Edit</button>
            <button onclick="deletePost(${post.id})">Delete</button>
            <div id="comments-${post.id}"></div>
        `;
        postList.appendChild(postDiv);
    });
}

// delete posts 
function deletePost(postId) {
    if (confirm("Are you sure you want to delete this post?")) {
        fetch(`/posts/${postId}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    loadPosts(); // Reload posts after deletion
                } else {
                    alert('Error deleting post.');
                }
            });
    }
}

// return home button
document.getElementById('returnHomeButton').onclick = function() {
    document.getElementById('tagSearchInput').value = ''; 
    document.getElementById('returnHomeButton').style.display = 'none'; // Hide the return button
    loadPosts(); // Reload all posts
};

// search functionality
document.getElementById('tagSearchButton').onclick = function() {
    const tag = document.getElementById('tagSearchInput').value.trim();
    if (tag !== '') {
        searchByTag(tag);
    }
};

// create post button redirect
document.getElementById('createPostBtn').onclick = function() {
    window.location.href = '/create-post';
};

document.addEventListener('DOMContentLoaded', loadPosts);
