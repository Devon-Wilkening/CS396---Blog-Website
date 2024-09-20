const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.static('public')); // Serve static files from the 'public' directory

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); //Here is a route for the index/home page. As we add more pages, we will use very similar structure to route to these pages. 
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
