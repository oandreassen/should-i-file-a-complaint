import fs from 'fs';
import path from 'path';



export function createFolderIfNotExists (folderPath: string, clearIfNotEmpty: boolean = false) {
    fs.mkdir(folderPath, { recursive: true }, (error) => {
        if (error) {
            console.error('An error occurred:', error);
        } else {
            console.log(`Folder created at ${folderPath}`);
        }
    });

    if (clearIfNotEmpty) {
        fs.readdir(folderPath, (error, files) => {
            if (error) {
                console.error('An error occurred:', error);
            } else {
                for (const file of files) {
                    fs.rm(path.join(folderPath, file), { recursive: true, force: true }, (error) => {
                        if (error) {
                            console.error('An error occurred:', error);
                        } else {
                            console.log(`Removed ${file}`);
                        }
                    });
                }
            }
        });
    }
}

