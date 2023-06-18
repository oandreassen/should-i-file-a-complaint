import { NodeHtmlMarkdown } from 'node-html-markdown';
import { createEmbeddingFromString } from './openai';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const SERVICE_NAME = process.env.AZURE_COGNATIVE_SERVICE_NAME;
const INDEX_NAME = process.env.AZURE_COGNATIVE_INDEX_NAME;
const API_VERSION = '2023-07-01-Preview';

export interface SearchResult {
    '@search.score': number;
    category: string;
    title: string;
    content: string;
    id: string;
}

export async function search (content: string): Promise<SearchResult[]> {
    const searchVector = await createEmbeddingFromString(content);

    const res = await axios.post(
        `https://${SERVICE_NAME}.search.windows.net/indexes/${INDEX_NAME}/docs/search?api-version=${API_VERSION}`,
        {
            vector: {
                value: searchVector,
                fields: 'contentVector',
                k: 5
            },
            select: 'title, content, category, id'
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.AZURE_CONGNATIVE_SEARCH_KEY ?? ''
            }
        }
    );

    const items = (res.data.value as SearchResult[]).filter((i) => i['@search.score'] > 0.75);

    return items;
}

export async function addToSearch (id: string, title: string, content: string, category: string): Promise<any> {
    // create embedding vectors for both title and content
    const titleVector = await createEmbeddingFromString(title);
    const contentVector = await createEmbeddingFromString(content);

    // trim away html by converting it to markdown
    // makes less tokens and easier for chatgpt to read
    content = new NodeHtmlMarkdown({ keepDataImages: false }).translate(content);

    if (content.length > 32766 / 2) {
        content = content.substring(0, 32766 / 2 - 1);
    }

    const url = `https://${SERVICE_NAME}.search.windows.net/indexes/${INDEX_NAME}/docs/index?api-version=${API_VERSION}`;

    const res = await axios.post(
        url,
        [
            {
                id: id,
                title: title,
                content: content,
                category: category,
                titleVector: titleVector,
                contentVector: contentVector
            }
        ],
        {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.AZURE_CONGNATIVE_SEARCH_KEY ?? ''
            }
        }
    );

    if (res.status === 200 || res.status === 201) {
        return true;
    } else {
        let details = res.data;
        console.error(`${res.status} (${res.statusText}): ${details}`);
        return false;
    }
}

export async function updateOrCreateIndex (apiVersion = '2023-07-01-Preview'): Promise<void> {
    const res = await axios.put(
        `https://${SERVICE_NAME}.search.windows.net/indexes/${INDEX_NAME}?api-version=${apiVersion}`,
        {
            name: INDEX_NAME,
            fields: [
                {
                    name: 'id',
                    type: 'Edm.String',
                    key: true,
                    filterable: true
                },
                {
                    name: 'category',
                    type: 'Edm.String',
                    filterable: true,
                    searchable: true,
                    retrievable: true
                },
                {
                    name: 'title',
                    type: 'Edm.String',
                    searchable: true,
                    retrievable: true
                },
                {
                    name: 'titleVector',
                    type: 'Collection(Edm.Single)',
                    searchable: true,
                    retrievable: true,
                    dimensions: 1536,
                    vectorSearchConfiguration: 'vectorConfig'
                },
                {
                    name: 'content',
                    type: 'Edm.String',
                    searchable: true,
                    retrievable: true
                },
                {
                    name: 'contentVector',
                    type: 'Collection(Edm.Single)',
                    searchable: true,
                    retrievable: true,
                    dimensions: 1536,
                    vectorSearchConfiguration: 'vectorConfig'
                }
            ],
            corsOptions: {
                allowedOrigins: ['*'],
                maxAgeInSeconds: 60
            },
            vectorSearch: {
                algorithmConfigurations: [
                    {
                        name: 'vectorConfig',
                        kind: 'hnsw'
                    }
                ]
            },
            semantic: {
                configurations: [
                    {
                        name: 'my-semantic-config',
                        prioritizedFields: {
                            titleField: {
                                fieldName: 'title'
                            },
                            prioritizedContentFields: [
                                {
                                    fieldName: 'content'
                                }
                            ],
                            prioritizedKeywordsFields: []
                        }
                    }
                ]
            }
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.AZURE_CONGNATIVE_SEARCH_KEY ?? ''
            }
        }
    );

    console.log(res.statusText);
}
