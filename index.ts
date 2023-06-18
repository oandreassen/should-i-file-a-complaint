import dotenv from 'dotenv';
import promptCompileBugs from './prompts/compile_bugs';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { search } from "./src/azure-cognative-search";
import { compileSearchResults } from "./src/openai";
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './../client/build')));

app.post('/api/search', async (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: 'query is required' });
    }

    try {
        const searchResults = await search(query);

        if (searchResults.length === 0) {
            console.trace(`No matches for query: ${query} was found.`);
            return [];
        }

        const prompt = promptCompileBugs();

        try {
            const output = await compileSearchResults(prompt, query, searchResults);
            return res.json(output);
        } catch (error: any) {
            return res.status(400).send(error.message);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while processing your request' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + './../client/build/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
