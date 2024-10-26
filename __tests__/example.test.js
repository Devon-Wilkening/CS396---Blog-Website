test('simple test', () => {
    expect(true).toBe(true);
});

// unit tests
// Mock the global fetch API
global.fetch = jest.fn();

describe('addComment function', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should add a comment successfully', async () => {
    // Set up the DOM
    document.body.innerHTML = `
      <input id="comment-input-1" value="This is a test comment" />
      <div id="comments-1"></div>
    `;

    // Mock the fetch response to simulate a successful API call
    fetch.mockResolvedValueOnce({ ok: true });

    // Import the function to test
    const { addComment } = require('../../path/to/your/file');
    await addComment(1);

    // Expect fetch to have been called with the correct parameters
    expect(fetch).toHaveBeenCalledWith(`/posts/1/comments`, expect.any(Object));
    expect(fetch).toHaveBeenCalledTimes(1);

    // Check if the input was cleared after adding the comment
    expect(document.getElementById('comment-input-1').value).toBe('');
  });

  it('should handle a failed comment addition', async () => {
    fetch.mockRejectedValueOnce(new Error('Failed to add comment'));

    // Mock alert
    global.alert = jest.fn();

    const { addComment } = require('../../path/to/your/file');
    await addComment(1);

    expect(alert).toHaveBeenCalledWith('Error adding comment');
  });
});

// integration tests 
const { fetchPosts } = require('../../path/to/your/file');

// Mock the global fetch API
global.fetch = jest.fn();

describe('fetchPosts function', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch and render posts', async () => {
    document.body.innerHTML = '<div id="postList"></div>';

    // Mock fetch response with post data
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve([{ id: 1, title: 'Test Post', content: 'Content' }]),
    });

    await fetchPosts();

    expect(fetch).toHaveBeenCalledWith('/posts');
    expect(document.getElementById('postList').innerHTML).toContain('Test Post');
    expect(document.getElementById('postList').innerHTML).toContain('Content');
  });
});

// end to end test
// __tests__/e2e/posts.test.js

const request = require('supertest');
const app = require('../../app'); // Your Express app

describe('POST /posts', () => {
  it('should create a new post and redirect to home', async () => {
    const response = await request(app)
      .post('/posts')
      .send({ title: 'New Post', content: 'Content', tag: 'Tag' })
      .expect(302);

    expect(response.headers.location).toBe('/home');
  });
});
