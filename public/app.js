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
