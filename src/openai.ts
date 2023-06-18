import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { SearchResult } from './azure-cognative-search';
dotenv.config();

const EMBEDDINGS_ENDPOINT = 'https://api.openai.com/v1/embeddings';

export interface CompilationMatch { id: string, reason: string, mode: "full" | "partial"; }

function stripContent (content: string): string {
    if ((content === null) || (content === ''))
        return content;

    return content.replace(/<[^>]*>/g, '').replace('\n', ' ').replace('\r', '');
}

export async function compileSearchResults (prompt: string, query: string, matches: SearchResult[]): Promise<CompilationMatch[]> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages = [{ role: 'system', content: prompt }, ...matches.map(m => {
        return {
            role: 'assistant',
            content: `Id: ${m.id} \n\n${m.content}`
        };
    },

    ), { role: 'user', content: query }];

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "model": "gpt-4-0613",
            messages: messages
        }),
    });

    let content = (await res.json()).choices[0].message.content as string;
    const ERROR_INDICATOR = '##ERROR##';
    let errorIndex = content.indexOf(ERROR_INDICATOR);

    if (errorIndex > -1) {
        throw new Error(content.substring(errorIndex + ERROR_INDICATOR.length).trim());
    }

    let output = JSON.parse(content);
    return output;
}


export async function createEmbeddingFromString (value: string): Promise<[number]> {
    const res = await fetch(EMBEDDINGS_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            // it's best practise to keep only plain text
            // so we need to remove html tags and line breaks
            "input": stripContent(value),
            "model": "text-embedding-ada-002"
        }),
    });

    if (!res.ok) {
        throw new Error(`Error generating embedding: ${res.statusText}`);
    }

    const root = await res.json();
    return root.data[0].embedding;
}