import fs from 'fs';
import path from 'path';

// Paths to your files
const filesTxtPath = path.join('.', 'files.txt');
const driveJsonPath = path.join('.', 'drive_structure.json');
const outputFilePath = path.join('.', 'missing_files.txt');

// Function to read file contents
const readFile = (filePath) => fs.promises.readFile(filePath, 'utf8');

// Function to write output to file
const writeFile = (filePath, data) => fs.promises.writeFile(filePath, data, 'utf8');

// Main function to compare files
const compareFiles = async () => {
    try {
        // Read the list of files
        const filesTxt = await readFile(filesTxtPath);
        const filesList = filesTxt.split('\n').map(file => file.trim()).filter(file => file);

        // Read the JSON file as plain text
        const driveJsonText = await readFile(driveJsonPath);

        // Find filenames in the JSON text
        const driveFilesSet = new Set();
        const regex = /"([^"]+)":\s*\{/g; // Match any filename in quotes
        let match;
        while ((match = regex.exec(driveJsonText)) !== null) {
            driveFilesSet.add(match[1]);
        }

        // Find files that are not in the JSON
        const missingFiles = filesList.filter(file => !driveFilesSet.has(file));

        // Write missing files to output file
        const missingFilesOutput = missingFiles.join('\n');
        await writeFile(outputFilePath, missingFilesOutput);

        console.log(`Comparison complete. Missing files written to ${outputFilePath}`);
    } catch (error) {
        console.error('Error during file comparison:', error);
    }
};

// Execute the comparison
compareFiles();