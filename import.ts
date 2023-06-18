import dotenv from 'dotenv';
import { saveWorkItems, getWorkItemByUrl, loadWorkItems } from "./src/azure-devops";
import { addToSearch, updateOrCreateIndex } from "./src/azure-cognative-search";
import { createFolderIfNotExists } from "./src/utils";

dotenv.config();

const TEMP_DIR = './temp';

const ITEM_TYPE = process.argv[2] ?? 'Bug';
const START_DATE = process.argv[3] ?? '2021-01-01';


async function main (): Promise<number> {
    // make sure the search index is up to date
    await updateOrCreateIndex();

    // temporary folder to hold the work-item references while we process them
    createFolderIfNotExists(TEMP_DIR, true);

    // get all matching work items and store them on disc
    let itemsSaved = await saveWorkItems(ITEM_TYPE, START_DATE, TEMP_DIR, 100);

    if (itemsSaved === false) {
        return 0;
    }

    // load all stored work items (makes it easier to debug locally having disc as a buffer)
    let items = loadWorkItems(TEMP_DIR);

    // loop all files
    for (const file of items) {
        // loop all work items
        for (const workItem of file.items) {
            // get the full content
            let fullItem = await getWorkItemByUrl(workItem.url);

            // some work items is empty, we cant create embeddings on empty strings
            if (fullItem.title === undefined || fullItem.title.length === 0 ||
                fullItem.description === undefined || fullItem.description.length === 0) {
                continue;
            }

            // add the work item to the vector database
            const success = await addToSearch(fullItem.id + '', fullItem.title, fullItem.description, fullItem.type);

            if (success) {
                console.log(`Added ${fullItem.id} to search.`);
            }
        }
    }

    return items.length;
}

main().then((count) => {
    console.log(`Added ${count} ${ITEM_TYPE.toLocaleLowerCase()}s to index`);
}).catch(error => {
    console.error(error);
});
