// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const posts = {};

// Get all comments from a post
const getComments = (postId) => {
    const comments = posts[postId] || [];
    return comments;
};

// Add a comment to a post
const addComment = (postId, comment) => {
    const comments = posts[postId] || [];
    comments.push(comment);
    posts[postId] = comments;
};

// Create a comment
app.post('/posts/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    // Create new comment
    const comment = {
        id: Math.random().toString(36).substr(2, 5),
        content,
        status: 'pending'
    };

    // Add comment to post
    addComment(id, comment);

    // Send event to event-bus
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            ...comment,
            postId: id
        }
    });

    res.status(201).send(comment);
});

// Get all comments from a post
app.get('/posts/:id/comments', (req, res) => {
    const { id } = req.params;
    const comments = getComments(id);
    res.send(comments);
});

// Handle event from event-bus
app.post('/events', async (req, res) => {
    const { type, data } = req.body;
    console.log(`Received event: ${type}`);

    if (type === 'CommentModerated') {
        const { id, postId, status, content } = data;
        const comments = posts[postId];
        const comment = comments.find(comment => {
            return comment.id === id;
        });
        comment.status = status;

        // Send event to event-bus
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status,
                content
            }
        });
    }

    res.send({});
});

app.listen(4001, () => {
    console.log('Listening on 400