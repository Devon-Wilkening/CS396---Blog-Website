document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();

    document.getElementById('postForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;

        const response = await fetch('/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, content })
        });

        if (response.ok) {
            fetchPosts(); // Refresh the posts
            document.getElementById('postForm').reset(); // Clear the form
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
            <p>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</p>
            <button onclick="editPost(${post.id})">Edit</button>
            <button onclick="deletePost(${post.id})">Delete</button>
            <div id="comments-${post.id}"></div>
        `;
        postList.appendChild(postDiv);
    });
}
