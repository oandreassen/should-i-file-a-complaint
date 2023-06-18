import fs from 'fs';
import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const DEVOPS_ORGANISATION = process.env.AZURE_DEVOPS_ORGANISATION;
const DEVOPS_PROJECT = process.env.AZURE_DEVOPS_PROJECT;

interface Fields {
    'System.WorkItemType': string;
    'System.State': string;
    'System.Title': string;
    'System.Description': string;
}

export interface WorkItem {
    id: number;
    fields: Fields;
    type: string;
    title: string;
    description: string;
}

const DefaultHeaders = {
    'Authorization': 'Basic ' + Buffer.from(':' + process.env.AZURE_DEVOPS_PAT).toString('base64'),
    'Content-Type': 'application/json'
};

function saveWorkItemsToFile (workItems: any[], filePath: string) {
    const data = JSON.stringify(workItems);
    fs.writeFileSync(filePath, data, 'utf8');
}

export async function getWorkItemByUrl (url: string): Promise<WorkItem> {
    const response = await axios.get(url,
        {
            headers: DefaultHeaders
        });
    let workItem = response.data as WorkItem;

    return {
        ...workItem,
        title: workItem.fields['System.Title'],
        description: workItem.fields['System.Description'],
        type: workItem.fields['System.WorkItemType']
    };
}

export async function saveWorkItems (itemType: string, startDate: string, outputDir: string, top: number, lastId: string = '1', page: number = 0): Promise<boolean> {
    const url = `https://dev.azure.com/${DEVOPS_ORGANISATION}/_apis/wit/wiql?api-version=7.0&$top=${top}`;

    const query = `
    SELECT 
      [System.Id], 
      [System.Title], 
      [System.Description], 
      [System.WorkItemType], 
      [System.State] 
    FROM workItems 
    WHERE 
      [System.TeamProject] = '${DEVOPS_PROJECT}' AND 
      [System.CreatedDate] > '${startDate}' AND
      [System.WorkItemType] = '${itemType}' AND
      [System.Id] > ${lastId}
    ORDER BY [System.Id]
  `;

    let workItems: WorkItem[] = [];

    try {
        const response = await axios.post(url, { query }, { headers: DefaultHeaders });
        workItems = response.data.workItems;

        saveWorkItemsToFile(workItems, path.join(outputDir, `${Date.now()}-${page}.json`));

        // check if there are more items
        if (workItems.length === top) {
            const lastItemId = workItems[workItems.length - 1].id;
            await saveWorkItems(itemType, startDate, outputDir, top, lastItemId + '', page + 1);
        }

    } catch (error) {
        console.error(error);
        return false;
    }

    return true;
}

export function loadWorkItems (folderPath: string): { path: string, items: { id: string, url: string; }[]; }[] {
    const res: { path: string, items: { id: string, url: string; }[]; }[] = [];

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const data = fs.readFileSync(filePath, 'utf8');

        res.push({
            path: filePath,
            items: JSON.parse(data)
        });
    }

    return res;
}