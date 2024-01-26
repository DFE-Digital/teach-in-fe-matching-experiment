const { app } = require('@azure/functions');
const axios = require('axios');
const urls = require('./urls');

app.http('auth-test', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        return {
            body: JSON.stringify({ hello: "world" })
        }
    }
});